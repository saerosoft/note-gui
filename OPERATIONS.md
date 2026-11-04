# Releases and consumption

## Project ownership

Note GUI owns its development, public contract, qualification and releases as
an independent project. Consuming projects choose their versions and integration
and qualify their own backend, deployment and product behavior. KMS milestones,
Jenkins routing, dependency-pin publication and business-data validation are
outside this repository's completion criteria. Historical integration evidence
does not authorize work in a consuming repository.

## Development-first, one-way promotion

`master` is this repository's main development branch. All implementation, defect fixes, tests and documentation start there, including defects discovered in a released version. Do not develop fixes directly on `version/*` or create temporary work branches.

The only promotion direction is `master -> version/MAJOR.MINOR`. The release operator works on the receiving version branch, selects reviewed master-origin commits compatible with that line, merges the eligible development snapshot, and records its source SHAs. Do not merge a newer contract into an older patch line; if unrelated development changes prevent a safe merge, select only eligible development-origin changes with explicit provenance or require a new minor line.

`version/* -> master` is forbidden: never merge a release branch into master, rebase master onto it, or cherry-pick/copy release-branch commits into development. If release integration exposes a defect requiring implementation changes, fix and test it on master first, then promote forward again. Release conflict resolutions only integrate the selected development changes while preserving the receiving contract; they are not an independent development path.

Qualify the exact clean release-branch result after promotion, not just its development source. Record selected development SHAs and the final release SHA. Only that tested result receives new immutable tags/assets. A release merge commit can differ from master; it must not flow back into development. Preserve the inherited upstream-style `main` and other legacy refs as history, not as development or consumer sources.

`master` holds the latest development. `version/MAJOR.MINOR` holds a qualified
minor contract and receives only patches that preserve it. Each release has an
immutable annotated `release/vMAJOR.MINOR.PATCH` tag and matching GitHub assets.
`release.json` declares the repository, version, branch, tag, public contract
paths and artifact kind. It declares identity; qualification is separate evidence.

## Version policy

The current minor contract is 0.8.0. Optional collaboration capabilities and
mount-local dirty reporting establish this line. The current qualified patch is
[release/v0.8.1](https://github.com/saerosoft/note-gui/releases/tag/release/v0.8.1)
at `07db42d5eff379cf2141e463c7f723c14ce185e1`, with annotated tag object
`f24188816ecc86091a5400877604ceb90ac7eecc`. It repairs native modal split-pane
layout within the unchanged intended 0.8 protocol. Its exact clean release source
passes normal Make verification, 43 independent browser cases, five actual
Draw.io cases and strict extracted-package checks. All seven downloaded assets match qualification
and checksums. Human review is not an acceptance gate. Consumer adoption and
product acceptance remain separate.

The original 0.8.0 annotated tag `a327c46c3c8ba92f81b6cb6bc911112eb9ae4749`
still resolves to `b9c1ae1d544194fe9dc0bfe5490992be79182cbe`. Preserve its assets
and source for consumers retaining that pin. Publishing 0.8.1 does not update
an existing consumer automatically.

- Increment MAJOR for a substantial redesign of the library's concept or
  responsibility, then reset MINOR and PATCH.
- Increment MINOR and reset PATCH for every public contract change, including
  additions, removed operations, limits, errors, defaults, timing and lifecycle
  guarantees. Compatibility across arbitrary minor versions is not promised.
- Increment PATCH only for defect repairs within the unchanged intended minor
  contract. Bring master-origin repairs forward to their version line, rerun its
  complete qualification and publish a new tag and assets.

The core/context/relations split and explicit host contract added to package
0.6 establish the 0.7.0 contract. Its line is `version/0.7` and its tag is
`release/v0.7.0`. The inherited Docmost `v0.7.0` tag identifies upstream history;
it is unrelated to this release. Preserve inherited branches and tags.

The 0.8.2 development candidate repairs opaque cursor preservation, empty-token
continuation and tree cache key collisions within the existing 0.8 contract.
Public types and page-size bounds are unchanged. Its release qualification and
publication are recorded separately from the qualified 0.8.1 assets above.

## Consumer identity

For the 0.8.1 patch, pin `version/0.8`, `release/v0.8.1` and exact commit
`07db42d5eff379cf2141e463c7f723c14ce185e1`, as recorded in `qualification.json`.
Verify that the selected checkout
equals that commit, that the tag resolves to it, and that `release.json` and
the contract digests match the release evidence. Later patches may advance the
branch; a consumer stays on its reviewed tag and commit until explicitly upgraded.
Never follow `master`, a caret range, `latest` or automatic remote updates.

Download `knowledge-engine-note-gui-0.8.1.tgz` from that release and check it against
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
published assets.

1. Update the package version, `CONTRACT.md`, release identity and operational
   references on `master`. Review status, diff and history, then commit intended
   public files. In the release session, promote eligible master-origin commits
   into the receiving version branch; record their source SHAs. Implementation
   corrections must return to master first and be promoted again.
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
5. Record selected master SHAs, the final release commit, relative commands,
   exit codes, test counts, tool versions, contract SHA-256 values and artifact SHA-256 values in
   `.tmp/release/qualification.json`. Publish that file, the real package,
   corresponding-source archive, release identity and checksums. SHA-256
   checksums establish byte identity; they are not cryptographic signatures.

The independent browser gate qualifies this public library and example. Product
Next.js `/notes/` adoption, backend compatibility and product visual acceptance
remain separate checks owned by the consumer.

## Publication and patch recovery

Before creating or pushing anything, inspect remote `master`, the intended
version branch/tag and the GitHub release. An unexpected existing identity or
non-fast-forward rejection stops publication for review. Never force-push,
rewrite a published tag, overwrite a release asset or delete unrelated refs.

Create a new version line from an eligible master snapshot or advance its existing
line only with reviewed master-origin changes. Qualify that result before tagging.
Publish master development and the intended release refs separately, never in the
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
