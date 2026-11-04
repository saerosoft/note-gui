# Note GUI development session

## Project scope

Note GUI is an independent reusable browser library. Work in the canonical
`/home/saerosoft/Projects/note-gui` checkout on `master`. Preserve the retained
Docmost shell, editor, tree, menus and styles, and the independent persistent host.

This project owns its GUI behavior, public host contract, optional adapters,
package, tests, corresponding source and releases. Each consuming project decides
how to use it and owns authentication, authorization, backend semantics, storage,
routing, deployment and product acceptance. The optional `/kms` adapter remains
supported. KMS plans, milestones, Jenkins jobs, data migrations and dependency
updates are outside this project's work queue and completion conditions.

Read the local `README.md`, `GOAL.md`, `CONTRACT.md`, `OPERATIONS.md`,
`docs/functional-specification.md`, `COMPLETION_STATUS.md`, `release.json` and
relevant source/tests. Historical KMS documents and integration receipts provide
context; they do not govern this project's architecture or acceptance.

## Required library behavior

| Unit | Library responsibility | Local verification |
| --- | --- | --- |
| G01 | Preserve the Docmost shell, tree, editor, controls, styles and local fonts. | Actual built-library desktop/narrow browser flows and visual checks. |
| G02 | Support injected core APIs, optional context/relations, navigation/access lifecycle and isolated mounts. | Independent persistent host, absent/failed extensions, multiple roots and late/disposed results. |
| G03 | Preserve structured save/reload/history/restore/conflict and uncertain-write identity. | Revision, replay, readback and lost-acknowledgement checks through the host contract. |
| G04 | Preserve independent dirty tabs/panes, including the same note in both panes. | Browser save/restore/navigation and late-result isolation without losing another draft. |
| G05 | Keep trees, ancestor lookup, moves, caches and downloads bounded. | Paged requests, keyboard/drag operations and measured independent-host resource behavior. |
| G06 | Present typed properties, relations, current/history/proof and exact supplied destinations. | Populated extension results, paging, retries, authorization and late delivery; business truth stays host-owned. |
| G07 | Retain editable Draw.io, Excalidraw and Mermaid data and authorized attachment lifetimes. | Actual native editing, save/reopen/restore, pane ownership, immutable references and cleanup. |
| G08 | Respond to host-signaled identity/access changes and scoped denials. | Protected content/media cleanup, stale-result fencing and unrelated authorized draft retention. |
| G09 | Deliver package exports, CSS/assets/fonts, declarations, notices, provenance and matching source. | Normal repository verification, strict extracted-package imports and independent/native browser gates. |
| G10 | Present optional capabilities, audience, associations, supplied actors and policy epochs. | Independent shared/controlled host checks using the public contract; policy and identity remain host-owned. |
| G11 | Keep specifications, evidence and work records consistent with this independent scope. | Local requirement/evidence audit, working links and retirement of completed local work records. |

The functional specification owns lasting behavior; the contract owns exact
operations and lifecycle; operations owns release procedures. Preserve all local
feature requirements when correcting historical scope. Style packs, simultaneous
co-editing, a Docmost backend and full Trilium parity remain outside scope.
Windows OS qualification is not required. Linux, desktop/narrow layouts, native
editor behavior and source/license obligations retain their recorded requirements.

## Work cycle

Use `GOAL.md` and `COMPLETION_STATUS.md` to identify actual remaining library work.
Reuse valid recorded evidence for unchanged code. Investigate a reproducible
local defect before changing behavior. Keep failed attempts and their limits.
Consumer observations may identify a library defect; reproduce and verify it
against this repository's contract rather than inheriting that consumer's backlog.

Qualify core functionality with the independent persistent host and the actual
built package. Optional capability checks use supplied contract results and real
browser interactions. The GUI does not generate business knowledge or rule
comparison results. A consuming project's dataset or model execution is not a
prerequisite for testing how the library presents a supplied result.

## Commands and release discipline

Follow the user's current Command Gate and authorization. This document grants
no permission to build, test, commit, push, publish, deploy or change another
repository. Keep temporary outputs under project-root `.tmp/` and follow the
user's search exclusions. Preserve unrelated changes and existing releases/data.

Development starts on `master`. Follow `OPERATIONS.md` for forward-only promotion
from `master` to `version/MAJOR.MINOR`; do not copy release changes back into
master. Contract changes require the documented version decision and qualification.
Package names and `/kms` exports remain unchanged by this scope correction.

Report in Korean the actual local changes, affected files/lines, verification and
remaining library work. Consumer adoption or product deployment cannot block
completion of an independently qualified library. Do not claim whole-project
completion until the local requirement/evidence audit is complete.
