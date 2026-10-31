// @vitest-environment jsdom
import { useState } from 'react';
import { MantineProvider } from '@mantine/core';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { ApiError, createNoteAccess } from './access';
import { NoteHostProvider, useRelations } from './hostRuntime';
import { NotePicker } from './NotePicker';
import type { NoteCoreApi, NoteRelationsApi, NoteSummary, RelationTargetPage } from './model';

beforeEach(() => {
  vi.useFakeTimers();
  Object.defineProperty(window, 'matchMedia', { configurable: true, value: vi.fn(() => ({ matches: false, addEventListener() {}, removeEventListener() {} })) });
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); });
async function tick() { await act(async () => { await vi.advanceTimersByTimeAsync(300); }); }
const refreshed: RelationTargetPage = { noteId: 'anchor', total: 1, items: [{ id: 'current', title: 'Installed current target' }], nextCursor: null };

it.each([
  ['selected', 'success'], ['selected', 'denied'], ['paged', 'success'], ['paged', 'denied'],
] as const)('awaits the installed %s nonempty-query replacement, including %s', async (mode, outcome) => {
  let revalidating = false; let replacementStarted = false;
  let resolve!: (page: RelationTargetPage) => void; let reject!: (error: Error) => void;
  const gate = new Promise<RelationTargetPage>((yes, no) => { resolve = yes; reject = no; });
  const core = { findNotes: async () => { throw new Error('Relation selection must use its authorized API'); } } as unknown as NoteCoreApi;
  const relations = { findRelationNotes: async (_id: string, _query: string, cursor: string | null) => {
    if (!revalidating) return cursor
      ? { noteId: 'anchor', total: 21, items: [{ id: 'later', title: 'Later target' }], nextCursor: null }
      : { noteId: 'anchor', total: 21, items: [{ id: 'choice', title: 'Chosen private target' }], nextCursor: '20' };
    const oldSelectionOrPage = mode === 'selected' ? screen.queryByText('Chosen private target') : screen.queryByText('2페이지');
    if (oldSelectionOrPage) return { ...refreshed, items: [{ id: 'discarded', title: 'Response before selection/page reset' }] };
    replacementStarted = true; return gate;
  } } as unknown as NoteRelationsApi;
  const access = createNoteAccess();
  function Picker() {
    const [selected, select] = useState<NoteSummary | null>(null); const api = useRelations()!;
    return <NotePicker api={core} relations={api} spaceId="space" relationNoteId="anchor" label="Relation target" selected={selected} onSelect={select}/>;
  }
  render(<MantineProvider env="test"><NoteHostProvider api={core} relations={relations} host={{ access, destinations: {} }}><Picker/></NoteHostProvider></MantineProvider>);
  await tick(); fireEvent.change(screen.getByLabelText('Relation target'), { target: { value: 'private' } }); await tick();
  if (mode === 'selected') fireEvent.click(screen.getByRole('button', { name: 'Chosen private target' }));
  else { fireEvent.click(screen.getByRole('button', { name: '다음 대상' })); await tick(); expect(screen.getByText('2페이지')).toBeTruthy(); }
  revalidating = true; let finished = false; let pending!: Promise<{ error: unknown }>;
  act(() => { pending = access.refresh().then(() => { finished = true; return { error: null }; }, error => { finished = true; return { error }; }); });
  try {
    await tick(); expect(replacementStarted).toBe(true); expect(finished).toBe(false);
    await act(async () => { if (outcome === 'denied') reject(new ApiError('Current target search denied', 'FORBIDDEN')); else resolve(refreshed); });
    const result = await pending;
    if (outcome === 'denied') {
      expect(result.error).toMatchObject({ message: 'Current target search denied', code: 'FORBIDDEN' });
      expect(screen.getByRole('alert').textContent).toBe('Current target search denied');
      expect(screen.queryByText('연결 가능한 노트를 찾지 못했습니다.')).toBeNull();
    } else {
      expect(result.error).toBeNull(); expect(screen.getByRole('button', { name: 'Installed current target' })).toBeTruthy();
      expect(screen.getByRole('button', { name: '이전 대상' })).toHaveProperty('disabled', true);
    }
    expect((screen.getByLabelText('Relation target') as HTMLInputElement).value).toBe('private');
    expect(screen.queryByText('Response before selection/page reset')).toBeNull();
    expect(screen.queryByText('Later target')).toBeNull();
  } finally { await act(async () => { resolve(refreshed); await pending; }); }
});

it('starts a pending typed query immediately on refresh and does not leave a later debounce read outside completion', async () => {
  let release!: (page: RelationTargetPage) => void;
  const gate = new Promise<RelationTargetPage>(resolve => { release = resolve; });
  let typedReads = 0;
  const relations = { findRelationNotes: async (_id: string, query: string) => { if (query) { typedReads++; return gate; } return { noteId: 'anchor', total: 0, items: [], nextCursor: null }; } } as unknown as NoteRelationsApi;
  const core = {} as NoteCoreApi; const access = createNoteAccess();
  function Picker() { const api = useRelations()!; return <NotePicker api={core} relations={api} spaceId="space" relationNoteId="anchor" label="Relation target" selected={null} onSelect={() => {}}/>; }
  render(<MantineProvider env="test"><NoteHostProvider api={core} relations={relations} host={{ access, destinations: {} }}><Picker/></NoteHostProvider></MantineProvider>);
  await tick(); fireEvent.change(screen.getByLabelText('Relation target'), { target: { value: 'new query' } });
  expect(typedReads).toBe(0); let finished = false; let pending!: Promise<void>;
  act(() => { pending = access.refresh().then(() => { finished = true; }); });
  try {
    expect(typedReads).toBe(1); expect(finished).toBe(false); await tick(); expect(typedReads).toBe(1);
    await act(async () => { release(refreshed); await pending; });
    expect(screen.getByRole('button', { name: 'Installed current target' })).toBeTruthy();
  } finally { await act(async () => { release(refreshed); await pending; }); }
});
