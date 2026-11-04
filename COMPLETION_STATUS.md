# Note GUI implementation and verification status

## Current scope

Note GUI is an independent browser-library project. This record tracks library
behavior, its public contract, package, supported environments and releases.
Consuming projects own their integration choices, backend semantics, deployment,
data migrations, product acceptance and dependency updates.

The user's 2026-11-04 scope clarification supersedes earlier statements that
KMS adoption, Jenkins branch routing, independently generated business knowledge,
rule comparisons or a KMS product milestone block this project's completion.
The previous blanket PARTIAL/blocked judgments based on those dependencies must
not be reused. A fresh local requirement audit is still required; removing an
out-of-scope condition does not prove all library behavior complete.

## Recorded immutable release

| Item | Recorded result |
| --- | --- |
| Release | 0.8.1, unchanged intended 0.8 public protocol |
| Release commit | `07db42d5eff379cf2141e463c7f723c14ce185e1` |
| Annotated tag | `release/v0.8.1`, object `f24188816ecc86091a5400877604ceb90ac7eecc` |
| Producer qualification | 3 source checks; 307 unit tests in 34 files; 43 independent browser cases; 5 actual native Draw.io cases; strict extracted-package imports/types |
| Distribution | 682 distribution files and 292 corresponding-source entries; seven downloaded assets verified in evidence 492 |
| Platforms | Linux; desktop and narrow browser layouts. Windows is excluded. |

These are prior recorded results for the exact release, retained in
`docs/producer-evidence.json` under `qualifiedPublished081Release492` and in the
release qualification assets. Documentation edits are not a fresh execution of
those gates and do not rewrite that release's source or assets.

## 2026-11-04 independent requirement audit

The audit compares F01–F10 and G01–G11 with current implementation, test assertions
and actual qualification. At the initial audit, runtime/build/dependency inputs matched the qualified
0.8.1 release. The subsequent cursor repair changes only the existing pagination
implementation and its regressions; public types and page-size bounds remain unchanged. The prior whole-consumer PARTIAL labels are not reused.

| Requirement / units | Inspected implementation and checks | Current result |
| --- | --- | --- |
| F01 / G02 | `src/index.tsx`, `src/hostRuntime.tsx`; mount isolation, absent/failed extensions, immediate revocation and disposal in `src/hostBoundary.test.tsx` | Covered by fresh normal unit and independent-host gates. |
| F02 / G03 | `src/paneState.ts`, `src/docmost/validateDocument.ts`; structured editor, unknown-node rejection, replay/conflict and lost acknowledgements in pane/retry/independent tests | Covered by fresh gates; unknown attributes remain fail-closed. |
| F03 / G04 | `src/Workspace.tsx`, `src/Pane.tsx`; independent tabs/panes, native drafts, dirty reporting and cancelled/explicit departure | Covered by `dirty.independent`, native-editor and independent restore cases. |
| F04 / G03/G04 | `src/NotePanels.tsx`, `src/docmost/DocmostHistory.tsx`; revision-guarded restore, supplied actors and late viewer/restore delivery | Covered by history tests and independent restore flows, including the two new current-preservation cases. |
| F05 / G05 | `src/NoteTree.tsx`, `src/treeCache.ts`;50-row pages,24-page cache, ancestors, keyboard/drag moves and retained drafts | Fresh unit/tree/resource browser checks pass; historical timeout cause remains unproven below. |
| F06 / G06 | `src/NoteProperties.tsx`, `src/NoteRelations.tsx`, `src/RelationNotePicker.tsx`; typed fields, uncertain writes, exact proof and target selection | Property/relation checks pass; R2 numeric-token restriction is repaired and covered by regressions. |
| F07 / G06 | `src/NoteCurrentKnowledge.tsx`, `src/NoteAccumulations.tsx`; separate authored/current/history, exact rule/source/review/action destinations and comparisons | New empty-authored/restore checks pass; R1 opaque/empty cursor handling is repaired and covered by regressions. |
| F08 / G07 | Diagram/file source hooks and native node views; origin/window guards, immutable successors, previews, refresh/revocation and metadata pages | Fresh independent/native-protocol cases pass. Existing actual Draw.io5 qualification is reused because its runtime/configuration sources are unchanged. |
| F09 / G08/G10 | `src/useSpaceAccess.ts`, `src/hostRuntime.tsx`, collaboration/policy/association panels; scoped denials, supplied capability/actor and opaque epochs | Fresh host-boundary, access, collaboration and independent browser checks pass. |
| F10 / G01/G09 | Retained Docmost graph/styles/fonts, strict imports/types, source/notices/provenance and actual built desktop/narrow host | Fresh normal Make/package and independent gates pass; no new release is published. |
| Documentation / G11 | Local scope/owners, historical evidence classification and requirement accounting | Scope correction and this audit are complete; final retirement waits for actual local findings, not consumer adoption. |

Fresh `make verify` passes source3, unit307/34, types, build, distribution and
strict package-name imports. The full independent browser run passes45/45 with
zero skipped, unexpected or flaky cases. Both gates use a private copy of292
current source inputs with before/after hashes; original working inputs and
outputs are preserved. Evidence is under
`.tmp/independent-audit-20261104/`, summarized in
`docs/producer-evidence.json` as `independentLibraryAudit20261104`.
These gates do not erase the contract findings: the existing pagination tests
use ordinary numeric offsets and did not cover opaque tokens.

### Verified cursor contract repair

Current/accumulation pages now retain each returned cursor unchanged and keep
actual visited cursors for back navigation. Relation target selection no longer
infers an offset limit from a numeric-looking token. Only null ends pagination
across tree, attachments, comments/history, relations/proof and associations;
empty tokens remain valid. Tree cache keys use tuple serialization so actual
null, the string "null" and separator-containing IDs/cursors cannot collide.
Public types, page-size limits and adapter validation are unchanged.

The original code fails8 focused token regressions. Review exposes11 additional
empty-token failures and3 cache-collision failures. All corresponding focused
checks pass after repair. A failed full Make attempt caused by a Testing Library
option typo remains preserved; the option is corrected without changing the
assertions. Final normal Make passes source3/unit329/34, types/build/distribution
and strict imports. Independent browser46 and actual native Draw.io5 pass with
zero skipped, unexpected or flaky outcomes and matching before/after input hashes.
Actual native static files3092 remain byte-verified. Test ports are released.
Read-only code review reports no remaining blocker; current narrow context and
actual native screenshots are inspected. The repair proof and all attempts are
under `.tmp/opaque-cursor-20261104/` and summarized in the producer packet.
A same-contract0.8.2 release is the remaining publication step.

## Local issue retained

The first direct-ancestor test historically exceeded its unchanged 5,000 ms limit.
Later full and selected runs pass, but do not establish that historical cause.
The most recent selected diagnostic 626 passes the unchanged case in 556 ms and
measures one retained auto-scroll warning at about 3.08 ms synchronously. Its 217
source/config/lock inputs match before/after. Initial diagnostic 625 passes the
case but fails its result-file hook; 626 corrects only that output path. Proof 627
and publication 629 retain the limits of these observations.

The fresh normal Make gate also passes all329 cases under the unchanged
configuration. The available-evidence investigation is complete with an unknown historical
cause retained as a limitation. Reopen upon a current reproducible failure. Current
passes are not proof of a historical fix; an unverified consumer scheduling
snapshot is not an independent-project prerequisite. Preserve the failed
attempts, assertions and timeout, and use local evidence for any proposed change.

## Historical consumer evidence

`docs/producer-evidence.json` retains the original bounded KMS runs, failed
attempts, source tuples, SQL/storage observations, resource measurements and
cleanup proofs. Their recorded acceptance flags describe those snapshots only.
The full earlier [execution ledger](https://github.com/saerosoft/note-gui/blob/3d15c3e096b4fdb4fec347a01277b0780ac2ce2d/COMPLETION_STATUS.md) preserves the detailed
chronology. These records grant no authority to edit a consuming repository and
do not prescribe how KMS must adopt, host or deploy this library.

The former requests for Jenkins branch routing, legitimate pipeline/current
results and historical consumer corpora are not prerequisites for this project's
work. A consumer may use that evidence when it chooses its own acceptance plan.

## Published cursor repair and dependency follow-up

Release 0.8.2 at `41595cfaacb762a8165046069ce09c78b6bf13b1`, annotated tag object
`2d581c52ccd52e8294cd9ae4cfda76b17b74d0ce`, passes the exact clean-release normal
source3/unit329/34, independent46, actual native5 and extracted-package gates.
All7 downloaded assets,6 checksums,682 distribution files and292 public source
files match. Existing 0.8.0/0.8.1 assets are unchanged. The producer packet records
the publication proof; this qualification makes no security-audit claim.

Publication reveals dependency alerts belonging to this project. A fresh lockfile
audit confirms 24 affected findings, including 1 critical. Three affected direct
pins and four exact transitive resolutions are corrected. The updated audit has 0
known findings; the full normal/independent/native gates pass again at329/46/5.
Actual Mermaid sequence conversion produces 8 elements with 4 unique generated IDs,
math rendering produces a MathML node, and the built library renders the supplied
diagram without an error or forbidden script/frame output. The installed graph
matches all corrected pins. Read-only review finds no blocker. Diagnostic attempts
with incorrect metadata/skeleton assumptions remain failed and preserved.

The same intended public contract now needs a 0.8.3 qualification. This is library
maintenance and changes no consuming repository, backend, data or deployment.

## Remaining work

Qualify and publish the unchanged-contract0.8.3 dependency repair through `OPERATIONS.md`,
verify immutable refs/downloaded assets, then finish local record retirement.
The user approved this session's repairs and verification. No consumer adoption,
deployment or business-data prerequisite is part of this work.
