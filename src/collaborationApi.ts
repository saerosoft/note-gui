import { ApiError, graphql } from './transport';
import type { NoteContentAccess, NotePolicyApi, NoteAssociationTarget, NoteAssociation, NoteAssociationPage, NoteAssociationState, NoteAssociationsApi } from './collaboration';
import { validateNoteContentAccess } from './collaboration';

function mismatch(): never { throw new ApiError('The response does not match the requested content scope.', 'RESPONSE_MISMATCH'); }
function offset(cursor: string | null) {
  const value = Number(cursor ?? 0);
  if (!Number.isInteger(value) || value < 0 || value > 100000) throw new ApiError('Check the association page cursor.', 'INVALID_INPUT');
  return value;
}
interface WirePage<T> { noteId: string; total: number; hasNext: boolean; items: T[] }
function associationPage<T>(value: WirePage<T>, noteId: string, start: number): NoteAssociationPage<T> {
  if (!value || value.noteId !== noteId || !Number.isInteger(value.total) || value.total < 0 || typeof value.hasNext !== 'boolean' || !Array.isArray(value.items) || value.items.length > 20) mismatch();
  return { noteId, total: value.total, items: value.items, nextCursor: value.hasNext ? String(start + value.items.length) : null };
}
interface WireState { id: string; noteId: string; privateNoteId: string; revision: number; linked: boolean }
function associationState(value: WireState, noteId: string, targetNoteId: string): NoteAssociationState {
  if (!value || !value.id || value.noteId !== noteId || value.privateNoteId !== targetNoteId || !Number.isInteger(value.revision) || value.revision < 1 || typeof value.linked !== 'boolean') mismatch();
  return { id: value.id, noteId, targetNoteId, revision: value.revision, linked: value.linked };
}
const stateFields = 'id noteId privateNoteId revision linked';
type WireAssociation = Omit<NoteAssociation, 'targetNoteId' | 'targetNoteRevision'> & { privateNoteId: string; privateNoteRevision: number };

export const kmsNotePolicy: NotePolicyApi = {
  async contentAccess(spaceId) {
    const value = (await graphql<{ collaborationContentAccess: NoteContentAccess }>(
      'query($spaceId:UUID!){collaborationContentAccess(spaceId:$spaceId){organizationId spaceId mode policyRevision accessEpoch capabilities{read write review manageSource manageRule}}}', { spaceId }, 'extension',
    )).collaborationContentAccess;
    return validateNoteContentAccess(value, spaceId);
  },
};

export const kmsNoteAssociations: NoteAssociationsApi = {
  async targets(noteId, query, cursor) {
    const start = offset(cursor); const text = query.trim();
    if (text.length > 200) throw new ApiError('Check the association search text.', 'INVALID_INPUT');
    const value = (await graphql<{ knowledgePersonalNoteOptions: WirePage<NoteAssociationTarget> }>(
      'query($noteId:UUID!,$query:String,$offset:Int!){knowledgePersonalNoteOptions(noteId:$noteId,query:$query,offset:$offset,limit:20){noteId total hasNext items{id title revision bodyOrigin updatedAt}}}',
      { noteId, query: text || null, offset: start }, 'extension',
    )).knowledgePersonalNoteOptions;
    return associationPage(value, noteId, start);
  },
  async list(noteId, cursor) {
    const start = offset(cursor);
    const value = (await graphql<{ knowledgePersonalNotes: WirePage<WireAssociation> }>(
      'query($noteId:UUID!,$offset:Int!){knowledgePersonalNotes(noteId:$noteId,offset:$offset,limit:20){noteId total hasNext items{id revision privateNoteId privateNoteRevision title authoredBody authoredBodyTruncated bodyOrigin createdAt updatedAt creatorId creatorName}}}',
      { noteId, offset: start }, 'extension',
    )).knowledgePersonalNotes;
    const page = associationPage(value, noteId, start);
    if (!page.items.every(item => item && typeof item.id === 'string' && item.id
      && typeof item.privateNoteId === 'string' && item.privateNoteId
      && Number.isInteger(item.revision) && item.revision > 0
      && Number.isInteger(item.privateNoteRevision) && item.privateNoteRevision > 0
      && typeof item.creatorId === 'string' && item.creatorId
      && (item.creatorName === null || typeof item.creatorName === 'string'))) mismatch();
    return { ...page, items: page.items.map(({ privateNoteId, privateNoteRevision, ...item }) => ({ ...item, targetNoteId: privateNoteId, targetNoteRevision: privateNoteRevision })) };
  },
  async state(noteId, targetNoteId) {
    const value = (await graphql<{ knowledgePersonalNoteLink: WireState | null }>(
      `query($noteId:UUID!,$privateNoteId:UUID!){knowledgePersonalNoteLink(noteId:$noteId,privateNoteId:$privateNoteId){${stateFields}}}`, { noteId, privateNoteId: targetNoteId }, 'extension',
    )).knowledgePersonalNoteLink;
    return value === null ? null : associationState(value, noteId, targetNoteId);
  },
  async set(noteId, input) {
    const { targetNoteId, ...fields } = input;
    const value = (await graphql<{ setKnowledgePersonalNote: WireState }>(
      `mutation($id:UUID!,$input:SetKnowledgePersonalNoteInput!){setKnowledgePersonalNote(id:$id,input:$input){${stateFields}}}`, { id: noteId, input: { privateNoteId: targetNoteId, ...fields } }, 'extension',
    )).setKnowledgePersonalNote;
    const state = associationState(value, noteId, targetNoteId);
    if (state.linked !== input.linked) mismatch();
    return state;
  },
};
