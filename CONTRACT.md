# Note GUI host contract

This additive contract accompanies package 0.6.0. The public declarations are
emitted from `src/index.tsx`, `src/model.ts`, `src/host.ts` and `src/access.ts`.
The legacy complete API remains supported. KMS integration and its pinned release
are accepted separately by the product owner.

## Imports and mount lifetime

```ts
import {
  mountNoteCoreGui, mountNoteGui, createNoteAccess, ApiError,
  createLocalNoteApi,
  type NoteCoreApi, type NoteKnowledgeContextApi, type NoteRelationsApi,
  type NoteCoreGuiOptions, type NoteGuiOptions, type NoteHost,
  type NoteDestination, type NoteAccessLifecycle, type NoteAccessController,
  type MountedNoteGui, type NoteGuiHostModule,
} from '@knowledge-engine/note-gui';
import '@knowledge-engine/note-gui/style.css';
```

The browser ESM is `dist/note-gui.js`, the stylesheet is `dist/note-gui.css`,
and root declarations are `dist/types/index.d.ts`. Load the stylesheet before
mounting. Copy the complete `dist` tree, including chunks, fonts, notices and
the source offer. This entry bundles the pinned React runtime.

```ts
function mountNoteCoreGui(container: HTMLElement, options: NoteCoreGuiOptions): MountedNoteGui;
function mountNoteGui(container: HTMLElement, options?: NoteGuiOptions | NoteCoreGuiOptions): MountedNoteGui;
interface MountedNoteGui { unmount(): void }
interface NoteCoreGuiOptions {
  api: NoteCoreApi;
  host: NoteHost;
  knowledgeContext?: NoteKnowledgeContextApi;
  relations?: NoteRelationsApi;
  timeZone?: string;
}
```

Call `unmount()` during host cleanup. It is idempotent. Cleanup removes access
subscriptions, timers, browser listeners and React portals; outstanding adapter
calls may continue but cannot deliver their results to the retired mount. An
unmount does not undo a committed write. Host effects must also discard a late
module or stylesheet load after their own disposal. Keep adapter and host object
identities stable for a mount. Publish access changes through the lifecycle;
replacing options or remounting is not a revalidation strategy for dirty drafts.
Injected mounts subscribe to the host lifecycle before returning their handle,
so a same-stack `mountNoteCoreGui(...); access.revoke()` cannot lose the event
while the initial React commit is pending. Unmount also retires that synchronous
subscription when no React commit has occurred yet.

`mountNoteCoreGui` requires the core API, lifecycle and destinations. The
`mountNoteGui` overload with these same options selects the same reusable path.
Neither path loads the KMS adapter. Only the legacy overload dynamically loads
the compatibility component. Neither an unsupported extension nor a failed
extension falls back to the default API.

`timeZone` is an optional IANA zone for source/application timestamps. An invalid
zone rejects mounting before React root creation. Its absence uses the browser
clock. The GUI keeps `space`, `note` and optional `right` selection query
parameters on the current host pathname; these are GUI locations, not KMS routes.

## Core data and operations

All IDs and cursors are opaque strings. `revision` is a host-issued, positive
integer. Each returned object is an authorized snapshot. The host owns final
authorization, transaction isolation, revisions and persistence; the GUI does
not authorize a write merely because `canEdit` is true.

`Note` contains `id`, `spaceId`, `title`, `revision`, `bodyJson`, `visibility`,
`canEdit` and nullable `parentId`. `bodyJson` is a complete Tiptap `JSONContent`
document. `Revision` contains `id`, `revision`, `title`, `createdAt` and
`bodyJson`. Both allow optional `presentation: { bodyOrigin?:
'HUMAN' | 'LEGACY_UNCLASSIFIED' }`. The historical optional `bodyOrigin` alias
remains readable for complete adapters. Presentation metadata takes precedence.
Missing classification implies neither HUMAN nor legacy status and produces no
authorship notice. The core save request never supplies a classification.

`Space` retains `id`, `name`, `accessEpoch` and `myRole`
(`OWNER | EDITOR | VIEWER`). `Visibility` retains `SPACE | PRIVATE |
ADMINISTRATORS`. These existing structural values are not new host permissions.
`Page<T>` has `items: T[]` and `nextCursor: string | null`. Supply null for the
first page and pass the returned cursor unchanged for the next one. Trees/files
use pages of up to 50; history/comments/context/relations use up to 20. Core
readable-title search returns up to 20 results. Empty successful results mean
authorized emptiness; denial/unavailability must reject.

```ts
interface NoteCoreApi {
  spaces(): Promise<Space[]>;
  tree(spaceId: string, parentId: string | null, cursor: string | null): Promise<Page<TreeNote>>;
  ancestors(id: string): Promise<NoteSummary[]>;
  note(id: string): Promise<Note>;
  findNotes(spaceId: string, query: string): Promise<NoteSummary[]>;
  create(input: CreateNote): Promise<Note>;
  save(id: string, input: SaveNote): Promise<Note>;
  move(ids: string[], parentId: string | null, spaceId: string): Promise<void>;
  history(id: string, cursor: string | null): Promise<Page<Revision>>;
  restore(id: string, revision: number, expectedRevision: number): Promise<Note>;
  comments(id: string, cursor: string | null): Promise<Page<Comment>>;
  comment(id: string, input: AddComment): Promise<void>;
  properties(id: string): Promise<PropertyValue[]>;
  setProperties(id: string, values: PropertyValue[], expectedRevision: number): Promise<void>;
  deleteProperty(noteId: string, propertyId: string, expectedRevision: number): Promise<void>;
  files(id: string, cursor: string | null): Promise<Page<NoteFile>>;
  upload(id: string, file: File, previous?: AttachmentRevision): Promise<AttachmentRevision>;
  attachment(id: string, revision: number): Promise<Blob>;
}
```

| Operation | Required semantics |
| --- | --- |
| `spaces`, `tree`, `ancestors`, `note`, `findNotes` | Current authorized snapshots. Ancestors are root-to-parent, excluding the selected note. `TreeNote.hasChildren` is a navigation hint. Reads must not expose inaccessible counts or titles. |
| `create` | `CreateNote` has `spaceId`, `title`, nullable `parentId`, `visibility`, `idempotencyKey`. Commit once per intent and return stable identity. The retained KMS adapter supports root creation and rejects non-null parents explicitly. |
| `save` | `SaveNote` has `title`, `bodyJson`, `expectedRevision`, `idempotencyKey`. Compare revision and write atomically. Return the committed document and allocated revision. The GUI reuses its pending key and content after uncertain failure, even if the local editor has since changed. |
| `move` | IDs identify a complete atomic move to the specified space/parent. Validate the current hierarchy, authority and all moved descendants. This retained signature has no caller revision/key. A host that needs per-note revisions must read them and compare within its transport/service operation, as the KMS adapter does. Repeating an already completed placement must be safe. |
| `history`, `restore` | History uses immutable revision identity. Restore copies the selected document into a new revision after checking `expectedRevision`; it never mutates history. Preserve supplied authorship metadata. A stale restore conflicts. The retained signature has no caller idempotency key; after an uncertain outcome reread before offering another restore. |
| `comments`, `comment` | `AddComment` has `body` and `idempotencyKey`. Exact replay creates one comment. The GUI reloads comments and note metadata after acknowledgement. |
| `properties`, `setProperties`, `deleteProperty` | Properties have optional `id`, `key`, `valueType` (`TEXT | NUMBER | BOOLEAN | DATE`) and string `value`. Set upserts only supplied names; omitted names remain. The GUI sends one field at a time. Delete requires the property's identity and current note revision. Check revisions atomically and advance note metadata. No caller key is present: after acknowledgement, retry reload rather than repeating the write. |
| `files`, `upload`, `attachment` | Files list all authorized immutable files, including retained versions not embedded in the document. An `AttachmentRevision` has `attachmentId`, `revision`, `name`, `mimeType`; uploads may identify a previous immutable revision. Validate it before creating a successor. In the current editor, file IDs identify immutable blobs and their dereference revision is 1; `NoteFile.revision` is the displayed chain revision. Return actual bytes, never an unchecked URL. Upload does not commit a document reference: save the note separately. Upload has no caller key; an uncertain failure may leave an unreferenced stored blob and must not be reported as undone. |

For idempotent operations, the host binds a key to the caller, operation, target
and exact intent. Exact replay returns the original committed result; changed
intent with the same key rejects. A transport may allocate additional internal
keys for retained signatures, but must not claim that they provide caller replay
guarantees. There is no automatic merge. A conflict preserves the editor draft
and lets the member inspect the latest version.

## Optional knowledge context and relations

```ts
interface NoteKnowledgeContextApi {
  provenance(note: Note): Promise<Provenance>;
  accumulations(id: string, cursor: string | null): Promise<Page<NoteAccumulation>>;
  currentKnowledge(id: string, cursor: string | null): Promise<CurrentKnowledgePage>;
  accumulationChange(id: string): Promise<NoteAccumulationChange>;
}
interface NoteRelationsApi {
  findRelationNotes(noteId: string, query: string, cursor: string | null): Promise<RelationTargetPage>;
  relations(id: string, cursor: string | null): Promise<Page<Relation>>;
  relationEvidence(id: string, cursor: string | null): Promise<Page<RelationEvidence>>;
  relate(id: string, targetNoteId: string, predicate: RelationPredicate, validity: RelationValidity): Promise<void>;
  decideRelation(id: string, expectedRevision: number, decision: 'ACCEPTED' | 'REJECTED', reason: string): Promise<void>;
}
```

Each extension is a complete named API, not a bag of optional methods. Omit it
when unsupported. The GUI hides its controls and makes no requests for it. Supply
both extensions for KMS. A supplied extension that rejects shows the actual
failure rather than reporting an empty successful projection. Optional denial
does not classify the core document as inaccessible: the host publishes a
global revocation separately when that is what happened. Unsaved core content
survives extension failures.

`provenance` receives the currently authorized note snapshot. It returns typed
source revisions, rule versions, reviews and actions, without granting access to
their destinations. `accumulations` returns applied operations, immutable
evidence, rules and result revisions. `currentKnowledge` returns the selected
note ID/revision, explicit body origin and current items; authored text is never
inferred to be current knowledge. `accumulationChange` selects an accumulation
operation ID and returns its proposal, saved before/after comparison and recorded
policy. All extension models, including evidence scope, source/application
times and truncated-quote markers, are exported from the root.

Relations preserve `DERIVED_FROM | SUPPORTS | SUPERSEDES | RELATED_TO`,
`RECORDED | INFERRED | UNCERTAIN`, and `PROPOSED | ACCEPTED | REJECTED` semantics.
`findRelationNotes` authorizes the anchor before filtering/counting/paging
eligible targets; generic title search is not a substitute. `relate` records
the supplied endpoints, predicate and nullable ISO validity interval under
current host policy. Its retained signature has no revision/key, so policy and
duplicate handling are host-owned and uncertain writes require rereading.
`decideRelation` checks the relation's expected revision, final decision and
nonempty reason atomically. `relationEvidence` uses the relation ID and returns
only currently readable source proof. A target-specific rejection may use
`ApiError.field = 'toNoteId'` so the picker requests a new selection.

## Host destinations and access

```ts
interface NoteAccessLifecycle {
  onAccessLost(listener: () => void): () => void;
  onAccessRefresh(listener: () => void | Promise<void>): () => void;
}
interface NoteAccessController extends NoteAccessLifecycle {
  readonly generation: number;
  revoke(): void;
  refresh(): Promise<void>;
}
function createNoteAccess(): NoteAccessController;
interface NoteHost {
  access: NoteAccessLifecycle;
  destinations: {
    home?: string;
    login?: string;
    resolve?: (destination: NoteDestination) => string | undefined;
  };
  onNavigate?: (href: string) => boolean;
  attachmentUrl?: (id: string, revision: number) => string | undefined;
}
```

`NoteDestination` is a discriminated union with these exact cases:

| `kind` | Other required fields |
| --- | --- |
| `home`, `login` | None |
| `ask`, `overview`, `settings`, `ruleImprovements` | `spaceId` |
| `conflicts`, `createAction` | `spaceId`, `noteId` |
| `source` | `spaceId`, `revisionId` |
| `rule` | `spaceId`, `rulesetId`, `versionId` |
| `review` | `spaceId`, `id`, `reviewKind: 'proposal' | 'changeSet'`, optional `operationId` |
| `action` | `spaceId`, `id` |

The host returns actual destinations. Missing product destinations hide shell
links; contextual labels remain readable without a link. No core path constructs
KMS URLs, reads KMS cookies, or performs HTTP by default. `onNavigate` runs only
after dirty confirmation for an ordinary same-window primary click; returning
true means the router handled it. Ctrl/Meta/Shift/Alt, non-primary and new-window
links retain native behavior. Context links retain their existing new-window
behavior. A logo without a home destination is noninteractive and never invokes
dirty confirmation or `onNavigate`. `attachmentUrl`, when supplied, must identify an authorized immutable
native download. The browser performs that download under host policy. Without
it, the GUI reads through `api.attachment` and downloads a temporary object URL.

Hosts publish identity or access revocation with `revoke()`. Each mount creates
its own delivery generation, clears protected drafts/panels/media on revocation
and rejects late results, including responses from adapters that ignore
cancellation. Revocation is terminal for that mount; a subsequently authenticated
identity needs a new mount. Before an in-place authority revalidation, publish
`await refresh()`: it invalidates older responses and waits for subscribed
revalidation and the actual guarded reads it starts, including React-effect
projection reloads. Cached search titles and selected targets are cleared and
revalidated without changing the search query. The completion barrier includes
context, files, relations, relation targets and visible media/diagram reads;
callbacks and reads settle before it returns. A failed projection rejects the
refresh with its safe error while its panel shows the failure. Optional-context
failure does not itself revoke or discard the core draft. It preserves editor instances and unsaved drafts, reloads note
metadata and contextual projections, and revalidates visible attachment/diagram
bytes. The GUI also checks `spaces()` on focus/visibility and every 30 seconds,
with a 30-second deadline. Removed spaces revoke access. Changed access epochs
trigger the same local refresh. An unavailable access check withholds the
workspace while retaining drafts for retry. Hosts remain responsible for timely
notifications when their authority changes; this is not an authentication server.

Automatic focus/polling and space-epoch revalidation await the same reads but
make the workspace authority decision from core-read and callback failures.
Failures attributed to a guarded optional extension stay visible in its panel
and do not withhold an otherwise authorized core editor. Explicit host refresh
still rejects those projection failures after completing revalidation. Core
failures take precedence when both core and optional reads fail; authorization
loss still revokes access, and an unavailable core check still withholds the
workspace while retaining its draft. This separation uses adapter ownership,
not a catch-all exception handler or an allowlist of error-message/code strings.

Relation-target refresh clears selection and paging before the replacement read
starts. Its returned promise is settled by the read whose result or error is
actually installed for that reset state, including nonempty selected/paged
queries. A pending typing debounce is cancelled for revalidation; it cannot
start a replacement query after refresh has already completed. Only ordinary
user query edits use the typing debounce. Retiring the picker leaves no
projection to install; the session still waits for its guarded adapter work.

An open configured Draw.io frame keeps its URL and native document during a
temporary revalidation. Its edit/view URL depends on the persistent edit
capability, not the temporary read-ready state. The verified frame window is
retained when React detaches a hidden modal's refs, so an already pending autosave
can update the local XML draft while access is checked. Writes remain gated on
successful revalidation. Actual close or revocation retires the frame window;
real edit-capability changes may switch the frame to its appropriate viewer.

All core and extension calls use the mount's guarded adapter. Core
`ACCESS_DENIED | UNAUTHENTICATED | UNAUTHORIZED | FORBIDDEN` errors revoke the
mount; optional-extension errors show a panel failure. A generation change or
disposal retires delivery with `STALE_ACCESS`. Revocation/cleanup never asserts
that server work was cancelled or a committed write rolled back.

## Errors

`new ApiError(message, code, field?)` is exported from the root. Use a safe,
member-readable message without credentials, stack traces or private server
details. Known codes are `CONFLICT`, `NOT_FOUND`, `INVALID_INPUT`,
`ACCESS_DENIED`, `UNAUTHENTICATED`, `UNAUTHORIZED`, `FORBIDDEN`, `STALE_ACCESS`,
`NETWORK` and `STORAGE`. Adapters may preserve additional codes. Every operation
rejects on failure; never replace denial/unavailability with an empty page or
successful acknowledgement. Network failures after dispatch can have an
uncertain write outcome. Only documented idempotent operations may replay their
same key without first resolving that uncertainty.

## KMS compatibility and migration

```ts
import {
  kmsNoteApi, createKmsNoteHost, clearAccess, refreshAccess,
} from '@knowledge-engine/note-gui/kms';

const host = createKmsNoteHost(href => { router.push(href); return true; });
const mounted = mountNoteCoreGui(container, {
  api: kmsNoteApi,
  knowledgeContext: kmsNoteApi,
  relations: kmsNoteApi,
  host,
  timeZone: workspaceTimeZone,
});
```

The KMS runtime entry is `dist/kms.js` and its declarations are
`dist/types/kms.d.ts`. It exports the existing complete public adapter and the
historical same-origin GraphQL/file/CSRF transport, its access notifications and
KMS destinations. It needs no generated private client. `createKmsNoteHost`
subscribes to that same transport lifecycle, so compatibility media/core/context
reads share revocation. Hosts with their own transport supply their own
`NoteHost.access` and all three APIs instead. Do not combine an unrelated
lifecycle with the KMS adapter.

`mountNoteGui(container)` and `mountNoteGui(container, { api, onNavigate,
timeZone })` remain complete legacy entrypoints. The default adapter still
prefers `richBody`, then `authoredBody ?? body`, preserving intentionally empty
authored text. It supplies classification from the same response as optional
presentation metadata and the compatibility alias, without another request or
implicit HUMAN default. History and legacy warnings retain their semantics.
Advance the product pin only after the coordinator verifies its actual Next.js
`/notes/` host with Vite stopped, access changes and complete source delivery.

## Independent persistent example

After `make bootstrap` and `make verify`, run `pnpm example` and open
`http://127.0.0.1:18139/example/`. `examples/independent.html` imports the built
module/CSS and supplies only `NoteCoreApi`, a lifecycle and one home destination.
The static example server serves no KMS API, requires no cookie or database and
does not run Vite. `pnpm test:independent` owns and stops its own instance.
That browser gate also builds a configured Draw.io test bundle under
`.tmp/drawio-dist` and intercepts its approved HTTPS origin with an offline
protocol fixture. The normal `dist` remains unconfigured. This checks iframe
document/state retention, delayed autosave and successor upload plus note save;
it does not claim acceptance of a remote Draw.io deployment.

`createLocalNoteApi({ namespace, storage?, locks? }): NoteCoreApi` implements
every core operation. It persists notes, immutable history, comments, property
upserts, tree moves, actual file bytes/checksums and idempotency receipts in
browser localStorage. Web Locks serialize revision checks and commits across
tabs. Default dependencies are `window.localStorage` and `navigator.locks`;
missing Web Locks, corrupt/unsupported storage and quota failures reject
explicitly. The example uses one `local` workspace and one local user. Visibility
values are stored labels in this single-user example, not multi-user protection.
It does not implement knowledge/relation APIs, production authentication,
cross-device sync, encryption or scalable file storage. Browser eviction and
quota apply. No KMS host uses this store unless explicitly configured to do so.
