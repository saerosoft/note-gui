import { expect, test } from '@playwright/test';
import type { MountedNoteGui } from '../src/host';

declare global { interface Window { dirtyEvents: boolean[]; otherMount: MountedNoteGui } }

test('reports body, comment and property drafts across panes until the last draft is saved', async ({ page }) => {
  await page.goto('./'); await page.waitForFunction(() => !!window.noteExample);
  const ids = await page.evaluate(async () => {
    const { api } = window.noteExample;
    const left = await api.create({ spaceId: 'local', title: 'Left dirty contract', parentId: null, visibility: 'PRIVATE', idempotencyKey: crypto.randomUUID() });
    const right = await api.create({ spaceId: 'local', title: 'Right dirty contract', parentId: null, visibility: 'PRIVATE', idempotencyKey: crypto.randomUUID() });
    return { left: left.id, right: right.id };
  });
  await page.goto(`?space=local&note=${ids.left}&right=${ids.right}`);
  await page.waitForFunction(() => !!window.noteExample);
  await page.evaluate(async () => {
    const entry = '/note-gui/note-gui.js'; const gui: typeof import('../src/index') = await import(entry);
    const { api, host, mounted } = window.noteExample; mounted.unmount(); window.dirtyEvents = [];
    window.noteExample.mounted = gui.mountNoteCoreGui(document.getElementById('notes')!, { api, host, onDirtyChange: value => window.dirtyEvents.push(value) });
  });
  expect(await page.evaluate(() => typeof window.noteExample.mounted.hasUnsavedChanges)).toBe('function');
  const left = page.getByRole('region', { name: '왼쪽 편집 창', exact: true });
  const right = page.getByRole('region', { name: '오른쪽 편집 창', exact: true });
  await expect(left.getByRole('textbox', { name: '노트 본문', exact: true })).toBeVisible();
  expect(await page.evaluate(() => window.noteExample.mounted.hasUnsavedChanges())).toBe(false);
  await left.getByRole('textbox', { name: '노트 본문', exact: true }).fill('Retained body');
  await expect.poll(() => page.evaluate(() => window.noteExample.mounted.hasUnsavedChanges())).toBe(true);
  await right.getByRole('button', { name: '댓글 및 노트 상세', exact: true }).click();
  await right.getByRole('textbox', { name: '댓글', exact: true }).fill('Retained comment');
  await left.getByRole('button', { name: '저장', exact: true }).click();
  await expect(left.getByRole('button', { name: '저장', exact: true })).toBeDisabled();
  expect(await page.evaluate(() => window.noteExample.mounted.hasUnsavedChanges())).toBe(true);
  await left.getByRole('button', { name: '페이지 메뉴', exact: true }).click();
  await left.getByRole('menuitem', { name: '속성', exact: true }).click();
  await left.getByRole('button', { name: '속성 추가', exact: true }).click();
  await left.getByRole('textbox', { name: '속성 이름', exact: true }).fill('Pending property');
  await left.getByLabel('값', { exact: true }).fill('Retained value');
  await right.getByRole('button', { name: '댓글 남기기', exact: true }).click();
  await expect(right.getByText('Retained comment', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => window.noteExample.mounted.hasUnsavedChanges())).toBe(true);
  await left.getByRole('button', { name: '이 속성 저장', exact: true }).click();
  await expect.poll(() => page.evaluate(() => window.noteExample.mounted.hasUnsavedChanges())).toBe(false);
  expect(await page.evaluate(() => window.dirtyEvents)).toEqual([true, false]);
});

test('isolates native drafts by mount and clears reporting on revocation and idempotent disposal', async ({ page }) => {
  await page.goto('./'); await page.waitForFunction(() => !!window.noteExample);
  const id = await page.evaluate(async () => {
    const { api } = window.noteExample;
    const note = await api.create({ spaceId: 'local', title: 'Native dirty handle', parentId: null, visibility: 'PRIVATE', idempotencyKey: crypto.randomUUID() });
    await api.save(note.id, { title: note.title, expectedRevision: 1, idempotencyKey: crypto.randomUUID(), bodyJson: { type: 'doc', content: [{ type: 'mermaid', attrs: { source: 'graph TD\n Original --> Diagram' } }, { type: 'paragraph' }] } });
    return note.id;
  });
  await page.goto(`?space=local&note=${id}`); await page.waitForFunction(() => !!window.noteExample);
  await page.evaluate(async () => {
    const entry = '/note-gui/note-gui.js'; const gui: typeof import('../src/index') = await import(entry);
    const { api, host, mounted } = window.noteExample; mounted.unmount(); window.dirtyEvents = [];
    window.noteExample.mounted = gui.mountNoteCoreGui(document.getElementById('notes')!, { api, host, onDirtyChange: value => window.dirtyEvents.push(value) });
    const container = document.createElement('div'); container.id = 'other-notes'; document.body.append(container);
    window.otherMount = gui.mountNoteCoreGui(container, { api, host: { access: gui.createNoteAccess(), destinations: {} } });
  });
  expect(await page.evaluate(() => typeof window.noteExample.mounted.hasUnsavedChanges)).toBe('function');
  await page.locator('#notes').getByRole('button', { name: '원본 편집', exact: true }).click();
  await page.getByLabel('Mermaid 원본', { exact: true }).fill('graph TD\n Unsaved --> Source');
  await expect.poll(() => page.evaluate(() => window.noteExample.mounted.hasUnsavedChanges())).toBe(true);
  expect(await page.evaluate(() => window.otherMount.hasUnsavedChanges())).toBe(false);
  await page.evaluate(() => window.noteExample.access.revoke());
  await expect.poll(() => page.evaluate(() => window.noteExample.mounted.hasUnsavedChanges())).toBe(false);
  await expect(page.getByLabel('Mermaid 원본', { exact: true })).toHaveCount(0);
  await page.locator('#other-notes').getByRole('textbox', { name: '노트 본문', exact: true }).fill('Independent dirty mount');
  await expect.poll(() => page.evaluate(() => window.otherMount.hasUnsavedChanges())).toBe(true);
  await page.evaluate(() => { window.otherMount.unmount(); window.otherMount.unmount(); window.noteExample.mounted.unmount(); });
  expect(await page.evaluate(() => [window.noteExample.mounted.hasUnsavedChanges(), window.otherMount.hasUnsavedChanges(), window.dirtyEvents])).toEqual([false, false, [true, false]]);
});
