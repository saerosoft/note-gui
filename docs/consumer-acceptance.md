# Library qualification and consumer ownership

## Independent project boundary

Note GUI owns its public API, GUI behavior, optional adapters, package,
corresponding source, tests and releases. Each consuming project decides how to
use the library and qualifies its own integration. KMS is one optional consumer;
its milestones, deployment, Jenkins configuration, business data, model execution
and dependency-pin changes do not define this project's completion.

The [functional specification](functional-specification.md),
[public contract](../CONTRACT.md) and [release procedures](../OPERATIONS.md)
define this library's requirements. The [qualification record](note-gui-acceptance.md) maps completed library work to its evidence.
This packet does not prescribe a consuming project's architecture or acceptance
plan and grants no permission to change another repository.

## Responsibilities

| Owner | Responsibility |
| --- | --- |
| Note GUI | Retained shell/editor/tree behavior, optional panels, dirty/navigation/access lifecycle and native diagrams/files |
| Note GUI | Typed host contract, existing adapter behavior, error/replay/resource guarantees and independent host verification |
| Note GUI | Package exports, CSS/chunks/fonts/declarations, notices/provenance, matching source and immutable release qualification |
| Consuming project | Framework, routes, authentication, authorization, canonical persistence/revisions and storage |
| Consuming project | Knowledge membership, source processing, rule validation/approval, business migrations and product-scale acceptance |
| Consuming project | Version selection, dependency pins, deployment, CI configuration and its own integration checks |

## Producer qualification

Verify the actual built library in its independent persistent host. Retain the
normal repository checks, strict extracted-package import/type checks, desktop
and narrow browser flows, native editor checks and measured resource behavior.
Optional capabilities need populated, empty, denied, failed and late supplied
results. The library presents those results and fences retired work; it does not
generate the host's business truth or require a production corpus to test the UI.

The qualified 0.8.3 release selects commit
`eb6f80843db21ea6878ecde9838ad277e12009b5` and annotated tag `release/v0.8.3`.
It passes 3 source checks, 329 unit tests in 34 files, 46 independent browser cases,
5 actual native Draw.io cases, strict extracted-package checks and additional
sequence/math compatibility checks. Its dependency audit reports 0 known findings.
All seven downloaded assets match the checksums. Exact tag identity, commands,
source and hashes remain in `OPERATIONS.md` and the release qualification assets.
Earlier releases and historical consumer observations retain their original limits.

## Optional integration

A host supplies `NoteCoreApi`, lifecycle and destinations through the public
contract. Knowledge context, relations and collaboration are optional named
capabilities. Absent capabilities make no calls; supplied failures remain visible
and recoverable. Each host chooses the persistence and transport behind those
interfaces.

The existing `/kms` entry remains a compatibility adapter with the prerequisites
in [CONTRACT.md](../CONTRACT.md#kms-compatibility-and-migration). Its documented
routes, cookies and operations describe that adapter. KMS decides whether and
how to use it, select a version and qualify its own deployment.

A consumer report can reveal a library defect. Record the affected library
version, public operation, supplied input/result and observed behavior; reproduce
it locally against the contract. A consumer's unrelated release, business-data
or deployment work does not enter this repository's completion queue.

## Historical integration records

`producer-evidence.json` preserves dated KMS integration/load observations with
exact source tuples, failed attempts, qualification limits and cleanup proofs.
These records are evidence about those runs, not current producer prerequisites.
No previous consumer acceptance flag establishes whole-library completion.

The historical [current-knowledge](current-knowledge-acceptance.md),
[populated-data](populated-data-acceptance.md) and
[note-screen](note-gui-acceptance.md#historical-consumer-evidence) records retain their provenance links.
The full earlier [consumer packet](https://github.com/saerosoft/note-gui/blob/3d15c3e096b4fdb4fec347a01277b0780ac2ce2d/docs/consumer-acceptance.md) remains in Git history.
Its consumer-specific work instructions and library completion dependencies are
superseded by the user's 2026-11-04 independence clarification. Each consumer
chooses whether any of those historical checks applies to its own project.
