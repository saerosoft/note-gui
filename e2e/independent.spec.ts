import { test, expect, type Page } from '@playwright/test';
import type { NoteCoreApi } from '../src/model';
import type { MountedNoteGui, NoteHost } from '../src/host';
import type { NoteAccessController } from '../src/access';
import { resolve, sep } from 'node:path';

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
