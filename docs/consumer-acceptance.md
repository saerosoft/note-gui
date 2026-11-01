# Consumer acceptance packet

## Candidate and compatibility

The published release is 0.8.0, building on the verified 0.7
repairs through `8946d40b`, implemented and pushed in `bd28c292`. Optional policy/association adapters and mount-local
dirty reporting establish a new MINOR contract. The local store version and
public root, KMS and stylesheet export paths remain unchanged.
The candidate repairs pending restore ownership, tab-owned comment/property
drafts, retired-tab responses, property/relation recovery and native slash/link
menu lifetimes and unapplied native-diagram navigation/close guards. It also
ships a local CJK-only Noto Sans KR fallback, including
code and comparison views, while retaining Latin and monospace font choices.
Consumers must update the complete matching module, CSS and asset tree together.

A pending restore accepts only its original note. Later dirty content keeps its
editor instance and conflict base; another tab or pane is not remounted. Panel
read recovery does not replay an acknowledged property or relation write. No
storage migration is required. Hosts opt into the new named capabilities and
dirty reporting; existing core-only mounts still work. The package remains private
to npm publication. Qualification and KMS adoption are separate; deployed
consumers retain their prior reviewed tuple until adoption is accepted.

COMPLETED release qualification/publication: `version/0.8` and annotated
`release/v0.8.0` select `b9c1ae1d544194fe9dc0bfe5490992be79182cbe`; tag object
`a327c46c3c8ba92f81b6cb6bc911112eb9ae4749`. Exact-source qualification passes
unit307/34, source3, browser41/41, actual Draw.io5/5 and package682/source295.
All seven downloaded assets match the local qualified bytes. The published
qualification/evidence preserve the first 40/41 browser attempt and unchanged
successful reruns. KMS adoption must verify this exact tuple, lock/gitlink and
complete asset distribution. Never consume a moving master tip.

KMS's normal build rebuilds the locked source rather than copying the release
tarball. All 804 ZIP entries in its rebuilt corresponding source match the
published source entry bytes. Archive metadata and generated chunk names differ;
this is a separately built consumer distribution, not byte-identical adoption of
the published binary. Its current-source parent and actual-host gates remain
required. The seven release-download byte checks above concern the published
assets only.

## Producer checks

- `verify-23.log` passes three source-offer exclusion tests, 307 unit/component tests
  in 34 files, TypeScript/declarations, the production module/CSS/assets build,
  distribution verification and strict package-name declaration/export checks.
  This includes the 24 transport cases plus actual policy/association UI,
  fail-closed recovery, opaque policy epochs and exact association replay.
  Two-worker execution keeps existing assertions/timeouts unchanged under shared
  host load. Earlier resource-concurrent failures remain recorded in GOAL.md.
- `pnpm test:independent` contains 36 real browser cases using built assets,
  revision-checked browser persistence and Web Locks without KMS or Vite. It
  covers late restores across dirty/switching/closed tabs, exact lost-ack
  create/save/comment replay, native local diagrams, optional-extension failure,
  access refresh/revocation, same-note panes and desktop/narrow layouts. Both
  Linux Chromium and installed Chrome 156 pass all 36. Added cases exercise
  nested child/ancestor pages, keyboard/multiselect/native moves, full contextual
  proof destinations, tab retirement and property/relation recovery. Native
  slash, toolbar, link, code, table and file-chooser edits persist after reload;
  downloaded bytes are checked exactly.
  Unapplied native source is protected during Ctrl+K navigation; cancellation
  keeps the original URL/draft, explicit discard/reopen does not restore old
  input, refresh preserves it, and revocation releases unload protection. An
  independent other-pane draft and DOM editor survive these actions.
  The 0.8 suite additionally verifies aggregate dirty state and mount isolation
  in two actual browser cases; the combined 38-case run passes. Three additional
  collaboration cases pass desktop/narrow association paging/creator/unlink and
  delayed-save fencing across a policy epoch change. The final combined run
  passes 41/41 in `independent-19.log` on the current built runtime. Earlier
  run 17/18 failures and focused repairs remain recorded in GOAL.md. Real KMS tests additionally passed cross-actor receipt
  replay/global identity and controlled private-target links on the new lease.
   `kms-08-fixture/real-collaboration-03.log` now passes all three real-backend
   cases, including shared rich create/save, comments, properties, authoritative
   history editors, exact protected-file bytes and outsider403. Neither static-byte
   mounting nor producer fixtures establish adopted product-host acceptance.
- `pnpm test:native-drawio` passes five cases against the actual approved Draw.io
  v32.6.1 static artifact, commit `84487b4891cbc0f32d7e30f34cf878c87cb1f414`.
  An isolated HTTPS loopback fixture trusts only its certificate SPKI pin. It
  verifies desktop/narrow canvas edits, immutable successors, a read-only viewer,
  same-note restore isolation and inline edits/undo through held refresh.
  The final matching runtime passes 5/5 in `native-drawio-10.log`; final source/
  test TypeScript checking passes in `types-26.log`.
- An actual `npm pack --ignore-scripts` tarball was extracted into a fresh
  consumer. Root and KMS runtime imports execute; CSS export resolution and
  public imports pass with `skipLibCheck: false`. All 682 distribution files
  match the build, and every library source entry in its source ZIP matches
  the working source. The Noto Sans KR OFL license is in the source offer.
  The final 0.8 snapshot includes 295 matching source files after completed-unit
  retirement and actual KMS policy/association runtime exports. The final
  documentation-only recording receives a repeat source-byte check.
  Final artifact hashes are external qualification output;
  do not embed a package's own hash inside its source offer.
- The in-app browser loaded the extracted package through package-name import
  maps. It exercised populated heading/bold/code/table/comments, dirty tab
  switching/reorder/cancel, property save/delete, 1600/390 layouts and two actual
  roots. Idempotent unmount removed both lifecycle subscriptions; a delayed
  retired-root read did not replace the other root's draft. The newer packaged
  Chrome capture confirms the shipped Korean font supplies the control glyphs
  without a system Korean fallback and the 390px document has no page overflow.

The bounded real-API producer lease passed five core cases and four access
cases on the implementation through `f971775e`, with fixture-independent
expectations committed in `673d7b6f`. A peer also edited an XML diagram through
the GUI and saved a distinct immutable successor: the owner read the unchanged
original and exact successor bytes, while an outsider received 403 and an
anonymous client 401 without protected bytes. The created note was archived.
The later menu-only repair is covered by the independent/native suites above.

The lease ended at its fixed 2026-11-01 13:22:39 UTC expiry. KMS confirmed cleanup
of all eight owned resources. It did not capture an independent SQL inventory
before deletion, so specific producer row/count/role claims remain unverified
by the consumer. This is finite producer browser/API evidence, not integrated
product, shared-mode or storage acceptance. Protected fixture material remains
outside the public source offer.

The new isolated 0.8 lease captured independent SQL counts for all 135 public
tables and a complete storage inventory after the three browser cases, before
cleanup. Its recovered supervisor runs outside the OpenCode cgroup after an OOM;
the owned database/storage and authenticated sessions were preserved. Final
independent role/link/receipt and actual object-byte verification passes 34
assertions across 28 categories with zero mismatches. Roles match baseline/post/
current SQL exactly; three active accounts/original sessions remain; 16 association
receipts/audits show no replay transition. All three actual S3 objects match their
26-byte database size/checksum and synthetic payload. The final current-adapter
browser run passes 3/3 in `real-collaboration-05.log`. The original and final
sanitized proofs are retained. Another complete inventory preceded owned-only
cleanup, and exact Docker inspection confirms seven containers and their network
absent. No existing product runtime or consumer pin was changed.
The old expired lease's missing inventory does not apply to this new snapshot.

The sanitized [producer evidence](producer-evidence.json) records the finite
results, source/runtime hashes and visual evidence hashes. Raw logs, package
bytes and synthetic screenshots remain under `.tmp/session-2026-11-01`,
`.tmp/gui-completion` and the named browser-output paths; they
   must be archived with the separately authorized release qualification before
   final product/release acceptance records retire. A completed bounded correction
   diary may retire after its own evidence is readable and every separate parent
   dependency remains in the active ledger.

[GOAL.md](../GOAL.md) tracks the complete remaining objective and document
retirement. Lasting behavior belongs to the
[functional specification](functional-specification.md); this packet records
verification and adoption conditions only.
The local producer archive has 93 readable byte-checked entries, including both
sanitized real-backend proofs, final role/storage cleanup verification, synthetic
screenshots and the completed correction unit's four-entry archive. Qualification
records its hash externally. Release 0.8.0 now archives this evidence with its
exact-source logs, bounded SQL/S3 proofs and retained qualification attempts.

## Consumer acceptance cases

| Owner/input | Required check before acceptance |
| --- | --- |
| KMS release coordinator | Adopt only the published version/tag/peeled commit and matching source offer. Serve the complete module/CSS/chunks/fonts/notices through actual `/notes/`, with Vite stopped. |
| KMS ordinary authenticated host | Save/reload a rich document; delay a real history-restore response, type a draft, deliver it, verify the draft and stale-save conflict, inspect the committed server revision, then explicitly replace the draft. Repeat same-note panes and tab switching/closure. |
| KMS file authority | Repeat the bounded peer XML result for the qualified integrated host and all required native formats; retain independent storage inventory. Change role/audience during reads/uploads and verify the byte endpoint as well as the UI. |
| KMS contextual fixture | Current/authored/history stay distinct; relation/backlink proof and source/rule/review/action links select the exact authorized operation/revision. No private source is copied into shared content. |
| Approved Draw.io installation | Qualify the approved deployment/embed origin. Five current tests use the actual pinned native application over isolated loopback HTTPS; deployment/session acceptance remains separate. |
| Platform scope | Linux is required. Windows support and its qualification are NOT_APPLICABLE by explicit user decision; its historical billing failure is not a blocker and its workflow is removed. |
| KMS P14 owner | Freeze the real workload, hardware, access selectivity and scale envelope. Repeat root/child/ancestor/move/large-body/byte/memory measurements and sustained mixed-authority acceptance. |
| KMS SC01/SC09 coordinator | Verify the new optional policy/association and dirty-state APIs in its isolated shared/controlled host. Original creator and SC01/SC02 mapping are implemented; wider per-record audience/actor DTOs remain backend-owned inputs. |

## Limits and documentation state

The 1,300-root local example measurement is warm, single-user and explicitly
garbage-collected. It is not a million-note service, peak-memory or sustained
KMS capacity result. The 1 MiB actual download does not replace the older 20 MiB
KMS native-download check. Native Excalidraw edits and Mermaid/XML roundtrips
pass. The protocol fixture and actual native Draw.io suite have separate
receipts. The packaged Korean glyph issue was reproduced and repaired using
shipped same-origin/embedded font resources; current tests need no temporary
system font configuration. Existing third-party sourcemap and Node
experimental-localStorage warnings remain.

KMS settled R01 and pushed SC01 base policy/capability transport in `59bc415`.
Its subsequent SC02 packet confirms original creator identity/nullable name,
global association identity and the existing paging/request protocol; the current
   SDL contains those fields. The public adapter preserves them. Exact GUI
wrapper and dirty-state designs were approved by the user. Current source
confirms CONTROLLED MEMBER write, first-creation revision zero and exact receipt
replay; these are not pending technical questions. Wider effective-audience and
actor transport is not agreed; current actual-space policy and existing history
editor/comment author/association creator suffice for the bounded adapter. Any
concrete unrepresentable actor requirement stays open. No authority is inferred.
Public 0.8 policy/association and mount-local dirty APIs are implemented;
host router integration remains consumer-owned. Human review is not a gate.
KMS records the agreed wrappers in its `docs/frontend-architecture.md:25-31`
(owner commit `115cfbd`). The user's later session grant authorized the external
release/adoption work. KMS now selects the exact published 0.8 tuple and has the
optional bindings and persistent dirty-navigation guard in its development
tree. Final focused15/3 and full WEB938/148, types, production build, lint and the
exact release import check pass. Current-source CONTROLLED run10 `0caa51d9e802`
passes375/900/1440px with diagnostics removed: native Back and single/multiple
Forward cancellation, explicit leave/reopen, unchanged draft/editor/history,
style disposal, rich save/reload, actual download, denials and tree move.
Independent proof verifies12 dialogs, SQL3 notes/9 tree records, S3 LIST3 objects/
166 bytes, both135-table inventories and owned-only cleanup. Original organization
and roles remain preserved; no separate direct S3 GET is claimed. The API SHA-256
`7eaaac803389e2ccd1f41408f02c86c9eae5c5c5869a401f19ea12e6d6dedeb0` is
independently bound to frozen backend source. Exact commits, clean freeze and the
single normal parent pre-push/push remain open, together with SHARED,
populated/native/workload evidence. Existing
runtime/data and unrelated concurrent backend work are preserved. The remaining
host conditions cannot be closed by producer-only checks.
G11 retirement remains open. Seven historical journals are reconciled in
`COMPLETION_STATUS.md`; the completed 2026-10-25 correction unit is removed after
53 current tests and a readable four-entry archive. Six journals still retain
unfinished dependencies. Historical evidence keeps its original source/topology
limits. Keep licenses, provenance and active criteria; retire the session prompt
and completion record last.
