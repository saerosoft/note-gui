import { expect, test } from '@playwright/test';
import type { SetNoteAssociation, NoteContentAccess } from '../src/collaboration';

declare global { interface Window { collaborationWrites: SetNoteAssociation[]; nextPolicy: NoteContentAccess; releasePolicySave: () => void } }

for (const width of [1600, 390]) test(`offers shared creation and bounded associations with original attribution at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 1000 });
  await page.goto('./'); await page.waitForFunction(() => !!window.noteExample);
  const ids = await page.evaluate(async () => {
    const { api } = window.noteExample;
    const anchor = await api.create({ spaceId: 'local', title: 'Shared anchor', parentId: null, visibility: 'PRIVATE', idempotencyKey: crypto.randomUUID() });
    const target = await api.create({ spaceId: 'local', title: 'Shared organization target', parentId: null, visibility: 'PRIVATE', idempotencyKey: crypto.randomUUID() });
    return { anchor: anchor.id, target: target.id };
  });
  await page.goto(`?space=local&note=${ids.anchor}`); await page.waitForFunction(() => !!window.noteExample);
  await page.evaluate(async ids => {
    const entry = '/note-gui/note-gui.js'; const gui: typeof import('../src/index') = await import(entry);
    const { api, host, mounted } = window.noteExample; mounted.unmount(); window.collaborationWrites = [];
    let state: import('../src/collaboration').NoteAssociationState | null = null;
    const client = { ...api, spaces: async () => (await api.spaces()).map(space => ({ ...space, myRole: 'VIEWER' as const })) };
    window.noteExample.mounted = gui.mountNoteCoreGui(document.getElementById('notes')!, {
      api: client, host,
      policy: { contentAccess: async spaceId => ({ organizationId: 'test-organization', spaceId, mode: 'SHARED', policyRevision: 1, accessEpoch: '9007199254740993123', capabilities: { read: true, write: true, review: true, manageSource: true, manageRule: true } }) },
      associations: {
        targets: async (noteId, query, cursor) => ({ noteId, total: state?.linked ? 0 : 21, nextCursor: !state?.linked && cursor === null ? '20' : null, items: state?.linked || cursor === null ? [] : [{ id: ids.target, title: 'Shared organization target', revision: 1, bodyOrigin: 'HUMAN', updatedAt: '2026-11-01T00:00:00Z' }] }),
        list: async noteId => ({ noteId, total: state?.linked ? 1 : 0, nextCursor: null, items: state?.linked ? [{ id: 'retained-link', revision: state.revision, targetNoteId: ids.target, targetNoteRevision: 1, title: 'Shared organization target', authoredBody: 'Authorized authored preview.', authoredBodyTruncated: false, bodyOrigin: 'HUMAN', creatorId: 'original-creator', creatorName: null, createdAt: '2026-11-01T00:00:00Z', updatedAt: '2026-11-01T00:00:00Z' }] : [] }),
        state: async () => state,
        set: async (noteId, input) => { window.collaborationWrites.push(input); state = { id: 'retained-link', noteId, targetNoteId: input.targetNoteId, revision: input.expectedRevision + 1, linked: input.linked }; return state; },
      },
    });
  }, ids);
  const pane = page.getByRole('region', { name: '왼쪽 편집 창', exact: true });
  await expect(pane.locator('.note-body-status')).toContainText('조직 구성원 공유');
  await expect(pane.locator('.note-body-status')).not.toContainText('나만 보기');
  await pane.getByRole('button', { name: '페이지 메뉴', exact: true }).click();
  await pane.getByRole('menuitem', { name: '노트 연결', exact: true }).click();
  const panel = pane.getByRole('region', { name: '노트 연결', exact: true });
  await expect(panel.getByRole('button', { name: '대상 다음', exact: true })).toBeEnabled();
  await panel.getByRole('button', { name: '대상 다음', exact: true }).click();
  await panel.getByRole('button', { name: 'Shared organization target', exact: true }).click();
  await panel.getByRole('button', { name: '연결', exact: true }).click();
  await expect(panel.getByText('작성자: original-creator · 연결 개정 1', { exact: true })).toBeVisible();
  await panel.getByRole('button', { name: '연결 해제', exact: true }).click();
  await expect(panel.getByText('연결된 노트가 없습니다.', { exact: true })).toBeVisible();
  const writes = await page.evaluate(() => window.collaborationWrites);
  expect(writes.map(value => [value.targetNoteId, value.expectedRevision, value.linked])).toEqual([[ids.target, 0, true], [ids.target, 1, false]]);
  expect(writes[0].requestId).not.toBe(writes[1].requestId);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: `.tmp/collaboration-${width}.png`, fullPage: true });
});

test('fences a delayed save across an opaque policy epoch change without replacing the dirty editor', async ({ page }) => {
  await page.goto('./'); await page.waitForFunction(() => !!window.noteExample);
  const id = await page.evaluate(async () => (await window.noteExample.api.create({ spaceId: 'local', title: 'Policy epoch document', parentId: null, visibility: 'PRIVATE', idempotencyKey: crypto.randomUUID() })).id);
  await page.goto(`?space=local&note=${id}`); await page.waitForFunction(() => !!window.noteExample);
  await page.evaluate(async () => {
    const entry = '/note-gui/note-gui.js'; const gui: typeof import('../src/index') = await import(entry);
    const { api, host, mounted } = window.noteExample; mounted.unmount();
    const wait = new Promise<void>(resolve => { window.releasePolicySave = resolve; });
    window.nextPolicy = { organizationId: 'test-organization', spaceId: 'local', mode: 'SHARED', policyRevision: 1, accessEpoch: '9007199254740993123', capabilities: { read: true, write: true, review: true, manageSource: true, manageRule: true } };
    window.noteExample.mounted = gui.mountNoteCoreGui(document.getElementById('notes')!, { api: { ...api, save: async (id, input) => { const result = await api.save(id, input); await wait; return result; } }, host, policy: { contentAccess: async () => structuredClone(window.nextPolicy) } });
  });
  const body = page.getByRole('textbox', { name: '노트 본문', exact: true });
  await body.fill('Saved while acknowledgement is held.');
  const original = await body.elementHandle();
  await page.getByRole('button', { name: '저장', exact: true }).click();
  await expect.poll(() => page.evaluate(id => window.noteExample.api.note(id).then(note => note.revision), id)).toBe(2);
  await page.evaluate(() => { window.nextPolicy.accessEpoch = '9007199254740993124'; window.nextPolicy.capabilities.write = false; window.dispatchEvent(new Event('focus')); });
  await expect(body).not.toHaveAttribute('contenteditable', 'true');
  await page.evaluate(() => window.releasePolicySave());
  await expect(body).toHaveText('Saved while acknowledgement is held.');
  expect(await body.evaluate((element, handle) => element === handle, original)).toBe(true);
  expect(await page.evaluate(() => window.noteExample.mounted.hasUnsavedChanges())).toBe(true);
  await expect(page.getByRole('button', { name: '저장', exact: true })).toBeDisabled();
});
