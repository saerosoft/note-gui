import { expect, test } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
import type { NoteCoreApi } from '../src/model';

test('uses real nested pages, keyboard focus, multiselect subtree moves and native root drops without losing a draft', async ({ page }) => {
  await page.goto('./'); await page.waitForFunction(() => !!window.noteExample);
  const fixture = await page.evaluate(async () => {
    const { api, access, host, mounted } = window.noteExample; mounted.unmount();
    const create = (title: string, parentId: string | null = null) => api.create({ spaceId: 'local', title, parentId, visibility: 'SPACE', idempotencyKey: crypto.randomUUID() });
    const first = await create('Parent A'); const second = await create('Parent B');
    const children = [];
    for (let index = 0; index < 60; index++) children.push(await create(`A child ${String(index).padStart(2, '0')}`, first.id));
    const deep = await create('Direct nested location', children[0].id);
    const movedDeep = await create('Moved nested descendant', children[50].id);
    const sibling = await create('B child 00', second.id); const active = await create('B child 01', second.id);
    const reads: { parent: string | null; cursor: string | null; rows: number }[] = [];
    const ancestors: string[] = []; const moves: { ids: string[]; parent: string | null }[] = [];
    Reflect.set(window, 'nestedTreeReads', reads); Reflect.set(window, 'nestedTreeAncestors', ancestors); Reflect.set(window, 'nestedTreeMoves', moves);
    const client: NoteCoreApi = { ...api,
      tree: async (space, parent, cursor) => { const result = await api.tree(space, parent, cursor); reads.push({ parent, cursor, rows: result.items.length }); return result; },
      ancestors: async id => { ancestors.push(id); return api.ancestors(id); },
      move: async (ids, parent, space) => { moves.push({ ids: [...ids], parent }); await api.move(ids, parent, space); },
    };
    const entry = '/note-gui/note-gui.js'; const gui: typeof import('../src/index') = await import(entry);
    history.replaceState(null, '', `?space=local&note=${deep.id}`);
    window.noteExample = { api: client, access, host, mounted: gui.mountNoteCoreGui(document.getElementById('notes')!, { api: client, host }) };
    return { first: first.id, second: second.id, child: children[0].id, moved: [children[50].id, children[51].id], dragged: children[52].id, movedDeep: movedDeep.id, active: active.id, sibling: sibling.id };
  });
  const tree = page.getByRole('navigation', { name: '노트 트리', exact: true });
  await expect(tree.locator('.breadcrumb')).toHaveText('Parent A / A child 00');
  await expect(tree.getByRole('treeitem', { name: 'Direct nested location', exact: true })).toBeVisible();
  const direct = await page.evaluate(() => Reflect.get(window, 'nestedTreeReads') as { parent: string | null; rows: number }[]);
  expect(direct).toHaveLength(1); expect(direct[0]).toMatchObject({ parent: fixture.child, rows: 1 });
  await tree.getByRole('button', { name: '루트', exact: true }).click();
  await tree.getByRole('button', { name: 'Parent B 하위 트리 보기', exact: true }).click();
  await expect(tree.getByRole('treeitem', { name: 'B child 00', exact: true })).toBeVisible();
  await tree.getByRole('button', { name: 'Parent A 하위 트리 보기', exact: true }).click();
  await expect(tree.getByRole('treeitem', { name: 'A child 00', exact: true })).toBeVisible();
  await tree.getByRole('button', { name: 'Parent A 하위 노트 다음', exact: true }).click();
  await expect(tree.getByRole('treeitem', { name: 'A child 50', exact: true })).toBeVisible();
  await expect(tree.getByRole('treeitem', { name: 'A child 00', exact: true })).toHaveCount(0);
  await expect(tree.getByRole('treeitem', { name: 'B child 00', exact: true })).toBeVisible();
  const count = await page.evaluate(() => (Reflect.get(window, 'nestedTreeAncestors') as string[]).length);
  await tree.getByRole('treeitem', { name: 'B child 00', exact: true }).click();
  await expect(page.getByRole('textbox', { name: '노트 제목', exact: true })).toHaveText('B child 00');
  expect(await page.evaluate(() => (Reflect.get(window, 'nestedTreeAncestors') as string[]).length)).toBe(count);
  await tree.getByRole('treeitem', { name: 'B child 00', exact: true }).focus();
  await page.keyboard.press('ArrowDown');
  await expect(tree.getByRole('treeitem', { name: 'B child 01', exact: true })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('textbox', { name: '노트 제목', exact: true })).toHaveText('B child 01');
  const body = page.getByRole('textbox', { name: '노트 본문', exact: true }); await body.fill('Preserve this independent draft while moving other subtrees.');
  for (const title of ['A child 50', 'A child 51']) await tree.getByRole('checkbox', { name: `${title} 선택`, exact: true }).check();
  await tree.locator('summary').click();
  await tree.getByRole('textbox', { name: '대상 상위 노트 (선택하지 않으면 루트)', exact: true }).fill('Parent B');
  await tree.getByRole('button', { name: 'Parent B', exact: true }).click();
  await tree.getByRole('button', { name: '선택 노트 이동', exact: true }).click();
  await expect(tree.locator('.breadcrumb')).toHaveText('Parent B');
  const moved = await page.evaluate(async fixture => ({ notes: await Promise.all(fixture.moved.map(id => window.noteExample.api.note(id))), path: await window.noteExample.api.ancestors(fixture.movedDeep) }), fixture);
  for (const note of moved.notes) expect(note).toMatchObject({ parentId: fixture.second, revision: 2 });
  expect(moved.path.map(note => note.id)).toEqual([fixture.second, fixture.moved[0]]);
  await expect(body).toHaveText('Preserve this independent draft while moving other subtrees.');
  await tree.getByRole('button', { name: '루트', exact: true }).click();
  await tree.getByRole('treeitem', { name: 'Parent A', exact: true }).hover();
  await tree.getByRole('button', { name: 'Parent A 하위 트리에 집중', exact: true }).click();
  await expect(tree.locator('.breadcrumb')).toHaveText('Parent A');
  await tree.getByRole('button', { name: '다음', exact: true }).click();
  await expect(tree.getByRole('treeitem', { name: 'A child 52', exact: true })).toBeVisible();
  await tree.getByRole('treeitem', { name: 'A child 52', exact: true }).dragTo(tree.getByRole('button', { name: '루트', exact: true }));
  await expect.poll(async () => (await page.evaluate(id => window.noteExample.api.note(id), fixture.dragged)).parentId).toBeNull();
  await expect(body).toHaveText('Preserve this independent draft while moving other subtrees.');
  const result = await page.evaluate(() => ({ reads: Reflect.get(window, 'nestedTreeReads') as { rows: number }[], moves: Reflect.get(window, 'nestedTreeMoves') as { ids: string[]; parent: string | null }[] }));
  expect(Math.max(...result.reads.map(read => read.rows))).toBeLessThanOrEqual(50);
  expect(result.moves).toHaveLength(2); expect([...result.moves[0].ids].sort()).toEqual([...fixture.moved].sort()); expect(result.moves[1]).toEqual({ ids: [fixture.dragged], parent: null });
  expect((await page.evaluate(id => window.noteExample.api.note(id), fixture.active)).revision).toBe(1);
  await writeFile('.tmp/independent-nested-tree.json', JSON.stringify({ ...result, keyboard: 'ArrowDown/Enter', directAncestorLookup: true, independentDraftRetained: true }, null, 2));
});
