import {
  mountNoteGui, mountNoteCoreGui, createNoteAccess, createLocalNoteApi, ApiError,
  type Note, type Revision, type NoteCoreApi, type NoteKnowledgeContextApi,
  type NoteRelationsApi, type NoteCoreGuiOptions, type NoteGuiHostModule,
  type NotePolicyApi, type NoteAssociationsApi, type MountedNoteGui,
} from '@knowledge-engine/note-gui';
import { kmsNoteApi, kmsNotePolicy, kmsNoteAssociations, createKmsNoteHost, clearAccess, refreshAccess } from '@knowledge-engine/note-gui/kms';
import '@knowledge-engine/note-gui/style.css';

const access = createNoteAccess();
const api: NoteCoreApi = createLocalNoteApi({ namespace: 'clean-export-consumer' });
const options: NoteCoreGuiOptions = { api, host: { access, destinations: {} } };
const policy: NotePolicyApi = kmsNotePolicy;
const associations: NoteAssociationsApi = kmsNoteAssociations;
const collaborationOptions: NoteCoreGuiOptions = { ...options, policy, associations, onDirtyChange: dirty => { const value: boolean = dirty; void value; } };
declare const mounted: MountedNoteGui;
const dirty: boolean = mounted.hasUnsavedChanges();
const context: NoteKnowledgeContextApi = kmsNoteApi;
const relations: NoteRelationsApi = kmsNoteApi;
const moduleContract: NoteGuiHostModule = { mountNoteGui, mountNoteCoreGui };
const note: Note = { id: 'note', spaceId: 'space', title: '', revision: 1, bodyJson: { type: 'doc' }, visibility: 'PRIVATE', canEdit: true, parentId: null };
const revision: Revision = { id: 'revision', revision: 1, title: '', bodyJson: { type: 'doc' }, createdAt: '2026-11-01T00:00:00Z' };
void [options, collaborationOptions, dirty, context, relations, moduleContract, note, revision, createKmsNoteHost, clearAccess, refreshAccess, ApiError];
