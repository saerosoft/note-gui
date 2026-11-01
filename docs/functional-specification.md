# Note GUI functional specification

## Responsibility

The reusable library provides the retained Docmost note shell, editor, tree and
panels inside a consuming web host. The host owns authentication, authorization,
canonical persistence/revisions, immutable storage and business knowledge,
rules, reviews and actions. Vite is optional development tooling. Enterprise
modules, simultaneous co-editing, style packs and full Trilium parity are excluded.

This document owns lasting feature behavior. [CONTRACT.md](../CONTRACT.md) owns
exact API types/operations/errors/lifecycle; [OPERATIONS.md](../OPERATIONS.md)
owns build/release/source procedures. [GOAL.md](../GOAL.md) owns work status and
verification. Requirements here do not claim completed acceptance.

## F01: Host composition

Core-only hosts supply authorized persistence, access lifecycle and destinations
without KMS routes/cookies/context stubs. Knowledge context and relations are
complete optional named capabilities: absent means no controls/calls; supplied
failure is visible and recoverable. Every mount owns its root/listeners/timers/
portals. Idempotent disposal fences retired results without undoing backend writes.

## F02: Rich editing and mutation recovery

Titles and complete structured bodies support native slash/formatting/headings/
lists/links/tables/code/images/files. Prefer rich content, then nullable authored
text, then compatibility text; explicitly empty authored text stays empty.
Current knowledge is never inserted into the editor. Unknown structured nodes
remain preserved and block saving visibly instead of being flattened.

Saves compare authoritative revisions. Conflicts preserve the draft and offer
inspection/explicit replacement, without automatic merge. Create/save/comment
retain exact intent/key after uncertain acknowledgement. Keyless mutations use
readback before another write; read recovery never repeats an accepted mutation.

## F03: Tabs, panes and departure

Reorderable/closable tabs retain independent authored, comment and typed-property
drafts. The same note may be edited independently in both panes. Editor/toolbar/
selection/details/history/operations belong to their actual tab/pane lifetime;
reopened tabs reject retired acknowledgements and follow-up reads.

Navigation/close protect all unsaved content, including unapplied native diagram
changes. Cancellation retains the selection, URL and draft. Explicit discard
affects only the requested scope. Host-external dirty reporting follows the
agreed public contract; the host owns its router and confirmation.
Each mount exposes `hasUnsavedChanges()` and accepts optional
`onDirtyChange(boolean)` notifications when its aggregate dirty state changes.
Notifications cover both panes and every retained tab, including comment,
property and unapplied native drafts. Access loss and disposal clear the state.
Disposal is not an asynchronous save or a navigation confirmation.

## F04: History

History has bounded pages and immutable revision identities. Restore copies the
selected structured content into a new revision under the current expected
revision and preserves supplied origin metadata. Pending responses cannot erase
later edits or remount another tab/pane; dirty content retains its conflict base.
Uncertain restoration requires readback before another restore intent.
History rows show the supplied revision editor name. An unavailable editor is
explicitly unknown, never substituted with the current account or note owner.

## F05: Trees and bounded resources

Roots/children use cursor reads, bounded caches and rendered rows. Descendant
expansion/location never requires fetching the full tree. Direct links resolve
authorized root-to-parent ancestors. Keyboard focus, multiselect, native drag/
drop and subtree moves preserve unrelated drafts. The host validates every
source/destination/descendant. Cross-space completion uses actual placement and
clears obsolete links after authority refresh. Bounded title lookup remains
separate from full product search. Workload limits require actual measurements.
Tree reads return at most 50 siblings and the cache retains at most 24 pages.

## F06: Properties and relationships

Properties support TEXT/NUMBER/BOOLEAN/DATE, individual upsert and identity-based
deletion under current note revisions. Tab-owned input and accepted/uncertain
state survive read failure. Readback brackets values with revisions and rejects
torn observations. Panel-only conflict recovery retains independent body edits.

Relationships retain predicate/direction/validity/review/revision/provenance and
supplied actor. Authorized targets are filtered before counts/paging. Backlinks
and bounded supporting proof are reachable. Rejected targets require reselection;
uncertain keyless writes require readback that paging cannot bypass. Empty success
and denied/unavailable results remain distinct.
Comments, history and relations use 20-row pages with at most 100 displayed
records. Current knowledge and accumulation history replace their 20-row pages.

## F07: Current knowledge, proof and exact links

Authored content, authoritative current membership and accumulation history stay
separate. Claim labels distinguish confirmed fact/request/inference/unclassified
statements; legacy mixed documents/revisions retain their supplied origin.
Evidence includes authorized immutable originals, locators, quote truncation,
occurrence/effective/application times and supplied audience. Applied rules select
exact versions. Comparisons select exact operations/saved before-after revisions;
proposals remain separate. Source/rule/review/action links use injected exact
destinations. The GUI neither computes business truth nor copies private proof.

## F08: Native diagrams and files

Draw.io retains editable XML and, when configured, the approved native graphical
application. Messages require both its approved HTTPS origin and current iframe
window; graphical mode owns its XML view. Excalidraw retains editable scenes,
authorized embedded files and local previews. Mermaid retains editable source
with strict sanitized rendering.
No external Draw.io frame loads without configuration. Read-only access selects
the graphical viewer. Excalidraw previews omit remote content without rewriting
the source; Escape stays with canvas/text tools, while explicit exit confirms
dirty edits. The pinned bundled Korean locale is enabled, with normal upstream
fallback for untranslated controls.

Diagram edits create immutable attachment successors and then apply references
to the note; file save and note save are separate. Prior bytes/history remain
unchanged. Uncertain uploads may leave an unreferenced stored blob and are never
reported as undone. Refresh retains authorized drafts, document instances and
undo. Access loss retires protected editors/previews/object URLs/late results.
Attachment lists include superseded/unembedded authorized versions with bounded
pages and native authorized downloads; unchecked external URLs grant no access.
Attachment pages replace at most 50 rows. Large native downloads use the browser
download manager instead of buffering complete editor blobs.

## F09: Current authority and shared collaboration

Host access change/loss invalidates obsolete note/tree/context/history/comment/
relation/diagram/byte results while preserving unrelated authorized drafts.
Optional extension denial remains distinct from global identity loss. Core
failure handling follows the exact fail-closed public protocol.

Shared content uses authoritative organization policy/capabilities. Historical
private/administrator values are provenance, not privacy promises. Shared
creation omits restricted-audience choices and uses the permitted baseline.
Content capability never promotes organization administration or waives revision
checks. Associations retain IDs/history, authorized targets and actual creators;
shared associations are not owner-only. Authors/editors/commenters/uploaders/
reviewers remain actual identities. Policy/epoch changes fence stale open panes.
No mode, effective audience or actor is inferred from selected organization/role.
In controlled mode, an authorized member can link its own writable private target
without gaining edit authority over the shared anchor.

## F10: Fidelity and delivery

Preserve native shell/editor/tree/menu/panel composition at desktop/narrow widths;
local table/diagram scrolling must not force page overflow. Deliver matching
module/CSS/chunks/fonts/declarations/licenses/notices/provenance/source together.
Shipped CJK fallback covers Korean controls/code/comparisons without replacing
retained Latin/monospace character ranges or requiring a font CDN. Native-platform,
consumer-host and workload acceptance uses actual authorized environments and
matching delivered artifacts, not types or producer fixtures alone.
Linux is the qualified host operating system. Windows support and native Windows
qualification are outside the required scope. No human-review gate is required;
automated checks and actual authorized-environment evidence still apply.
