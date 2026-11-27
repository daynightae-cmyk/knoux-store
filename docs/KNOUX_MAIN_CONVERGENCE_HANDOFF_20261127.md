# KNOuX Store — main convergence handoff (2026-11-27)

## Merge outcome

PR #132 was **merged into `main`** on 2026-11-27 at 17:57:39Z through the
authorized workflow — squash merge, no `--admin`, no protection bypass, no
branch deletion.

| Item | Value |
|---|---|
| PR #132 head (merged) | `40f5df3b7f01d432e5eaadf4e1ffae755c309304` |
| CI run on that head | `46039181544` — **success** (all 6 jobs) |
| SonarCloud Code Analysis on that head | **success** (security A, reliability A, duplication ≤ 3%) |
| Required checks | CodeQL static analysis, lint/types/build/tests/coverage/audit, Browser desktop/tablet/mobile, V4 exact-build visual matrix, SonarCloud Code Analysis — **all SUCCESS** |
| Merge commit on `main` | `0c4aef17170797a13ad04bdf26a6bff3af2a579c` |
| `origin/main` after the merge | `0c4aef17170797a13ad04bdf26a6bff3af2a579c` (linear: `0c4aef1` → `0ffbd8f` → `5ae5f9c`) |
| Vercel production deployment | `Production – knoux-store`, state `success` |
| `integration/main-convergence` | reset onto `origin/main` (`0c4aef1`) after the squash merge, so the next PR carries only new work |

### Production verification (live `https://knoux.store`, merge commit `0c4aef1`)

Measured with the same probe used for the pre-merge baseline
(`D:\Temp\opencode\prod-evidence\production-baseline-premerge.json` →
`production-measurements.json`), Chromium at 1920×1080 and 1440×900:

| Screen | Metric | Before (production) | After (production) |
|---|---|---|---|
| Providers | route width / unused right gap @1920 | 1400 / 520px | **1920 / 0px** |
| Providers | Get API in viewport @1920 / @1440 | clipped below the fold | **visible** (bottom 1026 / 855) |
| Providers | title band vs top orbit node | — | **0 px²** overlap; nodes span 97→1823 at 1920 |
| PowerShell | hero height @1920 | 553px | **360px** |
| PowerShell | console size @1920 | 692×293 | **974×454** (terminal dominates) |
| Deployments | masthead background | `rgb(7, 5, 14)` (rectangular seam) | **`rgba(0, 0, 0, 0)`** (transparent) |
| Deployments | station widths @1920 | 4×277px | **4×390px** |
| One Platform | card↔card overlaps @1440 | 1 | **0** |
| Services | route width / unused gap @1920 | 1400 / 250px | **1618 / 32px**; 6 services, copy capped |
| All five routes | horizontal overflow | none | **none** (`scrollWidth === innerWidth`) |

Owner comparison screenshots: `D:\Temp\opencode\prod-evidence\*.png`
(`providers-1920.png`, `powershell-1920.png`, `deployments-1920.png`,
`platform-1920.png`, `services-1920.png`).

## How the SonarCloud gate was cleared

CI runs `46016828173` (`8cf6d96`) and `46026384809` (`2dcd8eb`) are **green** on
every job (CodeQL static analysis, Lint/types/build/tests/coverage/audit, V4
exact-build visual matrix, Browser desktop/tablet/mobile). The merge is
nevertheless refused by the `protect-main` ruleset because its required
**SonarCloud Code Analysis** check fails its quality gate on the PR's new code:

| Gate condition | Required | Observed | Cause |
|---|---|---|---|
| Security rating on new code | ≥ A | **A** ✓ | was **C** — `typescript:S2245`, `Math.random()` used to build the executor's atomic-write temp file name (`generated-project-executor.ts:58`); now `crypto.randomUUID()` |
| Reliability rating on new code | ≥ A | **A** ✓ | was **C** — `css:S4656` duplicate `min-height` in `provider-hero.module.css` plus `typescript:S2871` / `typescript:S4158` on the generated-projects API routes; the duplicate declaration is removed and the routes now share one guarded entry point |
| Duplication on new code | ≤ 3% | **5.0%** on `7135c24` → **0.08%** locally on `40f5df3` (CI verification pending) | the duplicated lines are the generated-project API route boilerplate and the executor's deploy cleanup, not application logic |

### How the duplication was located and removed

SonarCloud's file-level duplication measures are not exposed for a pull
request through the public API, and a line-based scan of the diff finds
nothing — SonarCloud's CPD compares **tokens** against whole files, including
unchanged context, and counts a block once it reaches its token threshold. The
duplication was therefore located with a token-level copy-paste detector over
the PR's changed files, intersected with the PR's changed line ranges:

```
npx --yes jscpd@4 --min-lines 5 --min-tokens 50 \
  --format typescript,tsx,javascript,css,json --reporters json \
  --output D:\Temp\opencode\jscpd src
```

On `7135c24` that scan reported **85 duplicated new-code lines**, all in the
generated-projects API routes and the executor:

- `src/app/api/build/generated-projects/[operationId]/route.ts` — the write
  guard, the owner lookup, the operation-id validation and the
  not-found/forbidden responses were restated in each of the three handlers;
- `src/app/api/build/generated-projects/[operationId]/deploy/route.ts`,
  `.../bundle/route.ts` and `generated-projects/route.ts` — the same preamble
  again, plus a private copy of `getGeneratedProjectsRoot()`;
- `src/lib/build/generated-project-executor.ts` — the staged-publish and
  progress-marker cleanup written out twice (failed deploy and cancellation).

Fixes (commit `40f5df3`):

- new `src/lib/build/generated-project-route.ts` owns the shared plumbing:
  `getGeneratedProjectsRoot()`, `authorizeBuildOwner()` (same-origin write
  guard + owner identity), `resolveOperationId()`, `operationNotFound()` and
  `operationForbidden()`. Each route keeps its own exact status wording, so
  the HTTP contract is unchanged;
- the status, cancel, deploy, bundle and apply handlers now route through that
  helper instead of restating the preamble;
- `removeDeployStaging()` in the executor cleans up the staging directory and
  the progress marker in one implementation, used by both the failed-deploy and
  the cancellation path.

After the refactor the same scan reports **1 duplicated new-code line out of
1299 analyzed new lines (0.08%)** — the remaining pair is the pre-existing
PowerShell/Terminal console markup, of which only one line is new.

### Other fixes already in this increment

- the duplicate `min-height` is removed (the `!important` reset already won, so
  the rendering is unchanged);
- the duplicated `.contextActions`, `.contextBtn`, `.nodeWrapper`, `.node` and
  `.node .sphere img` blocks are merged into their original declarations —
  the stable hit-target rules (`pointer-events`, `touch-action`) now live with
  the components they belong to;
- the duplicate `.standalone .composition` selector is merged into one rule;
- the bundle route's two `catch` blocks now explain, in a comment, why the
  underlying error is deliberately not surfaced.

Note on the evidence ledgers: `docs/evidence/**.json` and
`references/**/report.json` are **not** analysed by SonarCloud (the analysis
covers the 24 changed source files only), so their formatting does not move the
duplication metric. They were still rewritten losslessly — one record per line,
verified by re-parsing and comparing the JSON content — because the repeated
empty-field record templates were noise in the repository (the owner visual
delivery ledger shrank from 2840 to 180 lines, the acceptance measurements from
3032 to 28 lines, the QA cockpit report from 121 to 10 lines).

Known remaining items on the PR's new code, to be closed before the gate can
pass (all reported by SonarCloud for this PR):

- `typescript:S3776` cognitive complexity and `typescript:S9382` await-in-loop
  in `generated-project-executor.ts`, `generated-project-executor-v2.ts`,
  `build-executor.ts`, `write-executor.ts`,
  `generated-project-contract-v2.ts` and `generated-project-api.ts`;
- `typescript:S6606`, `typescript:S6582`, `typescript:S7503`,
  `typescript:S4323`, `typescript:S7780`, `typescript:S4030` and
  `typescript:S8783` in the same area;
- `css:S7924` contrast on `.getApi` (a code smell — it does not drive any of
  the three failing gate conditions, and the button keeps the approved brand
  purple);
- the separate `CodeQL` code-scanning check reports 19 `js/path-injection`
  alerts and one `js/file-system-race` in
  `src/lib/build/generated-project-executor.ts` (plus two
  `js/http-to-file-access` in `qa/owner-product-matrix-20261124.mjs`). Those
  patterns pre-date this PR — the file last changed on `main` in `0ffbd8f` —
  but the PR modifies those lines, so the scan attributes them to the PR. The
  containment helper (`operationRoot()` → `path.resolve` + `inside()`) and its
  symlink-containment test are the intended remediation points.

## Branch and SHAs

| Item | Value |
|---|---|
| Branch | `integration/main-convergence` (now tracking `origin/main` at `0c4aef1`) |
| Merged PR head | `40f5df3b7f01d432e5eaadf4e1ffae755c309304` |
| `origin/main` | `0c4aef17170797a13ad04bdf26a6bff3af2a579c` |

Increment history on this branch (each pushed and verified against the remote):

| Commit | Content |
|---|---|
| `af25930` → `c71c862` → `8cf6d96` | WordPress canvas measurement fix, five visual defects, evidence, handoff ledger |
| `2dcd8eb` | SonarCloud security + reliability fixes (`crypto.randomUUID()`, duplicate `min-height`, merged CSS blocks) |
| `7135c24` | lossless compaction of the evidence JSON ledgers; merged `.instrumentBtn`/`.contextBtn` rule |
| `40f5df3` | shared generated-project route plumbing; shared deploy cleanup (the duplication fix) |
| `0c4aef1` | the squash merge of PR #132 into `main` (branch reset onto it) |

## What this increment changed

### WordPress responsive-canvas measurement (the CI failure)

`e2e/wordpress-responsive-canvas.spec.ts` measured the preview with
`getBoundingClientRect().width`, which returns **scaled visual geometry**
(484 / 359 / 360 px) instead of the logical layout width. The preview is a real
`HTMLElement` document scaled with CSS `zoom`, so:

- `node.offsetWidth` is the **logical** layout width — asserted independently as
  1920 / 1024 / 390 for desktop / tablet / mobile;
- `getBoundingClientRect().width` is the **visual** geometry — asserted as
  `logical × zoom`;
- the 125% zoom case is asserted to change the rendered geometry only, never
  the logical width;
- the `data-logical-width` attribute is never asserted as a substitute for a
  measurement.

### The CI-only 125% failure (run `45999138498`) and its root cause

With the logical-width measurement corrected, CI failed on one assertion in all
three browser jobs:

```
Expected: > 0.329006
Received:   0.329006
```

The received value was **exactly** the 100% zoom, which proves the preview never
rendered at the requested 125% *in the sampled frame*. Two root causes, both
fixed:

1. **A stale frame.** The canvas applies the new zoom to the preview's inline
   style, but the *rendered* geometry settles on the following frame. Measured
   locally at the instant CI sampled: inline `zoom` already `0.411258` while the
   bounding rect still reported the previous `128.313px` width. The spec now
   polls the rendered geometry until it reaches the requested scale instead of
   sampling a single frame.
2. **A platform-dependent fit.** `LiveCanvas` fitted the preview with the
   workspace's *content* box (`ResizeObserverEntry.contentRect.width`). Scaling
   the preview makes it overflow, which adds a scrollbar, which shrinks that
   content box — so the fit factor, and therefore the outcome of the scale
   control, depended on whether the platform draws classic (Linux CI) or
   overlay scrollbars. The canvas now measures the workspace's *border* box, so
   the visible space the preview is scaled into never depends on the preview's
   own scrollbar. Under classic scrollbars the zoom ratio is now exactly 1.25
   (`0.329006 → 0.411258`, rendered `128.313px → 160.391px`, logical width
   unchanged at 390).

The 125% scenario is now asserted against the implementation's real semantics:
the expected zoom is the measured fit (`min(available / logicalWidth, 1)`)
multiplied by the requested 125%, the logical width must stay 390, the rendered
geometry must equal `logical × zoom`, and the rendered geometry must visibly
grow.

### The second CI-only failure (run `46010671865`) and its root cause

With the scale semantics fixed, CI still failed on desktop and mobile (the
tablet job passed) with:

```
Error: 125% visibly enlarges the preview
Expected: > 207.953125
Received:   160.390625
```

`207.953125` is the mobile preview's rendered width **while the tablet device
was still hidden** — the test toggled the tablet off and on but never asserted
that the device came back, so the baseline was sampled in a podium layout that
no longer existed; by the time the 125% preview was measured, the podium had
re-flowed around the restored tablet and the mobile preview had been re-fitted.

Two fixes:

- the test now asserts the restored device is back on the podium
  (`await expect(tablet).toHaveCount(1)`) before anything is measured;
- `settlePreview()` waits until the rendered geometry has stopped changing
  *and* agrees with the fit the canvas should be applying, so no measurement is
  ever taken while the podium is still re-fitting the previews.

### Owner-reported visual defects (root causes, not symptoms)

See [`docs/evidence/visual-acceptance-20261127/report.md`](./evidence/visual-acceptance-20261127/report.md)
for the full before/after measurement table and the raw
[`measurements.json`](./evidence/visual-acceptance-20261127/measurements.json).

| Screen | Root cause | Fix |
|---|---|---|
| Providers | `.dev-cinematic .dev-route{max-width:1400px}` capped the route; a 69px in-flow mode switch pushed the hero down so Get API fell below the fold | Constellation route breaks out of the readable cap; the switch floats over the sky; orbit centre 53.5% / radius 21.5%; instrument height `clamp(240px,30vh,460px)`; viewport-aware title type |
| PowerShell / Terminal | 553px hero over a 293px console in equal columns; opaque `#07050e` hero rectangle | `compact` runtime-hero variant (360px, transparent); session grid `1.55fr / 1fr`; console `clamp(340px,42vh,480px)` |
| Deployments | opaque masthead rectangle; station row capped at 1150px | transparent masthead; stations use the full stage (4 × 390px at 1920); larger labels and saucers |
| One Platform | glass card was a flex row — the capability/auth reading sat beside the title block | card is a grid (`tile text` / `detail detail`); services/deployments row moved to 64% to clear the 1366px collision; orbital geometry, core, brand and nav untouched |
| Services | route capped at 1400px; card line length ~1000px | wide route; card copy capped at 72ch; separated action row |
| Dead CSS | `operational-v3.module.css` carried `:global(.dev-route .scene/.window/.windowBody)` rules that can never match the hashed production class names | removed |

### Dependency state

`archiver` was still present in `package-lock.json` as an **extraneous**
package after the V1 executor removal (`npm ls archiver` → `extraneous@8.0.0`).
It is now pruned from the lockfile (`npm ls archiver` → empty). Nothing in
`src/`, `tests/` or `e2e/` imports it.

## Exact commands and results

```
npm run lint                                  # clean, no output
npx tsc --noEmit                              # clean
npm run build                                 # Next.js 16.4.6, 103 routes, TypeScript clean
npm test                                      # 1209 pass / 0 fail
node --import ./tests/isolate-network.mjs --test tests/generated-project.test.mjs
                                               # 24 pass / 0 fail (executor parity)
cmd /c "set KNOUX_E2E_REUSE_CURRENT=1&& npx playwright test e2e/wordpress-responsive-canvas.spec.ts --reporter=line"
                                               # 3 passed (desktop, tablet, mobile)
cmd /c "set KNOUX_E2E_REUSE_CURRENT=1&& npx playwright test e2e/wordpress --reporter=line"
                                               # 52 passed, 2 skipped (all WordPress browser flows)
cmd /c "set KNOUX_E2E_REUSE_CURRENT=1&& npx playwright test e2e/provider-os.spec.ts e2e/provider-credential-validation.spec.ts e2e/provider-credential-recovery.spec.ts e2e/build-atmosphere.spec.ts --project=desktop"
                                               # 35 passed (provider + atmosphere, after the CSS merge)
cmd /c "set KNOUX_E2E_REUSE_CURRENT=1&& npx playwright test e2e/generated-project-access.spec.ts e2e/api-boundary.spec.ts e2e/build-connected.spec.ts --project=desktop"
                                               # 25 passed (after the generated-project route refactor)
npx --yes jscpd@4 --min-lines 5 --min-tokens 50 --format typescript,tsx,javascript,css,json --reporters json --output D:\Temp\opencode\jscpd src
                                               # token-level CPD scan: 85 duplicated new-code lines before, 1 after
```

Production-bundle geometry probe (Chromium, 1920×1080 / 1440×900 / 1366×768 /
820×1180 / 390×844): `document.documentElement.scrollWidth === innerWidth` on
every route; Providers route width == viewport width with a 0px right gap;
Get API inside the viewport at 1920 / 1440 / 1366; Providers title band vs top
orbit node overlap **0 px²** at every viewport; One Platform card↔card
overlaps **0** at every viewport.

The same probe was re-run against the rebuilt local bundle after the CSS and
route changes and reports unchanged geometry: Providers route 1920 with a 0px
gap and Get API bottom 1026 inside the viewport, PowerShell hero 360px with a
974×454 console, Deployments masthead `rgba(0, 0, 0, 0)` with 4×390px
stations, One Platform with no overlaps, and no horizontal overflow on any of
the five routes.

## Remaining blockers

None for PR #132 — it is merged, CI and every required quality gate are green,
and the production deployment is verified on the five corrected routes.

Open work, in order:

1. Continue the remaining approved platform experiences on
   `integration/main-convergence` (now tracking `main`): SIGNAL, Apps, Build
   Hub, Web Systems Studio, WordPress, Developer Workspace, OpenCode Console
   V2, Model Explorer, Agent Workspace, split-screen generation. Each screen
   needs the same treatment this branch just received: a real defect list
   from the owner's approved reference, a root-cause fix, and measured visual
   evidence — not a green test run.
2. PR #134 (`fix/provider-tablet-wordpress-clean`) was compared: its
   provider-fixture heading scoping, the Chromium `flex-end`/`flow-end`
   assertion and the Sentinel speech-session serial are **already present** in
   `main` via PR #132, and its conflict markers are already resolved — it
   carries no missing functionality and needs no cherry-pick.
3. The separate `CodeQL` code-scanning check still reports 19
   `js/path-injection` alerts and one `js/file-system-race` in
   `src/lib/build/generated-project-executor.ts` (plus two
   `js/http-to-file-access` in `qa/owner-product-matrix-20261124.mjs`). Those
   patterns pre-date this work — the file last changed on `main` in `0ffbd8f` —
   and the check is not in the required set, but the intended remediation point
   is the containment helper (`operationRoot()` → `path.resolve` + `inside()`)
   and its symlink-containment test.
4. SonarCloud code smells that remain open but drive no gate condition:
   `typescript:S3776`, `typescript:S9382`, `typescript:S6606`,
   `typescript:S6582`, `typescript:S7503`, `typescript:S7780`,
   `typescript:S4030`, `typescript:S4323`, `typescript:S8783` in the executor
   area, and `css:S7924` contrast on `.getApi` (the button keeps the approved
   brand purple).

## Relevant reference paths

- Evidence report: `docs/evidence/visual-acceptance-20261127/report.md`
- Raw measurements: `docs/evidence/visual-acceptance-20261127/measurements.json`
- Viewport screenshots: same folder (`*.png`, git-ignored by repository rule)
- Approved provider reference:
  `references/owner-curation-20261124/originals/knoux_provider_constellation_dashboard.png`
- Owner visual ledger: `docs/evidence/owner-cosmic-expansion-20261124/visual-delivery-ledger.json`
- Canonical executor: `src/lib/build/generated-project-executor.ts`
- Shared generated-project route plumbing: `src/lib/build/generated-project-route.ts`
- Executor parity tests: `tests/generated-project.test.mjs`

## Next executable action

PR #132 is merged and verified in production. Continue the remaining approved
platform experiences on `integration/main-convergence` (tracking `main` at
`0c4aef1`): take the next unverified screen from
`docs/evidence/owner-cosmic-expansion-20261124/visual-delivery-ledger.json`,
compare it against the owner's approved reference in `references/owner-curation-20261124/`,
list the real defects, fix their root causes, and capture measured visual
evidence in `docs/evidence/` — then push the increment and open the follow-up
PR for the remaining experiences (SIGNAL, Apps, Build Hub, Web Systems Studio,
WordPress, Developer Workspace, OpenCode Console V2, Model Explorer, Agent
Workspace, split-screen generation).
