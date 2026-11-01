import { test, expect, type Page } from '@playwright/test';
import type { NoteCoreApi } from '../src/model';
import type { MountedNoteGui, NoteHost } from '../src/host';
import type { NoteAccessController } from '../src/access';
import { resolve, sep } from 'node:path';
import { openToolbar } from './nativeControls';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

declare global {
  interface Window { noteExample: { api: NoteCoreApi; access: NoteAccessController; host: NoteHost; mounted: MountedNoteGui } }
}
async function create(page: Page, title: string) {
  return page.evaluate(async title => window.noteExample.api.create({ spaceId: 'local', title, parentId: null, visibility: 'PRIVATE', idempotencyKey: crypto.randomUUID() }), title);
}
async function open(page: Page, id: string) { await page.goto(`?space=local&note=${id}`); await expect(page.getByRole('textbox', { name: '노트 본문', exact: true })).toBeVisible(); }

test.beforeEach(async ({ page }) => {
  await page.goto('./');
  await page.waitForFunction(() => !!window.noteExample);
});

test('built core host persists authored rich content, comments and attachments without KMS or Vite', async ({ page }) => {
  const forbidden: string[] = []; const loaded: string[] = [];
  await page.addInitScript(() => Object.defineProperty(document, 'cookie', { configurable: true, get() { throw new Error('A core-only host must not read cookies.'); } }));
  page.on('request', request => { loaded.push(request.url()); if (/\/(graphql|api|spaces)\b/.test(new URL(request.url()).pathname)) forbidden.push(request.url()); });
  const note = await create(page, 'Independent browser document'); await open(page, note.id);
  await expect(page.getByRole('button', { name: '지식 정보', exact: true })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'AI 대화' })).toHaveCount(0);
  const body = page.getByRole('textbox', { name: '노트 본문', exact: true });
  await body.fill('Persisted independent body.'); await body.press('End'); await body.press('Control+b'); await body.pressSequentially(' Bold detail.'); await body.press('Control+b');
  await page.getByRole('button', { name: '저장', exact: true }).click();
  await expect(page.getByRole('button', { name: '저장', exact: true })).toBeDisabled();
  await page.reload(); await expect(body).toHaveText('Persisted independent body. Bold detail.');
  const saved = await page.evaluate(id => window.noteExample.api.note(id), note.id);
  expect(saved.revision).toBe(2); expect(saved.bodyJson.content![0].content![1].marks).toContainEqual({ type: 'bold' });
  await page.getByRole('button', { name: '댓글 및 노트 상세', exact: true }).click();
  await page.getByRole('textbox', { name: '댓글', exact: true }).fill('Persisted independent comment.');
  await page.getByRole('button', { name: '댓글 남기기', exact: true }).click();
  await expect(page.getByText('Persisted independent comment.', { exact: true })).toBeVisible();
  const attachment = await page.evaluate(async id => window.noteExample.api.upload(id, new File(['real independent bytes'], 'independent.txt', { type: 'text/plain' })), note.id);
  await page.getByRole('tab', { name: '첨부', exact: true }).click();
  const download = page.waitForEvent('download'); await page.getByRole('button', { name: 'independent.txt', exact: true }).click();
  expect((await download).suggestedFilename()).toBe('independent.txt');
  await page.reload();
  expect(await page.evaluate(async id => (await window.noteExample.api.attachment(id, 1)).text(), attachment.attachmentId)).toBe('real independent bytes');
  expect(forbidden).toEqual([]); expect(loaded.some(url => /\/(kms\.js|assets\/(App|legacyHost)-)/.test(url))).toBe(false);
});

test('renders Korean controls from shipped same-origin fonts without an installed Korean fallback', async ({ page, context }) => {
  const note = await create(page, 'Portable Korean labels'); await open(page, note.id);
  const save = page.getByRole('button', { name: '저장', exact: true });
  await save.evaluate(element => element.setAttribute('data-korean-font-probe', 'true'));
  await save.evaluate(async element => { await document.fonts.load(`${getComputedStyle(element).fontWeight} 14px "Noto Sans KR Variable"`, element.textContent!.trim()); await document.fonts.ready; });
  const cdp = await context.newCDPSession(page); await cdp.send('DOM.enable'); await cdp.send('CSS.enable');
  const { root } = await cdp.send('DOM.getDocument');
  const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: root.nodeId, selector: '[data-korean-font-probe] .mantine-Button-label' });
  const { fonts } = await cdp.send('CSS.getPlatformFontsForNode', { nodeId });
  expect(fonts).toEqual(expect.arrayContaining([expect.objectContaining({ isCustomFont: true, familyName: expect.stringMatching(/Noto Sans KR/), glyphCount: expect.any(Number) })]));
  expect(fonts.filter(font => font.isCustomFont && /Noto Sans KR/.test(font.familyName)).reduce((count, font) => count + font.glyphCount, 0)).toBeGreaterThanOrEqual(2);
  const titleNode = await cdp.send('DOM.querySelector', { nodeId: root.nodeId, selector: '[aria-label="노트 제목"] h1' });
  const latin = await cdp.send('CSS.getPlatformFontsForNode', { nodeId: titleNode.nodeId });
  expect(latin.fonts.some(font => /Noto Sans KR/.test(font.familyName))).toBe(false);
  const sources = await page.evaluate(() => [...document.styleSheets].flatMap(sheet => [...sheet.cssRules]).filter(rule => rule instanceof CSSFontFaceRule && rule.style.fontFamily.includes('Noto Sans KR')).map(rule => (rule as CSSFontFaceRule).style.getPropertyValue('src')));
  expect(sources.length).toBeGreaterThan(0);
  for (const source of sources) {
    const url = new URL(source.match(/url\(["']?([^"')]+)/)![1], page.url());
    expect(url.protocol === 'data:' || url.origin === new URL(page.url()).origin).toBe(true);
  }
  await page.screenshot({ path: '.tmp/portable-korean-controls.png', fullPage: true });
});

test('real cross-tab persistence serializes competing writes and preserves the losing draft', async ({ page, context }) => {
  const note = await create(page, 'Concurrent base'); await open(page, note.id);
  const other = await context.newPage(); await open(other, note.id);
  await page.getByRole('textbox', { name: '노트 본문', exact: true }).fill('First writer.');
  await other.getByRole('textbox', { name: '노트 본문', exact: true }).fill('Keep losing draft.');
  await page.getByRole('button', { name: '저장', exact: true }).click();
  await expect(page.getByRole('button', { name: '저장', exact: true })).toBeDisabled();
  await other.getByRole('button', { name: '저장', exact: true }).click();
  await expect(other.getByRole('alert')).toContainText('newer revision');
  await expect(other.getByRole('textbox', { name: '노트 본문', exact: true })).toHaveText('Keep losing draft.');
  expect((await page.evaluate(id => window.noteExample.api.note(id), note.id)).revision).toBe(2);
  const racing = await Promise.all([page, other].map((tab, index) => tab.evaluate(async ({ id, index }) => {
    const current = await window.noteExample.api.note(id);
    try { await window.noteExample.api.save(id, { title: `Racing writer ${index}`, bodyJson: current.bodyJson, expectedRevision: 2, idempotencyKey: `race-${index}` }); return 'saved'; }
    catch (error) { return (error as { code: string }).code; }
  }, { id: note.id, index })));
  expect(racing.sort()).toEqual(['CONFLICT', 'saved']);
});

for (const width of [1600, 390]) test(`retains edits made during a delayed history restore at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 1000 });
  const note = await create(page, 'Historical title');
  await page.evaluate(async id => {
    await window.noteExample.api.save(id, { title: 'Before restore', bodyJson: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Current body.' }] }] }, expectedRevision: 1, idempotencyKey: 'before-restore' });
  }, note.id);
  await page.goto(`?space=local&note=${note.id}${width === 1600 ? `&right=${note.id}` : ''}`);
  await page.waitForFunction(() => !!window.noteExample);
  await page.evaluate(async () => {
    const entry = '/note-gui/note-gui.js'; const gui: typeof import('../src/index') = await import(entry);
    const { api, access, host, mounted } = window.noteExample; mounted.unmount();
    let release!: () => void;
    const delivery = new Promise<void>(resolve => { release = resolve; });
    window.addEventListener('fixture-release-restore', () => release(), { once: true });
    const client: NoteCoreApi = { ...api, restore: async (id, revision, expectedRevision) => {
      const result = await api.restore(id, revision, expectedRevision);
      Reflect.set(window, 'restoreCommitted', result.revision);
      await delivery; return result;
    } };
    window.noteExample = { api: client, access, host, mounted: gui.mountNoteCoreGui(document.getElementById('notes')!, { api: client, host }) };
  });
  const left = page.locator('.note-gui-pane').first();
  const body = left.getByRole('textbox', { name: '노트 본문', exact: true });
  const title = left.getByRole('textbox', { name: '노트 제목', exact: true });
  await expect(body).toHaveText('Current body.');
  const originalEditor = await body.elementHandle();
  const right = page.locator('.note-gui-pane').last().getByRole('textbox', { name: '노트 본문', exact: true });
  if (width === 1600) await right.fill('Independent right draft.');
  await left.getByRole('button', { name: '페이지 메뉴', exact: true }).click();
  await left.getByRole('menuitem', { name: '페이지 이력', exact: true }).click();
  await left.getByRole('button', { name: /개정 1 · Historical title/ }).click();
  page.once('dialog', dialog => dialog.accept());
  await left.getByRole('button', { name: '복원', exact: true }).click();
  await page.waitForFunction(() => Reflect.get(window, 'restoreCommitted') === 3);
  await title.fill('Title typed while restoring');
  await body.fill('Body typed while restoring.');
  await page.evaluate(() => window.dispatchEvent(new Event('fixture-release-restore')));
  await expect(left.getByRole('status')).toHaveCount(0);
  await expect(title).toHaveText('Title typed while restoring');
  await expect(body).toHaveText('Body typed while restoring.');
  expect(await body.evaluate((element, original) => element === original, originalEditor)).toBe(true);
  await expect(left.locator('.note-body-status')).toContainText('개정 2');
  if (width === 1600) await expect(right).toHaveText('Independent right draft.');
  await left.getByRole('button', { name: '저장', exact: true }).click();
  await expect(left.getByRole('alert')).toContainText('newer revision');
  await expect(body).toHaveText('Body typed while restoring.');
  const committed = await page.evaluate(id => window.noteExample.api.note(id), note.id);
  expect(committed.title).toBe('Historical title'); expect(committed.revision).toBe(3);
  await left.getByRole('button', { name: '최신 버전 확인', exact: true }).click();
  await expect(left.getByRole('alert').filter({ hasText: '서버 개정 3 · Historical title.' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await page.screenshot({ path: `.tmp/restore-draft-${width}.png`, fullPage: true });
  page.once('dialog', dialog => dialog.accept());
  await left.getByRole('button', { name: '서버 버전 열기', exact: true }).click();
  await expect(title).toHaveText('Historical title'); await expect(body).toHaveText('');
  await expect(left.getByRole('button', { name: '저장', exact: true })).toBeDisabled();
  if (width === 1600) await expect(right).toHaveText('Independent right draft.');
});

for (const closeTarget of [false, true]) test(`isolates a pending restore after switching tabs (close target: ${closeTarget})`, async ({ page }) => {
  const target = await create(page, 'Historical original'); const other = await create(page, 'Independent active tab');
  await page.evaluate(async id => { const note = await window.noteExample.api.note(id); await window.noteExample.api.save(id, { title: 'Restore target', bodyJson: note.bodyJson, expectedRevision: note.revision, idempotencyKey: 'prepare-restore-target' }); }, target.id);
  await open(page, target.id);
  await page.evaluate(async () => {
    const entry = '/note-gui/note-gui.js'; const gui: typeof import('../src/index') = await import(entry);
    const { api, access, host, mounted } = window.noteExample; mounted.unmount();
    let release!: () => void; const delivery = new Promise<void>(resolve => { release = resolve; });
    window.addEventListener('fixture-release-tab-restore', () => release(), { once: true });
    const client: NoteCoreApi = { ...api, restore: async (id, revision, expectedRevision) => { const result = await api.restore(id, revision, expectedRevision); Reflect.set(window, 'tabRestoreCommitted', true); await delivery; Reflect.set(window, 'tabRestoreDelivered', true); return result; } };
    window.noteExample = { api: client, access, host, mounted: gui.mountNoteCoreGui(document.getElementById('notes')!, { api: client, host }) };
  });
  await page.getByRole('button', { name: '페이지 메뉴', exact: true }).click();
  await page.getByRole('menuitem', { name: '페이지 이력', exact: true }).click();
  await page.getByRole('button', { name: /개정 1 · Historical original/ }).click();
  page.once('dialog', dialog => dialog.accept()); await page.getByRole('button', { name: '복원', exact: true }).click();
  await page.waitForFunction(() => Reflect.get(window, 'tabRestoreCommitted'));
  await page.getByRole('treeitem', { name: 'Independent active tab', exact: true }).click();
  const body = page.getByRole('textbox', { name: '노트 본문', exact: true });
  await body.fill('Keep this other tab draft.'); const originalEditor = await body.elementHandle();
  if (closeTarget) await page.getByRole('button', { name: 'Restore target 탭 닫기', exact: true }).click();
  await page.evaluate(() => window.dispatchEvent(new Event('fixture-release-tab-restore')));
  await page.waitForFunction(() => Reflect.get(window, 'tabRestoreDelivered'));
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  await expect(body).toHaveText('Keep this other tab draft.');
  expect(await body.evaluate((element, original) => element === original, originalEditor)).toBe(true);
  expect((await page.evaluate(id => window.noteExample.api.note(id), other.id)).revision).toBe(1);
  if (closeTarget) await expect(page.getByRole('tab', { name: /Historical original|Restore target/ })).toHaveCount(0);
  else { await page.getByRole('tab', { name: 'Historical original', exact: true }).click(); await expect(body).toHaveText(''); await page.getByRole('tab', { name: 'Independent active tab •', exact: true }).click(); await expect(body).toHaveText('Keep this other tab draft.'); }
});

test('round-trips native local diagrams and revalidates their dirty media lifecycle', async ({ page }) => {
  const note = await create(page, 'Native diagram document'); await open(page, note.id);
  const body = page.getByRole('textbox', { name: '노트 본문', exact: true });
  async function insert(kind: string) {
    await body.click(); await body.press('Control+End'); await body.press('Enter');
    await openToolbar(page);
    await page.getByRole('button', { name: '다이어그램 삽입', exact: true }).click();
    await page.getByRole('menuitem', { name: kind, exact: true }).click();
  }
  async function save() {
    await page.getByRole('button', { name: '저장', exact: true }).click();
    await expect(page.getByRole('button', { name: '저장', exact: true })).toBeDisabled();
  }
  await insert('mermaid');
  await page.getByRole('button', { name: '원본 편집', exact: true }).click();
  const mermaid = 'graph TD\n  Author --> Revision';
  await page.getByLabel('Mermaid 원본', { exact: true }).fill(mermaid);
  await page.getByRole('button', { name: '첨부 개정 저장 후 노트에 적용', exact: true }).click();
  await save(); await page.reload(); await expect(body.locator('svg')).toContainText('Author');
  await insert('drawio');
  await page.getByRole('button', { name: '다이어그램 편집', exact: true }).click();
  const xml = '<mxfile><diagram name="Local XML"><mxGraphModel><root><mxCell id="0"/></root></mxGraphModel></diagram></mxfile>';
  await page.getByLabel('Draw.io XML', { exact: true }).fill(xml);
  await page.getByRole('button', { name: '첨부 개정 저장 후 노트에 적용', exact: true }).click();
  await save(); await page.reload();
  await page.getByRole('button', { name: '다이어그램 편집', exact: true }).click();
  await expect(page.getByLabel('Draw.io XML', { exact: true })).toHaveValue(xml);
  await page.getByRole('button', { name: 'Draw.io 닫기', exact: true }).click();
  await insert('excalidraw');
  await page.getByRole('button', { name: '드로잉 편집', exact: true }).click();
  const canvas = page.locator('.excalidraw canvas.interactive'); await expect(canvas).toBeVisible();
  const rectangle = page.getByRole('radio', { name: /^(Rectangle|사각형)$/ });
  await page.locator('label').filter({ has: rectangle }).click();
  const bounds = (await canvas.boundingBox())!;
  await page.mouse.move(bounds.x + bounds.width * .4, bounds.y + 220); await page.mouse.down();
  await page.mouse.move(bounds.x + bounds.width * .4 + 160, bounds.y + 320, { steps: 8 }); await page.mouse.up();
  await expect(page.getByRole('dialog').getByRole('button', { name: /^(Undo|실행 취소)$/ })).toBeEnabled();
  await page.getByRole('button', { name: '저장 후 나가기', exact: true }).click(); await save(); await page.reload();
  const original = await page.evaluate(async id => {
    const note = await window.noteExample.api.note(id);
    const sceneId = String(note.bodyJson.content!.find(node => node.type === 'excalidraw')!.attrs!.fileId);
    return { sceneId, bytes: await (await window.noteExample.api.attachment(sceneId, 1)).text() };
  }, note.id);
  expect(JSON.parse(original.bytes).elements).toContainEqual(expect.objectContaining({ type: 'rectangle', isDeleted: false }));
  await page.getByRole('button', { name: '드로잉 편집', exact: true }).click(); await expect(canvas).toBeVisible();
  const ellipse = page.getByRole('radio', { name: /^(Ellipse|타원)$/ });
  await page.locator('label').filter({ has: ellipse }).click();
  const reopened = (await canvas.boundingBox())!;
  await page.mouse.move(reopened.x + reopened.width * .6, reopened.y + 380); await page.mouse.down();
  await page.mouse.move(reopened.x + reopened.width * .6 + 100, reopened.y + 460, { steps: 8 }); await page.mouse.up();
  await page.keyboard.press('Escape'); await expect(canvas).toBeVisible();
  await page.evaluate(async () => window.noteExample.access.refresh()); await expect(canvas).toBeVisible();
  await page.screenshot({ path: '.tmp/native-excalidraw-1600.png', fullPage: true });
  await page.getByRole('button', { name: '저장 후 나가기', exact: true }).click(); await save();
  const saved = await page.evaluate(async id => {
    const note = await window.noteExample.api.note(id);
    const files = await Promise.all(note.bodyJson.content!.filter(node => ['mermaid', 'drawio', 'excalidraw'].includes(node.type!)).map(async node => ({ type: node.type, fileId: String(node.attrs!.fileId), text: await (await window.noteExample.api.attachment(String(node.attrs!.fileId), 1)).text() })));
    return files;
  }, note.id);
  expect(saved.find(file => file.type === 'mermaid')!.text).toBe(mermaid);
  expect(saved.find(file => file.type === 'drawio')!.text).toBe(xml);
  const scene = saved.find(file => file.type === 'excalidraw')!;
  expect(scene.fileId).not.toBe(original.sceneId);
  expect(JSON.parse(scene.text).elements).toEqual(expect.arrayContaining([expect.objectContaining({ type: 'rectangle', isDeleted: false }), expect.objectContaining({ type: 'ellipse', isDeleted: false })]));
  expect(await page.evaluate(async id => (await window.noteExample.api.attachment(id, 1)).text(), original.sceneId)).toBe(original.bytes);
  await page.evaluate(() => window.noteExample.access.revoke());
  await expect(body).toHaveCount(0); await expect(canvas).toHaveCount(0); await expect(page.locator('img[src^="blob:"]')).toHaveCount(0);
});

test('replays exact committed create save and comment intents after lost acknowledgements', async ({ page }) => {
  await page.evaluate(async () => {
    const entry = '/note-gui/note-gui.js'; const gui: typeof import('../src/index') = await import(entry);
    const { api, access, host, mounted } = window.noteExample; mounted.unmount();
    const attempts = { create: [] as unknown[], save: [] as unknown[], comment: [] as unknown[] };
    Reflect.set(window, 'retryAttempts', attempts);
    const client: NoteCoreApi = { ...api,
      create: async input => { attempts.create.push(structuredClone(input)); const result = await api.create(input); if (attempts.create.length === 1) throw new gui.ApiError('Create acknowledgement lost', 'NETWORK'); return result; },
      save: async (id, input) => { attempts.save.push(structuredClone({ id, input })); const result = await api.save(id, input); if (attempts.save.length === 1) throw new gui.ApiError('Save acknowledgement lost', 'NETWORK'); return result; },
      comment: async (id, input) => { attempts.comment.push(structuredClone({ id, input })); await api.comment(id, input); if (attempts.comment.length === 1) throw new gui.ApiError('Comment acknowledgement lost', 'NETWORK'); },
    };
    window.noteExample = { api: client, access, host, mounted: gui.mountNoteCoreGui(document.getElementById('notes')!, { api: client, host }) };
  });
  await page.getByRole('button', { name: '새 페이지', exact: true }).click();
  await page.getByRole('textbox', { name: '새 노트 제목', exact: true }).fill('Exactly one created note');
  await page.getByRole('button', { name: '현재 경로에 만들기', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveText('Create acknowledgement lost');
  await page.getByRole('button', { name: '현재 경로에 만들기', exact: true }).click();
  const body = page.getByRole('textbox', { name: '노트 본문', exact: true }); await expect(body).toBeVisible();
  await body.fill('Frozen save intent.'); await page.getByRole('button', { name: '저장', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveText('Save acknowledgement lost');
  await body.fill('Later independent draft.'); await page.getByRole('button', { name: '저장', exact: true }).click();
  await expect(page.locator('.note-body-status')).toContainText('개정 2');
  await expect(body).toHaveText('Later independent draft.');
  await expect(page.getByRole('button', { name: '저장', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: '저장', exact: true }).click();
  await expect(page.getByRole('button', { name: '저장', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: '댓글 및 노트 상세', exact: true }).click();
  const comment = page.getByRole('textbox', { name: '댓글', exact: true }); await comment.fill('Exactly one comment.');
  await page.getByRole('button', { name: '댓글 남기기', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveText('Comment acknowledgement lost');
  await expect(comment).toHaveText('Exactly one comment.');
  await page.getByRole('button', { name: '댓글 남기기', exact: true }).click();
  await expect(page.getByText('Exactly one comment.', { exact: true })).toBeVisible();
  const result = await page.evaluate(async () => {
    const notes = await window.noteExample.api.findNotes('local', 'Exactly one created note');
    const id = notes[0].id;
    return { notes, note: await window.noteExample.api.note(id), history: await window.noteExample.api.history(id, null), comments: await window.noteExample.api.comments(id, null), attempts: Reflect.get(window, 'retryAttempts') as { create: unknown[]; save: { input: { idempotencyKey: string } }[]; comment: unknown[] } };
  });
  expect(result.notes).toHaveLength(1); expect(result.note.revision).toBe(3);
  expect(result.note.bodyJson.content![0].content![0].text).toBe('Later independent draft.');
  expect(result.history.items.map(item => item.revision)).toEqual([3, 2, 1]); expect(result.comments.items).toHaveLength(1);
  expect(result.attempts.create).toHaveLength(2); expect(result.attempts.create[1]).toEqual(result.attempts.create[0]);
  expect(result.attempts.save).toHaveLength(3); expect(result.attempts.save[1]).toEqual(result.attempts.save[0]);
  expect(result.attempts.save[2].input.idempotencyKey).not.toBe(result.attempts.save[0].input.idempotencyKey);
  expect(result.attempts.comment).toHaveLength(2); expect(result.attempts.comment[1]).toEqual(result.attempts.comment[0]);
});

test('measures bounded tree transfers and retained heap with a persistent 1300-note collection', async ({ page, context }) => {
  test.setTimeout(180_000);
  const seed = await page.evaluate(async () => {
    const { api, mounted } = window.noteExample; mounted.unmount();
    let first = '';
    for (let index = 0; index < 1300; index++) {
      const note = await api.create({ spaceId: 'local', title: `Root ${String(index).padStart(4, '0')}`, parentId: null, visibility: 'SPACE', idempotencyKey: `root-${index}` });
      if (!index) first = note.id;
    }
    const child = await api.create({ spaceId: 'local', title: 'Direct child', parentId: first, visibility: 'SPACE', idempotencyKey: 'direct-child' });
    const grandchild = await api.create({ spaceId: 'local', title: 'Direct grandchild', parentId: child.id, visibility: 'SPACE', idempotencyKey: 'direct-grandchild' });
    return { first, grandchild: grandchild.id };
  });
  await page.evaluate(async () => {
    const entry = '/note-gui/note-gui.js'; const gui: typeof import('../src/index') = await import(entry);
    const { api, access, host } = window.noteExample;
    const reads: { parent: string | null; cursor: string | null; rows: number; bytes: number }[] = [];
    Reflect.set(window, 'treeMeasurements', reads);
    const client: NoteCoreApi = { ...api, tree: async (space, parent, cursor) => {
      const result = await api.tree(space, parent, cursor);
      reads.push({ parent, cursor, rows: result.items.length, bytes: new TextEncoder().encode(JSON.stringify(result)).byteLength }); return result;
    } };
    window.noteExample = { api: client, access, host, mounted: gui.mountNoteCoreGui(document.getElementById('notes')!, { api: client, host }) };
  });
  const tree = page.getByRole('navigation', { name: '노트 트리', exact: true });
  await expect(tree.getByRole('treeitem', { name: 'Root 0000', exact: true })).toBeVisible();
  const cdp = await context.newCDPSession(page);
  async function heap() { await cdp.send('HeapProfiler.collectGarbage'); return (await cdp.send('Runtime.getHeapUsage')).usedSize as number; }
  const baselineHeap = await heap(); const elapsed: number[] = []; let maxRows = 0;
  for (let index = 1; index <= 25; index++) {
    const start = Date.now(); await tree.getByRole('button', { name: '다음', exact: true }).click();
    await expect(tree.getByRole('treeitem', { name: `Root ${String(index * 50).padStart(4, '0')}`, exact: true })).toBeVisible();
    elapsed.push(Date.now() - start); maxRows = Math.max(maxRows, await tree.getByRole('treeitem').count());
  }
  const after25Heap = await heap();
  for (let index = 24; index >= 0; index--) {
    await tree.getByRole('button', { name: '이전', exact: true }).click();
    await expect(tree.getByRole('treeitem', { name: `Root ${String(index * 50).padStart(4, '0')}`, exact: true })).toBeVisible();
  }
  const reads = await page.evaluate(() => Reflect.get(window, 'treeMeasurements') as { parent: string | null; cursor: string | null; rows: number; bytes: number }[]);
  expect(reads.filter(read => read.parent === null && read.cursor === null).length).toBeGreaterThan(1);
  expect(Math.max(...reads.map(read => read.rows))).toBeLessThanOrEqual(50); expect(maxRows).toBeLessThanOrEqual(40);
  const sorted = [...elapsed].sort((a, b) => a - b);
  await writeFile('.tmp/independent-tree-measurements.json', JSON.stringify({ rootNotes: 1300, totalNotes: 1302, traversedPages: 26, reads, maxRenderedRows: maxRows, navigationP95Ms: sorted[Math.ceil(sorted.length * .95) - 1], retainedHeapBytes: { baseline: baselineHeap, after25Pages: after25Heap, afterReturn: await heap() }, boundary: 'Warm Linux Chromium, real local persistence, explicit GC, not peak memory or KMS scale acceptance' }, null, 2));
  await page.goto(`?space=local&note=${seed.grandchild}`);
  await expect(page.getByRole('textbox', { name: '노트 본문', exact: true })).toBeVisible();
  await expect(tree.locator('.breadcrumb')).toHaveText('Root 0000 / Direct child');
  await expect(tree.getByRole('treeitem', { name: 'Direct grandchild', exact: true })).toBeVisible();
});

test('preserves a thousand rich paragraphs and exact downloaded attachment bytes', async ({ page }) => {
  const note = await create(page, 'Large independent document');
  await page.evaluate(async id => {
    await window.noteExample.api.save(id, { title: 'Large independent document', expectedRevision: 1, idempotencyKey: 'large-body', bodyJson: { type: 'doc', content: Array.from({ length: 1000 }, (_, index) => ({ type: 'paragraph', content: [{ type: 'text', text: `Paragraph ${index}: ${'authored content '.repeat(4)}`, marks: [{ type: 'bold' }] }] })) } });
    await window.noteExample.api.upload(id, new File([new Uint8Array(1024 * 1024).fill(83)], 'one-mib.bin', { type: 'application/octet-stream' }));
  }, note.id);
  const start = Date.now(); await open(page, note.id);
  const body = page.getByRole('textbox', { name: '노트 본문', exact: true });
  await expect(body.locator('p')).toHaveCount(1000);
  await body.click(); await body.press('Control+End'); await body.press('Enter'); await body.press('Control+b'); await body.pressSequentially('Retained browser addition.');
  const saveStart = Date.now(); await page.getByRole('button', { name: '저장', exact: true }).click();
  await expect(page.getByRole('button', { name: '저장', exact: true })).toBeDisabled();
  const savedMs = Date.now() - saveStart; await page.reload();
  await expect(body.locator('p')).toHaveCount(1001); await expect(body.locator('p').last()).toHaveText('Retained browser addition.');
  expect(await body.locator('strong').count()).toBe(1000);
  const saved = await page.evaluate(id => window.noteExample.api.note(id), note.id);
  expect(saved.revision).toBe(3); expect(saved.bodyJson.content![500].content![0].marks).toEqual([{ type: 'bold' }]);
  await page.getByRole('button', { name: '페이지 메뉴', exact: true }).click();
  await page.getByRole('menuitem', { name: '첨부파일', exact: true }).click();
  const downloading = page.waitForEvent('download'); await page.getByRole('button', { name: 'one-mib.bin', exact: true }).click();
  const download = await downloading; expect(download.suggestedFilename()).toBe('one-mib.bin');
  const bytes = await readFile((await download.path())!);
  expect(bytes.length).toBe(1024 * 1024);
  expect(createHash('sha256').update(bytes).digest('hex')).toBe(createHash('sha256').update(Buffer.alloc(1024 * 1024, 83)).digest('hex'));
  await writeFile('.tmp/independent-large-document.json', JSON.stringify({ paragraphs: 1000, jsonBytes: Buffer.byteLength(JSON.stringify(saved.bodyJson)), browserOpenEditSaveReloadMs: Date.now() - start, saveMs: savedMs, downloadBytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex'), boundary: 'Warm single-user localStorage example; not KMS 20 MiB native-download or peak-memory acceptance' }, null, 2));
});

for (const panel of ['comments', 'history'] as const) test(`retries an unavailable ${panel} projection without showing an empty success`, async ({ page }) => {
  const note = await create(page, 'Projection recovery'); await open(page, note.id);
  await page.evaluate(async panel => {
    const entry = '/note-gui/note-gui.js'; const gui: typeof import('../src/index') = await import(entry);
    const { api, access, host, mounted } = window.noteExample; mounted.unmount();
    let unavailable = true;
    window.addEventListener('fixture-recover-projection', () => { unavailable = false; });
    const client: NoteCoreApi = { ...api, [panel]: async () => { if (unavailable) throw new gui.ApiError('Projection unavailable', 'NETWORK'); return { items: [], nextCursor: null }; } };
    window.noteExample = { api: client, access, host, mounted: gui.mountNoteCoreGui(document.getElementById('notes')!, { api: client, host }) };
  }, panel);
  const body = page.getByRole('textbox', { name: '노트 본문', exact: true }); await body.fill('Keep the independent body draft.');
  await page.getByRole('button', { name: '댓글 및 노트 상세', exact: true }).click();
  if (panel === 'history') await page.getByRole('tab', { name: '이력', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveText('Projection unavailable');
  const empty = panel === 'comments' ? '아직 댓글이 없습니다.' : '아직 저장된 페이지 기록이 없습니다.';
  const projection = page.locator('.note-detail-panels .note-panel-content').filter({ visible: true });
  await expect(projection).not.toContainText(empty);
  const comment = page.getByRole('textbox', { name: '댓글', exact: true });
  if (panel === 'comments') await comment.fill('Retain the unsent comment through read retry.');
  await page.evaluate(() => window.dispatchEvent(new Event('fixture-recover-projection')));
  await page.getByRole('button', { name: '노트 상세 다시 읽기', exact: true }).click();
  await expect(projection).toContainText(empty);
  await expect(page.getByRole('alert')).toHaveCount(0);
  await expect(body).toHaveText('Keep the independent body draft.');
  if (panel === 'comments') await expect(comment).toHaveText('Retain the unsent comment through read retry.');
  expect((await page.evaluate(id => window.noteExample.api.note(id), note.id)).revision).toBe(1);
});

test('retains an unsaved comment editor through an injected access refresh', async ({ page }) => {
  const note = await create(page, 'Comment draft'); await open(page, note.id);
  await page.getByRole('button', { name: '댓글 및 노트 상세', exact: true }).click();
  const comment = page.getByRole('textbox', { name: '댓글', exact: true });
  await comment.fill('Unsaved comment must survive.');
  await page.evaluate(async () => window.noteExample.access.refresh());
  await expect(comment).toHaveText('Unsaved comment must survive.');
  await page.getByRole('tab', { name: '속성', exact: true }).click();
  await page.getByRole('button', { name: '속성 추가', exact: true }).click();
  const property = page.getByRole('textbox', { name: '속성 이름', exact: true });
  await property.fill('Unsaved property');
  await page.evaluate(async () => window.noteExample.access.refresh());
  await expect(property).toHaveValue('Unsaved property');
});

test('refreshes the open note metadata after a core-only tree move', async ({ page }) => {
  const note = await create(page, 'Move child'); const parent = await create(page, 'Move parent'); await open(page, note.id);
  await page.getByRole('checkbox', { name: 'Move child 선택', exact: true }).check();
  await page.locator('summary').filter({ hasText: /^선택한 노트 이동/ }).click();
  await page.getByRole('textbox', { name: '대상 상위 노트 (선택하지 않으면 루트)', exact: true }).fill('Move parent');
  await page.getByRole('button', { name: 'Move parent', exact: true }).click();
  await page.getByRole('button', { name: '선택 노트 이동', exact: true }).click();
  await expect(page.locator('.note-body-status')).toContainText('개정 2');
  expect((await page.evaluate(id => window.noteExample.api.note(id), note.id)).parentId).toBe(parent.id);
});

test('mounts both named extensions, resolves actual host destinations and preserves drafts on extension failure', async ({ page }) => {
  const note = await create(page, 'Full context document'); await open(page, note.id);
  await page.evaluate(async () => {
    const entry = '/note-gui/note-gui.js';
    const gui: typeof import('../src/index') = await import(entry);
    const { api, access, mounted } = window.noteExample;
    let unavailable = false; let epoch = 1;
    window.addEventListener('fixture-deny-context', () => { unavailable = true; });
    window.addEventListener('fixture-bump-space-epoch', () => { epoch++; });
    const check = () => { if (unavailable) throw new Error('Optional context unavailable'); };
    mounted.unmount();
    const host = { access, destinations: { home: '/example/', resolve: () => '/example/?destination=authorized-context' } };
    const client = { ...api, spaces: async () => (await api.spaces()).map(space => ({ ...space, accessEpoch: epoch })) };
    window.noteExample.api = client; window.noteExample.host = host;
    window.noteExample.mounted = gui.mountNoteCoreGui(document.getElementById('notes')!, {
      api: client, host,
      knowledgeContext: {
        provenance: async () => { check(); return { sources: [{ revisionId: 'source', spaceId: 'local', title: 'Authorized original' }], rules: [], reviews: [], actions: [] }; },
        accumulations: async () => { check(); return { items: [], nextCursor: null }; },
        currentKnowledge: async () => { check(); return { noteId: new URLSearchParams(location.search).get('note')!, revision: 1, bodyOrigin: 'HUMAN', items: [{ id: 'claim', claimKind: 'CONFIRMED_FACT', body: 'Authorized current statement.', resultRevision: 1, appliedAt: '2026-10-31T00:00:00Z', evidenceCount: 0, evidence: [], rules: [] }], nextCursor: null }; },
        accumulationChange: async () => { throw new Error('No comparison requested in this fixture'); },
      },
      relations: {
        findRelationNotes: async noteId => { check(); return { noteId, total: 0, items: [], nextCursor: null }; },
        relations: async () => { check(); return { items: [], nextCursor: null }; },
        relationEvidence: async () => { check(); return { items: [], nextCursor: null }; },
        relate: async () => { throw new Error('No write requested in this fixture'); },
        decideRelation: async () => { throw new Error('No decision requested in this fixture'); },
      },
    });
  });
  const body = page.getByRole('textbox', { name: '노트 본문', exact: true });
  await body.fill('Keep full-host unsaved text.');
  await page.getByRole('button', { name: '지식 정보', exact: true }).click();
  await expect(page.getByText('Authorized current statement.', { exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Authorized original', exact: true })).toHaveAttribute('href', '/example/?destination=authorized-context');
  await page.screenshot({ path: '.tmp/full-context-1600.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 1000 });
  await page.waitForFunction(() => document.getElementById('page-navigation')!.getBoundingClientRect().right <= 1);
  await page.evaluate(async () => { await Promise.all(document.getAnimations().map(animation => animation.finished.catch(() => {}))); });
  await expect(page.getByText('Authorized current statement.', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  await page.screenshot({ path: '.tmp/full-context-390.png', fullPage: true });
  await page.setViewportSize({ width: 1600, height: 1000 });
  const editorHandle = await body.elementHandle();
  await page.evaluate(() => {
    window.dispatchEvent(new Event('fixture-deny-context')); window.dispatchEvent(new Event('fixture-bump-space-epoch')); window.dispatchEvent(new Event('focus'));
  });
  for (const name of ['현재 정리', '누적 이력', '출처·규칙·검토·업무 연결']) await expect(page.getByRole('region', { name, exact: true })).toContainText('Optional context unavailable');
  await expect(body).toBeVisible(); await expect(body).toBeEditable();
  expect(await body.evaluate((element, original) => element === original, editorHandle)).toBe(true);
  await expect(page.getByRole('button', { name: '접근 권한 다시 확인', exact: true })).toHaveCount(0);
  await body.press('End'); await body.pressSequentially(' Still editable.');
  const failure = await page.evaluate(async () => {
    window.dispatchEvent(new Event('fixture-deny-context'));
    try { await window.noteExample.access.refresh(); return null; } catch (error) { return (error as Error).message; }
  });
  expect(failure).toBe('Optional context unavailable');
  for (const name of ['현재 정리', '누적 이력', '출처·규칙·검토·업무 연결']) await expect(page.getByRole('region', { name, exact: true })).toContainText('Optional context unavailable');
  await expect(page.getByText('Authorized current statement.', { exact: true })).toHaveCount(0);
  await expect(body).toHaveText('Keep full-host unsaved text. Still editable.');
  await page.getByRole('button', { name: '페이지 메뉴', exact: true }).click();
  await page.getByRole('menuitem', { name: '관계', exact: true }).click();
  await expect(page.getByText('아직 관계가 없습니다.', { exact: true })).toHaveCount(0);
});

for (const width of [1600, 390]) test(`preserves Docmost shell and independent dirty panes at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 1000 });
  const note = await create(page, 'Document-centered editor'); await open(page, note.id);
  const body = page.getByRole('textbox', { name: '노트 본문', exact: true });
  await body.fill('Unsaved left document.');
  if (width === 1600) {
    await page.getByRole('button', { name: '두 창으로', exact: true }).click();
    await create(page, 'Right document');
    await page.locator('label').filter({ hasText: /^오른쪽 창$/ }).click();
    await page.getByRole('button', { name: '노트 검색', exact: true }).first().click();
    await page.getByRole('textbox', { name: '노트 제목', exact: true }).last().fill('Right document');
    await page.getByRole('button', { name: 'Right document', exact: true }).click();
    await expect(page.locator('.note-gui-pane').last().getByRole('textbox', { name: '노트 본문', exact: true })).toBeVisible();
    await expect(page.locator('.note-gui-pane').first().getByRole('textbox', { name: '노트 본문', exact: true })).toHaveText('Unsaved left document.');
  }
  const draft = page.locator('.note-gui-pane').first().getByRole('textbox', { name: '노트 본문', exact: true });
  await page.getByRole('button', { name: '페이지 탐색', exact: true }).filter({ visible: true }).click();
  await page.getByRole('button', { name: '페이지 탐색', exact: true }).filter({ visible: true }).click();
  await expect(draft).toHaveText('Unsaved left document.');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  await page.mouse.move(width - 10, 700);
  await page.evaluate(async () => { await Promise.all(document.getAnimations().map(animation => animation.finished.catch(() => {}))); });
  await page.screenshot({ path: `.tmp/independent-${width}.png`, fullPage: true });
  if (width === 390) {
    await page.getByRole('button', { name: '페이지 탐색', exact: true }).filter({ visible: true }).click();
    await page.evaluate(async () => { await Promise.all(document.getAnimations().map(animation => animation.finished.catch(() => {}))); });
    await page.screenshot({ path: '.tmp/independent-390-navigation.png', fullPage: true });
  }
  await page.evaluate(() => window.noteExample.access.revoke());
  await expect(page.getByRole('textbox', { name: '노트 본문', exact: true })).toHaveCount(0);
  await expect(page.getByText('Unsaved left document.')).toHaveCount(0);
});

test('preserves a configured iframe native document and pending autosave through refresh and saves the successor', async ({ page }) => {
  const fixtureRoot = resolve('.tmp/drawio-dist');
  await page.route('**/drawio-note-gui/**', async route => {
    const path = resolve(fixtureRoot, new URL(route.request().url()).pathname.slice('/drawio-note-gui/'.length));
    if (!path.startsWith(fixtureRoot + sep)) throw new Error('Unexpected diagram fixture asset path.');
    await route.fulfill({ path });
  });
  await page.route('https://drawio.example.test/**', route => route.fulfill({ contentType: 'text/html', body: `<!doctype html><html><body>
    <textarea aria-label="Native diagram XML"></textarea><script>
    window.nativeToken = crypto.randomUUID(); window.undoStack = [];
    const input = document.querySelector('textarea');
    input.addEventListener('input', () => window.undoStack.push(input.value));
    addEventListener('message', event => { if (event.source !== parent) return; const message = JSON.parse(event.data); if (message.action === 'load') input.value = message.xml; });
    parent.postMessage(JSON.stringify({ event: 'init' }), 'http://127.0.0.1:18139');
    </script></body></html>` }));
  let frameNavigations = 0;
  page.on('framenavigated', frame => { if (frame.url().startsWith('https://drawio.example.test/')) frameNavigations++; });
  const original = '<mxfile><diagram name="Original"><mxGraphModel><root/></mxGraphModel></diagram></mxfile>';
  const changed = '<mxfile><diagram name="Unsent native change"><mxGraphModel><root><mxCell id="retained"/></root></mxGraphModel></diagram></mxfile>';
  const fixture = await page.evaluate(async original => {
    window.noteExample.mounted.unmount();
    const entry = '/drawio-note-gui/note-gui.js'; const gui: typeof import('../src/index') = await import(entry);
    const api = gui.createLocalNoteApi({ namespace: 'native-drawio-fixture' });
    const note = await api.create({ spaceId: 'local', title: 'Configured diagram', parentId: null, visibility: 'PRIVATE', idempotencyKey: 'configured-diagram' });
    const file = await api.upload(note.id, new File([original], 'original.drawio', { type: 'application/vnd.jgraph.mxfile' }));
    await api.save(note.id, { title: note.title, expectedRevision: note.revision, idempotencyKey: 'initial-diagram', bodyJson: { type: 'doc', content: [{ type: 'drawio', attrs: { fileId: file.attachmentId } }] } });
    let hold = false; let release: (() => void) | undefined; let gate = Promise.resolve();
    window.addEventListener('fixture-hold-diagram', () => { hold = true; gate = new Promise(resolve => { release = resolve; }); });
    window.addEventListener('fixture-release-diagram', () => { hold = false; release?.(); });
    const client = { ...api, attachment: async (id: string, revision: number) => { if (hold) await gate; return api.attachment(id, revision); } };
    const access = gui.createNoteAccess(); const host = { access, destinations: {} };
    history.replaceState(null, '', '?space=local&note=' + note.id);
    window.noteExample = { api: client, access, host, mounted: gui.mountNoteCoreGui(document.getElementById('notes')!, { api: client, host }) };
    return { noteId: note.id, originalFile: file.attachmentId };
  }, original);
  await page.getByRole('button', { name: '다이어그램 편집', exact: true }).click();
  const iframe = page.locator('iframe[title="Draw.io editor"]');
  const frame = page.frameLocator('iframe[title="Draw.io editor"]');
  const input = frame.getByRole('textbox', { name: 'Native diagram XML' }); await expect(input).toHaveValue(original);
  await input.fill(changed);
  const nativeBefore = await iframe.evaluate(element => {
    const frame = element as HTMLIFrameElement; return { src: frame.src };
  });
  const nativeFrame = page.frames().find(frame => frame.url().startsWith('https://drawio.example.test/'))!;
  const state = await nativeFrame.evaluate(() => ({ token: Reflect.get(window, 'nativeToken'), undo: Reflect.get(window, 'undoStack') }));
  await page.evaluate(() => window.dispatchEvent(new Event('fixture-hold-diagram')));
  let finished = false;
  const refreshing = page.evaluate(async () => window.noteExample.access.refresh()).then(() => { finished = true; });
  await expect(page.getByRole('dialog', { name: 'Draw.io', exact: true })).toBeHidden();
  expect(finished).toBe(false);
  await expect(iframe).toHaveAttribute('src', nativeBefore.src);
  const delivered = page.evaluate(() => new Promise<void>(resolve => {
    function receive(event: MessageEvent) {
      if (event.origin === 'https://drawio.example.test' && event.source === document.querySelector('iframe')?.contentWindow && JSON.parse(event.data).event === 'autosave') { window.removeEventListener('message', receive); resolve(); }
    }
    window.addEventListener('message', receive);
  }));
  const posted = await nativeFrame.evaluate(() => {
    const input = document.querySelector('textarea')!;
    parent.postMessage(JSON.stringify({ event: 'autosave', xml: input.value }), 'http://127.0.0.1:18139');
    return input.value;
  });
  await delivered; expect(posted).toBe(changed);
  await page.evaluate(() => window.dispatchEvent(new Event('fixture-release-diagram'))); await refreshing;
  await expect(page.getByLabel('Draw.io XML', { exact: true })).toHaveValue(changed);
  await expect(input).toBeVisible(); await expect(input).toHaveValue(changed);
  expect(await nativeFrame.evaluate(() => ({ token: Reflect.get(window, 'nativeToken'), undo: Reflect.get(window, 'undoStack') }))).toEqual(state);
  expect(frameNavigations).toBe(1); await expect(iframe).toHaveAttribute('src', nativeBefore.src);
  await page.getByRole('button', { name: '첨부 개정 저장 후 노트에 적용', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Draw.io', exact: true })).toBeHidden();
  await page.getByRole('button', { name: '저장', exact: true }).click(); await expect(page.getByRole('button', { name: '저장', exact: true })).toBeDisabled();
  const saved = await page.evaluate(async id => {
    const note = await window.noteExample.api.note(id); const fileId = String(note.bodyJson.content![0].attrs!.fileId);
    return { fileId, source: await (await window.noteExample.api.attachment(fileId, 1)).text() };
  }, fixture.noteId);
  expect(saved.fileId).not.toBe(fixture.originalFile); expect(saved.source).toBe(changed);
});

test('awaits selected and paged relation-query replacements and retains the core draft after target denial', async ({ page }) => {
  const note = await create(page, 'Relation refresh authority'); await open(page, note.id);
  await page.evaluate(async () => {
    const entry = '/note-gui/note-gui.js'; const gui: typeof import('../src/index') = await import(entry);
    const { api, mounted } = window.noteExample; mounted.unmount();
    const access = gui.createNoteAccess(); const host = { access, destinations: {} };
    let mode: 'selected' | 'paged' | null = null; let deny = false; let release: (() => void) | undefined; let gate = Promise.resolve();
    window.addEventListener('fixture-prepare-targets', () => { mode = null; });
    window.addEventListener('fixture-hold-targets', event => {
      const detail = (event as CustomEvent<{ mode: 'selected' | 'paged'; deny: boolean }>).detail;
      mode = detail.mode; deny = detail.deny; Reflect.set(window, 'targetReplacementStarted', false);
      gate = new Promise(resolve => { release = resolve; });
    });
    window.addEventListener('fixture-release-targets', () => release?.());
    window.noteExample = { api, access, host, mounted: gui.mountNoteCoreGui(document.getElementById('notes')!, {
      api, host, relations: {
        findRelationNotes: async (noteId, _query, cursor) => {
          if (!mode) return { noteId, total: 21, nextCursor: cursor ? null : '20', items: [{ id: cursor ? 'later' : 'chosen', title: cursor ? 'Later private target' : 'Chosen private target' }] };
          const oldSnapshot = mode === 'selected'
            ? [...document.querySelectorAll('.note-picker strong')].some(element => element.textContent === 'Chosen private target')
            : [...document.querySelectorAll('.note-picker span')].some(element => element.textContent === '2페이지');
          if (oldSnapshot) return { noteId, total: 1, nextCursor: null, items: [{ id: 'retired', title: 'Retired reset response' }] };
          Reflect.set(window, 'targetReplacementStarted', true); await gate;
          if (deny) throw new gui.ApiError('Current relation target denied', 'FORBIDDEN');
          return { noteId, total: 1, nextCursor: null, items: [{ id: 'current', title: 'Current authorized target' }] };
        },
        relations: async () => ({ items: [], nextCursor: null }), relationEvidence: async () => ({ items: [], nextCursor: null }),
        relate: async () => { throw new Error('No relation write is expected'); }, decideRelation: async () => { throw new Error('No decision is expected'); },
      },
    }) };
  });
  const body = page.getByRole('textbox', { name: '노트 본문', exact: true }); await body.fill('Relation refresh core draft.');
  await page.getByRole('button', { name: '페이지 메뉴', exact: true }).click(); await page.getByRole('menuitem', { name: '관계', exact: true }).click();
  const query = page.getByLabel('연결할 노트', { exact: true });
  for (const mode of ['selected', 'paged'] as const) {
    await page.evaluate(() => window.dispatchEvent(new Event('fixture-prepare-targets')));
    const text = mode === 'selected' ? 'private' : 'paged lookup'; await query.fill(text);
    await page.getByRole('button', { name: 'Chosen private target', exact: true }).waitFor();
    if (mode === 'selected') await page.getByRole('button', { name: 'Chosen private target', exact: true }).click();
    else { await page.getByRole('button', { name: '다음 대상', exact: true }).click(); await expect(page.getByText('2페이지', { exact: true })).toBeVisible(); }
    await page.evaluate(mode => window.dispatchEvent(new CustomEvent('fixture-hold-targets', { detail: { mode, deny: mode === 'paged' } })), mode);
    let settled = false;
    const pending = page.evaluate(async () => {
      try { await window.noteExample.access.refresh(); return { code: null, message: null }; }
      catch (error) { return { code: (error as { code: string }).code, message: (error as Error).message }; }
    }).then(result => { settled = true; return result; });
    let result: Awaited<typeof pending>;
    try { await page.waitForFunction(() => Reflect.get(window, 'targetReplacementStarted')); expect(settled).toBe(false); }
    finally { await page.evaluate(() => window.dispatchEvent(new Event('fixture-release-targets'))); result = await pending; }
    await expect(query).toHaveValue(text); await expect(page.getByText('Retired reset response', { exact: true })).toHaveCount(0);
    if (mode === 'selected') { expect(result.code).toBeNull(); await expect(page.getByRole('button', { name: 'Current authorized target', exact: true })).toBeVisible(); }
    else { expect(result).toEqual({ code: 'FORBIDDEN', message: 'Current relation target denied' }); await expect(page.getByRole('alert')).toHaveText('Current relation target denied'); }
    await expect(body).toBeVisible(); await expect(body).toBeEditable(); await expect(body).toHaveText('Relation refresh core draft.');
  }
});
