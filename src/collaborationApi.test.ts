// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { graphql } from './transport';
import { kmsNoteAssociations, kmsNotePolicy } from './collaborationApi';

vi.mock('./transport', async original => ({ ...await original<typeof import('./transport')>(), graphql: vi.fn() }));
afterEach(() => vi.clearAllMocks());

const access = {
  organizationId: 'organization', spaceId: 'space', mode: 'SHARED', policyRevision: 3,
  accessEpoch: '9007199254740993123',
  capabilities: { read: true, write: true, review: true, manageSource: true, manageRule: true },
};
it('reads exact SC01 policy for the requested space without narrowing the string epoch or inventing administrator status', async () => {
  vi.mocked(graphql).mockResolvedValueOnce({ collaborationContentAccess: access });
  expect(await kmsNotePolicy.contentAccess('space')).toEqual(access);
  expect(graphql).toHaveBeenCalledExactlyOnceWith(
    expect.stringContaining('collaborationContentAccess(spaceId:$spaceId)'), { spaceId: 'space' }, 'extension',
  );
  expect(vi.mocked(graphql).mock.calls[0][0]).toContain('policyRevision accessEpoch capabilities{read write review manageSource manageRule}');
});
it.each([
  { ...access, spaceId: 'another-space' },
  { ...access, accessEpoch: 9007199254740992 },
  { ...access, policyRevision: 0 },
  { ...access, mode: 'PERSONAL' },
  { ...access, capabilities: { ...access.capabilities, write: undefined } },
  null,
  { ...access, capabilities: true },
])('rejects an unbound or incomplete current policy instead of falling back to roles', async value => {
  vi.mocked(graphql).mockResolvedValueOnce({ collaborationContentAccess: value });
  await expect(kmsNotePolicy.contentAccess('space')).rejects.toMatchObject({ code: 'RESPONSE_MISMATCH' });
});

const association = {
  id: 'link', revision: 4, privateNoteId: 'target', privateNoteRevision: 9,
  title: 'Original associated note', authoredBody: 'Authored preview only.', authoredBodyTruncated: false,
  bodyOrigin: 'HUMAN', createdAt: '2026-10-25T00:00:00Z', updatedAt: '2026-11-01T00:00:00Z',
  creatorId: 'original-creator', creatorName: null,
};
it('maps the authorized association page and preserves original creator attribution without manufacturing a name', async () => {
  vi.mocked(graphql).mockResolvedValueOnce({ knowledgePersonalNotes: { noteId: 'anchor', total: 21, hasNext: true, items: [association] } });
  expect(await kmsNoteAssociations.list('anchor', '20')).toEqual({ noteId: 'anchor', total: 21, nextCursor: '40', items: [{
    id: 'link', revision: 4, targetNoteId: 'target', targetNoteRevision: 9,
    title: 'Original associated note', authoredBody: 'Authored preview only.', authoredBodyTruncated: false,
    bodyOrigin: 'HUMAN', createdAt: '2026-10-25T00:00:00Z', updatedAt: '2026-11-01T00:00:00Z',
    creatorId: 'original-creator', creatorName: null,
  }] });
  expect(graphql).toHaveBeenLastCalledWith(expect.stringContaining('knowledgePersonalNotes(noteId:$noteId,offset:$offset,limit:20)'), { noteId: 'anchor', offset: 20 }, 'extension');
  expect(vi.mocked(graphql).mock.calls[0][0]).toContain('creatorId creatorName');
});
it('uses association-specific targets and the server continuation flag instead of generic note search or page length', async () => {
  const items = [{ id: 'target', title: 'Readable organization target', revision: 2, bodyOrigin: 'HUMAN', updatedAt: '2026-11-01T00:00:00Z' }];
  vi.mocked(graphql).mockResolvedValueOnce({ knowledgePersonalNoteOptions: { noteId: 'anchor', total: 25, hasNext: true, items } });
  expect(await kmsNoteAssociations.targets('anchor', '  needle  ', null)).toEqual({ noteId: 'anchor', total: 25, nextCursor: '20', items });
  expect(graphql).toHaveBeenLastCalledWith(expect.stringContaining('knowledgePersonalNoteOptions(noteId:$noteId,query:$query,offset:$offset,limit:20)'), { noteId: 'anchor', query: 'needle', offset: 0 }, 'extension');
  expect(vi.mocked(graphql).mock.calls[0][0]).not.toContain('knowledgeNotes(');
});
it('keeps a null initial link state and maps retained unlinked state without creating a per-reader identity', async () => {
  vi.mocked(graphql).mockResolvedValueOnce({ knowledgePersonalNoteLink: null });
  expect(await kmsNoteAssociations.state('anchor', 'target')).toBeNull();
  vi.mocked(graphql).mockResolvedValueOnce({ knowledgePersonalNoteLink: { id: 'same-link', noteId: 'anchor', privateNoteId: 'target', revision: 8, linked: false } });
  expect(await kmsNoteAssociations.state('anchor', 'target')).toEqual({ id: 'same-link', noteId: 'anchor', targetNoteId: 'target', revision: 8, linked: false });
});
it('forwards exact association revision/request identity through an uncertain retry', async () => {
  const input = { targetNoteId: 'target', expectedRevision: 8, linked: true, requestId: '9bd160af-d8bf-4bcc-a841-bfeac698bdea' };
  vi.mocked(graphql).mockRejectedValueOnce(new Error('Acknowledgement unavailable'));
  await expect(kmsNoteAssociations.set('anchor', input)).rejects.toThrow('Acknowledgement unavailable');
  vi.mocked(graphql).mockResolvedValueOnce({ setKnowledgePersonalNote: { id: 'same-link', noteId: 'anchor', privateNoteId: 'target', revision: 9, linked: true } });
  expect(await kmsNoteAssociations.set('anchor', input)).toEqual({ id: 'same-link', noteId: 'anchor', targetNoteId: 'target', revision: 9, linked: true });
  expect(vi.mocked(graphql).mock.calls.map(call => call[1])).toEqual([
    { id: 'anchor', input: { privateNoteId: 'target', expectedRevision: 8, linked: true, requestId: '9bd160af-d8bf-4bcc-a841-bfeac698bdea' } },
    { id: 'anchor', input: { privateNoteId: 'target', expectedRevision: 8, linked: true, requestId: '9bd160af-d8bf-4bcc-a841-bfeac698bdea' } },
  ]);
});
it('rejects a response for another anchor or target', async () => {
  vi.mocked(graphql).mockResolvedValueOnce({ knowledgePersonalNotes: { noteId: 'other', total: 0, hasNext: false, items: [] } });
  await expect(kmsNoteAssociations.list('anchor', null)).rejects.toMatchObject({ code: 'RESPONSE_MISMATCH' });
  vi.mocked(graphql).mockResolvedValueOnce({ knowledgePersonalNoteLink: { id: 'link', noteId: 'anchor', privateNoteId: 'other', revision: 1, linked: true } });
  await expect(kmsNoteAssociations.state('anchor', 'target')).rejects.toMatchObject({ code: 'RESPONSE_MISMATCH' });
});
it.each([
  { ...association, creatorId: undefined },
  { ...association, creatorName: undefined },
  { ...association, privateNoteId: '' },
  { ...association, privateNoteRevision: 0 },
])('rejects an association without its authoritative identity or creator', async item => {
  vi.mocked(graphql).mockResolvedValueOnce({ knowledgePersonalNotes: { noteId: 'anchor', total: 1, hasNext: false, items: [item] } });
  await expect(kmsNoteAssociations.list('anchor', null)).rejects.toMatchObject({ code: 'RESPONSE_MISMATCH' });
});
it('rejects an oversized association page rather than returning unbounded rows', async () => {
  vi.mocked(graphql).mockResolvedValueOnce({ knowledgePersonalNotes: { noteId: 'anchor', total: 21, hasNext: false, items: Array.from({ length: 21 }, () => association) } });
  await expect(kmsNoteAssociations.list('anchor', null)).rejects.toMatchObject({ code: 'RESPONSE_MISMATCH' });
});
it('does not treat an omitted state as an authoritative absent link', async () => {
  vi.mocked(graphql).mockResolvedValueOnce({});
  await expect(kmsNoteAssociations.state('anchor', 'target')).rejects.toMatchObject({ code: 'RESPONSE_MISMATCH' });
});
it('rejects an acknowledgement for the opposite association intent', async () => {
  vi.mocked(graphql).mockResolvedValueOnce({ setKnowledgePersonalNote: { id: 'link', noteId: 'anchor', privateNoteId: 'target', revision: 9, linked: false } });
  await expect(kmsNoteAssociations.set('anchor', { targetNoteId: 'target', expectedRevision: 8, linked: true, requestId: '9bd160af-d8bf-4bcc-a841-bfeac698bdea' })).rejects.toMatchObject({ code: 'RESPONSE_MISMATCH' });
});
it.each(['-1', 'NaN', '2.5', '100020'])('rejects an invalid association cursor %s before any request', async cursor => {
  await expect(kmsNoteAssociations.targets('anchor', '', cursor)).rejects.toMatchObject({ code: 'INVALID_INPUT' });
  expect(graphql).not.toHaveBeenCalled();
});
