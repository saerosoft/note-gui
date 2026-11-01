import { useEffect, useState } from 'react';
import { Button, Tabs } from '@mantine/core';
import './docmost/i18n';
import CommentListWithTabs from './vendor/docmost/client/features/comment/components/comment-list-with-tabs';
import { DocmostHistory } from './docmost/DocmostHistory';
import { NoteProperties } from './NoteProperties';
import { NoteRelations } from './NoteRelations';
import { NoteAttachments } from './NoteAttachments';
import type { AddComment, Comment, Note, NoteCoreApi, Page, Revision } from './model';
import { useNoteAccess, useRelations } from './hostRuntime';

export type NotePanel = 'comments' | 'history' | 'properties' | 'relations' | 'attachments';
export interface CommentDraft { body: string; busy: boolean; error?: string; pending?: { noteId: string; input: AddComment } }
interface Props { api: NoteCoreApi; note: Note; dirty: boolean; panel?: NotePanel; onPanelChange?: (panel: NotePanel) => void; commentDraft?: CommentDraft; onCommentDraftChange?: (transform: (draft: CommentDraft) => CommentDraft) => void; onRestore: (note: Note) => void; onOpen: (id: string) => void; onRevision: (note: Note) => void }
export function NotePanels({ api, note, dirty, panel: selectedPanel, onPanelChange, commentDraft: suppliedCommentDraft, onCommentDraftChange, onRestore, onOpen, onRevision }: Props) {
  const relations = useRelations();
  const access = useNoteAccess();
  const [localPanel, setLocalPanel] = useState<NotePanel>('comments');
  const panel = selectedPanel || localPanel;
  const [visited, setVisited] = useState<NotePanel[]>([panel]);
  useEffect(() => { setVisited(values => values.includes(panel) ? values : [...values, panel]); }, [panel]);
  function select(value: string | null) {
    if (!value) return;
    const next = value as NotePanel;
    setLocalPanel(next); onPanelChange?.(next);
  }
  const [comments, setComments] = useState<Page<Comment>>({ items: [], nextCursor: null });
  const [history, setHistory] = useState<Page<Revision>>({ items: [], nextCursor: null });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [reload, setReload] = useState(0);
  const [localCommentDraft, setLocalCommentDraft] = useState<CommentDraft>({ body: '', busy: false });
  const commentDraft = suppliedCommentDraft ?? localCommentDraft;
  const updateCommentDraft = onCommentDraftChange ?? setLocalCommentDraft;
  useEffect(() => {
    let alive = true; let sequence = 0;
    async function load() {
      const request = ++sequence;
      setError(''); setBusy(true); setLoaded(false); setComments({ items: [], nextCursor: null }); setHistory({ items: [], nextCursor: null });
      try {
        if (panel === 'comments') { const value = await api.comments(note.id, null); if (alive && request === sequence) setComments(value); }
        if (panel === 'history') { const value = await api.history(note.id, null); if (alive && request === sequence) setHistory(value); }
        if (alive && request === sequence) { setLoaded(true); if (reload) updateCommentDraft(value => value.error ? { ...value, error: undefined } : value); }
      } catch (failure) { if (alive && request === sequence) setError((failure as Error).message); }
      finally { if (alive && request === sequence) setBusy(false); }
    }
    void load();
    const stop = access.onAccessRefresh(load);
    return () => { alive = false; sequence++; stop(); };
  }, [api, note.id, note.revision, panel, access, reload]);
  async function perform(action: () => Promise<void>) {
    setBusy(true); setError('');
    try { await action(); } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  async function retryRead() {
    setBusy(true); setError('');
    try { onRevision(await api.note(note.id)); setReload(value => value + 1); }
    catch (failure) { setError((failure as Error).message); }
    finally { setBusy(false); }
  }
  async function comment(message: string) {
    if (busy || commentDraft.busy || !message.trim()) return false;
    const previous = commentDraft.pending;
    const request = previous && previous.noteId === note.id && previous.input.body === message
      ? previous : { noteId: note.id, input: { body: message, idempotencyKey: crypto.randomUUID() } };
    updateCommentDraft(value => ({ ...value, pending: request, busy: true, error: undefined }));
    setBusy(true); setError('');
    let committed = false;
    try {
      await api.comment(request.noteId, request.input);
      committed = true;
      updateCommentDraft(value => ({ ...value, pending: undefined, body: value.body === message ? '' : value.body }));
      const [comments, current] = await Promise.all([api.comments(request.noteId, null), api.note(request.noteId)]);
      onRevision(current); setComments(comments);
    } catch (failure) { updateCommentDraft(value => ({ ...value, error: (failure as Error).message })); }
    finally { setBusy(false); updateCommentDraft(value => ({ ...value, busy: false })); }
    return committed;
  }
  return <aside className="note-panels" aria-label="노트 상세">
    <Tabs value={panel} onChange={select}><Tabs.List aria-label="노트 상세 패널">
       <Tabs.Tab value="comments">댓글</Tabs.Tab><Tabs.Tab value="history">이력</Tabs.Tab><Tabs.Tab value="properties">속성</Tabs.Tab>{relations && <Tabs.Tab value="relations">관계</Tabs.Tab>}<Tabs.Tab value="attachments">첨부</Tabs.Tab>
    </Tabs.List></Tabs>
    {(error || commentDraft.error) && <p role="alert">{error || commentDraft.error}</p>}{busy && <p role="status">처리 중…</p>}
    {(error || commentDraft.error) && !busy && !commentDraft.busy && <Button variant="subtle" onClick={() => void retryRead()}>노트 상세 다시 읽기</Button>}
    {visited.includes('comments') && <div hidden={panel !== 'comments'} className="note-panel-content"><CommentListWithTabs comments={comments} canComment={note.canEdit} isLoading={busy || commentDraft.busy} showEmpty={loaded} draft={commentDraft.body} onDraftChange={body => updateCommentDraft(value => ({ ...value, body }))} onSave={comment}
      onLoadMore={() => void perform(async () => { const page = await api.comments(note.id, comments.nextCursor); setComments({ items: [...comments.items, ...page.items].slice(-100), nextCursor: page.nextCursor }); })}/></div>}
    {visited.includes('history') && <div hidden={panel !== 'history'} className="note-panel-content">
      {dirty && <p>현재 변경을 먼저 저장한 뒤 복원해 주세요.</p>}
      <DocmostHistory api={api} noteId={note.id} history={history} busy={busy || !loaded} canRestore={note.canEdit && loaded && !dirty && !busy}
        onRestore={revision => { if (window.confirm(`개정 ${revision.revision}을 새 개정으로 복원할까요?`)) void perform(async () => onRestore(await api.restore(note.id, revision.revision, note.revision))); }}
        onLoadMore={() => void perform(async () => { const page = await api.history(note.id, history.nextCursor); setHistory({ items: [...history.items, ...page.items].slice(-100), nextCursor: page.nextCursor }); })}/>
    </div>}
    {visited.includes('properties') && <div hidden={panel !== 'properties'} className="note-panel-content"><NoteProperties api={api} note={note} dirty={dirty} onRevision={onRevision}/></div>}
    {visited.includes('attachments') && <div hidden={panel !== 'attachments'} className="note-panel-content"><NoteAttachments api={api} noteId={note.id} revision={note.revision}/></div>}
     {visited.includes('relations') && relations && <div hidden={panel !== 'relations'} className="note-panel-content"><NoteRelations api={api} relations={relations} note={note} onOpen={onOpen} onRevision={onRevision}/></div>}
  </aside>;
}
