import { expect, test } from '@playwright/test';
import type { CurrentKnowledgeItem, Note, NoteAccumulation, NoteKnowledgeContextApi, NoteRelationsApi, Relation, RelationEvidence } from '../src/model';

test('requires relation readback before offering another keyless write after an uncertain acknowledgement', async ({ page }) => {
  await page.goto('./'); await page.waitForFunction(() => !!window.noteExample);
  await page.evaluate(async () => {
    const entry = '/note-gui/note-gui.js'; const gui: typeof import('../src/index') = await import(entry);
    const { api, access, host, mounted } = window.noteExample; mounted.unmount();
    const anchor = await api.create({ spaceId: 'local', title: 'Uncertain relation anchor', parentId: null, visibility: 'SPACE', idempotencyKey: crypto.randomUUID() });
    const peer = await api.create({ spaceId: 'local', title: 'Uncertain relation peer', parentId: null, visibility: 'SPACE', idempotencyKey: crypto.randomUUID() });
    const rows: Relation[] = []; let writes = 0; Reflect.set(window, 'uncertainRelationWrites', 0);
    const relations: NoteRelationsApi = {
      findRelationNotes: async noteId => ({ noteId, total: 1, items: [{ id: peer.id, title: peer.title }], nextCursor: null }),
      relations: async () => ({ items: rows, nextCursor: null }), relationEvidence: async () => ({ items: [], nextCursor: null }),
      relate: async (_id, targetNoteId, predicate, validity) => { writes++; Reflect.set(window, 'uncertainRelationWrites', writes); rows.push({ id: crypto.randomUUID(), targetNoteId, title: peer.title, predicate, ...validity, legacyPredicate: null, kind: 'RECORDED', reviewState: 'ACCEPTED', revision: 1, evidenceCount: 0, provenance: 'Committed controlled fixture relation', actorLabel: 'Fixture editor', direction: 'OUTGOING' }); throw new gui.ApiError('Relation acknowledgement lost after commit', 'NETWORK'); },
      decideRelation: async () => { throw new gui.ApiError('No proposed relation is present', 'INVALID_INPUT'); },
    };
    history.replaceState(null, '', `?space=local&note=${anchor.id}`);
    window.noteExample = { api, access, host, mounted: gui.mountNoteCoreGui(document.getElementById('notes')!, { api, host, relations }) };
  });
  const body = page.getByRole('textbox', { name: '노트 본문', exact: true }); await body.fill('Keep this author draft after the uncertain relation.');
  await page.getByRole('button', { name: '페이지 메뉴', exact: true }).click(); await page.getByRole('menuitem', { name: '관계', exact: true }).click();
  await page.getByRole('button', { name: 'Uncertain relation peer', exact: true }).click();
  await page.getByRole('button', { name: '관계 추가', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveText('Relation acknowledgement lost after commit');
  await expect(page.getByRole('button', { name: '관계 추가', exact: true, includeHidden: true })).toBeDisabled();
  await page.getByRole('button', { name: '관계 다시 읽기', exact: true }).click();
  await expect(page.getByText('Committed controlled fixture relation', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '관계 추가', exact: true })).toBeDisabled();
  expect(await page.evaluate(() => Reflect.get(window, 'uncertainRelationWrites'))).toBe(1);
  await expect(body).toHaveText('Keep this author draft after the uncertain relation.');
});

test('navigates controlled current/history and relation proof pages through exact injected destinations while retaining an authored draft', async ({ page, context }) => {
  await page.goto('./'); await page.waitForFunction(() => !!window.noteExample);
  await context.route('http://127.0.0.1:18139/consumer/**', async route => {
    const url = new URL(route.request().url());
    const body = url.searchParams.get('kind') === 'source'
      ? await page.evaluate(async id => (await window.noteExample.api.attachment(id!, 1)).text(), url.searchParams.get('revisionId'))
      : url.searchParams.toString();
    await route.fulfill({ contentType: 'text/plain', body });
  });
  const fixture = await page.evaluate(async () => {
    const entry = '/note-gui/note-gui.js'; const gui: typeof import('../src/index') = await import(entry);
    const { api, access, mounted } = window.noteExample; mounted.unmount();
    const note = await api.create({ spaceId: 'local', title: 'Controlled full-context host', parentId: null, visibility: 'SPACE', idempotencyKey: crypto.randomUUID() });
    const authored = 'Authored document stays separate from current knowledge. 한글 원문';
    const saved = await api.save(note.id, { title: note.title, expectedRevision: 1, idempotencyKey: crypto.randomUUID(), bodyJson: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: authored, marks: [{ type: 'bold' }] }] }] } });
    const targets: Note[] = [];
    for (let index = 0; index < 21; index++) targets.push(await api.create({ spaceId: 'local', title: `Fixture relation target ${String(index).padStart(2, '0')}`, parentId: null, visibility: 'SPACE', idempotencyKey: crypto.randomUUID() }));
    const text = Array.from({ length: 21 }, (_, index) => `Fixture authorized quote ${index}`).join('\n');
    const source = await api.upload(note.id, new File([text], 'controlled-source.txt', { type: 'text/plain' }));
    const evidence = (index: number) => ({ id: `span-${index}`, revisionId: source.attachmentId, spaceId: 'local', title: 'Fixture immutable original', locator: `line:${index + 1}`, quote: `Fixture authorized quote ${index}`, quoteTruncated: index === 0, occurredAt: '2026-10-31T00:00:00Z', effectiveAt: '2026-10-31T01:00:00Z', visibility: 'SPACE' as const });
    const rules = [{ rulesetId: 'fixture-ruleset', versionId: 'fixture-rule-v3', name: 'Fixture rule', versionNumber: 3 }];
    const currentItems: CurrentKnowledgeItem[] = Array.from({ length: 21 }, (_, index) => ({ id: `operation-${index}`, claimKind: index % 2 ? 'REQUEST' : 'CONFIRMED_FACT', body: `Fixture current item ${String(index).padStart(2, '0')}`, resultRevision: 2, appliedAt: '2026-11-01T00:00:00Z', evidenceCount: 1, evidence: [evidence(index)], rules }));
    const historyItems: NoteAccumulation[] = currentItems.map((item, index) => ({ id: item.id, spaceId: 'local', changeSetId: 'fixture-change-set', kind: 'APPEND_NOTE', title: `Recorded historical fixture ${index}`, preview: 'Recorded older proposal, separate from the authored document.', appliedAt: item.appliedAt, actorName: 'Fixture source actor', automatic: false, reviewerName: 'Fixture reviewer', resultRevision: 2, evidenceCount: 1, evidence: item.evidence, rules }));
    const rows: Relation[] = targets.map((target, index) => ({ id: `edge-${index}`, targetNoteId: target.id, title: target.title, predicate: index ? 'RELATED_TO' : 'SUPPORTS', legacyPredicate: null, kind: index === 1 ? 'INFERRED' : 'RECORDED', reviewState: index === 1 ? 'PROPOSED' : 'ACCEPTED', revision: 1, validFrom: null, validTo: null, evidenceCount: index === 0 ? 21 : 0, provenance: `Recorded fixture relation ${String(index).padStart(2, '0')}`, actorLabel: 'Fixture relation actor', direction: index ? 'INCOMING' : 'OUTGOING' }));
    const proof: RelationEvidence[] = currentItems.map((_, index) => ({ id: `proof-${index}`, sourceRevisionId: source.attachmentId, sourceRevision: 1, spaceId: 'local', sourceTitle: 'Fixture immutable original', locator: `line:${index + 1}`, excerpt: `Fixture authorized quote ${index}`, excerptTruncated: index === 0 }));
    const reads: { kind: string; cursor: string | null }[] = []; const decisions: unknown[] = []; const changes: string[] = [];
    Reflect.set(window, 'controlledContextReads', reads); Reflect.set(window, 'controlledContextDecisions', decisions); Reflect.set(window, 'controlledContextChanges', changes);
    let relationUnavailable = true; let proofUnavailable = true;
    window.addEventListener('fixture-recover-relations', () => { relationUnavailable = false; });
    window.addEventListener('fixture-recover-proof', () => { proofUnavailable = false; });
    function slice<T>(items: T[], cursor: string | null) { const start = Number(cursor ?? 0); return { items: items.slice(start, start + 20), nextCursor: start + 20 < items.length ? String(start + 20) : null }; }
    const knowledge: NoteKnowledgeContextApi = {
      provenance: async () => ({ sources: [{ revisionId: source.attachmentId, spaceId: 'local', title: 'Fixture immutable original' }], rules: [{ rulesetId: 'fixture-ruleset', versionId: 'fixture-rule-v3', spaceId: 'local', label: 'Fixture rule v3' }], reviews: [{ id: 'fixture-change-set', spaceId: 'local', title: 'Fixture accepted review', kind: 'changeSet', status: 'ACCEPTED' }], actions: [{ id: 'fixture-action', spaceId: 'local', title: 'Fixture recorded action' }] }),
      currentKnowledge: async (id, cursor) => { reads.push({ kind: 'current', cursor }); return { ...slice(currentItems, cursor), noteId: id, revision: (await api.note(id)).revision, bodyOrigin: 'HUMAN' }; },
      accumulations: async (_id, cursor) => { reads.push({ kind: 'history', cursor }); return slice(historyItems, cursor); },
      accumulationChange: async id => { changes.push(id); return { operationBody: 'Recorded older proposal', before: { revision: 2, title: note.title, body: authored }, after: { revision: 2, title: note.title, body: authored }, preserveHumanFields: true, requireEvidence: true, excludePrivateExamples: true, reviewPolicy: 'REVIEW', allowedDocumentTypes: ['TEXT'] }; },
    };
    const relations: NoteRelationsApi = {
      findRelationNotes: async (id, query, cursor) => { await api.note(id); const items = targets.filter(target => target.title.toLowerCase().includes(query.toLowerCase())).map(({ id, title }) => ({ id, title })); return { ...slice(items, cursor), noteId: id, total: items.length }; },
      relations: async (_id, cursor) => { reads.push({ kind: 'relations', cursor }); if (relationUnavailable) throw new gui.ApiError('Fixture relation projection unavailable', 'NETWORK'); return slice(rows, cursor); },
      relationEvidence: async (_id, cursor) => { reads.push({ kind: 'proof', cursor }); if (proofUnavailable) throw new gui.ApiError('Fixture proof unavailable', 'NETWORK'); return slice(proof, cursor); },
      relate: async (_id, targetId, predicate, validity) => { const target = await api.note(targetId); rows.unshift({ id: crypto.randomUUID(), targetNoteId: target.id, title: target.title, predicate, ...validity, legacyPredicate: null, kind: 'RECORDED', reviewState: 'ACCEPTED', revision: 1, evidenceCount: 0, provenance: 'Explicit fixture relation', actorLabel: 'Fixture relation actor', direction: 'OUTGOING' }); },
      decideRelation: async (id, revision, decision, reason) => { const row = rows.find(row => row.id === id)!; if (row.revision !== revision) throw new gui.ApiError('Fixture relation conflict', 'CONFLICT'); decisions.push({ id, revision, decision, reason }); row.reviewState = decision; row.revision++; },
    };
    const host = { access, destinations: { home: '/example/', resolve: (destination: import('../src/host').NoteDestination) => { const url = new URL('/consumer/', location.origin); for (const [key, value] of Object.entries(destination)) if (value !== undefined) url.searchParams.set(key, String(value)); return url.pathname + url.search; } } };
    const client = { ...api, note: async (id: string) => ({ ...await api.note(id), presentation: { bodyOrigin: 'HUMAN' as const } }) };
    history.replaceState(null, '', `?space=local&note=${note.id}`);
    window.noteExample = { api: client, access, host, mounted: gui.mountNoteCoreGui(document.getElementById('notes')!, { api: client, host, knowledgeContext: knowledge, relations, timeZone: 'Asia/Seoul' }) };
    return { noteId: note.id, sourceId: source.attachmentId, body: saved.bodyJson };
  });
  const body = page.getByRole('textbox', { name: '노트 본문', exact: true }); await body.fill('Keep this independent authored draft.');
  await page.getByRole('button', { name: '지식 정보', exact: true }).click();
  const current = page.getByRole('region', { name: '현재 정리', exact: true });
  await expect(current.getByText('Fixture current item 00', { exact: true })).toBeVisible();
  await current.getByRole('button', { name: '다음 현재 항목', exact: true }).click();
  await expect(current.getByText('Fixture current item 20', { exact: true })).toBeVisible(); await expect(current.getByText('Fixture current item 00', { exact: true })).toHaveCount(0);
  await current.getByRole('button', { name: '이전 현재 항목', exact: true }).click();
  const item = current.locator('.current-knowledge-item').first(); await item.locator('summary').click();
  await expect(item.getByText('Fixture authorized quote 0', { exact: true })).toBeVisible();
  await item.getByRole('button', { name: '변경 전후·반영 기준 보기', exact: true }).click();
  await expect(item.getByRole('region', { name: '변경 전후와 반영 기준', exact: true })).toContainText('Recorded older proposal');
  await page.evaluate(async () => { await document.fonts.load('400 14px "Noto Sans KR Variable"', '한글 원문'); await document.fonts.ready; });
  const cdp = await context.newCDPSession(page); await cdp.send('DOM.enable'); await cdp.send('CSS.enable');
  const { root } = await cdp.send('DOM.getDocument'); const comparisonNode = await cdp.send('DOM.querySelector', { nodeId: root.nodeId, selector: '.accumulation-comparison pre' });
  const comparisonFonts = await cdp.send('CSS.getPlatformFontsForNode', { nodeId: comparisonNode.nodeId });
  expect(comparisonFonts.fonts.filter(font => font.isCustomFont && /Noto Sans KR/.test(font.familyName)).reduce((count, font) => count + font.glyphCount, 0)).toBeGreaterThanOrEqual(4);
  const historyPanel = page.getByRole('region', { name: '누적 이력', exact: true });
  await historyPanel.getByRole('button', { name: '다음 반영 내역', exact: true }).click(); await expect(historyPanel.locator('.accumulation-item')).toHaveCount(1);
  await historyPanel.getByRole('button', { name: '이전 반영 내역', exact: true }).click(); await expect(historyPanel.locator('.accumulation-item')).toHaveCount(20);
  const record = historyPanel.locator('.accumulation-item').first(); await record.locator('summary').click();
  const reviewOpening = page.waitForEvent('popup'); await record.getByRole('link', { name: '반영 기록', exact: true }).click(); const review = await reviewOpening; await review.waitForLoadState();
  expect(new URL(review.url()).searchParams.get('operationId')).toBe('operation-0'); expect(new URL(review.url()).searchParams.get('id')).toBe('fixture-change-set'); await review.close();
  const ruleOpening = page.waitForEvent('popup'); await item.getByRole('link', { name: 'Fixture rule v3', exact: true }).click(); const rule = await ruleOpening; await rule.waitForLoadState();
  expect(new URL(rule.url()).searchParams.get('versionId')).toBe('fixture-rule-v3'); await rule.close();
  const actionOpening = page.waitForEvent('popup'); await page.getByRole('link', { name: 'Fixture recorded action', exact: true }).click(); const action = await actionOpening; await action.waitForLoadState();
  expect(new URL(action.url()).searchParams.get('id')).toBe('fixture-action'); await action.close();
  await page.getByRole('button', { name: '페이지 메뉴', exact: true }).click(); await page.getByRole('menuitem', { name: '관계', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveText('Fixture relation projection unavailable'); await expect(page.getByText('아직 관계가 없습니다.', { exact: true })).toHaveCount(0);
  await page.evaluate(() => window.dispatchEvent(new Event('fixture-recover-relations'))); await page.getByRole('button', { name: '관계 다시 읽기', exact: true }).click();
  const outgoing = page.locator('.note-detail-panels article').filter({ hasText: 'Recorded fixture relation 00' }).first();
  await expect(outgoing).toContainText('이 노트 → 연결된 노트'); await expect(outgoing).toContainText('Fixture relation actor');
  await outgoing.getByRole('button', { name: '관계 근거 보기', exact: true }).click(); await expect(outgoing.getByRole('alert')).toHaveText('Fixture proof unavailable');
  await page.evaluate(() => window.dispatchEvent(new Event('fixture-recover-proof'))); await outgoing.getByRole('button', { name: '근거 다시 읽기', exact: true }).click();
  await expect(outgoing.locator('blockquote')).toHaveCount(20); await outgoing.getByRole('button', { name: '다음 근거', exact: true }).click();
  await expect(outgoing.locator('blockquote')).toHaveCount(1); await expect(outgoing.locator('blockquote')).toHaveText('Fixture authorized quote 20');
  await outgoing.getByRole('button', { name: '이전 근거', exact: true }).click(); await expect(outgoing.locator('blockquote')).toHaveCount(20);
  const sourceOpening = page.waitForEvent('popup'); await outgoing.getByRole('link', { name: 'Fixture immutable original', exact: true }).first().click(); const source = await sourceOpening; await source.waitForLoadState();
  expect(new URL(source.url()).searchParams.get('revisionId')).toBe(fixture.sourceId); await expect(source.locator('body')).toContainText('Fixture authorized quote 20'); await source.close();
  await page.getByRole('button', { name: '관계 더 보기', exact: true }).click();
  const incoming = page.locator('.note-detail-panels article').filter({ hasText: 'Recorded fixture relation 20' }); await expect(incoming).toContainText('연결된 노트 → 이 노트');
  const proposed = page.locator('.note-detail-panels article').filter({ hasText: 'Recorded fixture relation 01' });
  page.once('dialog', dialog => dialog.accept('Checked fixture source')); await proposed.getByRole('button', { name: '관계 확정', exact: true }).click();
  await expect(proposed).toContainText('확정');
  expect(await page.evaluate(() => Reflect.get(window, 'controlledContextDecisions'))).toEqual([{ id: 'edge-1', revision: 1, decision: 'ACCEPTED', reason: 'Checked fixture source' }]);
  await expect(body).toHaveText('Keep this independent authored draft.');
  expect((await page.evaluate(id => window.noteExample.api.note(id), fixture.noteId)).bodyJson).toEqual(fixture.body);
  await page.setViewportSize({ width: 390, height: 1000 });
  await page.waitForFunction(() => document.getElementById('page-navigation')!.getBoundingClientRect().right <= 1);
  await page.evaluate(async () => { await Promise.all(document.getAnimations().map(animation => animation.finished.catch(() => {}))); });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await page.screenshot({ path: '.tmp/controlled-context-390.png', fullPage: true });
  await page.evaluate(async () => window.noteExample.access.refresh()); await expect(body).toHaveText('Keep this independent authored draft.');
  expect((await page.evaluate(() => Reflect.get(window, 'controlledContextDecisions') as unknown[])).length).toBe(1);
  await page.evaluate(() => window.noteExample.access.revoke()); await expect(body).toHaveCount(0); await expect(page.locator('blockquote')).toHaveCount(0);
});
