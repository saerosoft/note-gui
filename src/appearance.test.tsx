// @vitest-environment jsdom
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { JSONContent } from '@tiptap/core';
import { createNoteAccess } from './access';
import { mountNoteCoreGui, type MountedNoteGui } from './index';
import type { Note, NoteCoreApi } from './model';
import { normalizeNoteAppearance } from './appearance';

vi.mock('./vendor/docmost/client/pages/page/page', () => ({
  default: ({ header, editor, panels }: {
    header: React.ReactNode;
    editor: { title: string; content?: JSONContent; onTitleChange: (title: string) => void; byline: React.ReactNode };
    panels: React.ReactNode;
  }) => <>{header}<input aria-label="Draft title" value={editor.title} onChange={event => editor.onTitleChange(event.target.value)}/>{editor.byline}{panels}</>,
}));

const note: Note = {
  id: 'note-1',
  spaceId: 'space',
  title: 'Appearance note',
  revision: 1,
  bodyJson: { type: 'doc', content: [] },
  visibility: 'SPACE',
  canEdit: true,
  parentId: null,
};

function createCoreApi(): NoteCoreApi {
  return {
    spaces: async () => [{ id: 'space', name: 'Design workspace', accessEpoch: 1, myRole: 'OWNER' }],
    tree: async () => ({ items: [{ id: note.id, title: note.title, parentId: null, hasChildren: false, revision: note.revision }], nextCursor: null }),
    ancestors: async () => [],
    note: async () => note,
    findNotes: async () => [{ id: 'note-2', title: 'Found in sidebar search' }],
    create: async () => note,
    save: async (_id, input) => ({ ...note, title: input.title, revision: 2 }),
    move: async () => {},
    history: async () => ({ items: [], nextCursor: null }),
    restore: async () => note,
    comments: async () => ({ items: [], nextCursor: null }),
    comment: async () => {},
    properties: async () => [],
    setProperties: async () => {},
    deleteProperty: async () => {},
    files: async () => ({ items: [], nextCursor: null }),
    upload: async () => ({ attachmentId: 'file', revision: 1, name: 'a.png', mimeType: 'image/png' }),
    attachment: async () => new Blob(['bytes']),
  };
}

let container: HTMLDivElement;
let mounted: MountedNoteGui | undefined;

beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute('data-mantine-color-scheme');
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: vi.fn((query: string) => ({
      matches: query.includes('prefers-color-scheme: dark'),
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  });
  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', { configurable: true, value: vi.fn() });
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
  window.history.replaceState(null, '', '/notes?space=space&note=note-1');
  container = document.createElement('div');
  document.body.append(container);
});

afterEach(() => {
  if (mounted) {
    act(() => mounted!.unmount());
    mounted = undefined;
  }
  container.remove();
  localStorage.clear();
  document.documentElement.removeAttribute('data-mantine-color-scheme');
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  window.history.replaceState(null, '', '/');
});

it('validates appearance options before mounting and on live updates', () => {
  expect(normalizeNoteAppearance()).toEqual({ colorScheme: undefined, chrome: 'full' });
  expect(normalizeNoteAppearance({ colorScheme: 'dark', chrome: 'embedded' })).toEqual({ colorScheme: 'dark', chrome: 'embedded' });
  expect(() => normalizeNoteAppearance({ colorScheme: 'sepia' as unknown as 'dark' })).toThrow(RangeError);
  expect(() => normalizeNoteAppearance({ chrome: 'minimal' as unknown as 'embedded' })).toThrow(RangeError);

  const api = createCoreApi();
  const access = createNoteAccess();
  expect(() => mountNoteCoreGui(container, {
    api,
    host: { access, destinations: {} },
    appearance: { chrome: 'unknown' as unknown as 'embedded' },
  })).toThrow(RangeError);
  expect(container.childElementCount).toBe(0);
});

it('applies host colorScheme without reading or writing localStorage and ignores OS preference', async () => {
  localStorage.setItem('mantine-color-scheme-value', 'light');
  const setItem = vi.spyOn(Storage.prototype, 'setItem');
  const api = createCoreApi();
  const access = createNoteAccess();

  await act(async () => {
    mounted = mountNoteCoreGui(container, {
      api,
      host: { access, destinations: { home: '/home' } },
      appearance: { colorScheme: 'dark' },
    });
  });

  await screen.findByDisplayValue('Appearance note');
  expect(document.documentElement.getAttribute('data-mantine-color-scheme')).toBe('dark');
  expect(localStorage.getItem('mantine-color-scheme-value')).toBe('light');
  expect(setItem).not.toHaveBeenCalled();

  await act(async () => {
    mounted!.setAppearance({ colorScheme: 'light' });
  });
  expect(document.documentElement.getAttribute('data-mantine-color-scheme')).toBe('light');
  expect(localStorage.getItem('mantine-color-scheme-value')).toBe('light');
  expect(setItem).not.toHaveBeenCalled();
});

it('keeps existing uncontrolled light default when colorScheme is omitted', async () => {
  const api = createCoreApi();
  const access = createNoteAccess();

  await act(async () => {
    mounted = mountNoteCoreGui(container, {
      api,
      host: { access, destinations: { home: '/home' } },
    });
  });

  await screen.findByDisplayValue('Appearance note');
  expect(document.documentElement.getAttribute('data-mantine-color-scheme')).toBe('light');
  expect(container.querySelector('header')).not.toBeNull();
  expect(screen.getByRole('link', { name: /^홈$/ })).toBeTruthy();
});

it('updates colorScheme and chrome live via setAppearance without remounting or losing unsaved edits', async () => {
  localStorage.setItem('mantine-color-scheme-value', 'light');
  const api = createCoreApi();
  const access = createNoteAccess();

  await act(async () => {
    mounted = mountNoteCoreGui(container, {
      api,
      host: { access, destinations: { home: '/home', resolve: dest => dest.kind === 'ask' ? '/ask' : undefined } },
      appearance: { colorScheme: 'light', chrome: 'full' },
    });
  });

  const editor = await screen.findByLabelText<HTMLInputElement>('Draft title');
  fireEvent.change(editor, { target: { value: 'Unsaved live appearance edit' } });
  expect(mounted!.hasUnsavedChanges()).toBe(true);
  expect(container.querySelector('header')).not.toBeNull();

  await act(async () => {
    mounted!.setAppearance({ colorScheme: 'dark', chrome: 'embedded' });
  });

  expect(document.documentElement.getAttribute('data-mantine-color-scheme')).toBe('dark');
  expect(container.querySelector('header')).toBeNull();
  expect(screen.queryByRole('link', { name: /^홈$/ })).toBeNull();
  expect(screen.getByLabelText<HTMLInputElement>('Draft title')).toBe(editor);
  expect(editor.value).toBe('Unsaved live appearance edit');
  expect(mounted!.hasUnsavedChanges()).toBe(true);
  expect(localStorage.getItem('mantine-color-scheme-value')).toBe('light');

  // Invalid live updates throw without altering the active appearance or draft.
  expect(() => mounted!.setAppearance({ colorScheme: 'solarized' as unknown as 'dark' })).toThrow(RangeError);
  expect(() => mounted!.setAppearance({ chrome: 'compact' as unknown as 'embedded' })).toThrow(RangeError);
  expect(document.documentElement.getAttribute('data-mantine-color-scheme')).toBe('dark');
  expect(container.querySelector('header')).toBeNull();
  expect(editor.value).toBe('Unsaved live appearance edit');

  // Switch back to uncontrolled full mode; stored light preference returns and draft remains.
  await act(async () => {
    mounted!.setAppearance({});
  });

  await waitFor(() => expect(document.documentElement.getAttribute('data-mantine-color-scheme')).toBe('light'));
  expect(container.querySelector('header')).not.toBeNull();
  expect(screen.getByLabelText<HTMLInputElement>('Draft title')).toBe(editor);
  expect(editor.value).toBe('Unsaved live appearance edit');
  expect(mounted!.hasUnsavedChanges()).toBe(true);

  // Post-unmount setAppearance is a safe no-op.
  const retired = mounted!;
  act(() => retired.unmount());
  mounted = undefined;
  expect(() => retired.setAppearance({ colorScheme: 'dark', chrome: 'embedded' })).not.toThrow();
  expect(document.documentElement.getAttribute('data-mantine-color-scheme')).toBe('light');
});

it('removes app header and Ctrl+K hijack in embedded chrome while keeping sidebar toggle, split toggle, sidebar search, ask link and document toolbar reachable', async () => {
  const api = createCoreApi();
  const access = createNoteAccess();

  await act(async () => {
    mounted = mountNoteCoreGui(container, {
      api,
      host: {
        access,
        destinations: {
          home: '/home',
          resolve: dest => dest.kind === 'ask' ? `/spaces/${dest.spaceId}/ask` : undefined,
        },
      },
      appearance: { colorScheme: 'dark', chrome: 'embedded' },
    });
  });

  const editor = await screen.findByLabelText<HTMLInputElement>('Draft title');
  fireEvent.change(editor, { target: { value: 'Embedded draft' } });

  // App header chrome is removed.
  expect(container.querySelector('header')).toBeNull();
  expect(screen.queryByLabelText('Knowledge Engine 홈')).toBeNull();
  expect(screen.queryByRole('link', { name: /^홈$/ })).toBeNull();

  // Ctrl+K is NOT hijacked by Note GUI in embedded mode so host search shortcut stays intact.
  const keyEvent = new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, cancelable: true });
  window.dispatchEvent(keyEvent);
  expect(keyEvent.defaultPrevented).toBe(false);
  expect(screen.queryByRole('dialog', { name: '노트 검색' })).toBeNull();

  // Document toolbar stays intact.
  expect(screen.getByRole('button', { name: '최신 버전 확인' })).toBeTruthy();
  expect(screen.getByRole('button', { name: /^저장$/ })).toBeTruthy();
  expect(screen.getByRole('button', { name: '댓글 및 노트 상세' })).toBeTruthy();
  expect(screen.getByRole('button', { name: '페이지 메뉴' })).toBeTruthy();

  // Navbar toggle stays reachable in the tab strip without losing edits.
  const navToggles = screen.getAllByRole('button', { name: '페이지 탐색' });
  const desktopToggle = navToggles.find(button => button.getAttribute('aria-expanded') === 'true') ?? navToggles[0];
  fireEvent.click(desktopToggle);
  expect(desktopToggle.getAttribute('aria-expanded')).toBe('false');
  expect(screen.getByLabelText<HTMLInputElement>('Draft title')).toBe(editor);
  fireEvent.click(desktopToggle);
  expect(desktopToggle.getAttribute('aria-expanded')).toBe('true');

  // Split toggle stays reachable in the tab strip.
  fireEvent.click(screen.getByRole('button', { name: '두 창으로' }));
  expect(screen.getByRole('button', { name: '한 창으로' })).toBeTruthy();
  expect(screen.getByLabelText('오른쪽 편집 창')).toBeTruthy();

  // Ask link and space-scoped note search remain reachable in the sidebar.
  const nav = screen.getByRole('navigation', { name: '공간 탐색' });
  const askLink = within(nav).getByRole('link', { name: 'AI 대화' });
  expect(askLink.getAttribute('href')).toBe('/spaces/space/ask');
  fireEvent.click(within(nav).getByRole('button', { name: '검색' }));
  expect(await screen.findByRole('dialog', { name: '노트 검색' })).toBeTruthy();
});
