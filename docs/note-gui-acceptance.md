# Independent library qualification

## Current accepted release

The F01–F10/G01–G11 library audit is complete for
[release 0.8.3](https://github.com/saerosoft/note-gui/releases/tag/release/v0.8.3),
qualified on 2026-11-04 at commit `eb6f80843db21ea6878ecde9838ad277e12009b5`.
Its annotated tag object is `f7435ccc48cbeff92d1da54b6e8587c9ea78e968`. This records
library behavior and delivered artifacts; each consuming project owns its
integration, backend semantics, deployment, data and adoption decision.

| Gate | Exact release result |
| --- | --- |
| Frozen bootstrap and normal Make | PASS; 3 source checks and 329 unit/component tests across 34 files; types/build/distribution/imports pass |
| Independent persistent host | 46 passed; zero skipped, unexpected or flaky cases |
| Actual native Draw.io | 5 passed; zero skipped, unexpected or flaky cases; 3092 static application files byte-verified |
| Extracted tarball | Strict declarations with `skipLibCheck: false`; root, `/kms` and CSS exports and actual runtime imports pass |
| Distribution/source | 747 distribution files, 292 committed source files and 754 package files checked |
| Dependency audit | 0 known findings, following 24 baseline findings; actual installed graph verified |
| Dependency compatibility | Actual sequence conversion and mathematical rendering pass, including the final built library |
| Publication | 7 downloaded assets byte-identical; 6 checksums pass; old 0.8.0/0.8.1/0.8.2 assets preserved |

The release's `qualification.json`, `producer-evidence-0.8.3.tgz` and
`SHA256SUMS` retain exact commands, tool versions, case results and hashes.
`producer-evidence.json` records the dated publication proof. No consuming
repository, dependency pin, service or business data was changed by this repair.

## Current work status

The 2026-11-05 documentation review found no additional unfinished requirement
outside the completed F01–F10/G01–G11 mapping. The retired checklist's final
release and record-retirement items are closed by the published 0.8.3 evidence and
the completed-work-record disposition below.

The functional specification and contract retain implemented behavior as ongoing
requirements. `OPERATIONS.md` describes checks for future changes and releases;
it does not schedule another release. Historical integration journals and dated
pending/failure flags in `producer-evidence.json` describe their original runs,
not an active work queue. Licenses, notices and source-provenance records remain
required distribution material.

There is no open implementation, qualification or publication task in this
project's current scope. Consumer adoption and future upstream updates belong to
their respective integration and maintenance decisions. Historical limitations
remain recorded below. Current runtime, public types and dependency pins match
the qualified release; this documentation review does not claim new test runs.

## Requirement mapping

| Requirement / completed unit | Verified library behavior | Checks |
| --- | --- | --- |
| F01 / G02 | Injected core, optional named capabilities, exact destinations, isolated mount/disposal | Host-boundary/access tests; independent mount and late-result flows |
| F02 / G03 | Structured editing, revisions, replay, lost acknowledgements and write rejection | Pane/retry/local persistence tests; actual native controls and reload |
| F03 / G04 | Independent dirty tabs/panes, protected departure and native drafts | Dirty/pane tests; split-layout, same-note and cancelled/discarded browser flows |
| F04 / G03/G04 | Immutable history, revision-guarded restore, supplied actors and late-result fencing | History tests; authored/current preservation and native restore browser flows |
| F05 / G05 | Bounded pages/cache/rows, authorized ancestors, moves and retained drafts | Tree/cache/ancestor tests; tree and independent resource checks |
| F06 / G06 | Typed properties, relations, target selection, proof and uncertain-write readback | Property/relation tests; actual independent relation/proof flows |
| F07 / G06 | Separate authored/current/history, exact destinations and opaque paging | Current/context tests; empty-authored/restore and opaque/empty-token browser cases |
| F08 / G07 | Editable immutable diagrams/files, authorized bytes, refresh/revocation and previews | Diagram/file tests; independent native editors; five actual Draw.io cases |
| F09 / G08/G10 | Supplied policy/capabilities/actors/epochs, associations and scoped denial | Access/collaboration/host-boundary tests; independent shared/controlled flows |
| F10 / G01/G09 | Retained Docmost composition, desktop/narrow layout, module/CSS/fonts/types/source/notices | Normal Make, strict extracted package, independent/native checks and visual inspection |
| Documentation / G11 | Independent ownership, exact evidence, preserved failures and completed-record retirement | Local requirement matrix, immutable source snapshots, JSON/link/diff verification |

The source offer on the qualified tag retains the full test inputs, lockfile,
SDK patch, provenance, notices and local feature specifications. Optional context,
relations and collaboration use supplied contract results around a real persistent
core; a business pipeline is not a prerequisite for library presentation checks.

## Repairs and retained limits

Current/history pagination preserves original cursor strings and visited pages.
Only null ends pagination; empty and numeric-looking tokens remain valid. Tree
cache tuple keys distinguish null, string sentinels and separator-containing IDs.
The 22 original failing regressions are retained with their passing counterparts.
Affected dependency pins/resolutions are updated while retaining the intended
0.8 public operations, limits and existing Excalidraw patch.

Qualification covers Linux and desktop/narrow browser layouts. Windows remains
excluded. The independent example uses browser storage and Web Locks; no product
authentication, model/search quality, business truth or production-scale claim is
made. A dependency audit covers advisories known at that execution time.

Historical direct-ancestor failures remain failures with unknown cause because
their original runs lack stage/scheduler data. The current unchanged 5000 ms case
passes in the full gate. No timeout or assertion was relaxed and no historical
fix is claimed. Reopen upon a current reproducible failure. Failed preparation
and diagnostic attempts remain preserved alongside the selected successful run.

## Completed work records

The local library checklist, session work units and execution status are retired
after qualification and publication. Their exact source snapshots remain in the
[qualified source](https://github.com/saerosoft/note-gui/tree/eb6f80843db21ea6878ecde9838ad277e12009b5)
as `GOAL.md`, `SESSION_PROMPT.md` and `COMPLETION_STATUS.md`, and in its matching
source archive. Their release/final-record checklist items are closed by the
publication proof and this lasting requirement mapping. Current behavior remains
owned by the functional specification and contract; operations owns releases.
No outstanding task is carried from those records into this library queue.

## Historical consumer evidence

The [historical screen journal](https://github.com/saerosoft/note-gui/blob/3d15c3e096b4fdb4fec347a01277b0780ac2ce2d/docs/note-gui-acceptance.md)
retains the original real-API observations. The [current-knowledge](current-knowledge-acceptance.md)
and [populated-data](populated-data-acceptance.md) reference pages preserve their
provenance and limits. Earlier KMS plans and acceptance flags describe those exact
runs. They do not govern this independent project's architecture or completion,
or authorize changes in another project.
