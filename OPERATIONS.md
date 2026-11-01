# Releases and consumption

`master` holds the latest development. `version/MAJOR.MINOR` holds a qualified
minor contract and receives only patches that preserve it. Each release has an
immutable annotated `release/vMAJOR.MINOR.PATCH` tag and matching GitHub assets.
`release.json` declares the repository, version, branch, tag, public contract
paths and artifact kind. It declares identity; qualification is separate evidence.

## Version policy

- Increment MAJOR for a substantial redesign of the library's concept or
  responsibility, then reset MINOR and PATCH.
- Increment MINOR and reset PATCH for every public contract change, including
  additions, removed operations, limits, errors, defaults, timing and lifecycle
  guarantees. Compatibility across arbitrary minor versions is not promised.
- Increment PATCH only for defect repairs within the unchanged intended minor
  contract. Backport such repairs to their version line, rerun its complete
  qualification and publish a new tag and assets.

The core/context/relations split and explicit host contract added to package
0.6 establish the 0.7.0 contract. Its line is `version/0.7` and its tag is
`release/v0.7.0`. The inherited Docmost `v0.7.0` tag identifies upstream history;
it is unrelated to this release. Preserve inherited branches and tags.

## Consumer identity

Pin all three values: `version/0.7`, `release/v0.7.0` and the tag's exact peeled
commit recorded in `qualification.json`. Verify that the selected checkout
equals that commit, that the tag resolves to it, and that `release.json` and
the contract digests match the release evidence. Later patches may advance the
branch; a consumer stays on its reviewed tag and commit until explicitly upgraded.
Never follow `master`, a caret range, `latest` or automatic remote updates.

Download the release's `knowledge-engine-note-gui-0.7.0.tgz` and check it against
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
   references on `master`. Review status, diff and recent history, then commit
   the intended public files. A source change after qualification requires
   another commit and another full qualification.
2. On that exact clean commit, run `make verify`. This runs the source-offer
   exclusion tests, all unit/component tests, TypeScript checks, declaration and
   production builds, distribution verification and `make import-check`. The
   import check builds the library and runs a fresh package-name consumer with
   strict declarations (`skipLibCheck: false`) and root/KMS/CSS export resolution.
3. Run `pnpm test:independent`. Its nine Chromium scenarios use built assets and
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
5. Record relative commands, exit codes, test counts, exact source commit,
   tool versions, contract SHA-256 values and artifact SHA-256 values in
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

Create the version branch and annotated tag at the qualified commit. Push only
`master` and the intended new release refs, then create the GitHub release with
`gh release create --verify-tag`. For repositories whose SSH key is read-only,
use direct HTTPS and the `gh auth git-credential` helper through command-local
Git options; do not modify global or repository Git configuration or bypass hooks.
Verify remote peeled refs and downloaded asset checksums after publication.

If publication is interrupted, inspect the existing refs and assets before
resuming. Keep any published identity immutable. A source defect needs a new
qualified patch within the same contract, or a new minor/major for a changed
contract. Consumers can return to their prior released tag and exact commit;
they must retain the corresponding assets and source offer.
