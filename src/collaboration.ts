import { ApiError } from './access';
import type { KnowledgeBodyOrigin, NoteSummary, Page } from './model';

export interface NoteContentAccess {
  organizationId: string; spaceId: string; mode: 'CONTROLLED' | 'SHARED';
  policyRevision: number; accessEpoch: string;
  capabilities: { read: boolean; write: boolean; review: boolean; manageSource: boolean; manageRule: boolean };
}
export interface NotePolicyApi { contentAccess(spaceId: string): Promise<NoteContentAccess> }
export interface NoteAssociationTarget extends NoteSummary { revision: number; bodyOrigin: KnowledgeBodyOrigin; updatedAt: string }
export interface NoteAssociation extends NoteSummary {
  revision: number; targetNoteId: string; targetNoteRevision: number;
  authoredBody: string | null; authoredBodyTruncated: boolean; bodyOrigin: KnowledgeBodyOrigin;
  createdAt: string; updatedAt: string; creatorId: string; creatorName: string | null;
}
export interface NoteAssociationPage<T> extends Page<T> { noteId: string; total: number }
export interface NoteAssociationState { id: string; noteId: string; targetNoteId: string; revision: number; linked: boolean }
export interface SetNoteAssociation { targetNoteId: string; expectedRevision: number; linked: boolean; requestId: string }
export interface NoteAssociationsApi {
  targets(noteId: string, query: string, cursor: string | null): Promise<NoteAssociationPage<NoteAssociationTarget>>;
  list(noteId: string, cursor: string | null): Promise<NoteAssociationPage<NoteAssociation>>;
  state(noteId: string, targetNoteId: string): Promise<NoteAssociationState | null>;
  set(noteId: string, input: SetNoteAssociation): Promise<NoteAssociationState>;
}

export function validateNoteContentAccess(value: NoteContentAccess, spaceId: string) {
  if (!value || value.spaceId !== spaceId || typeof value.organizationId !== 'string' || !value.organizationId || !['CONTROLLED', 'SHARED'].includes(value.mode)
    || !Number.isSafeInteger(value.policyRevision) || value.policyRevision < 1 || typeof value.accessEpoch !== 'string' || !/^\d+$/.test(value.accessEpoch)
    || !value.capabilities || typeof value.capabilities !== 'object' || !['read', 'write', 'review', 'manageSource', 'manageRule'].every(key => typeof Reflect.get(value.capabilities, key) === 'boolean')) {
    throw new ApiError('The policy response does not match the requested content scope.', 'RESPONSE_MISMATCH');
  }
  return value;
}
