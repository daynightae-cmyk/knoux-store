# KNOuX Store — main convergence handoff (2026-11-27)

## Branch and SHAs

| Item | Value |
|---|---|
| Branch | `integration/main-convergence` |
| Remote HEAD before this increment | `eb9b913f336aa8645465933fb7dac96849fb8ccf` (PR #132 head) |
| Local HEAD before this increment | `eb9b913f336aa8645465933fb7dac96849fb8ccf` |
| `origin/main` at hand-off | `0ffbd8f4c7e9e508ac313d9e99a82a5c463e7ccb` |

The local increment in this document is the commit created with it; read the
commit SHA from `git log -1` on `integration/main-convergence` (it is the PR
#132 head after the push).

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
```

Production-bundle geometry probe (Chromium, 1920×1080 / 1440×900 / 1366×768 /
820×1180 / 390×844): `document.documentElement.scrollWidth === innerWidth` on
every route; Providers route width == viewport width with a 0px right gap;
Get API inside the viewport at 1920 / 1440 / 1366; Providers title band vs top
orbit node overlap **0 px²** at every viewport; One Platform card↔card
overlaps **0** at every viewport.

## Remaining blockers

1. CI must be green on the new PR #132 head (run `45999138498` failed only the
   WordPress 125% zoom assertion, whose root causes — a stale sampled frame and
   a platform-dependent fit — are fixed by this increment).
2. PR #132 must then be merged through the authorized workflow and the
   resulting `main` SHA verified.
3. The Vercel production deployment must be re-checked on the five corrected
   routes against the owner's screenshots.
4. PR #134 (`fix/provider-tablet-wordpress-clean`) was compared: its
   provider-fixture heading scoping, the Chromium `flex-end`/`flow-end`
   assertion and the Sentinel speech-session serial are **already present** in
   this branch, and its conflict markers are already resolved — it carries no
   missing functionality and needs no cherry-pick.

## Relevant reference paths

- Evidence report: `docs/evidence/visual-acceptance-20261127/report.md`
- Raw measurements: `docs/evidence/visual-acceptance-20261127/measurements.json`
- Viewport screenshots: same folder (`*.png`, git-ignored by repository rule)
- Approved provider reference:
  `references/owner-curation-20261124/originals/knoux_provider_constellation_dashboard.png`
- Owner visual ledger: `docs/evidence/owner-cosmic-expansion-20261124/visual-delivery-ledger.json`
- Canonical executor: `src/lib/build/generated-project-executor.ts`
- Executor parity tests: `tests/generated-project.test.mjs`

## Next executable action

Push this increment to `integration/main-convergence`, confirm the PR #132 head
SHA equals the new local commit, then check CI **once** for that exact SHA.
When the matrix is green, merge PR #132, verify the resulting `main` SHA and
the Vercel production deployment, and re-open the five corrected production
routes for the owner's comparison. Then continue the remaining approved
platform experiences (SIGNAL, Apps, Build Hub, Web Systems Studio, WordPress,
Developer Workspace, OpenCode Console V2, Model Explorer, Agent Workspace,
split-screen generation).
