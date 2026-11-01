# Consumer acceptance packet

## Candidate and compatibility

The development candidate is 0.7.1 on `master`, with the unchanged intended 0.7
host contract. It repairs history-restore responses that replaced edits made
while the request was pending. A clean original tab accepts the restored note;
a later dirty draft keeps its content, editor instance and conflict base.
Switching to or closing another tab does not remount its independent editor.

The public root, KMS and stylesheet exports, adapter signatures, local store
version and CSS are unchanged. No host code or storage migration is needed for
this repair. The package remains private to npm publication. This packet is
producer evidence, not a qualified release tuple or KMS adoption approval.
Existing consumers remain on their reviewed 0.7.0 tag and exact commit.

The release operator must separately promote the reviewed development commits
to `version/0.7`, qualify that exact result, publish a new immutable tag/assets
and verify downloaded bytes. KMS then reviews the tuple and updates its lock,
gitlink and asset distribution together. Never consume a moving master tip.

## Producer checks

- `make verify` runs three source-offer exclusion tests, 262 unit/component tests
  in 32 files, TypeScript/declarations, the production module/CSS/assets build,
  distribution verification and strict package-name declaration/export checks.
- `pnpm test:independent` now contains 17 real Chromium cases using built assets,
  revision-checked browser persistence and Web Locks without KMS or Vite. It
  covers late restores across dirty/switching/closed tabs, exact lost-ack
  create/save/comment replay, native local diagrams, optional-extension failure,
  access refresh/revocation, same-note panes and desktop/narrow layouts.
- An actual `npm pack --ignore-scripts` tarball was extracted into a fresh
  consumer. Root and KMS runtime imports execute; CSS export resolution and
  public imports pass with `skipLibCheck: false`. All 677 distribution files
  match the build, and every library source entry in its source ZIP matches
  the working source. Final artifact hashes are external qualification output;
  do not embed a package's own hash inside its source offer.
- The in-app browser loaded the extracted package through package-name import
  maps. It exercised populated heading/bold/code/table/comments, dirty tab
  switching/reorder/cancel, property save/delete, 1600/390 layouts and two actual
  roots. Idempotent unmount removed both lifecycle subscriptions; a delayed
  retired-root read did not replace the other root's draft.

The sanitized [producer evidence](producer-evidence.json) records the finite
results, source/runtime hashes and visual evidence hashes. Raw logs, package
bytes and synthetic screenshots remain under `.tmp/session-2026-11-01`; they
must be archived with the separately authorized release qualification before
the active records or historical acceptance journals are retired.

## Consumer acceptance cases

| Owner/input | Required check before acceptance |
| --- | --- |
| KMS release coordinator | Adopt only the published version/tag/peeled commit and matching source offer. Serve the complete module/CSS/chunks/fonts/notices through actual `/notes/`, with Vite stopped. |
| KMS ordinary authenticated host | Save/reload a rich document; delay a real history-restore response, type a draft, deliver it, verify the draft and stale-save conflict, inspect the committed server revision, then explicitly replace the draft. Repeat same-note panes and tab switching/closure. |
| KMS file authority | Another authorized editor revises each native diagram, retaining original bytes/history and unrelated drafts. Change role/audience during attachment reads/uploads and verify the actual byte endpoint as well as the UI. |
| KMS contextual fixture | Current/authored/history stay distinct; relation/backlink proof and source/rule/review/action links select the exact authorized operation/revision. No private source is copied into shared content. |
| Approved Draw.io installation | Supply its approved HTTPS embed origin, pinned native editor artifact and permitted offline/local test boundary. The protocol fixture proves message/lifecycle behavior, not native graphical deployment acceptance. |
| Native Windows owner | Supply a reachable authorized native command environment with Node 26, pnpm 10.29.2, Python and Make. Run package and browser gates there; Wine/static inspection do not qualify it. |
| KMS P14 owner | Freeze the real workload, hardware, access selectivity and scale envelope. Repeat root/child/ancestor/move/large-body/byte/memory measurements and sustained mixed-authority acceptance. |
| KMS SC01/SC09 coordinator | Agree generated effective mode/audience/capability fields, actual actor and shared-association operations, policy revision/epoch and error semantics before a new MINOR GUI contract. |

## Limits and documentation state

The 1,300-root local example measurement is warm, single-user and explicitly
garbage-collected. It is not a million-note service, peak-memory or sustained
KMS capacity result. The 1 MiB actual download does not replace the older 20 MiB
KMS native-download check. Native Excalidraw edits and Mermaid/XML roundtrips
pass; the configured Draw.io protocol fixture is not the actual native editor.

The isolated Linux Chromium run uses Noto CJK fonts through a temporary
fontconfig file because the system has no Korean fallback. The in-app Chrome
session retains its missing-glyph limitation. No application CSS/font default
was changed to hide that platform difference. Existing third-party sourcemap
and Node experimental-localStorage warnings remain.

KMS has confirmed that G10's exact field contract is blocked on its R01/SC01
decision. There is no shared-mode implementation or publication claim here.
G11 retirement also remains open: all seven historical journals are reconciled
in `COMPLETION_STATUS.md`, and their evidence is preserved with its original
source/topology limits. Keep required licenses, provenance and all active
criteria. Retire the session prompt and completion record last.
