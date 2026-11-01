import { expect, test } from '@playwright/test';
import { resolve, sep } from 'node:path';
import { readFile } from 'node:fs/promises';
import type { NoteCoreApi } from '../src/model';

const origin = 'https://127.0.0.1:18143';
const initial = '<mxfile><diagram name="Native acceptance"><mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/><mxCell id="2" value="Original native shape" vertex="1" parent="1"><mxGeometry x="20" y="20" width="180" height="80" as="geometry"/></mxCell></root></mxGraphModel></diagram></mxfile>';

test.beforeEach(async ({ page, context }) => {
  await context.grantPermissions(['local-network-access'], { origin: 'http://127.0.0.1:18139' });
  const root = resolve('.tmp/native-drawio-dist');
  await page.route('**/native-note-gui/**', async route => {
    const path = resolve(root, new URL(route.request().url()).pathname.slice('/native-note-gui/'.length));
    if (!path.startsWith(root + sep)) throw new Error('Unexpected native fixture asset path.');
    await route.fulfill({ path });
  });
  await page.route('**/example/**', async route => {
    const html = (await readFile('examples/independent.html', 'utf8')).replace("'/note-gui/note-gui.js'", "'/native-note-gui/note-gui.js'");
    await route.fulfill({ contentType: 'text/html', body: html });
  });
  await page.goto('./');
  await page.waitForFunction(() => !!window.noteExample);
});

for (const width of [1600, 390]) test(`edits the actual native Draw.io canvas and preserves revisions at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 1000 });
  const external: string[] = [];
  await page.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.protocol.startsWith('http') && !['http://127.0.0.1:18139', origin].includes(url.origin)) { external.push(url.origin); await route.abort(); }
    else await route.fallback();
  });
  const fixture = await page.evaluate(async initial => {
    const entry = '/native-note-gui/note-gui.js'; const gui: typeof import('../src/index') = await import(entry);
    const { api, access, host, mounted } = window.noteExample; mounted.unmount();
    const note = await api.create({ spaceId: 'local', title: 'Native graphical Draw.io', visibility: 'PRIVATE', parentId: null, idempotencyKey: crypto.randomUUID() });
    const file = await api.upload(note.id, new File([initial], 'native.drawio', { type: 'application/vnd.jgraph.mxfile' }));
    await api.save(note.id, { title: note.title, expectedRevision: 1, idempotencyKey: crypto.randomUUID(), bodyJson: { type: 'doc', content: [{ type: 'drawio', attrs: { fileId: file.attachmentId } }] } });
    history.replaceState(null, '', `?space=local&note=${note.id}`);
    window.noteExample = { api, access, host, mounted: gui.mountNoteCoreGui(document.getElementById('notes')!, { api, host }) };
    return { id: note.id, fileId: file.attachmentId };
  }, initial);
  for (const [before, after] of [['Original native shape', 'First native edit'], ['First native edit', 'Reopened native edit']]) {
    await page.getByRole('button', { name: '다이어그램 편집', exact: true }).click();
    const frame = page.frameLocator('iframe[title="Draw.io editor"]');
    await expect(frame.getByText(before, { exact: true })).toBeVisible();
    const dialog = page.getByRole('dialog', { name: 'Draw.io', exact: true });
    const geometry = await dialog.evaluate(element => ({ width: element.getBoundingClientRect().width, viewport: innerWidth }));
    expect(geometry.width).toBeGreaterThan(geometry.viewport * .9);
    const source = page.getByLabel('Draw.io XML', { exact: true });
    await expect(source).toHaveJSProperty('readOnly', true);
    const previous = await source.inputValue();
    await page.evaluate(origin => {
      const iframe = document.querySelector<HTMLIFrameElement>('iframe[title="Draw.io editor"]')!;
      for (const [messageOrigin, messageSource] of [['https://unapproved.invalid', iframe.contentWindow], [origin, window]] as const) {
        window.dispatchEvent(new MessageEvent('message', { origin: messageOrigin, source: messageSource, data: JSON.stringify({ event: 'save', xml: '<mxfile><diagram name="Forged"/></mxfile>' }) }));
      }
    }, origin);
    await expect(source).toHaveValue(previous);
    await frame.getByText(before, { exact: true }).dblclick();
    const editor = frame.locator('.mxCellEditor[contenteditable="true"]');
    await editor.fill(after); await editor.press('Control+Enter');
    await expect(source).toHaveValue(new RegExp(after));
    await frame.getByText('Save', { exact: true }).click();
    await expect(dialog).toHaveCount(0);
    await page.getByRole('button', { name: '저장', exact: true }).click();
    await expect(page.getByRole('button', { name: '저장', exact: true })).toBeDisabled();
    await page.evaluate(async () => window.noteExample.access.refresh());
    await page.reload();
  }
  const saved = await page.evaluate(async ({ id, fileId }) => {
    const { api } = window.noteExample;
    const note = await api.note(id); const current = String(note.bodyJson.content![0].attrs!.fileId);
    return { revision: note.revision, current, xml: await (await api.attachment(current, 1)).text(), original: await (await api.attachment(fileId, 1)).text() };
  }, fixture);
  expect(saved.revision).toBe(4); expect(saved.current).not.toBe(fixture.fileId);
  expect(saved.xml).toContain('Reopened native edit'); expect(saved.original).toBe(initial);
  await page.getByRole('button', { name: '다이어그램 편집', exact: true }).click();
  await expect(page.frameLocator('iframe[title="Draw.io editor"]').getByText('Reopened native edit', { exact: true })).toBeVisible();
  await page.screenshot({ path: `.tmp/native-drawio-${width}.png`, fullPage: true });
  await page.evaluate(() => window.noteExample.access.revoke());
  await expect(page.locator('iframe[title="Draw.io editor"]')).toHaveCount(0);
  await expect(page.getByLabel('Draw.io XML', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('textbox', { name: '노트 본문', exact: true })).toHaveCount(0);
  expect(external).toEqual([]);
});

test('keeps the actual native diagram read-only after effective edit permission is removed', async ({ page }) => {
  await page.evaluate(async initial => {
    const entry = '/native-note-gui/note-gui.js'; const gui: typeof import('../src/index') = await import(entry);
    const { api, access, host, mounted } = window.noteExample; mounted.unmount();
    const note = await api.create({ spaceId: 'local', title: 'Native read-only diagram', visibility: 'SPACE', parentId: null, idempotencyKey: crypto.randomUUID() });
    const file = await api.upload(note.id, new File([initial], 'viewer.drawio', { type: 'application/vnd.jgraph.mxfile' }));
    await api.save(note.id, { title: note.title, expectedRevision: 1, idempotencyKey: crypto.randomUUID(), bodyJson: { type: 'doc', content: [{ type: 'drawio', attrs: { fileId: file.attachmentId } }] } });
    const client: NoteCoreApi = { ...api, note: async id => ({ ...await api.note(id), canEdit: false }), upload: async () => { throw new Error('Read-only host must not upload'); } };
    history.replaceState(null, '', `?space=local&note=${note.id}`);
    window.noteExample = { api: client, access, host, mounted: gui.mountNoteCoreGui(document.getElementById('notes')!, { api: client, host }) };
  }, initial);
  await page.getByRole('button', { name: '다이어그램 편집', exact: true }).click();
  const frame = page.frameLocator('iframe[title="Draw.io editor"]');
  await expect(frame.getByText('Original native shape', { exact: true })).toBeVisible();
  await frame.getByText('Original native shape', { exact: true }).dblclick();
  await expect(frame.locator('.mxCellEditor[contenteditable="true"]')).toHaveCount(0);
  await expect(frame.getByText('Save', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: '첨부 개정 저장 후 노트에 적용', exact: true })).toBeDisabled();
});

test('restores a native diagram revision without replacing the other same-note pane draft', async ({ page }) => {
  const fixture = await page.evaluate(async initial => {
    const entry = '/native-note-gui/note-gui.js'; const gui: typeof import('../src/index') = await import(entry);
    const { api, access, host, mounted } = window.noteExample; mounted.unmount();
    const note = await api.create({ spaceId: 'local', title: 'Same-note native panes', visibility: 'SPACE', parentId: null, idempotencyKey: crypto.randomUUID() });
    const file = await api.upload(note.id, new File([initial], 'pane-original.drawio', { type: 'application/vnd.jgraph.mxfile' }));
    await api.save(note.id, { title: note.title, expectedRevision: 1, idempotencyKey: crypto.randomUUID(), bodyJson: { type: 'doc', content: [{ type: 'drawio', attrs: { fileId: file.attachmentId } }] } });
    history.replaceState(null, '', `?space=local&note=${note.id}&right=${note.id}`);
    window.noteExample = { api, access, host, mounted: gui.mountNoteCoreGui(document.getElementById('notes')!, { api, host }) };
    return { id: note.id, original: file.attachmentId };
  }, initial);
  const left = page.locator('.note-gui-pane').first(); const right = page.locator('.note-gui-pane').last();
  const leftBody = left.getByRole('textbox', { name: '노트 본문', exact: true }); const rightBody = right.getByRole('textbox', { name: '노트 본문', exact: true });
  await rightBody.fill('Retain the other same-note pane draft.'); const originalEditor = await rightBody.elementHandle(); const rightDraft = await rightBody.textContent();
  expect(rightDraft).toContain('Retain the other same-note pane draft.');
  await leftBody.getByRole('button', { name: '다이어그램 편집', exact: true }).click();
  const frame = page.frameLocator('iframe[title="Draw.io editor"]'); await frame.getByText('Original native shape', { exact: true }).dblclick();
  const editor = frame.locator('.mxCellEditor[contenteditable="true"]'); await editor.fill('Saved left-pane native shape'); await editor.press('Control+Enter');
  await frame.getByText('Save', { exact: true }).click(); await left.getByRole('button', { name: '저장', exact: true }).click();
  await expect(left.getByRole('button', { name: '저장', exact: true })).toBeDisabled();
  await left.getByRole('button', { name: '페이지 메뉴', exact: true }).click(); await left.getByRole('menuitem', { name: '페이지 이력', exact: true }).click();
  await left.getByRole('button', { name: /개정 2 · Same-note native panes/ }).click();
  page.once('dialog', dialog => dialog.accept()); await left.getByRole('button', { name: '복원', exact: true }).click();
  await expect(left.locator('.note-body-status')).toContainText('개정 4'); await expect(rightBody).toHaveText(rightDraft!);
  expect(await rightBody.evaluate((element, original) => element === original, originalEditor)).toBe(true);
  await left.getByRole('button', { name: '노트 상세 닫기', exact: true }).click(); await leftBody.getByRole('button', { name: '다이어그램 편집', exact: true }).click();
  await expect(frame.getByText('Original native shape', { exact: true })).toBeVisible();
  await page.screenshot({ path: '.tmp/native-drawio-pane-restore.png', fullPage: true });
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Draw.io 닫기', exact: true }).click();
  await right.getByRole('button', { name: '저장', exact: true }).click(); await expect(right.getByRole('alert')).toContainText('newer revision');
  await expect(rightBody).toHaveText(rightDraft!);
  const restored = await page.evaluate(async fixture => ({ note: await window.noteExample.api.note(fixture.id), bytes: await (await window.noteExample.api.attachment(fixture.original, 1)).text(), files: await window.noteExample.api.files(fixture.id, null) }), fixture);
  expect(restored.note.bodyJson.content![0].attrs!.fileId).toBe(fixture.original); expect(restored.bytes).toBe(initial);
  expect(restored.files.items.map(file => file.revision).sort()).toEqual([1, 2]);
});

test('retains actual native inline edits and undo history through a held attachment refresh', async ({ page }) => {
  let navigations = 0; page.on('framenavigated', frame => { if (frame.url().startsWith(origin)) navigations++; });
  const fixture = await page.evaluate(async initial => {
    const entry = '/native-note-gui/note-gui.js'; const gui: typeof import('../src/index') = await import(entry);
    const { api, access, host, mounted } = window.noteExample; mounted.unmount();
    const note = await api.create({ spaceId: 'local', title: 'Native refresh ownership', visibility: 'SPACE', parentId: null, idempotencyKey: crypto.randomUUID() });
    const file = await api.upload(note.id, new File([initial], 'refresh-original.drawio', { type: 'application/vnd.jgraph.mxfile' }));
    await api.save(note.id, { title: note.title, expectedRevision: 1, idempotencyKey: crypto.randomUUID(), bodyJson: { type: 'doc', content: [{ type: 'drawio', attrs: { fileId: file.attachmentId } }] } });
    let hold = false; let release!: () => void; const delivery = new Promise<void>(resolve => { release = resolve; });
    window.addEventListener('fixture-hold-native-media', () => { hold = true; }); window.addEventListener('fixture-release-native-media', () => { hold = false; release(); }, { once: true });
    const client: NoteCoreApi = { ...api, attachment: async (id, revision) => { if (hold) await delivery; return api.attachment(id, revision); } };
    history.replaceState(null, '', `?space=local&note=${note.id}`);
    window.noteExample = { api: client, access, host, mounted: gui.mountNoteCoreGui(document.getElementById('notes')!, { api: client, host }) };
    return { id: note.id, original: file.attachmentId };
  }, initial);
  await page.getByRole('button', { name: '다이어그램 편집', exact: true }).click();
  const frame = page.frameLocator('iframe[title="Draw.io editor"]'); const iframe = page.locator('iframe[title="Draw.io editor"]'); const originalFrame = await iframe.elementHandle();
  await frame.getByText('Original native shape', { exact: true }).dblclick();
  const editor = frame.locator('.mxCellEditor[contenteditable="true"]'); await editor.fill('First unsaved native edit'); await editor.press('Control+Enter');
  await expect(page.getByLabel('Draw.io XML', { exact: true })).toHaveValue(/First unsaved native edit/);
  await frame.getByText('First unsaved native edit', { exact: true }).dblclick(); await editor.fill('Pending inline native edit');
  await page.evaluate(() => window.dispatchEvent(new Event('fixture-hold-native-media')));
  let settled = false; const refreshing = page.evaluate(async () => window.noteExample.access.refresh()).then(() => { settled = true; });
  await expect(page.getByRole('dialog', { name: 'Draw.io', exact: true })).toBeHidden(); expect(settled).toBe(false);
  expect(await iframe.evaluate((element, original) => element === original, originalFrame)).toBe(true);
  await expect(frame.getByText('Pending inline native edit', { exact: true }).first()).toBeAttached();
  await page.evaluate(() => window.dispatchEvent(new Event('fixture-release-native-media'))); await refreshing;
  await expect(page.getByRole('dialog', { name: 'Draw.io', exact: true })).toBeVisible();
  if (await editor.isVisible()) await editor.press('Control+Enter');
  await expect(page.getByLabel('Draw.io XML', { exact: true })).toHaveValue(/Pending inline native edit/);
  await frame.getByTitle(/^Undo/).click(); await expect(frame.getByText('First unsaved native edit', { exact: true })).toBeVisible();
  await frame.getByTitle(/^Undo/).click(); await expect(frame.getByText('Original native shape', { exact: true })).toBeVisible();
  expect(navigations).toBe(1); expect(await iframe.evaluate((element, original) => element === original, originalFrame)).toBe(true);
  expect(await page.evaluate(async id => (await window.noteExample.api.attachment(id, 1)).text(), fixture.original)).toBe(initial);
  expect((await page.evaluate(id => window.noteExample.api.note(id), fixture.id)).revision).toBe(2);
  await page.screenshot({ path: '.tmp/native-drawio-unsaved-refresh.png', fullPage: true });
  await page.evaluate(() => window.noteExample.access.revoke()); await expect(iframe).toHaveCount(0);
});
