# V4 build defect — CSS edits silently drop production stylesheets

**Status:** OPEN. Reproduced deterministically. Blocks the Visual System V4
visual pass until fixed.

**Baseline:** `origin/main` @ `0f96417` (PR #38, provider-operating-system)
**Branch:** `traycer/visual-system-v4-app-experiences`
**Severity:** P0 — release-blocking, and silent

## What happens

Editing either of the two large stylesheets causes `next build` to omit CSS
chunks that the prerendered HTML still references. The build **exits 0** and
Next reports success. At runtime the missing chunks return **HTTP 500** and the
affected routes render unstyled.

Measured on `/command/connections`:

| Build | `3-iylrnm6boks.css` | `11xw3v0pfp1ry.css` | `.ccPane` computed |
|---|---|---|---|
| pristine `origin/main` | **on disk** | **on disk** | `display:flex`, `border:1px`, `padding:14px 16px` |
| `globals.css` + `command.module.css` edited | **missing → HTTP 500** | **missing → HTTP 500** | `display:block`, `border:0`, `padding:0` |
| only `globals.css` edited | missing → HTTP 500 | on disk | — |
| only `command.module.css` edited | — | missing → HTTP 500 | — |

Each file independently accounts for a different lost chunk. Every build was a
clean `rm -rf .next && npm run build`. Reverting to pristine CSS restores both
chunks immediately, which is the control that rules out a stale cache.

The page's `<link rel="stylesheet">` list names five chunks; after an edit only
three resolve.

## Why it is dangerous

`npm run build` exits 0. Nothing in the build output reports a dropped chunk.
The failure surfaces only when a browser requests the asset and gets a 500 — or,
worse, not at all, if a reviewer never loads the affected routes.

This is precisely the class of defect that a green CI gate hides, and it is why
the V4 visual pass was stopped rather than landed: **a visual change cannot be
verified in this repository until the build stops silently losing CSS.**

The rule this exposes: *"build passed"* is not evidence that styles are served.
Until it is fixed, any CSS-only PR is unverifiable and should be treated as
untested, however green `npm run build` looks.

## Blast radius if it has already shipped

Undetermined, and deliberately not guessed. This was observed on a local
production build of `origin/main`; it was **not** checked against
`knoux.store`. Checking production requires an authenticated read of what is
deployed, which this mission did not perform. See `UNTESTED` in the PR body.

The routes that reference CSS modules through the affected chunks are the
`/command/*` family (14 routes) and anything sharing those chunks. Products
already mount eight distinct scene components; if any of their stylesheets ride
the lost chunks, product detail pages are affected too.

## Suspected mechanism, unproven

Two candidates, neither confirmed, and stated as candidates rather than findings:

1. **Chunk-hash coherency.** Editing a global stylesheet changes its content
   hash, so chunk filenames change. If prerendered HTML is reused rather than
   regenerated, its `<link>` list names the previous generation's chunks while
   the build only emits the new ones. This matches the evidence closely: the
   count of emitted CSS files is unchanged (13 in every build), only the names
   move.
2. **Minifier tolerance.** A construct in the edited rules is rejected by the
   CSS minifier, which drops the chunk silently rather than failing the build.
   Less likely — the edits used only `background`, `border`, `padding`,
   `min-width`, `font-size`, `border-top` and comments, and the same failure
   occurred for two unrelated files.

Candidate 1 fits better, and suggests the fix is in build coherency rather than
in the stylesheets: force a full prerender, or assert after build that every
stylesheet referenced by the prerendered HTML exists on disk.

## The assertion this needs

The check that would have caught this in CI, and should be added regardless of
how the underlying cause is fixed:

```
after build:
  for each prerendered route:
    for each /_next/static/chunks/*.css referenced by its HTML:
      assert the file exists and returns 200
```

Without it, the next CSS change repeats this discovery from scratch.

## Why V4 shipped without the visual change

The two de-boxing edits this branch was built to land were reverted. Both were
CSS-only, both were individually justified, and neither could be verified —
because verification requires a trustworthy production build, and this build is
not one. Landing them would have meant landing an unverified change to 14
Command routes and 24 Creative dossier regions, on the strength of a green
`next build` that is known to lie.

`docs/visual-system-v4.md` records the intended composition work, the evidence
for it, and the remaining visual debt, so it can be applied immediately once the
build is trustworthy.

## Reproducing

```bash
git stash push -- src/app/globals.css src/components/command/command.module.css
rm -rf .next && npm run build
for c in 3-iylrnm6boks 11xw3v0pfp1ry; do
  test -f ".next/static/chunks/$c.css" && echo "$c on disk" || echo "$c MISSING"
done

git stash pop
rm -rf .next && npm run build
for c in 3-iylrnm6boks 11xw3v0pfp1ry; do
  test -f ".next/static/chunks/$c.css" && echo "$c on disk" || echo "$c MISSING"
done
```

Or, against a running server, without rebuilding:

```bash
node scripts/visual-v4-overflow-probe.mjs
```

which reports the widest element past the viewport, its ancestry and computed
style — the signal that a stylesheet is not being applied.

`scripts/visual-v4-capture.mjs` records `overflow` and `status` for every
route at 11 widths; on this defect it reports up to 1567px of horizontal
overflow on `/command/connections`, which is what surfaced the problem.

## Environment

Windows 10 19045 · Node 24.21.0 · npm 11.19.0 · Next 16.3.6 · production build
(`next start`), local port 4411.