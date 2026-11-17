# The P0 in PR #39 does not reproduce

**Status:** the reported defect is **not real**. PR #39's P0 claim is incorrect
and this document is the correction.
**Baseline:** `origin/main` @ `0f9641708a89c2b41b1577d7e9bb9b3bf3de3d17`
(PR #38, provider-operating-system), verified by `git fetch origin --prune`.
**Branch:** `traycer/css-build-integrity-p0`
**Environment:** Windows 10 19045 · Node 24.21.0 · Next 16.3.8 · production build

---

## The claim being withdrawn

PR #39 stated, as P0:

> Editing `globals.css` or `command.module.css` causes `next build` to omit CSS
> chunks that prerendered HTML still references. Those chunks return HTTP 500 at
> runtime and affected routes render unstyled. The build exits 0.

It reproduced that claim four ways locally and shipped a control that appeared to
support it. **The control was not valid, and the claim does not hold.**

## What the corrected control shows

Five scenarios in a clean isolated worktree at actual `origin/main`, each with
`rm -rf .next` followed by a full `next build`, then a cross-check of every
stylesheet referenced by every prerendered HTML file against the physical build
output.

| ID | Scenario | build exit | documents | CSS on disk | CSS referenced | **missing** |
|---|---|---|---|---|---|---|
| A | pristine main | 0 | 62 | 13 | 7 | **0** |
| B | `globals.css` only | 0 | 62 | 13 | 7 | **0** |
| C | `command.module.css` only | 0 | 62 | 13 | 7 | **0** |
| D | both | 0 | 62 | 13 | 7 | **0** |
| E | revert control | 0 | 62 | 13 | 7 | **0** |

The edit used is `:root { --css-integrity-probe: 1; }` appended to the file.
An unused custom property is preserved through minification, so the emitted
stylesheet genuinely differs in bytes, and it cannot change a rendered pixel.

**Not one scenario lost a stylesheet.** Chunk names were also identical across all
five scenarios — CSS chunk identity here does not depend on stylesheet content,
so a content change could not have been the mechanism even in principle.

With a production server verified to own port 4411 from this checkout, all 15
representative routes — including the six `force-dynamic` ones that emit no
prerendered HTML at all — referenced between 3 and 6 stylesheets each, and every
one returned **HTTP 200**.

## Two errors in the original investigation, both mine

Stated plainly, because both shaped the wrong conclusion.

### 1. The first matrix reported the P0 on pristine `main`

The initial version of the harness resolved a public href to its output path by
stripping only the leading slash, mapping `/_next/static/chunks/x.css` to
`.next/_next/static/chunks/x.css`. That path never exists, so **every** stylesheet
read as missing in **every** scenario — including unmodified `main`. It reported
"P0 REPRODUCED, 5 scenarios". A control that fires on the pristine baseline is
not a control, and I should have treated a result that contradicts an
independent earlier observation as evidence about the instrument.

### 2. The minimal edit did not survive minification

After fixing the path bug, the harness appended a CSS **comment**. Minification
strips comments, so the emitted stylesheet was byte-identical, no chunk hash
could move, and the scenario tested nothing. It reported "not reproduced" — for
the wrong reason. The edit only became meaningful when changed to a declaration
that survives minification.

The wrong conclusion sat between those two errors: a real V4 run produced 69
overflow regressions that I could not attribute to a CSS content change, so I
reproduced it four times and shipped it. The reproduction was faithful; the
premise it was built on was not.

## What the original evidence actually shows

Re-reading the PR #39 run rather than the conclusion drawn from it:

- A `next start` child survived `traycer_stop_shell`, which stops the wrapper but
  not always the node process. This was confirmed directly: a later start failed
  with `EADDRINUSE`, and the orphan had to be killed by PID.
- The AFTER capture was served by that **stale process**, not the server I
  intended to start. I reported this only after the fact.
- Chunk filenames that "changed" on edit, and HTTP 500s for the previous
  generation's names, are the expected signature of a server serving a build
  manifest that no longer matches the `.next` directory underneath it.

So the honest reading is: **a stale server serving a replaced build directory**,
not a build-pipeline defect. The observed symptom — pages missing their
stylesheet — was real at that moment. The cause was environmental, and it is
gone in a clean checkout with a verified server.

This also matches production: `/` and `/command` return 200 on `knoux.store`
with their referenced stylesheets served successfully.

## What this branch therefore delivers

Not a fix to a non-existent bug, but the thing whose absence let a wrong P0 ship:

**A permanent stylesheet-integrity gate** — `scripts/css-integrity-gate.mjs`,
wired as `npm run audit:css-integrity`.

It cross-checks every stylesheet referenced by representative prerendered pages
against the build output, and with `--served` also verifies the production server
returns 200 for each. It discovers every href dynamically, so no hashed filename
is hardcoded and it survives chunk renames.

**Proven to fail when it should.** With one emitted stylesheet hidden:

```
stylesheet integrity FAILED
  /products — not in build output: /_next/static/chunks/06-drz460ztqa.css
GATE_EXIT_CODE=1
```

Restoring it returns the gate to exit 0. It passes on the pristine build, and it
covers 15/15 routes in served mode including all six dynamic routes.

**And a server-provenance rule**, added because it is the failure that actually
happened here: before trusting any capture, record the listening PID, its command
line, the checkout path and the HEAD. If a port is occupied, stop and identify the
owner rather than reusing an unknown server.

## Reproducing this document

```bash
node scripts/css-integrity-matrix.mjs        # the five-scenario control matrix
npm run build && npm run audit:css-integrity # gate on build output
PORT=4411 npm run audit:css-integrity -- --served   # gate incl. dynamic routes
```

`references/css-build-integrity/control-matrix.json` holds the recorded results.