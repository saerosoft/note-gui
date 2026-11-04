// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { api } from '../api';
import type { Note, Revision } from '../model';
import { NotePanels } from '../NotePanels';
import { DocmostPaneProvider } from './DocmostPaneProvider';
import { AttachmentContext } from '../editor/attachmentContext';
import { HistoryEditor } from '../vendor/docmost/client/features/page-history/components/history-editor';

const body = (text: string) => ({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text }] }] });
const note: Note = { id: 'note', spaceId: 'space', title: 'Current', revision: 7, bodyOrigin: 'HUMAN', bodyJson: body('Current'), canEdit: true, visibility: 'PRIVATE', parentId: null };
const revisions: Revision[] = [2, 1].map(revision => ({ id: `revision-${revision}`, revision, title: `Title ${revision}`, createdAt: `2026-10-2${revision}T00:00:00Z`, bodyOrigin: 'HUMAN', bodyJson: body(revision === 2 ? 'New body' : 'Old body') }));
beforeEach(() => {
  Object.defineProperty(window, 'matchMedia', { configurable: true, value: vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })) });
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

function show(dirty = false) {
  const history = vi.fn().mockResolvedValue({ items: revisions, nextCursor: null });
  const restore = vi.fn().mockResolvedValue({ ...note, revision: 8 });
  const restored = vi.fn();
  render(<DocmostPaneProvider><NotePanels api={{ ...api, history, restore, comments: vi.fn().mockResolvedValue({ items: [], nextCursor: null }) }} note={note} dirty={dirty} onRestore={restored} onOpen={vi.fn()} onRevision={vi.fn()}/></DocmostPaneProvider>);
  fireEvent.click(screen.getByRole('tab', { name: '이력' }));
  return { history, restore, restored };
}

it.each(['comments', 'history'] as const)('passes an empty continuation through the %s load-more control', async panel => {
  const read = vi.fn().mockResolvedValueOnce({ items: panel === 'history' ? revisions : [], nextCursor: '' })
    .mockResolvedValueOnce({ items: [], nextCursor: null });
  const client = { ...api, comments: panel === 'comments' ? read : vi.fn().mockResolvedValue({ items: [], nextCursor: null }), history: panel === 'history' ? read : vi.fn().mockResolvedValue({ items: revisions, nextCursor: null }) };
  render(<DocmostPaneProvider><NotePanels api={client} note={note} dirty={false} panel={panel} onRestore={vi.fn()} onOpen={vi.fn()} onRevision={vi.fn()}/></DocmostPaneProvider>);
  fireEvent.click(await screen.findByRole('button', { name: panel === 'comments' ? '댓글 더 보기' : '이력 더 보기' }));
  await waitFor(() => expect(read).toHaveBeenLastCalledWith('note', ''));
  expect(read).toHaveBeenCalledTimes(2);
});

it.each([
  { panel: 'comments' as const, empty: '아직 댓글이 없습니다.' },
  { panel: 'history' as const, empty: '아직 저장된 페이지 기록이 없습니다.' },
])('distinguishes a failed $panel read from an empty success and retries only the read', async ({ panel, empty }) => {
  let unavailable = true;
  const read = async () => { if (unavailable) throw new Error('Projection unavailable'); return { items: [], nextCursor: null }; };
  const comment = vi.fn(); const restore = vi.fn();
  const client = { ...api, note: async () => note, comments: read, history: read, comment, restore };
  render(<DocmostPaneProvider><NotePanels api={client} note={note} dirty={false} panel={panel} onRestore={vi.fn()} onOpen={vi.fn()} onRevision={vi.fn()}/></DocmostPaneProvider>);
  await screen.findByRole('alert');
  expect(screen.queryByText(empty)).toBeNull();
  const draft = panel === 'comments' ? screen.getByRole('textbox', { name: '댓글' }) : null;
  if (draft) {
    await waitFor(() => expect(draft.getAttribute('contenteditable')).toBe('true'));
    draft.textContent = 'Keep this unsent comment'; fireEvent.input(draft);
    await waitFor(() => expect(screen.getByRole('button', { name: '댓글 남기기' }).hasAttribute('disabled')).toBe(false));
  }
  unavailable = false;
  fireEvent.click(screen.getByRole('button', { name: '노트 상세 다시 읽기' }));
  await screen.findByText(empty);
  expect(screen.queryByRole('alert')).toBeNull();
  if (draft) { expect(screen.getByRole('textbox', { name: '댓글' })).toBe(draft); expect(draft.textContent).toBe('Keep this unsent comment'); }
  expect(comment).not.toHaveBeenCalled(); expect(restore).not.toHaveBeenCalled();
});

it('renders the selected immutable revision in the real core history editor and restores through the current revision guard', async () => {
  const value = show(); vi.spyOn(window, 'confirm').mockReturnValue(true);
  const editor = await screen.findByRole('textbox', { name: '개정 원문' });
  expect(editor.textContent).toContain('New body');
  expect(editor.getAttribute('contenteditable')).toBe('false');
  fireEvent.click(screen.getByRole('button', { name: '복원' }));
  await waitFor(() => expect(value.restore).toHaveBeenCalledExactlyOnceWith('note', 2, 7));
  expect(value.restored).toHaveBeenCalledWith(expect.objectContaining({ revision: 8 }));
});
it('displays supplied revision editors without attributing an unknown editor to the current account', async () => {
  const history = async () => ({ items: [{ ...revisions[0], editorName: 'Peer editor' }, { ...revisions[1], editorName: null }], nextCursor: null });
  render(<DocmostPaneProvider><NotePanels api={{ ...api, history }} note={note} panel="history" dirty={false} onRestore={vi.fn()} onOpen={vi.fn()} onRevision={vi.fn()}/></DocmostPaneProvider>);
  await screen.findByText('편집자: Peer editor');
  expect(screen.getByText('편집자 정보 없음')).toBeTruthy();
  expect(screen.queryByText('편집자: 나')).toBeNull();
});

it('keeps the revision viewer read-only and blocks restore while the current pane has an unsaved draft', async () => {
  const value = show(true);
  await screen.findByRole('textbox', { name: '개정 원문' });
  expect(screen.getByRole('button', { name: '복원' }).getAttribute('disabled')).toBe('');
  fireEvent.click(screen.getByRole('button', { name: '복원' }));
  expect(value.restore).not.toHaveBeenCalled();
});

it('keeps history selection and comment drafts independent for the same note in two panes', async () => {
  const client = { ...api, history: vi.fn().mockResolvedValue({ items: revisions, nextCursor: null }), comments: vi.fn().mockResolvedValue({ items: [], nextCursor: null }) };
  function pane(id: string) { return <DocmostPaneProvider><section aria-label={id}><NotePanels api={client} note={note} dirty={false} onRestore={vi.fn()} onOpen={vi.fn()} onRevision={vi.fn()}/></section></DocmostPaneProvider>; }
  render(<>{pane('left')}{pane('right')}</>);
  const left = within(screen.getByRole('region', { name: 'left' }));
  const right = within(screen.getByRole('region', { name: 'right' }));
  const leftDraft = await left.findByRole('textbox', { name: '댓글' });
  await waitFor(() => expect(leftDraft.getAttribute('contenteditable')).toBe('true'));
  leftDraft.textContent = 'Only the left pane'; fireEvent.input(leftDraft);
  expect(right.getByRole('textbox', { name: '댓글' }).textContent).toBe('');
  fireEvent.click(left.getByRole('tab', { name: '이력' }));
  fireEvent.click(right.getByRole('tab', { name: '이력' }));
  await left.findByRole('textbox', { name: '개정 원문' }); await right.findByRole('textbox', { name: '개정 원문' });
  fireEvent.click(left.getByRole('button', { name: /개정 1 · Title 1/ }));
  await waitFor(() => expect(left.getByRole('textbox', { name: '개정 원문' }).textContent).toContain('Old body'));
  expect(right.getByRole('textbox', { name: '개정 원문' }).textContent).toContain('New body');
});

it('retains an unsent comment when switching contextual panels and hiding the entire sidebar', async () => {
  const client = { ...api, history: vi.fn().mockResolvedValue({ items: revisions, nextCursor: null }), comments: vi.fn().mockResolvedValue({ items: [], nextCursor: null }) };
  function panel(hidden: boolean) {
    return <DocmostPaneProvider><div hidden={hidden}><NotePanels api={client} note={note} dirty={false} onRestore={vi.fn()} onOpen={vi.fn()} onRevision={vi.fn()}/></div></DocmostPaneProvider>;
  }
  const view = render(panel(false));
  const comment = await screen.findByRole('textbox', { name: '댓글' });
  await waitFor(() => expect(comment.getAttribute('contenteditable')).toBe('true'));
  comment.textContent = 'Keep this unsent comment'; fireEvent.input(comment);
  fireEvent.click(screen.getByRole('tab', { name: '이력' }));
  await screen.findByRole('textbox', { name: '개정 원문' });
  expect(screen.queryByRole('textbox', { name: '댓글' })).toBeNull();
  fireEvent.click(screen.getByRole('tab', { name: '댓글' }));
  expect(screen.getByRole('textbox', { name: '댓글' }).textContent).toBe('Keep this unsent comment');
  view.rerender(panel(true));
  expect(screen.queryByRole('textbox', { name: '댓글' })).toBeNull();
  view.rerender(panel(false));
  expect(screen.getByRole('textbox', { name: '댓글' }).textContent).toBe('Keep this unsent comment');
});

const codeBody = (text: string) => ({ type: 'doc', content: [{ type: 'codeBlock', attrs: { language: 'typescript' }, content: [{ type: 'text', text }] }] });
function historyView(text: string, previous = 'const previous = 1;') {
  return <DocmostPaneProvider><AttachmentContext.Provider value={{ api, noteId: 'history-note', editable: false }}>
    <HistoryEditor title="Rich revision" content={codeBody(text)} previousContent={codeBody(previous)}/>
  </AttachmentContext.Provider></DocmostPaneProvider>;
}

function historyCodeText(document: HTMLElement, side: 'current' | 'previous') {
  const code = document.querySelector<HTMLElement>('pre code[data-node-view-content]');
  expect(code).not.toBeNull();
  const copy = code!.cloneNode(true) as HTMLElement;
  // Deleted widgets are comparison overlays, while added spans contain the current authored code.
  const excluded = side === 'current' ? '.history-diff-deleted, .history-diff-node-deleted' : '.history-diff-added, .history-diff-node-added';
  copy.querySelectorAll(excluded).forEach(node => node.remove());
  return copy.textContent;
}

it('renders and compares real React node views without flushing during a React lifecycle', async () => {
  const errors = vi.spyOn(console, 'error');
  try {
    const current = render(historyView('const current = 2;'));
    const document = await screen.findByRole('textbox', { name: '개정 원문' });
    await waitFor(() => expect(historyCodeText(document, 'current')).toBe('const current = 2;'));
    expect(historyCodeText(document, 'previous')).toBe('const previous = 1;');
    expect([...document.querySelectorAll('.history-diff-deleted')].map(node => node.textContent).join('')).toBe('previous1');
    expect(document.getAttribute('contenteditable')).toBe('false');
    current.rerender(historyView('const selected = 3;', 'const current = 2;'));
    await waitFor(() => expect(historyCodeText(document, 'current')).toBe('const selected = 3;'));
    expect(historyCodeText(document, 'previous')).toBe('const current = 2;');
    expect([...document.querySelectorAll('.history-diff-deleted')].map(node => node.textContent).join('')).toBe('current2');
    expect(errors.mock.calls.flat().map(String).join('\n')).not.toContain('flushSync was called from inside a lifecycle method');
  } finally { errors.mockRestore(); }
});

it('keeps the latest rapid history selection and cancels pending work on unmount', async () => {
  const errors = vi.spyOn(console, 'error');
  try {
    const current = render(historyView('const first = 1;'));
    current.rerender(historyView('const intermediate = 2;'));
    current.rerender(historyView('const last = 3;'));
    const document = await screen.findByRole('textbox', { name: '개정 원문' });
    await waitFor(() => expect(historyCodeText(document, 'current')).toBe('const last = 3;'));
    expect(historyCodeText(document, 'previous')).toBe('const previous = 1;');
    expect([...document.querySelectorAll('.history-diff-deleted')].map(node => node.textContent).join('')).toBe('previous1');
    expect(historyCodeText(document, 'current')).not.toContain('const intermediate = 2;');
    current.rerender(historyView('const cancelled = 4;'));
    current.unmount();
    await act(async () => { await Promise.resolve(); });
    expect(screen.queryByRole('textbox', { name: '개정 원문' })).toBeNull();
    expect(errors.mock.calls.flat().map(String).join('\n')).not.toContain('flushSync was called from inside a lifecycle method');
  } finally { errors.mockRestore(); }
});
