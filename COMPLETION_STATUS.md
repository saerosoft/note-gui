# GUI completion work record

This is the active G01–G11 requirement record, not a lane acceptance report.
The development baseline is `b9ecad5b` on `master`; the preserved history-restore
repair is committed as candidate 0.7.1. KMS owns product policy, migration, its Next host,
dependency adoption and whole-product acceptance. No consumer source or runtime
is changed by this record.

## Source reconciliation

Read on 2026-11-01: the current session assignment; KMS's release completion
handoff, document register, completion scope; completion-plan P03/P10/P11/P14–P16;
shared-collaboration design and Tasks 1–10; reusable-GUI design; technical design
GUI fidelity/scope/extraction sections; canonical planning blocks; original
KN01/KN02; historical knowledge/foundation criterion inventories; current ledger;
Docmost host closeout and authenticated packaged-host audit. Approved page and
Draw.io reference images were inspected. Their capture versions are unknown.

The corrected requirement is a public native GUI/CSS library inside WEB, with
Vite optional. Historical references to an independent product application or
package isolation as a license exemption are superseded. QA01, home aggregate
queries, AI decisions and business storage remain KMS-owned. Sharing is required;
simultaneous co-editing, style packs and full Trilium parity are explicit non-goals.

## G-unit ledger

`PARTIAL` means implementation or bounded producer evidence exists, with the
remaining criterion still open. Historical reports are not final current-host
acceptance. No whole G-unit is accepted solely from component tests.

| Unit | Original criteria and current source | Producer evidence / remaining behavior | Host dependency / status |
| --- | --- | --- | --- |
| G01 | KNOWLEDGE-002/010/064, F08; `src/vendor/docmost`, `upstream-manifest.json` | Retained shell/editor/tree/CSS, 115 provenance entries. Actual populated packed-browser 1600/390 views preserve shell, document, code/table and comments composition. Isolated Chromium has Noto CJK; in-app Chrome still lacks Korean fallback. No pixel equivalence or redesign claim. | KMS QA01, native Draw.io and current `/notes/` visual acceptance remain separate. PARTIAL. |
| G02 | KNOWLEDGE-001/003/004/011; `src/index.tsx`, `hostRuntime.tsx`, `host.ts` | Core-only persistence and full named-extension tests pass. Actual tarball root/KMS imports, CSS, strict declarations and byte checks pass. Actual two-root late/unmount check retains the other draft with zero retired subscriptions. | KMS selects compatible released adapter/session and verifies its host. PARTIAL. |
| G03 | KNOWLEDGE-005–009/027, F04/F05; `Pane.tsx`, `paneState.ts`, `NotePanels.tsx`, `localPersistence.ts` | Delayed restore loss reproduced and repaired. Complete gate 262 pass; independent suite 17 pass. Real committed/lost-ack create/save/comment retry preserves exact inputs/keys with one note/comment and revisions 1/2/3; later draft survives replay. | KMS canonical transaction, plain/proposal/MCP rich-node and application semantics. PARTIAL. |
| G04 | KNOWLEDGE-012/013/015; `Pane.tsx`, `DocmostPaneProvider.tsx`, `Workspace.tsx` | Same-note dirty panes, delayed restore at 1600/390, switching to another dirty tab and closing the restore target preserve the active DOM editor. Actual packed IAB tab switch/reorder/cancel and save retain rich JSON; component pane toolbar/comments/history coverage passes. | Product navigation/Back and imported corpus remain KMS acceptance. PARTIAL. |
| G05 | KNOWLEDGE-019–022/058, F06; `NoteTree.tsx`, `treeCache.ts` | Actual 1,300 roots/1,302 notes: 26 pages, reads at most 50 rows, 29 rendered rows; return after LRU eviction refetches the first page. Deep grandchild reveals its ancestor path. A 1,000-paragraph rich document and exact 1 MiB download pass. Sanitized measurements are in `docs/producer-evidence.json`. | Actual hierarchy/current authority, sustained mixed workload and scale envelope owned by KMS P14. Historical million-note results retain their older workload. PARTIAL. |
| G06 | KNOWLEDGE-023–026/030/032–038, F07; `NoteProperties`, `NoteRelations`, `NoteKnowledgeContext`, `NoteCurrentKnowledge`, `NoteProvenance` | Typed properties/proof/current/history/exact destinations pass component coverage; full-context browser verifies real panel failure/retained draft. Actual packed IAB edits TEXT/NUMBER/BOOLEAN/DATE and deletes a property with revisions 3–9, preserving rich content. | Actual populated KMS source/rule/review/action/proof and shared associations require the authoritative host fixture. PARTIAL. |
| G07 | KNOWLEDGE-016–018/027/065, F09; `useDiagramSource`, `useAuthorizedFile`, native node views | Existing diagram refresh was not reproduced as a current defect. Actual native Excalidraw rectangle/ellipse edit, save/reopen/refresh, retained Escape draft and immutable prior scene pass; actual Mermaid/XML roundtrips pass. Revocation removes editor/canvas/blob images. Configured offline iframe retains native document/autosave through refresh. | Approved real Draw.io deployment, cross-editor immutable file authority and KMS storage acceptance. PARTIAL. |
| G08 | KNOWLEDGE-014/027/036, F02; `access.ts`, `hostRuntime.tsx`, `useSpaceAccess.ts` | Host refresh/revocation, optional-failure separation, delayed response tests and native iframe refresh pass. Wider browser/cache/media combinations pending. | Current 0.7 core authorization errors revoke the whole mount. Per-note denial versus global identity loss requires an agreed host signal; GUI must not infer authority. PARTIAL. |
| G09 | FOUNDATION-002/003/004/025–029, KNOWLEDGE-064; build/source/package scripts | `make verify`: three source tests, 262 tests/32 files, declarations/build/distribution and strict copied-package resolution pass; 234 local fonts. Actual extracted tarball runtime imports/declarations/CSS, 677 dist-file comparisons and matching source ZIP pass. | Native Windows command environment and final authenticated packaged KMS candidate unavailable here. PARTIAL. |
| G10 | SC01/SC02/SC04/SC09/SC10, KNOWLEDGE-004/023–027/036/038 | Current 0.7 exports do not carry shared policy, effective audience, shared associations or complete actor attribution. No mode is inferred from role/admin flags. | KMS coordinator confirmed exact fields are not agreed and await R01/SC01. BLOCKED; no speculative exports. |
| G11 | R02–R06; factual docs, seven journals, source distribution | Seven journals read/reconciled below. Final facts/consumer packet and durable sanitized evidence are being prepared. | Retirement waits for accepted carried criteria, readable archived evidence and final source/link checks. Prompt and this record remain until last. PARTIAL. |

## Individual original criterion accounting

The prefixes in this table are `KNOWLEDGE-`. Every row retains its original
identity. `Producer partial` includes current code and the finite tests in the
G-unit ledger; it does not accept the backend or current integrated screen.

| ID | Required behavior | G-unit / disposition and dependency |
| --- | --- | --- |
| 001 | Domain-owned canonical notes and revisions | G02/G09 producer partial; KMS persistence acceptance |
| 002 | Native Docmost editor/tree/panels/diagrams | G01 producer partial; corrected library topology, reference comparison |
| 003 | Stable note identity and authenticated navigation | G02 partial; KMS host/session acceptance |
| 004 | Authorized snapshot/revision/edit capability | G02/G08 partial; G10 effective capabilities missing |
| 005 | Structured save/revision/exact replay intent | G03 partial; server schema/transaction validation KMS-owned |
| 006 | Atomic note/revision/change-event commit | KMS K02, not implemented by the GUI |
| 007 | Stale human/AI writes cannot overwrite newer content | G03 partial; actual AI/review semantics KMS K02 |
| 008 | No duplicate create/comment on retry | G03 producer browser passed exact committed-response-loss replay; host transaction acceptance separate |
| 009 | Rich nodes survive all exposed write paths | G03 partial; plain/proposal/MCP routes KMS K02 |
| 010 | Slash/table/code/link/file rich editor | G01/G03 partial; actual full control walkthrough pending |
| 011 | API save replaces upstream collaborative persistence | G02 implemented; independent real persistence passes |
| 012 | Dirty tab open/switch/close/reorder | G04 producer browser passed switch/reorder/cancel and delayed restore target closure; actual host acceptance separate |
| 013 | Location restoration and dirty departure confirmation | G02/G04 partial; actual KMS router/Back owned by consumer |
| 014 | Access change invalidates cached note/tree/file | G05/G08 partial; wider finite browser matrix pending |
| 015 | Pane-local editor/toolbar/comments/history/save | G04 partial; same-note delayed restore browser passes |
| 016 | Editable XML/scene/Mermaid source | G07 producer native Excalidraw, Mermaid and XML roundtrips passed; remote Draw.io acceptance separate |
| 017 | Approved Draw.io/local Excalidraw/strict Mermaid | G07 partial; real approved embed is installation input |
| 018 | Save/reload/restore/reopen all diagrams across panes | G03/G04/G07 partial; full current browser matrix pending |
| 019 | Cursor roots/children and bounded cache | G05 current bounded transfer/eviction measurements passed; KMS scale remains separate |
| 020 | Direct-link ancestor reveal/focus | G05 producer direct-grandchild browser and ancestor component checks passed |
| 021 | Keyboard/multiselect/drag/subtree navigation | G05 partial; measured actual interaction pending |
| 022 | Atomic authorized hierarchy moves | G05 client partial; server transaction/descendant checks KMS K02 |
| 023 | Typed property upsert/delete and revision guards | G06 actual packed-browser four-type edits/deletion and persistence passed; KMS authorization separate |
| 024 | Relations/backlinks without private target leakage | G06/G08 partial; authorized fixture and server matrix KMS-owned |
| 025 | Relation provenance and supporting proof | G06 implemented/tested; full current native proof fixture pending |
| 026 | Exact source/rule/review/action destinations | G02/G06 partial; KMS actual destination acceptance |
| 027 | Authorized comments/history/immutable files | G03/G07/G08 partial; actual multi-actor storage KMS-owned |
| 028 | Home space/tree/source/action/audience summaries | KMS KN01 home; G02 navigation and G10 audience dependency |
| 029 | Home content search and updated/new/count metadata | KMS KN01 home; core GUI title lookup is a narrower operation |
| 030 | Recent accepted changes and evidence | G06 projection partial; home/business acceptance KMS K02 |
| 031 | Home conflict/unresolved counts and navigation | KMS KN01/KN03; injected GUI destinations G02/G06 |
| 032 | Accumulate facts while preserving authored/history | G06 display partial; KMS current-write semantics |
| 033 | Original evidence and source/effective times | G06 implemented/tested; actual source acceptance KMS K02 |
| 034 | Source order/unclear updates use correct review | KMS K02; GUI displays supplied current/history state |
| 035 | Applied rule/version/comparison/improvement | G06 partial; actual rule/review lifecycle KMS K02/K03 |
| 036 | Private evidence cannot widen shared outputs | G06/G08 display partial; KMS policy and G10 contract |
| 037 | Related manual action preserves audience | G06 destination partial; KMS action creation and G10 audience |
| 038 | Actor/reviewer/rules/original/application history | G06 context partial; G10 full actor attribution contract missing |
| 058 | Growing collection latency/memory/freshness | G05 partial; freshness and sustained scale KMS P14 |
| 062 | Excluded Trilium clones/inheritance/scripts | NOT_APPLICABLE by technical-design GUI non-goals |
| 064 | Actual original screen appearance/state transitions | G01 partial; KN03/QA01 and integrated host KMS-owned |
| 065 | Another authorized editor revises a diagram | G07 client partial; KMS co-editor/file authority evidence required |
| 066 | Archive/restore monotonic backend events | KMS backend CRUD; no new GUI operation inferred |
| 067 | Bounded relationship answers and authorized proof | KMS SEARCH; G06 relation panel has a separate proof requirement |

KNOWLEDGE-039–057/059–061/063 cover KMS conflict decisions, retrieval, answers,
indexing, protected AI applications, MCP and human benefit evaluation. Their
implementation/acceptance remains with KMS K02–K08/K12/K13. GUI source/review
links and finite projection displays do not close those criteria.

FOUNDATION-002 is interpreted under the later explicit linkage/source-obligation
correction; no AGPL exemption is asserted. FOUNDATION-003/004/025–029 have the
G02/G03/G05/G07/G08/G09 split above. FOUNDATION-035 is KMS human adoption evidence,
not an agent-run GUI result; FOUNDATION-036 retains the explicit non-goals.

Historical finding reconciliation: F02 has injected lifecycle/focus/poll/epoch
implementation; F04 exact retry keys are retained; F05 server write preservation
is KMS-owned; F06 ancestor reveal exists; F07 proof components exist; F08 native
core/CSS restoration supersedes the old custom client; F09 co-editor storage
authority remains a KMS acceptance dependency. None is reopened solely from the
old code-audit status.

## Seven acceptance records

All seven files remain readable in Git and the working tree. Their facts and
limits have been reconciled, not relabeled as current integrated acceptance.

| Existing record | Facts retained | Current reconciliation / retirement condition |
| --- | --- | --- |
| `docs/2026-10-25-note-library-corrections.md` | Files/history/editor corrections, original byte checks and bounded imported-data actions | G03–G08; source is older. Reuse unaffected behavior, repeat changed lifecycle paths before retirement. |
| `docs/capacity-and-access-acceptance.md` | Warm million-note fixture, 50-row reads, cache/retained heap, real role changes | G05/G08; not cold/peak/sustained/current-host or Windows acceptance. |
| `docs/current-knowledge-acceptance.md` | Authored/current/legacy distinction, historical source ordering and exact pinned rule evidence | G06; server semantic results remain KMS-owned, later history-label repairs preserved. |
| `docs/drawio-acceptance.md` | Real approved native Draw.io, forged-window/origin refusal, immutable bytes and viewer | G07/G08; offline protocol fixture does not replace this native editor or current deployment acceptance. |
| `docs/move-and-large-document-acceptance.md` | Two-note private move, retained panes, 1,000 paragraphs and 20 MiB download | G04/G05/G07; not million-node moves or peak-memory/sustained load. |
| `docs/note-gui-acceptance.md` | Canonical scope and historical rich editor/pane/access cases | G01–G09; original standalone topology superseded by library-inside-WEB, no whole-screen completion inferred. |
| `docs/populated-data-acceptance.md` | Applied history/proof, exact rule links and restricted evidence | G06/G08; history is not current membership or model quality. |

## Evidence, versions and continuation

| Verified development unit | Commit |
| --- | --- |
| Updated complete G01–G11 assignment, separate policy documentation | `b3380daf` |
| Restore acceptance preserves dirty drafts/conflict base and other active editor | `cbb75603` |
| Persistent-host, native diagram, retry, bounded-resource and restore-lifetime browser qualification | `3f06cff8` |

- Current full gate: `.tmp/session-2026-11-01/verify-final.log`, 262/32 plus three source
  tests, build/distribution and strict copied-package consumer pass. The missing
  system Make was supplied locally under `.tmp`; no system configuration changed.
- Independent browser: `.tmp/session-2026-11-01/independent-final.log`, 17/17 after
  correcting a test-only exact-text selector. Earlier missing-build setup and
  selector failures are not product acceptance.
- Restore repair review found no Critical/Important regression. Added native
  tab-switch/close and diagram lifecycle checks pass. Arbitrary interleavings,
  current backend authority and target-platform performance are not inferred.
- Package/release metadata: 0.7.1 PATCH development candidate; public 0.7
  signatures unchanged. G10 requires a new MINOR once agreed. No tag, assets,
  release-branch integration or consumer pin update is authorized here.
- G10 schema request sent to the KMS coordinator on 2026-11-01. Needed inputs:
  authoritative effective audience/capabilities and policy revision, association
  operations, real actor identities and epoch/failure semantics, then SC09/SC10
  consumer cases. The coordinator confirmed R01/SC01 currently blocks agreement;
  this is an explicit dependency, not a waiver or a GUI completion claim.
- Native Windows needs an authorized reachable native command environment and
  pinned toolchain. Final KMS acceptance needs a qualified producer release,
  coordinator-owned asset/pin adoption and isolated authenticated product cases.
- G11 deletion is blocked until every carried criterion has accepted evidence or
  an authorized non-applicable disposition and the final manifest is retrievable.
  `SESSION_PROMPT.md` and this record are retired last, never to hide blockers.

The maintained consumer packet is `docs/consumer-acceptance.md`; sanitized
source/runtime/test/measurement/visual hashes are in `docs/producer-evidence.json`.
Package hashes and complete raw evidence remain qualification output outside the
distributed source to avoid self-referential archive hashes. Archive readability
must be established by the release owner before journal retirement.

## Checked deviations and remaining inputs

- Ruling: repair existing 0.7 guarantees with PATCH 0.7.1; a shared-mode contract
  requires a new MINOR after exact agreement. A wrong compatibility ruling would
  require a new version decision before consumer adoption.
- Ruling: retain the seven journals and execution files while their carried
  criteria remain open. Deleting them now would erase host/platform obligations.
- Ruling: independent 1,300-root/1 MiB measurements complement, not replace,
  historical million-note/20 MiB receipts and KMS sustained-load acceptance.
- Test-harness corrections included an unsupported Testing Library `exact`
  option, exact-text prefix mismatch, a diagram-button label, inherited bold
  marks on a newly typed paragraph and ES2022-compatible sorting. No production
  requirement, timeout or authority check was relaxed for a pass.
- No additional producer defect was confirmed in the existing diagram refresh
  boundary. Further changes there require a reproducible current failure.

The lane is paused, not complete. The inspected independent implementation and
verification work is delivered; no additional current producer defect was
confirmed by these checks. Resume on the agreed SC01/SC09 transport projection,
approved native Draw.io/file-authority fixture, reachable native Windows runner,
or coordinator-owned qualified-release/host/workload acceptance inputs. Those
conditions block the named criteria only; any newly reproduced independent
producer defect remains actionable on master under the development task.
