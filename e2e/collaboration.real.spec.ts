import { expect, test, type Browser } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { extname, resolve, sep } from 'node:path';
import type { MountedNoteGui } from '../src/host';
import type { NoteApi } from '../src/model';
import type { NoteAssociationsApi } from '../src/collaboration';

interface Fixture {
  origin: string; leaseDeadline: string;
  sessions: Record<'owner' | 'member' | 'outsider', string>;
  users: Record<'owner' | 'member' | 'outsider', { id: string }>;
  controlled: { spaceId: string }; shared: { spaceId: string };
  notes: Record<'controlledAnchor' | 'controlledPrivate' | 'sharedAnchor' | 'sharedTarget', { id: string }>;
}
const fixturePath = process.env.NOTE_GUI_COLLABORATION_FIXTURE;
const fixture = fixturePath ? JSON.parse(readFileSync(fixturePath, 'utf8')) as Fixture : undefined;
const dist = resolve(process.env.NOTE_GUI_E2E_PACKAGED_DIST || 'dist');
declare global { interface Window { realGui: { api: NoteApi; associations: NoteAssociationsApi; mounted: MountedNoteGui; refresh: () => Promise<void> } } }
test.skip(!fixture, 'Requires a new authorized isolated collaboration fixture lease.');
test.beforeEach(() => { expect(Date.now(), 'The isolated fixture lease must still be valid').toBeLessThan(Date.parse(fixture!.leaseDeadline)); });

async function open(browser: Browser, actor: keyof Fixture['sessions'], noteId: string, spaceId: string) {
  const context = await browser.newContext({ storageState: fixture!.sessions[actor], viewport: { width: 1600, height: 1000 } });
  const page = await context.newPage();
  await page.route('**/note-gui/**', async route => {
    const path = resolve(dist, decodeURIComponent(new URL(route.request().url()).pathname.slice('/note-gui/'.length)));
    if (!path.startsWith(dist + sep)) { await route.abort(); return; }
    const type = ({ '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2' } as Record<string, string>)[extname(path)] || 'application/octet-stream';
    await route.fulfill({ path, contentType: type, headers: { 'Cache-Control': 'no-store' } });
  });
  // Only static library bytes are supplied locally; every API/storage response comes from the leased server.
  await page.goto(`${fixture!.origin}/api/csrf`);
  await page.setContent('<!doctype html><html lang="ko"><head><meta charset="utf-8"><link rel="stylesheet" href="/note-gui/note-gui.css"></head><body><div id="notes"></div></body></html>');
  await page.evaluate(async ({ noteId, spaceId }) => {
    window.history.replaceState(null, '', `/notes/?${new URLSearchParams({ note: noteId, space: spaceId })}`);
    const root = '/note-gui/note-gui.js'; const adapter = '/note-gui/kms.js';
    const gui: typeof import('../src/index') = await import(root); const kms: typeof import('../src/kms') = await import(adapter);
    const mounted = gui.mountNoteCoreGui(document.getElementById('notes')!, { api: kms.kmsNoteApi, host: kms.createKmsNoteHost(), policy: kms.kmsNotePolicy, associations: kms.kmsNoteAssociations });
    window.realGui = { api: kms.kmsNoteApi, associations: kms.kmsNoteAssociations, mounted, refresh: kms.refreshAccess };
  }, { noteId, spaceId });
  await expect(page.getByRole('textbox', { name: '노트 본문', exact: true })).toBeVisible();
  return { context, page };
}

test('persists shared-member rich edits, comments, properties, actual history actors and protected file bytes through the real KMS adapter', async ({ browser }) => {
  const { context, page } = await open(browser, 'member', fixture!.notes.sharedAnchor.id, fixture!.shared.spaceId);
  try {
    await expect(page.locator('.note-body-status')).toContainText('조직 구성원 공유');
    await page.getByRole('button', { name: '새 페이지', exact: true }).click();
    await expect(page.getByRole('combobox', { name: '공유 범위', exact: true })).toHaveCount(0);
    await page.getByRole('textbox', { name: '새 노트 제목', exact: true }).fill('Shared GUI real acceptance');
    await page.getByRole('button', { name: '현재 경로에 만들기', exact: true }).click();
    await expect(page.getByRole('tab', { name: 'Shared GUI real acceptance', exact: true })).toBeVisible();
    const noteId = new URL(page.url()).searchParams.get('note')!;
    const body = page.getByRole('textbox', { name: '노트 본문', exact: true });
    await body.fill('Real shared GUI authored text.');
    await expect.poll(() => page.evaluate(() => window.realGui.mounted.hasUnsavedChanges())).toBe(true);
    await page.getByRole('button', { name: '저장', exact: true }).click();
    await expect.poll(() => page.evaluate(() => window.realGui.mounted.hasUnsavedChanges())).toBe(false);
    const saved = await page.evaluate(id => window.realGui.api.note(id), noteId);
    expect(saved.visibility).toBe('SPACE'); expect(saved.revision).toBe(2); expect(JSON.stringify(saved.bodyJson)).toContain('Real shared GUI authored text.');
    await page.getByRole('button', { name: '댓글 및 노트 상세', exact: true }).click();
    const comment = page.getByRole('textbox', { name: '댓글', exact: true });
    await expect(comment).toHaveAttribute('contenteditable', 'true');
    await comment.fill('Real member comment.');
    await page.getByRole('button', { name: '댓글 남기기', exact: true }).click();
    await expect(page.getByText('Real member comment.', { exact: true })).toBeVisible();
    await page.getByRole('tab', { name: '속성', exact: true }).click();
    await page.getByRole('button', { name: '속성 추가', exact: true }).click();
    await page.getByRole('textbox', { name: '속성 이름', exact: true }).fill('Real property');
    await page.getByLabel('값', { exact: true }).fill('Authoritative value');
    await page.getByRole('button', { name: '이 속성 저장', exact: true }).click();
    await expect(page.getByText('속성 변경을 저장했습니다.', { exact: true })).toBeVisible();
    await page.getByRole('tab', { name: '이력', exact: true }).click();
    const history = await page.evaluate(id => window.realGui.api.history(id, null), noteId);
    expect(history.items.length).toBeGreaterThan(1);
    for (const revision of history.items) {
      if (revision.editorName) await expect(page.getByText(`편집자: ${revision.editorName}`, { exact: true }).first()).toBeVisible();
    }
    const file = await page.evaluate(async id => {
      const attachment = await window.realGui.api.upload(id, new File(['owned protected file bytes'], 'gui-08.txt', { type: 'text/plain' }));
      return { ...attachment, content: await (await window.realGui.api.attachment(attachment.attachmentId, attachment.revision)).text() };
    }, noteId);
    expect(file.content).toBe('owned protected file bytes');
    const outsider = await browser.newContext({ storageState: fixture!.sessions.outsider });
    try {
      const denied = await outsider.request.get(`${fixture!.origin}/api/files/${file.attachmentId}`);
      expect(denied.status()).toBe(403); expect(await denied.text()).not.toContain(file.content);
    } finally { await outsider.close(); }
  } finally { await context.close(); }
});

test('keeps shared association creator and identity across another actor unlink, original receipt replay and relink', async ({ browser }) => {
  const seed = await open(browser, 'owner', fixture!.notes.sharedAnchor.id, fixture!.shared.spaceId);
  const { anchor, target } = await seed.page.evaluate(async spaceId => {
    const create = (title: string) => window.realGui.api.create({ spaceId, title, visibility: 'SPACE', parentId: null, idempotencyKey: crypto.randomUUID() });
    return { anchor: (await create(`Owned receipt anchor ${crypto.randomUUID().slice(0, 8)}`)).id, target: (await create(`Owned receipt target ${crypto.randomUUID().slice(0, 8)}`)).id };
  }, fixture!.shared.spaceId);
  await seed.context.close();
  const owner = await open(browser, 'owner', anchor, fixture!.shared.spaceId);
  const member = await open(browser, 'member', anchor, fixture!.shared.spaceId);
  try {
    const targetNote = await owner.page.evaluate(id => window.realGui.api.note(id), target);
    await owner.page.getByRole('button', { name: '페이지 메뉴', exact: true }).click(); await owner.page.getByRole('menuitem', { name: '노트 연결', exact: true }).click();
    const panel = owner.page.getByRole('region', { name: '노트 연결', exact: true });
    await panel.getByRole('button', { name: targetNote.title, exact: true }).click();
    const request = owner.page.waitForRequest(value => value.method() === 'POST' && value.url().endsWith('/graphql') && value.postDataJSON()?.query?.includes('setKnowledgePersonalNote'));
    await panel.getByRole('button', { name: '연결', exact: true }).click();
    const input = (await request).postDataJSON().variables.input;
    await expect(panel.getByRole('button', { name: '연결 해제', exact: true })).toBeVisible();
    const original = await owner.page.evaluate(id => window.realGui.associations.list(id, null), anchor);
    expect(original.items[0].creatorId).toBe(fixture!.users.owner.id);
    await member.page.getByRole('button', { name: '페이지 메뉴', exact: true }).click(); await member.page.getByRole('menuitem', { name: '노트 연결', exact: true }).click();
    const peerPanel = member.page.getByRole('region', { name: '노트 연결', exact: true });
    await peerPanel.getByRole('button', { name: '연결 해제', exact: true }).click();
    await expect(peerPanel.getByText('연결된 노트가 없습니다.', { exact: true })).toBeVisible();
    const replay = await owner.page.evaluate(({ anchor, target, input }) => window.realGui.associations.set(anchor, { targetNoteId: target, expectedRevision: input.expectedRevision, linked: input.linked, requestId: input.requestId }), { anchor, target, input });
    expect(replay).toMatchObject({ id: original.items[0].id, revision: 1, linked: true });
    const current = await owner.page.evaluate(({ anchor, target }) => window.realGui.associations.state(anchor, target), { anchor, target });
    expect(current).toMatchObject({ id: original.items[0].id, revision: 2, linked: false });
    await owner.page.evaluate(() => window.realGui.refresh());
    await panel.getByRole('button', { name: targetNote.title, exact: true }).click(); await panel.getByRole('button', { name: '연결', exact: true }).click();
    await expect(panel.getByRole('button', { name: '연결 해제', exact: true })).toBeVisible();
    const relinked = await owner.page.evaluate(id => window.realGui.associations.list(id, null), anchor);
    expect(relinked.items[0]).toMatchObject({ id: original.items[0].id, revision: 3, creatorId: fixture!.users.owner.id });
  } finally { await Promise.all([owner.context.close(), member.context.close()]); }
});

test('links a controlled member private target while its shared anchor remains read-only', async ({ browser }) => {
  const anchor = fixture!.notes.controlledAnchor.id;
  const { context, page } = await open(browser, 'member', anchor, fixture!.controlled.spaceId);
  try {
    await expect(page.getByRole('textbox', { name: '노트 본문', exact: true })).toHaveAttribute('contenteditable', 'false');
    const targetNote = await page.evaluate(spaceId => window.realGui.api.create({ spaceId, title: `Owned controlled private target ${crypto.randomUUID().slice(0, 8)}`, visibility: 'PRIVATE', parentId: null, idempotencyKey: crypto.randomUUID() }), fixture!.controlled.spaceId);
    await page.getByRole('button', { name: '페이지 메뉴', exact: true }).click(); await page.getByRole('menuitem', { name: '노트 연결', exact: true }).click();
    const panel = page.getByRole('region', { name: '노트 연결', exact: true });
    await panel.getByRole('button', { name: targetNote.title, exact: true }).click(); await panel.getByRole('button', { name: '연결', exact: true }).click();
    await expect(panel.getByRole('button', { name: '연결 해제', exact: true })).toBeVisible();
    const linked = await page.evaluate(id => window.realGui.associations.list(id, null), anchor);
    expect(linked.items.find(item => item.targetNoteId === targetNote.id)?.creatorId).toBe(fixture!.users.member.id);
    await expect(page.getByRole('button', { name: '저장', exact: true })).toBeDisabled();
  } finally { await context.close(); }
});
