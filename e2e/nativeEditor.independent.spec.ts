import { expect, test } from '@playwright/test';
import { openToolbar } from './nativeControls';
import { readFile } from 'node:fs/promises';

for (const width of [1600, 390]) test(`keeps native modal portals inside correctly arranged split panes at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 1000 });
  await page.goto('./'); await page.waitForFunction(() => !!window.noteExample);
  const id = await page.evaluate(async () => {
    const api = window.noteExample.api;
    const note = await api.create({ spaceId: 'local', title: 'Native split layout', parentId: null, visibility: 'PRIVATE', idempotencyKey: crypto.randomUUID() });
    await api.save(note.id, { title: note.title, expectedRevision: 1, idempotencyKey: crypto.randomUUID(), bodyJson: { type: 'doc', content: [
      { type: 'paragraph', content: [{ type: 'text', text: 'Native split layout body.' }] },
      { type: 'mermaid', attrs: { source: 'graph TD\n Original --> Diagram' } },
      { type: 'drawio' }, { type: 'excalidraw' },
    ] } });
    return note.id;
  });
  await page.goto(`?space=local&note=${id}&right=${id}`);
  const panes = page.locator('.note-gui-pane');
  const left = panes.first();
  const right = panes.last().getByRole('textbox', { name: '노트 본문', exact: true });
  await expect(left.getByRole('button', { name: '원본 편집', exact: true })).toBeEnabled();
  await right.fill('Keep the independent layout draft.');
  await expect(right).toHaveText('Keep the independent layout draft.');
  const originalRight = await right.elementHandle();
  async function expectPaneLayout() {
    const boxes = await panes.evaluateAll(nodes => nodes.map(node => {
      const box = node.getBoundingClientRect();
      return { x: box.x, y: box.y, width: box.width, height: box.height, bottom: box.bottom };
    }));
    expect(boxes).toHaveLength(2);
    if (width === 1600) {
      expect(boxes[1].y).toBeCloseTo(boxes[0].y, 0);
      expect(boxes[1].x).toBeGreaterThanOrEqual(boxes[0].x + boxes[0].width - 1);
      expect(boxes.every(box => box.height >= 700)).toBe(true);
    } else {
      expect(boxes[1].x).toBeCloseTo(boxes[0].x, 0);
      expect(boxes[1].width).toBeCloseTo(boxes[0].width, 0);
      expect(boxes[1].y).toBeGreaterThanOrEqual(boxes[0].bottom - 1);
    }
  }
  await expectPaneLayout();
  await left.locator('.node-excalidraw').scrollIntoViewIfNeeded();
  await left.getByRole('button', { name: '드로잉 편집', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Excalidraw', exact: true });
  await expect(dialog).toBeVisible();
  await expect.poll(async () => {
    const box = await dialog.boundingBox();
    return box && Math.abs(box.x) < .5 && Math.abs(box.y) < .5 && Math.abs(box.width - width) < .5 && box.height >= 999;
  }).toBe(true);
  const modal = (await dialog.boundingBox())!;
  expect(modal.x).toBeCloseTo(0, 0); expect(modal.y).toBeCloseTo(0, 0);
  expect(modal.width).toBeCloseTo(width, 0); expect(modal.height).toBeGreaterThanOrEqual(999);
  await page.getByRole('button', { name: 'Excalidraw 닫기', exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await expectPaneLayout();
  await expect(right).toHaveText('Keep the independent layout draft.');
  expect(await right.evaluate((node, original) => node === original, originalRight)).toBe(true);
  await page.screenshot({ path: `.tmp/native-split-layout-${width}.png`, fullPage: true });
});

for (const width of [1600, 390]) test(`persists native slash, toolbar, table, link and upload edits at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 1000 });
  await page.goto('./'); await page.waitForFunction(() => !!window.noteExample);
  const note = await page.evaluate(() => window.noteExample.api.create({ spaceId: 'local', title: 'Native control document', parentId: null, visibility: 'PRIVATE', idempotencyKey: crypto.randomUUID() }));
  await page.goto(`?space=local&note=${note.id}`);
  const body = page.getByRole('textbox', { name: '노트 본문', exact: true });
  await expect(body).toBeVisible(); await body.click(); await body.press('/');
  await expect(page.getByRole('listbox', { name: '슬래시 명령어', exact: true })).toBeVisible();
  await body.pressSequentially('heading');
  await page.getByRole('option', { name: /제목 2/ }).click();
  await body.pressSequentially('Native section'); await body.press('Enter');
  await openToolbar(page);
  const toolbar = page.getByRole('toolbar', { name: 'Editor toolbar', exact: true });
  await toolbar.getByRole('button', { name: '굵게', exact: true }).click();
  await body.pressSequentially('Toolbar bold text');
  await toolbar.getByRole('button', { name: '굵게', exact: true }).click();
  await body.press('Enter'); await body.pressSequentially('Linked document'); await body.press('Shift+Home');
  await toolbar.getByRole('button', { name: '링크 추가', exact: true }).click();
  const link = page.getByRole('combobox', { name: '링크 추가', exact: true });
  await link.fill('https://example.org/native-evidence'); await link.press('Enter');
  await expect(link).not.toBeVisible();
  await toolbar.getByRole('button', { name: '링크 추가', exact: true }).click();
  await expect(link).toHaveValue(''); await link.press('Escape');
  await body.press('ArrowRight'); await body.press('End'); await body.press('Enter'); await body.pressSequentially('/code');
  await page.getByRole('option', { name: /코드.*코드/ }).click();
  await body.pressSequentially('const nativeValue = 7;'); await body.press('ArrowDown'); await body.press('ArrowDown');
  await body.press('Control+End'); await body.press('Enter'); await body.press('Enter'); await body.press('Enter');
  await toolbar.getByRole('button', { name: '표', exact: true }).click();
  await body.locator('th').first().click(); await page.keyboard.type('Header value');
  await body.locator('td').first().click(); await page.keyboard.type('Cell value');
  await body.press('Control+End'); await body.press('ArrowDown');
  await toolbar.getByRole('button', { name: '미디어 삽입', exact: true }).click();
  const choosing = page.waitForEvent('filechooser'); await page.getByRole('menuitem', { name: '파일 첨부', exact: true }).click();
  await (await choosing).setFiles({ name: 'native-control.txt', mimeType: 'text/plain', buffer: Buffer.from('Native upload bytes\n') });
  await expect(body.getByRole('link', { name: 'Download', exact: true })).toBeVisible();
  await page.getByRole('button', { name: '저장', exact: true }).click();
  await expect(page.getByRole('button', { name: '저장', exact: true })).toBeDisabled(); await page.reload();
  await expect(body.locator('h2')).toHaveText('Native section');
  await expect(body.locator('strong')).toHaveText('Toolbar bold text');
  await expect(body.getByRole('link', { name: 'Linked document', exact: true })).toHaveAttribute('href', 'https://example.org/native-evidence');
  await expect(body.locator('pre code')).toHaveText('const nativeValue = 7;');
  await expect(body.locator('table')).toHaveCount(1); await expect(body.locator('th').first()).toHaveText('Header value'); await expect(body.locator('td').first()).toHaveText('Cell value');
  const downloading = page.waitForEvent('download'); await body.getByRole('link', { name: 'Download', exact: true }).click();
  const download = await downloading; expect(download.suggestedFilename()).toBe('native-control.txt');
  expect(await readFile((await download.path())!, 'utf8')).toBe('Native upload bytes\n');
  const saved = await page.evaluate(id => window.noteExample.api.note(id), note.id);
  expect(saved.revision).toBe(2); expect(JSON.stringify(saved.bodyJson)).toContain('native-control.txt');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await page.screenshot({ path: `.tmp/native-editor-controls-${width}.png`, fullPage: true });
});

test('protects a native diagram draft through cancelled navigation, explicit discard and reopening while the other pane stays dirty', async ({ page }) => {
  await page.goto('./'); await page.waitForFunction(() => !!window.noteExample);
  const ids = await page.evaluate(async () => {
    const api = window.noteExample.api;
    const diagram = await api.create({ spaceId: 'local', title: 'Native modal draft', parentId: null, visibility: 'PRIVATE', idempotencyKey: crypto.randomUUID() });
    await api.save(diagram.id, { title: diagram.title, expectedRevision: 1, idempotencyKey: crypto.randomUUID(), bodyJson: { type: 'doc', content: [{ type: 'mermaid', attrs: { source: 'graph TD\n Original --> Diagram' } }, { type: 'paragraph' }] } });
    const other = await api.create({ spaceId: 'local', title: 'Other native navigation target', parentId: null, visibility: 'PRIVATE', idempotencyKey: crypto.randomUUID() });
    return { diagram: diagram.id, other: other.id };
  });
  await page.goto(`?space=local&note=${ids.diagram}&right=${ids.other}`);
  const right = page.getByRole('region', { name: '오른쪽 편집 창', exact: true }).getByRole('textbox', { name: '노트 본문', exact: true });
  await right.fill('Independent right-pane draft.');
  const originalRight = await right.elementHandle();
  await page.getByRole('button', { name: '원본 편집', exact: true }).click();
  const source = page.getByLabel('Mermaid 원본', { exact: true });
  await source.fill('graph TD\n Preserve --> UnappliedDraft');
  await source.press('Control+k');
  const search = page.getByRole('dialog', { name: '노트 검색', exact: true });
  await search.getByLabel('노트 제목', { exact: true }).fill('Other native navigation target');
  const confirmations: string[] = [];
  const dismiss = async (dialog: import('@playwright/test').Dialog) => { confirmations.push(dialog.message()); await dialog.dismiss(); };
  page.on('dialog', dismiss);
  await search.getByRole('button', { name: 'Other native navigation target', exact: true }).click();
  await expect.poll(() => confirmations.length).toBe(1);
  await expect(source).toHaveValue('graph TD\n Preserve --> UnappliedDraft');
  await expect(page.getByRole('tab', { name: 'Native modal draft •', exact: true })).toBeVisible();
  expect(new URL(page.url()).searchParams.get('note')).toBe(ids.diagram);
  await expect(right).toHaveText('Independent right-pane draft.');
  expect(await right.evaluate((element, original) => element === original, originalRight)).toBe(true);
  await page.evaluate(() => window.noteExample.access.refresh());
  await expect(source).toHaveValue('graph TD\n Preserve --> UnappliedDraft');
  await expect(page.getByRole('tab', { name: 'Native modal draft •', exact: true })).toBeVisible();
  const saved = await page.evaluate(id => window.noteExample.api.note(id), ids.diagram);
  expect(saved.revision).toBe(2); expect(JSON.stringify(saved.bodyJson)).not.toContain('UnappliedDraft');
  page.off('dialog', dismiss);
  await source.press('Control+k'); await search.getByLabel('노트 제목', { exact: true }).fill('Other native navigation target');
  page.once('dialog', async dialog => { confirmations.push(dialog.message()); await dialog.accept(); });
  await search.getByRole('button', { name: 'Other native navigation target', exact: true }).click();
  const left = page.getByRole('region', { name: '왼쪽 편집 창', exact: true });
  await expect(left.getByRole('textbox', { name: '노트 본문', exact: true })).toHaveText('');
  await expect(source).toHaveCount(0); expect(confirmations).toHaveLength(2);
  await expect(right).toHaveText('Independent right-pane draft.');
  await page.getByRole('treeitem', { name: 'Native modal draft', exact: true }).click();
  await left.getByRole('button', { name: '원본 편집', exact: true }).click();
  await expect(source).toHaveValue('graph TD\n Original --> Diagram');
  await expect(left.getByRole('tab', { name: 'Native modal draft', exact: true })).toBeVisible();
  await expect(right).toHaveText('Independent right-pane draft.');
  expect(await right.evaluate((element, original) => element === original, originalRight)).toBe(true);
  await source.fill('graph TD\n Revoked --> NativeDraft');
  expect(await page.evaluate(() => { const event = new Event('beforeunload', { cancelable: true }); window.dispatchEvent(event); return event.defaultPrevented; })).toBe(true);
  await page.evaluate(() => window.noteExample.access.revoke());
  await expect(source).toHaveCount(0); await expect(page.getByRole('textbox', { name: '노트 본문', exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => { const event = new Event('beforeunload', { cancelable: true }); window.dispatchEvent(event); return event.defaultPrevented; })).toBe(false);
});
