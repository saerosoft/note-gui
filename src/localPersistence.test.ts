// @vitest-environment jsdom
import { beforeEach, expect, it } from 'vitest';
import { createLocalNoteApi } from './localPersistence';
import type { SaveNote } from './model';

const locks = { request: async <T>(_name: string, callback: () => T | Promise<T>): Promise<T> => callback() };
let storage: Pick<Storage, 'getItem' | 'setItem'>;
beforeEach(() => {
  const values = new Map<string, string>();
  storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => { values.set(key, value); } };
});
const adapter = () => createLocalNoteApi({ storage, locks, namespace: 'independent-test' });
it('persists a real note across adapter instances and rejects stale saves without replacing content', async () => {
  const api = adapter();
  const note = await api.create({ spaceId: 'local', title: 'Original', parentId: null, visibility: 'PRIVATE', idempotencyKey: 'create-1' });
  const input: SaveNote = { title: 'Persisted', bodyJson: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Durable body' }] }] }, expectedRevision: 1, idempotencyKey: 'save-1' };
  const saved = await api.save(note.id, input);
  expect(saved.revision).toBe(2);
  expect(await adapter().note(note.id)).toEqual(saved);
  await expect(adapter().save(note.id, { ...input, title: 'Stale', idempotencyKey: 'stale' })).rejects.toMatchObject({ code: 'CONFLICT' });
  expect((await adapter().note(note.id)).title).toBe('Persisted');
  expect((await adapter().history(note.id, null)).items.map(value => value.title)).toEqual(['Persisted', 'Original']);
  expect((await adapter().restore(note.id, 1, 2)).revision).toBe(3);
  expect((await adapter().note(note.id)).title).toBe('Original');
});
it('replays exact create/save/comment intent and rejects idempotency key reuse for different values', async () => {
  const api = adapter(); const input = { spaceId: 'local', title: 'One', parentId: null, visibility: 'PRIVATE' as const, idempotencyKey: 'one' };
  const note = await api.create(input);
  expect((await adapter().create(input)).id).toBe(note.id);
  await expect(api.create({ ...input, title: 'Other' })).rejects.toMatchObject({ code: 'INVALID_INPUT' });
  const save = { title: 'Two', bodyJson: note.bodyJson, expectedRevision: 1, idempotencyKey: 'two' };
  const saved = await api.save(note.id, save);
  expect(await adapter().save(note.id, save)).toEqual(saved);
  await api.comment(note.id, { body: 'Discussion', idempotencyKey: 'comment' });
  await adapter().comment(note.id, { body: 'Discussion', idempotencyKey: 'comment' });
  expect((await api.comments(note.id, null)).items).toHaveLength(1);
});
it('persists core properties and tree moves atomically and refuses cycles and stale metadata edits', async () => {
  const api = adapter();
  const create = (title: string) => api.create({ spaceId: 'local', title, parentId: null, visibility: 'PRIVATE', idempotencyKey: title });
  const parent = await create('Parent'); const child = await create('Child');
  await api.move([child.id], parent.id, 'local');
  expect(await api.ancestors(child.id)).toEqual([{ id: parent.id, title: 'Parent' }]);
  await expect(api.move([parent.id], child.id, 'local')).rejects.toMatchObject({ code: 'INVALID_INPUT' });
  await api.setProperties(child.id, [{ key: 'Status', valueType: 'TEXT', value: 'Active' }], 2);
  const values = await adapter().properties(child.id); expect(values[0]).toMatchObject({ key: 'Status', value: 'Active' });
  await expect(api.deleteProperty(child.id, values[0].id!, 2)).rejects.toMatchObject({ code: 'CONFLICT' });
  await api.deleteProperty(child.id, values[0].id!, 3);
  expect(await adapter().properties(child.id)).toEqual([]);
  expect((await api.tree('local', parent.id, null)).items[0].id).toBe(child.id);
  expect((await api.findNotes('local', 'chil'))[0].id).toBe(child.id);
});
it('does not report success when persistent storage rejects the commit', async () => {
  const storage = { getItem: () => null, setItem: () => { throw new DOMException('Quota exceeded', 'QuotaExceededError'); } };
  const api = createLocalNoteApi({ storage, locks, namespace: 'quota' });
  await expect(api.create({ spaceId: 'local', title: 'Not saved', parentId: null, visibility: 'PRIVATE', idempotencyKey: 'quota' })).rejects.toMatchObject({ code: 'STORAGE' });
});
it('upserts only supplied properties without deleting other saved fields', async () => {
  const api = adapter();
  const note = await api.create({ spaceId: 'local', title: 'Properties', parentId: null, visibility: 'PRIVATE', idempotencyKey: 'properties' });
  await api.setProperties(note.id, [{ key: 'First', valueType: 'TEXT', value: 'Keep' }], 1);
  await api.setProperties(note.id, [{ key: 'Second', valueType: 'TEXT', value: 'New' }], 2);
  expect((await adapter().properties(note.id)).map(value => value.key)).toEqual(['First', 'Second']);
});
it('rejects invalid workspace requests through the promised error boundary', async () => {
  const api = adapter();
  await expect(api.tree('missing', null, null)).rejects.toMatchObject({ code: 'NOT_FOUND' });
  await expect(api.findNotes('missing', 'title')).rejects.toMatchObject({ code: 'NOT_FOUND' });
  await expect(api.create({ spaceId: 'missing', title: 'Invalid', parentId: null, visibility: 'PRIVATE', idempotencyKey: 'invalid' })).rejects.toMatchObject({ code: 'NOT_FOUND' });
  await expect(api.move([], null, 'missing')).rejects.toMatchObject({ code: 'NOT_FOUND' });
});
it('preserves subtree edges when a move selection includes both an ancestor and its descendant', async () => {
  const api = adapter();
  const create = (title: string, parentId: string | null = null) => api.create({ spaceId: 'local', title, parentId, visibility: 'PRIVATE', idempotencyKey: title });
  const parent = await create('Parent'); const child = await create('Child', parent.id); const destination = await create('Destination');
  await api.move([parent.id, child.id], destination.id, 'local');
  expect((await adapter().note(child.id)).parentId).toBe(parent.id);
  expect((await adapter().note(parent.id)).parentId).toBe(destination.id);
});
