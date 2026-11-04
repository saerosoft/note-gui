# Releases and consumption

## Project ownership

Note GUI owns its development, public contract, qualification and releases as
an independent project. Consuming projects choose their versions and integration
and qualify their own backend, deployment and product behavior. KMS milestones,
Jenkins routing, dependency-pin publication and business-data validation are
outside this repository's completion criteria. Historical integration evidence
does not authorize work in a consuming repository.

## Development-first, one-way promotion

`main` is this repository's main development branch. All implementation, defect fixes, tests and documentation start there, including defects discovered in a released version. Do not develop fixes directly on `version/*` or create temporary work branches.

The only promotion direction is `main -> version/MAJOR.MINOR`. The release operator works on the receiving version branch, selects reviewed main-origin commits compatible with that line, merges the eligible development snapshot, and records its source SHAs. Do not merge a newer contract into an older patch line; if unrelated development changes prevent a safe merge, select only eligible development-origin changes with explicit provenance or require a new minor line.

`version/* -> main` is forbidden: never merge a release branch into main, rebase main onto it, or cherry-pick/copy release-branch commits into development. If release integration exposes a defect requiring implementation changes, fix and test it on main first, then promote forward again. Release conflict resolutions only integrate the selected development changes while preserving the receiving contract; they are not an independent development path.

Qualify the exact clean release-branch result after promotion, not just its development source. Record selected development SHAs and the final release SHA. Only that tested result receives new immutable tags/assets. A release merge commit can differ from main; it must not flow back into development. Keep `main` and `version/*` as the maintained project branches. Track the original repository separately through `upstream/main`; imported branch names are not maintained in this fork.

`main` holds the latest development. `version/MAJOR.MINOR` holds a qualified
minor contract and receives only patches that preserve it. Each release has an
immutable annotated `release/vMAJOR.MINOR.PATCH` tag and matching GitHub assets.
`release.json` declares the repository, version, branch, tag, public contract
paths and artifact kind. It declares identity; qualification is separate evidence.

## Version policy

The current minor contract is 0.8.0. Optional collaboration capabilities and
mount-local dirty reporting establish this line. The current qualified patch is
[release/v0.8.3](https://github.com/saerosoft/note-gui/releases/tag/release/v0.8.3)
at `eb6f80843db21ea6878ecde9838ad277e12009b5`, with annotated tag object
`f7435ccc48cbeff92d1da54b6e8587c9ea78e968`. It updates affected dependencies within the
intended 0.8 protocol and retains the opaque-cursor and native-layout repairs.
Normal Make verification, 46 independent browser cases, five actual Draw.io cases,
strict extracted-package checks and additional sequence/math compatibility checks
pass. Its dependency audit reports zero known findings. All seven downloaded
assets match qualification and checksums. Consumer adoption remains separate.

The prior 0.8.2 cursor repair at `41595cfaacb762a8165046069ce09c78b6bf13b1`
retains tag object `2d581c52ccd52e8294cd9ae4cfda76b17b74d0ce`. The 0.8.1 native
layout repair at `07db42d5eff379cf2141e463c7f723c14ce185e1` retains tag object
`f24188816ecc86091a5400877604ceb90ac7eecc`. Their source, assets and evidence
remain available to consumers retaining those exact pins.

The original 0.8.0 annotated tag `a327c46c3c8ba92f81b6cb6bc911112eb9ae4749`
still resolves to `b9c1ae1d544194fe9dc0bfe5490992be79182cbe`. Preserve its assets
and source for consumers retaining that pin. Publishing a patch does not update
an existing consumer automatically.

- Increment MAJOR for a substantial redesign of the library's concept or
  responsibility, then reset MINOR and PATCH.
- Increment MINOR and reset PATCH for every public contract change, including
  additions, removed operations, limits, errors, defaults, timing and lifecycle
  guarantees. Compatibility across arbitrary minor versions is not promised.
- Increment PATCH only for defect repairs within the unchanged intended minor
  contract. Bring main-origin repairs forward to their version line, rerun its
  complete qualification and publish a new tag and assets.

The core/context/relations split and explicit host contract added to package
0.6 establish the 0.7.0 contract. Its line is `version/0.7` and its tag is
`release/v0.7.0`. Docmost's upstream `v0.7.0` tag is unrelated to this library release.
Upstream tag names are not retained in this fork; provenance records retain
their original names and exact commits.

The exact overrides in `pnpm-workspace.yaml` apply only to affected versions.
Nano ID 4 moves to 5 because its corrected release is on that line; the converter
uses its synchronous API. KaTeX 0.18 uses its public renderer API. Verify actual
Mermaid-to-Excalidraw conversion and mathematical rendering when changing these
resolutions, retain the existing Excalidraw patch, and regenerate matching source
and dependency notices. A clean dependency audit describes the advisories known
at that run; it is not a guarantee against future vulnerabilities.

## Consumer identity

The reproducible identity for patch 0.8.3 is `version/0.8`, tag `release/v0.8.3`
and exact commit `eb6f80843db21ea6878ecde9838ad277e12009b5`, as recorded in
`qualification.json`. Verify that the tag resolves to that commit and that the
release identity and contract digests match the evidence. Later patches may
advance the branch; qualification applies to the recorded source tuple.
Each consuming project chooses its version-selection and update policy.

Download `knowledge-engine-note-gui-0.8.3.tgz` from that release and check it against
`SHA256SUMS`. It contains the package manifest and complete `dist/`, including
the ES module entries, CSS, chunks, fonts, declarations, source offer and notices.
The root, `/kms` and `/style.css` package exports retain their documented paths.
Hosts serving static browser assets copy the entire `dist/` tree and load its
stylesheet before mounting. The default asset base is `/note-gui/`; a different
base requires a separately qualified build. The package remains `private: true`;
GitHub release distribution does not publish it to an npm registry.

Keep the matching corresponding-source archive, lockfile, patches, provenance,
AGPL license and dependency notices available with the delivered GUI. The public
archive covers this library. It does not declare a consuming product exempt from
its own source obligations. See [README.md](README.md#source-distribution).

## Qualification

Use Node.js 26, pnpm 10.29.2, Python 3.11 or later and GNU Make. Install frozen
dependencies with `make bootstrap`. Keep logs and generated qualification files
under `.tmp/release/` and keep credentials and local host configuration outside
published assets. Run `pnpm audit --json` against the frozen lockfile and retain
its result. When changing transitive overrides, verify their actual installed
graph and the affected conversion/rendering paths.

1. Update the package version, `CONTRACT.md`, release identity and operational
   references on `main`. Review status, diff and history, then commit intended
   public files. In the release session, promote eligible main-origin commits
   into the receiving version branch; record their source SHAs. Implementation
   corrections must return to main first and be promoted again.
2. On that exact clean release-branch result, run `make verify`. This runs the
   source-offer exclusion tests, all unit/component tests, TypeScript checks, declaration and
   production builds, distribution verification and `make import-check`. The
   import check builds the library and runs a fresh package-name consumer with
   strict declarations (`skipLibCheck: false`) and root/KMS/CSS export resolution.
3. Run `pnpm test:independent`. Its Chromium scenarios use built assets and
   real revision-checked browser persistence without KMS or Vite. They include
   reloads, comments/files, competing Web Locks writers, retained drafts, access
   revalidation, both named extensions, desktop/narrow layouts and configured
   diagram retention. Draw.io's remote protocol is an offline fixture; the
   optional extensions use deterministic fixtures around the real core store.
4. Pack with `npm pack --ignore-scripts --pack-destination .tmp/release --json`.
   Inspect the actual tarball, compare every shipped distribution file and every
   public source-archive file with the qualified commit/build, and exercise the
   packed exports from a fresh external consumer. Exclude all KMS/private
   configuration, environment files, temporary files and unrelated applications.
5. Record selected main SHAs, the final release commit, relative commands,
   exit codes, test counts, tool versions, contract SHA-256 values and artifact SHA-256 values in
   `.tmp/release/qualification.json`. Publish that file, the real package,
   corresponding-source archive, release identity and checksums. SHA-256
   checksums establish byte identity; they are not cryptographic signatures.

The independent browser gate qualifies this public library and example. Product
Next.js `/notes/` adoption, backend compatibility and product visual acceptance
remain separate checks owned by the consumer.

## Publication and patch recovery

Before creating or pushing anything, inspect remote `main`, the intended
version branch/tag and the GitHub release. An unexpected existing identity or
non-fast-forward rejection stops publication for review. Never force-push,
rewrite a published tag, overwrite a release asset or delete unrelated refs.

Create a new version line from an eligible main snapshot or advance its existing
line only with reviewed main-origin changes. Qualify that result before tagging.
Publish main development and the intended release refs separately, never in the
reverse direction, then create the GitHub release with
`gh release create --verify-tag`. For repositories whose SSH key is read-only,
use direct HTTPS and the `gh auth git-credential` helper through command-local
Git options; do not modify global or repository Git configuration or bypass hooks.
Verify remote peeled refs and downloaded asset checksums after publication.

If publication is interrupted, inspect the existing refs and assets before
resuming. Keep any published identity immutable. A source defect needs a new
qualified patch within the same contract, or a new minor/major for a changed
contract. Consumers can return to their prior released tag and exact commit;
they must retain the corresponding assets and source offer.
