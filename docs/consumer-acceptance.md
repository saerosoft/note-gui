# Consumer acceptance packet

## Candidate and compatibility

The development candidate is 0.7.1 on `master`, through implementation commit
`ced912a8`. The intended public 0.7 signatures and local store version remain
unchanged. The public root, KMS and stylesheet export paths remain available.
The candidate repairs pending restore ownership, tab-owned comment/property
drafts, retired-tab responses, property/relation recovery and native slash/link
menu lifetimes. It also ships a local CJK-only Noto Sans KR fallback, including
code and comparison views, while retaining Latin and monospace font choices.
Consumers must update the complete matching module, CSS and asset tree together.

A pending restore accepts only its original note. Later dirty content keeps its
editor instance and conflict base; another tab or pane is not remounted. Panel
read recovery does not replay an acknowledged property or relation write. No
storage migration or new host method is required. The package remains private
to npm publication. Qualification and KMS adoption are separate; existing
consumers retain their reviewed 0.7.0 tag and exact commit.

The release operator must separately promote the reviewed development commits
to `version/0.7`, qualify that exact result, publish a new immutable tag/assets
and verify downloaded bytes. KMS then reviews the tuple and updates its lock,
gitlink and asset distribution together. Never consume a moving master tip.

## Producer checks

- `make verify` runs three source-offer exclusion tests, 266 unit/component tests
  in 32 files, TypeScript/declarations, the production module/CSS/assets build,
  distribution verification and strict package-name declaration/export checks.
- `pnpm test:independent` contains 35 real browser cases using built assets,
  revision-checked browser persistence and Web Locks without KMS or Vite. It
  covers late restores across dirty/switching/closed tabs, exact lost-ack
  create/save/comment replay, native local diagrams, optional-extension failure,
  access refresh/revocation, same-note panes and desktop/narrow layouts. Both
  Linux Chromium and installed Chrome 156 pass all 35. Added cases exercise
  nested child/ancestor pages, keyboard/multiselect/native moves, full contextual
  proof destinations, tab retirement and property/relation recovery. Native
  slash, toolbar, link, code, table and file-chooser edits persist after reload;
  downloaded bytes are checked exactly.
- `pnpm test:native-drawio` passes five cases against the actual approved Draw.io
  v32.6.1 static artifact, commit `84487b4891cbc0f32d7e30f34cf878c87cb1f414`.
  An isolated HTTPS loopback fixture trusts only its certificate SPKI pin. It
  verifies desktop/narrow canvas edits, immutable successors, a read-only viewer,
  same-note restore isolation and inline edits/undo through held refresh.
- An actual `npm pack --ignore-scripts` tarball was extracted into a fresh
  consumer. Root and KMS runtime imports execute; CSS export resolution and
  public imports pass with `skipLibCheck: false`. All 677 distribution files
  match the build, and every library source entry in its source ZIP matches
  the working source. The Noto Sans KR OFL license is in the source offer.
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

The sanitized [producer evidence](producer-evidence.json) records the finite
results, source/runtime hashes and visual evidence hashes. Raw logs, package
bytes and synthetic screenshots remain under `.tmp/session-2026-11-01`,
`.tmp/gui-completion` and the named browser-output paths; they
must be archived with the separately authorized release qualification before
the active records or historical acceptance journals are retired.

## Consumer acceptance cases

| Owner/input | Required check before acceptance |
| --- | --- |
| KMS release coordinator | Adopt only the published version/tag/peeled commit and matching source offer. Serve the complete module/CSS/chunks/fonts/notices through actual `/notes/`, with Vite stopped. |
| KMS ordinary authenticated host | Save/reload a rich document; delay a real history-restore response, type a draft, deliver it, verify the draft and stale-save conflict, inspect the committed server revision, then explicitly replace the draft. Repeat same-note panes and tab switching/closure. |
| KMS file authority | Repeat the bounded peer XML result for the qualified integrated host and all required native formats; retain independent storage inventory. Change role/audience during reads/uploads and verify the byte endpoint as well as the UI. |
| KMS contextual fixture | Current/authored/history stay distinct; relation/backlink proof and source/rule/review/action links select the exact authorized operation/revision. No private source is copied into shared content. |
| Approved Draw.io installation | Qualify the approved deployment/embed origin. Five current tests use the actual pinned native application over isolated loopback HTTPS; deployment/session acceptance remains separate. |
| Native Windows owner | Supply a reachable authorized native command environment with Node 26, pnpm 10.29.2, Python and Make. Run package and browser gates there; Wine/static inspection do not qualify it. |
| KMS P14 owner | Freeze the real workload, hardware, access selectivity and scale envelope. Repeat root/child/ancestor/move/large-body/byte/memory measurements and sustained mixed-authority acceptance. |
| KMS SC01/SC09 coordinator | Complete the effective-audience/creator/shared-association packet and transport mapping, including stale-open-pane and epoch/failure cases, before a new MINOR GUI contract. SC01 base fields are settled; the wider packet is pending. |

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
Its initial SC02 matrix and later audience/creator work were reported as
uncommitted backend evidence. Exact effective-audience/actor/association
agreement is still pending. No shared-mode GUI exports or inferred authority
were added. The proposed mount-local dirty-state method/router integration is
also unagreed; existing internal dirty confirmation remains the 0.7 behavior.
G11 retirement also remains open: all seven historical journals are reconciled
in `COMPLETION_STATUS.md`, and their evidence is preserved with its original
source/topology limits. Keep required licenses, provenance and all active
criteria. Retire the session prompt and completion record last.
