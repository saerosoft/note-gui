import type { NoteApi, NoteCoreApi, NoteKnowledgeContextApi, NoteRelationsApi } from './model';
import type { NoteAccessLifecycle } from './access';

export type NoteDestination =
  | { kind: 'home' }
  | { kind: 'login' }
  | { kind: 'ask' | 'overview' | 'settings' | 'ruleImprovements'; spaceId: string }
  | { kind: 'conflicts' | 'createAction'; spaceId: string; noteId: string }
  | { kind: 'source'; spaceId: string; revisionId: string }
  | { kind: 'rule'; spaceId: string; rulesetId: string; versionId: string }
  | { kind: 'review'; spaceId: string; id: string; reviewKind: 'proposal' | 'changeSet'; operationId?: string }
  | { kind: 'action'; spaceId: string; id: string };
export interface NoteHost {
  access: NoteAccessLifecycle;
  destinations: { home?: string; login?: string; resolve?: (destination: NoteDestination) => string | undefined };
  onNavigate?: (href: string) => boolean;
  /** Optional authorized native download; otherwise the GUI reads bytes through core.attachment. */
  attachmentUrl?: (id: string, revision: number) => string | undefined;
}
export interface NoteCoreGuiOptions {
  api: NoteCoreApi;
  host: NoteHost;
  knowledgeContext?: NoteKnowledgeContextApi;
  relations?: NoteRelationsApi;
  timeZone?: string;
}

export interface NoteGuiOptions {
  api?: NoteApi;
  /** IANA time zone for evidence and application timestamps; defaults to the browser clock. */
  timeZone?: string;
  /** Return true when the host handles a confirmed, unmodified product-link navigation. */
  onNavigate?: (href: string) => boolean;
}

export interface MountedNoteGui { unmount: () => void }

/** The framework-neutral contract used by browser hosts of the ESM distribution. */
export interface NoteGuiHostModule {
  mountNoteGui: (container: HTMLElement, options?: NoteGuiOptions | NoteCoreGuiOptions) => MountedNoteGui;
  mountNoteCoreGui: (container: HTMLElement, options: NoteCoreGuiOptions) => MountedNoteGui;
}
