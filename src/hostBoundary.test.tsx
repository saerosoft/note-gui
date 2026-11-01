// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { useState } from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { Pane } from './Pane';
import { Workspace } from './Workspace';
import { ApiError, createNoteAccess, legacyAccess } from './access';
import { NoteHostProvider, createNoteSession } from './hostRuntime';
import { AttachmentContext } from './editor/attachmentContext';
import { useAuthorizedFile } from './docmost/useAuthorizedFile';
import { NotePicker } from './NotePicker';
import type { Note, NoteCoreApi, NoteKnowledgeContextApi, NoteRelationsApi } from './model';

vi.mock('./vendor/docmost/client/pages/page/page', () => ({ default: ({ header, editor, panels }: { header: React.ReactNode; editor: { title: string; onTitleChange: (title: string) => void; byline: React.ReactNode }; panels: React.ReactNode }) => <>{header}<input aria-label="Draft title" value={editor.title} onChange={event => editor.onTitleChange(event.target.value)}/>{editor.byline}{panels}</> }));
const note: Note = { id: 'note', spaceId: 'space', title: 'Independent document', revision: 1, bodyJson: { type: 'doc', content: [] }, visibility: 'PRIVATE', canEdit: true, parentId: null };
function core(): NoteCoreApi {
  return {
    spaces: async () => [{ id: 'space', name: 'Independent workspace', accessEpoch: 1, myRole: 'OWNER' }],
    tree: async () => ({ items: [], nextCursor: null }), ancestors: async () => [], note: async () => note,
    findNotes: async () => [], create: async () => note, save: async (_id, input) => ({ ...note, title: input.title, revision: 2 }),
    move: async () => {}, history: async () => ({ items: [], nextCursor: null }), restore: async () => note,
    comments: async () => ({ items: [], nextCursor: null }), comment: async () => {}, properties: async () => [],
    setProperties: async () => {}, deleteProperty: async () => {}, files: async () => ({ items: [], nextCursor: null }),
    upload: async () => ({ attachmentId: 'file', revision: 1, name: 'image', mimeType: 'image/png' }), attachment: async () => new Blob(['protected']),
  };
}
beforeEach(() => {
  Object.defineProperty(window, 'matchMedia', { configurable: true, value: vi.fn(() => ({ matches: false, addEventListener() {}, removeEventListener() {} })) });
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', { configurable: true, value() {} });
  window.history.replaceState(null, '', '/independent?space=space&note=note');
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
function show(knowledgeContext?: NoteKnowledgeContextApi, relations?: NoteRelationsApi) {
  const access = createNoteAccess();
  const client = core();
  const host = { access, destinations: {} };
  const view = render(<MantineProvider env="test"><NoteHostProvider api={client} host={host} knowledgeContext={knowledgeContext} relations={relations}>
    <Pane api={client} paneId="Independent" requestedId="note" onLocation={() => {}} onDirty={() => {}} onActivate={() => {}}/>
  </NoteHostProvider></MantineProvider>);
  return { access, client, ...view };
}
it('edits a core-only document without context controls or an implicit authored classification', async () => {
  show();
  await screen.findByDisplayValue('Independent document');
  expect(screen.queryByRole('button', { name: '지식 정보' })).toBeNull();
  expect(screen.queryByText('사람이 작성한 본문')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: '페이지 메뉴' }));
  await screen.findByRole('menuitem', { name: '페이지 이력' });
  expect(screen.queryByRole('menuitem', { name: '관계' })).toBeNull();
  fireEvent.change(screen.getByLabelText('Draft title'), { target: { value: 'Saved independently' } });
  fireEvent.click(screen.getByRole('button', { name: '저장' }));
  await waitFor(() => expect(screen.queryByText(/저장하지 않은 변경/)).toBeNull());
});
it.each([false, true])('accepts a delayed restore without discarding a later draft (edited: %s)', async edited => {
  const access = createNoteAccess(); const client = core();
  let finish!: (value: Note) => void;
  const restored = { ...note, title: 'Restored document', revision: 2 };
  client.history = async () => ({ items: [{ id: 'revision-1', revision: 1, title: 'Restored document', bodyJson: note.bodyJson, createdAt: '2026-11-01T00:00:00Z' }], nextCursor: null });
  const restore = vi.fn(() => new Promise<Note>(resolve => { finish = resolve; }));
  client.restore = restore;
  render(<MantineProvider env="test"><NoteHostProvider api={client} host={{ access, destinations: {} }}>
    <Pane api={client} paneId="Independent" requestedId="note" onLocation={() => {}} onDirty={() => {}} onActivate={() => {}}/>
  </NoteHostProvider></MantineProvider>);
  await screen.findByDisplayValue('Independent document');
  fireEvent.click(screen.getByRole('button', { name: '페이지 메뉴' }));
  fireEvent.click(await screen.findByRole('menuitem', { name: '페이지 이력' }));
  await screen.findByRole('textbox', { name: '개정 원문' });
  vi.spyOn(window, 'confirm').mockReturnValue(true);
  fireEvent.click(screen.getByRole('button', { name: /^복원$/ }));
  await waitFor(() => expect(restore).toHaveBeenCalledExactlyOnceWith('note', 1, 1));
  if (edited) fireEvent.change(screen.getByLabelText('Draft title'), { target: { value: 'Written while restoring' } });
  await act(async () => finish(restored));
  expect(screen.getByLabelText<HTMLInputElement>('Draft title').value).toBe(edited ? 'Written while restoring' : 'Restored document');
  expect(document.querySelector('.note-body-status')?.textContent).toContain(`개정 ${edited ? 1 : 2}`);
  expect(screen.getByRole('button', { name: /^저장$/ }).hasAttribute('disabled')).toBe(!edited);
});
it('shows supported context denial honestly while preserving an unsaved core draft', async () => {
  show({ provenance: async () => { throw new Error('Context permission denied'); }, currentKnowledge: async () => { throw new Error('Context unavailable'); }, accumulations: async () => { throw new Error('History unavailable'); }, accumulationChange: async () => { throw new Error('Comparison unavailable'); } });
  await screen.findByDisplayValue('Independent document');
  fireEvent.change(screen.getByLabelText('Draft title'), { target: { value: 'Retained draft' } });
  fireEvent.click(screen.getByRole('button', { name: '지식 정보' }));
  await screen.findByText('Context permission denied');
  expect(screen.getByDisplayValue('Retained draft')).toBeTruthy();
  expect(screen.queryByText('현재 유효한 정리가 없습니다.')).toBeNull();
});
it('uses only supplied host destinations and preserves dirty/native navigation behavior', async () => {
  const access = createNoteAccess(); const api = core(); const navigate = vi.fn(() => true);
  render(<MantineProvider env="test"><NoteHostProvider api={api} host={{ access, destinations: { home: '/my-host' }, onNavigate: navigate }}><Workspace api={api}/></NoteHostProvider></MantineProvider>);
  const home = await screen.findByRole('link', { name: /^홈$/ });
  expect(home.getAttribute('href')).toBe('/my-host');
  expect(document.querySelector('a[href*="/spaces/"]')).toBeNull();
  await screen.findByDisplayValue('Independent document');
  fireEvent.change(screen.getByLabelText('Draft title'), { target: { value: 'Unsaved' } });
  vi.spyOn(window, 'confirm').mockReturnValue(false);
  fireEvent.click(home); expect(navigate).not.toHaveBeenCalled();
  window.addEventListener('click', event => event.preventDefault(), { once: true });
  fireEvent.click(home, { ctrlKey: true }); expect(navigate).not.toHaveBeenCalled();
});
it('retires all core, context, relation and media results after revocation and disposal', async () => {
  const access = createNoteAccess();
  let finish!: (value: Note) => void;
  let media!: (value: Blob) => void;
  const session = createNoteSession({ api: { ...core(), note: () => new Promise(resolve => { finish = resolve; }), attachment: () => new Promise(resolve => { media = resolve; }) }, host: { access, destinations: {} } });
  session.connect();
  const pending = session.api.note('note'); const file = session.api.attachment('file', 1);
  access.revoke(); finish(note); media(new Blob(['late protected bytes']));
  await expect(pending).rejects.toMatchObject({ code: 'STALE_ACCESS' });
  await expect(file).rejects.toMatchObject({ code: 'STALE_ACCESS' });
  session.dispose();
  await expect(session.api.note('note')).rejects.toMatchObject({ code: 'ACCESS_DENIED' });
});
it('unsubscribes the injected host lifecycle on unmount and ignores a late note', async () => {
  let finish!: (value: Note) => void;
  const access = createNoteAccess(); const stopLost = vi.fn(); const stopRefresh = vi.fn();
  const subscribe = vi.spyOn(access, 'onAccessLost'); const refresh = vi.spyOn(access, 'onAccessRefresh');
  subscribe.mockImplementation(() => stopLost); refresh.mockImplementation(() => stopRefresh);
  const api = { ...core(), note: () => new Promise<Note>(resolve => { finish = resolve; }) };
  const view = render(<MantineProvider env="test"><NoteHostProvider api={api} host={{ access, destinations: {} }}><Workspace api={api}/></NoteHostProvider></MantineProvider>);
  await waitFor(() => expect(finish).toBeTypeOf('function'));
  view.unmount(); await act(async () => finish(note));
  expect(stopLost).toHaveBeenCalledOnce(); expect(stopRefresh).toHaveBeenCalledOnce();
  expect(document.body.textContent).not.toContain('Independent document');
});
it('refreshes contextual projections without remounting or dropping the editor draft', async () => {
  let allowed = true;
  const context: NoteKnowledgeContextApi = {
    provenance: async () => { if (!allowed) throw new Error('Context permission changed'); return { sources: [{ revisionId: 'source', spaceId: 'space', title: 'Previously authorized source' }], rules: [], reviews: [], actions: [] }; },
    currentKnowledge: async () => { if (!allowed) throw new Error('Current items permission changed'); return { noteId: 'note', revision: 1, bodyOrigin: 'HUMAN', items: [{ id: 'claim', claimKind: 'CONFIRMED_FACT', body: 'Previously authorized current claim', resultRevision: 1, appliedAt: '2026-10-31T00:00:00Z', evidenceCount: 0, evidence: [], rules: [] }], nextCursor: null }; },
    accumulations: async () => ({ items: [], nextCursor: null }), accumulationChange: async () => { throw new Error('No comparison selected'); },
  };
  const view = show(context);
  const editor = await screen.findByDisplayValue('Independent document');
  fireEvent.change(editor, { target: { value: 'Preserve through refresh' } });
  fireEvent.click(screen.getByRole('button', { name: '지식 정보' }));
  await screen.findByText('Previously authorized source');
  await screen.findByText('Previously authorized current claim');
  allowed = false;
  await act(async () => { await expect(view.access.refresh()).rejects.toThrow(/permission changed/); });
  await screen.findByText('Context permission changed');
  expect(screen.queryByText('Previously authorized source')).toBeNull();
  expect(screen.queryByText('Previously authorized current claim')).toBeNull();
  expect(screen.getByDisplayValue('Preserve through refresh')).toBe(editor);
});
it('guards extension responses without treating optional denial as a core access revocation', async () => {
  const access = createNoteAccess(); let finish!: (value: { sources: []; rules: []; reviews: []; actions: [] }) => void;
  const context: NoteKnowledgeContextApi = { provenance: () => new Promise(resolve => { finish = resolve; }), accumulations: async () => { throw new Error('Unavailable'); }, currentKnowledge: async () => { throw new Error('Denied'); }, accumulationChange: async () => { throw new Error('Denied'); } };
  const session = createNoteSession({ api: core(), knowledgeContext: context, host: { access, destinations: {} } });
  session.connect(); const pending = session.knowledgeContext!.provenance(note);
  await access.refresh(); finish({ sources: [], rules: [], reviews: [], actions: [] });
  await expect(pending).rejects.toMatchObject({ code: 'STALE_ACCESS' });
  await expect(session.knowledgeContext!.currentKnowledge('note', null)).rejects.toThrow('Denied');
  expect(await session.api.note('note')).toEqual(note);
  session.dispose();
});
it('revalidates authorized media through the injected lifecycle and clears an expired projection', async () => {
  const access = createNoteAccess(); let authorized = true;
  const client = { ...core(), attachment: async () => { if (!authorized) throw new Error('Media permission changed'); return new Blob(['image']); } };
  const createUrl = vi.fn(() => 'blob:independent'); const revokeUrl = vi.fn();
  Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: createUrl });
  Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: revokeUrl });
  function Media() { const file = useAuthorizedFile('file'); return <div ref={file.container}>{file.url && <img src={file.url} alt="Authorized media"/>}{file.error && <p role="alert">{file.error}</p>}</div>; }
  render(<NoteHostProvider api={client} host={{ access, destinations: {} }}><AttachmentContext.Provider value={{ api: client, noteId: 'note', editable: true }}><Media/></AttachmentContext.Provider></NoteHostProvider>);
  await screen.findByRole('img', { name: 'Authorized media' });
  authorized = false;
  await act(async () => { await expect(access.refresh()).rejects.toThrow('Media permission changed'); });
  await screen.findByText('Media permission changed');
  expect(screen.queryByRole('img')).toBeNull();
  expect(revokeUrl).toHaveBeenCalledWith('blob:independent');
});
it('withholds relation writes after a supported relation read is denied and keeps core editing available', async () => {
  const relations: NoteRelationsApi = {
    findRelationNotes: async () => { throw new Error('Relation selection denied'); },
    relations: async () => { throw new Error('Relations denied'); }, relationEvidence: async () => { throw new Error('Evidence denied'); },
    relate: async () => { throw new Error('Write denied'); }, decideRelation: async () => { throw new Error('Decision denied'); },
  };
  show(undefined, relations); await screen.findByDisplayValue('Independent document');
  fireEvent.click(screen.getByRole('button', { name: '페이지 메뉴' }));
  fireEvent.click(await screen.findByRole('menuitem', { name: /^관계$/ }));
  await screen.findByText('Relations denied');
  expect(screen.queryByLabelText('연결할 노트')).toBeNull();
  expect(screen.queryByText('아직 관계가 없습니다.')).toBeNull();
  fireEvent.change(screen.getByLabelText('Draft title'), { target: { value: 'Core remains editable' } });
  expect(screen.getByDisplayValue('Core remains editable')).toBeTruthy();
});
it('isolates injected mounts from each other and from the compatibility access channel', async () => {
  const accessA = createNoteAccess(); const accessB = createNoteAccess();
  const a = createNoteSession({ api: core(), host: { access: accessA, destinations: {} } });
  const b = createNoteSession({ api: core(), host: { access: accessB, destinations: {} } });
  a.connect(); b.connect(); legacyAccess.revoke();
  expect((await a.api.note('note')).title).toBe('Independent document');
  accessA.revoke();
  await expect(a.api.note('note')).rejects.toMatchObject({ code: 'ACCESS_DENIED' });
  expect((await b.api.note('note')).title).toBe('Independent document');
  a.dispose(); b.dispose();
});
it('rejects relation evidence completed after the mount is disposed', async () => {
  let finish!: (value: { items: []; nextCursor: null }) => void;
  const relations: NoteRelationsApi = {
    findRelationNotes: async noteId => ({ noteId, total: 0, items: [], nextCursor: null }),
    relations: async () => ({ items: [], nextCursor: null }), relationEvidence: () => new Promise(resolve => { finish = resolve; }),
    relate: async () => {}, decideRelation: async () => {},
  };
  const session = createNoteSession({ api: core(), relations, host: { access: createNoteAccess(), destinations: {} } });
  session.connect(); const pending = session.relations!.relationEvidence('relation', null);
  session.dispose(); finish({ items: [], nextCursor: null });
  await expect(pending).rejects.toMatchObject({ code: 'STALE_ACCESS' });
});
it('revalidates cached readable search titles without changing the query or the dirty note editor', async () => {
  const access = createNoteAccess(); let allowed = true;
  const api = { ...core(), findNotes: async () => allowed ? [{ id: 'private', title: 'Previously readable private title' }] : [] };
  render(<MantineProvider env="test"><NoteHostProvider api={api} host={{ access, destinations: {} }}><Workspace api={api}/></NoteHostProvider></MantineProvider>);
  const editor = await screen.findByDisplayValue('Independent document');
  fireEvent.change(editor, { target: { value: 'Retain this draft' } });
  fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
  const query = await screen.findByLabelText('노트 제목'); fireEvent.change(query, { target: { value: 'private' } });
  await screen.findByRole('button', { name: 'Previously readable private title' });
  allowed = false;
  await act(async () => access.refresh());
  expect(screen.queryByText('Previously readable private title')).toBeNull();
  expect((query as HTMLInputElement).value).toBe('private');
  expect(screen.getByDisplayValue('Retain this draft')).toBe(editor);
});
it('invalidates a selected readable target snapshot on injected access refresh', async () => {
  const access = createNoteAccess(); const api = core();
  function Picker() { const [selected, select] = useState<{ id: string; title: string } | null>({ id: 'private', title: 'Previously selected private title' }); return <NotePicker api={api} spaceId="space" label="Destination" selected={selected} onSelect={select}/>; }
  render(<MantineProvider env="test"><NoteHostProvider api={api} host={{ access, destinations: {} }}><Picker/></NoteHostProvider></MantineProvider>);
  expect(screen.getByText('Previously selected private title')).toBeTruthy();
  await act(async () => access.refresh());
  expect(screen.queryByText('Previously selected private title')).toBeNull();
  expect(screen.getByLabelText('Destination')).toBeTruthy();
});
it('subscribes before a same-stack core mount can be revoked', async () => {
  const { mountNoteCoreGui } = await import('./index');
  const api = core(); const noteRead = vi.spyOn(api, 'note'); const spaces = vi.spyOn(api, 'spaces');
  const access = createNoteAccess(); const container = document.createElement('div'); document.body.append(container);
  let mounted!: ReturnType<typeof mountNoteCoreGui>;
  try {
    await act(async () => { mounted = mountNoteCoreGui(container, { api, host: { access, destinations: {} } }); access.revoke(); });
    expect(noteRead).not.toHaveBeenCalled(); expect(spaces).not.toHaveBeenCalled();
    expect(container.textContent).not.toContain('Independent document');
  } finally { act(() => mounted.unmount()); container.remove(); }
});
it('does not treat a logo without a home destination as navigation', async () => {
  const access = createNoteAccess(); const api = core(); const navigate = vi.fn(() => true); const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
  render(<MantineProvider env="test"><NoteHostProvider api={api} host={{ access, destinations: {}, onNavigate: navigate }}><Workspace api={api}/></NoteHostProvider></MantineProvider>);
  fireEvent.change(await screen.findByDisplayValue('Independent document'), { target: { value: 'Dirty logo draft' } });
  fireEvent.click(screen.getByLabelText('Knowledge Engine 홈'));
  expect(confirm).not.toHaveBeenCalled(); expect(navigate).not.toHaveBeenCalled();
  expect(screen.getByDisplayValue('Dirty logo draft')).toBeTruthy();
});
it.each(['context', 'files', 'relations', 'relationTargets'] as const)('awaits the actual %s projection before completing host refresh', async kind => {
  let hold = false; let started = false; let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  const wait = async () => { if (hold) { started = true; await gate; } };
  const context: NoteKnowledgeContextApi = {
    provenance: async () => { await wait(); return { sources: [{ revisionId: 'source', spaceId: 'space', title: 'Projection source' }], rules: [], reviews: [], actions: [] }; },
    accumulations: async () => ({ items: [], nextCursor: null }), currentKnowledge: async () => ({ noteId: 'note', revision: 1, bodyOrigin: 'HUMAN', items: [], nextCursor: null }),
    accumulationChange: async () => { throw new Error('No comparison selected'); },
  };
  const relations: NoteRelationsApi = {
    findRelationNotes: async noteId => { if (kind === 'relationTargets') await wait(); return { noteId, total: 0, items: [], nextCursor: null }; },
    relations: async () => { if (kind === 'relations') await wait(); return { items: [], nextCursor: null }; }, relationEvidence: async () => ({ items: [], nextCursor: null }), relate: async () => {}, decideRelation: async () => {},
  };
  const view = show(context, relations);
  view.client.files = async () => { await wait(); return { items: [], nextCursor: null }; };
  const editor = await screen.findByDisplayValue('Independent document');
  fireEvent.change(editor, { target: { value: 'Draft survives awaited refresh' } });
  if (kind === 'context') { fireEvent.click(screen.getByRole('button', { name: '지식 정보' })); await screen.findByText('Projection source'); }
  else if (kind === 'files') {
    fireEvent.click(screen.getByRole('button', { name: '댓글 및 노트 상세' }));
    fireEvent.click(await screen.findByRole('tab', { name: /^첨부$/ })); await screen.findByText('현재 볼 수 있는 첨부파일이 없습니다.');
  } else {
    fireEvent.click(screen.getByRole('button', { name: '페이지 메뉴' })); fireEvent.click(await screen.findByRole('menuitem', { name: /^관계$/ })); await screen.findByText('아직 관계가 없습니다.');
  }
  hold = true; let finished = false; let pending!: Promise<void>;
  act(() => { pending = view.access.refresh().then(() => { finished = true; }); });
  try {
    await waitFor(() => expect(started).toBe(true));
    await act(async () => { await Promise.resolve(); });
    expect(finished).toBe(false);
  } finally { await act(async () => { release(); await pending; }); }
  expect(finished).toBe(true);
  expect(screen.getByDisplayValue('Draft survives awaited refresh')).toBe(editor);
});
it('reports an optional projection failure through refresh while retaining its truthful panel error and core draft', async () => {
  let fail = false;
  const context: NoteKnowledgeContextApi = {
    provenance: async () => { if (fail) throw new Error('Projection refresh unavailable'); return { sources: [], rules: [], reviews: [], actions: [] }; },
    accumulations: async () => ({ items: [], nextCursor: null }), currentKnowledge: async () => ({ noteId: 'note', revision: 1, bodyOrigin: 'HUMAN', items: [], nextCursor: null }), accumulationChange: async () => { throw new Error('No comparison selected'); },
  };
  const view = show(context); fireEvent.change(await screen.findByDisplayValue('Independent document'), { target: { value: 'Draft after failed refresh' } });
  fireEvent.click(screen.getByRole('button', { name: '지식 정보' })); await screen.findByText('반영된 원본이 없습니다.');
  fail = true;
  await act(async () => { await expect(view.access.refresh()).rejects.toThrow('Projection refresh unavailable'); });
  expect(await screen.findByText('Projection refresh unavailable')).toBeTruthy();
  expect(screen.getByDisplayValue('Draft after failed refresh')).toBeTruthy();
});
it('keeps the same dirty core editor usable after an automatic epoch refresh encounters optional denial', async () => {
  let epoch = 1; let denied = false;
  const api = { ...core(), spaces: async () => [{ id: 'space', name: 'Independent workspace', accessEpoch: epoch, myRole: 'OWNER' as const }] };
  const context: NoteKnowledgeContextApi = {
    provenance: async () => { if (denied) throw new ApiError('Optional provenance denied', 'FORBIDDEN'); return { sources: [], rules: [], reviews: [], actions: [] }; },
    accumulations: async () => ({ items: [], nextCursor: null }), currentKnowledge: async () => ({ noteId: 'note', revision: 1, bodyOrigin: 'HUMAN', items: [], nextCursor: null }), accumulationChange: async () => { throw new Error('No comparison selected'); },
  };
  render(<MantineProvider env="test"><NoteHostProvider api={api} knowledgeContext={context} host={{ access: createNoteAccess(), destinations: {} }}><Workspace api={api}/></NoteHostProvider></MantineProvider>);
  const editor = await screen.findByRole('textbox', { name: 'Draft title' });
  fireEvent.change(editor, { target: { value: 'Epoch refresh preserves my draft' } });
  fireEvent.click(screen.getByRole('button', { name: '지식 정보' })); await screen.findByText('반영된 원본이 없습니다.');
  denied = true; epoch = 2; fireEvent.focus(window);
  await screen.findByText('Optional provenance denied');
  await waitFor(() => expect(screen.getByRole('textbox', { name: 'Draft title' })).toBe(editor));
  expect(screen.queryByRole('button', { name: '접근 권한 다시 확인' })).toBeNull();
  fireEvent.change(editor, { target: { value: 'Still editable after optional denial' } });
  fireEvent.click(screen.getByRole('button', { name: '저장' }));
  await waitFor(() => expect(screen.getByRole('button', { name: '저장' })).toHaveProperty('disabled', true));
  expect(screen.getByDisplayValue('Still editable after optional denial')).toBe(editor);
  expect(screen.getByText('Optional provenance denied')).toBeTruthy();
});
it.each(['NETWORK', 'ACCESS_DENIED'] as const)('does not suppress a core %s failure when optional projections also fail during an epoch refresh', async code => {
  let epoch = 1; let fail = false;
  const api = {
    ...core(), spaces: async () => [{ id: 'space', name: 'Independent workspace', accessEpoch: epoch, myRole: 'OWNER' as const }],
    note: async () => { if (fail) { await Promise.resolve(); throw new ApiError('Core note verification unavailable', code); } return note; },
  };
  const context: NoteKnowledgeContextApi = {
    provenance: async () => { if (fail) throw new ApiError('Optional provenance denied', 'FORBIDDEN'); return { sources: [], rules: [], reviews: [], actions: [] }; },
    accumulations: async () => ({ items: [], nextCursor: null }), currentKnowledge: async () => ({ noteId: 'note', revision: 1, bodyOrigin: 'HUMAN', items: [], nextCursor: null }), accumulationChange: async () => { throw new Error('No comparison selected'); },
  };
  render(<MantineProvider env="test"><NoteHostProvider api={api} knowledgeContext={context} host={{ access: createNoteAccess(), destinations: {} }}><Workspace api={api}/></NoteHostProvider></MantineProvider>);
  const editor = await screen.findByRole('textbox', { name: 'Draft title' });
  fireEvent.change(editor, { target: { value: 'Protected core draft' } });
  fireEvent.click(screen.getByRole('button', { name: '지식 정보' })); await screen.findByText('반영된 원본이 없습니다.');
  fail = true; epoch = 2; fireEvent.focus(window);
  if (code === 'ACCESS_DENIED') await waitFor(() => expect(screen.queryByDisplayValue('Protected core draft')).toBeNull());
  else { await screen.findByText(/Core note verification unavailable/); expect(screen.getByDisplayValue('Protected core draft')).toBe(editor); }
  expect(screen.queryByRole('textbox', { name: 'Draft title' })).toBeNull();
});
