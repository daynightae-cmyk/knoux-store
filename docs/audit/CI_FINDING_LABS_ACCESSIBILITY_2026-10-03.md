---
kind: review
title: "CI finding: /labs colour-contrast violation and a nondeterministic accessibility gate"
status: 0
comments: none
---

# CI finding — `/labs` contrast violation and a nondeterministic accessibility gate

**Branch:** `codex/reality-convergence-ai-runtime` · **Exact head observed:** `4efd1d7928a6ae569c102b4199086b957b76e1af` · **Run:** [37112363774](https://github.com/daynightae-cmyk/knoux-store/actions/runs/37112363774) · **Date:** 2026-10-03

This is a CI finding, not a Phase A evidence artifact. It is recorded separately because it is an application defect with an unresolved gate, not a question about live schema, Bridge canonicality or donor provenance.

**It was not introduced by this branch.** Every path across all five commits on this branch is `CLAUDE.md`, `.gitignore`, or `docs/audit/**`. Filtering the full diff `b25b3b7..4efd1d7` for `src/`, `e2e/`, `tests/`, `*.css` or `*.tsx` returns nothing.

## Defect 1 — a real WCAG AA contrast failure in `origin/main`

The `Routes, responsive geometry and automated accessibility` job fails on two tests:

```
2 failed
  [tablet] e2e/accessibility.spec.ts:36:5 › automated accessibility › /labs has no critical or serious automated violation
  [mobile]  e2e/accessibility.spec.ts:36:5 › automated accessibility › /labs has no critical or serious automated violation
8 skipped
413 passed (27.1m)
```

| | |
|---|---|
| Rule | `color-contrast`, impact **serious** |
| Element | `.experiment-chamber--v2__meta-note` — "PROTOTYPE FIELD / NOT A RELEASE" |
| Foreground / background | `#7e698d` on `#050508`, `font: 8px`, weight normal |
| Measured by axe | **4.16:1** against a required **4.5:1** |
| Tags | `wcag2aa`, `wcag143`, `EN-301-549`, `ACT`, `RGAA-3.2.1` |

Independently confirmed as a genuine failure. Recomputing WCAG relative luminance directly from the declared colours gives **3.556:1**, also below 4.5:1. axe reports a *higher* ratio than the flat-colour calculation, which means the effective composited background behind the text is lighter than the declared `#050508` — the element sits over the experiment chamber field. Under either measurement the contrast requirement for text this size is not met.

Source, present verbatim in `origin/main`:

- `src/app/globals.css:1423` — `.experiment-chamber--v2__meta-note{…color:#7e698d;…}`
- `src/components/labs/ExperimentChamberV2.tsx:67-69` — the `<small className="experiment-chamber--v2__meta-note">`

Both predate this branch; the CSS was last touched by `dac60f1` / `90d1821`. The 8 skipped tests are unrelated (`about-lamp`, `build-connected`, `software-universe`) and are the same 8 skipped in the passing run.

## Defect 2 — the gate is nondeterministic for exactly this assertion

The same test, at the same viewports, on identical application code, **passed and then failed**:

| Run | Head | `[desktop] /labs` | `[tablet] /labs` | `[mobile] /labs` | Job |
|---|---|---|---|---|---|
| [37105304508](https://github.com/daynightae-cmyk/knoux-store/actions/runs/37105304508) | `b7b0d1a` | pass (t26) | **pass (t167)** | **pass (t308)** | success |
| [37112363774](https://github.com/daynightae-cmyk/knoux-store/actions/runs/37112363774) | `4efd1d7` | pass | **fail** | **fail** | failure |

Since application code, CSS and the spec are identical between those heads, the gate does not reliably evaluate this assertion. A gate that reports the same input as both green and red is not currently trustworthy evidence either way.

### Correction to an earlier hypothesis in this session

An earlier note in this session attributed the nondeterminism to `next/dynamic` lazy-loading the Three.js field so that the `<small>` badge was absent when axe ran. **That explanation is wrong and should not be relied on.** The badge is a static sibling of the lazy component inside the same always-rendered field wrapper:

```jsx
<div className="experiment-chamber--v2__field" aria-hidden="true">
  <LabMaterialField activeExperimentId={experiment.id} />   {/* next/dynamic */}
  <small className="experiment-chamber--v2__meta-note">
    PROTOTYPE FIELD / NOT A RELEASE
  </small>
</div>
```

The `<small>` renders with the page regardless of whether the lazy chunk has mounted. The captured axe HTML in the failing run confirms this: the field wrapper appears containing only the `<small>`, with the lazy canvas absent. So the badge was present in both runs.

**The actual mechanism is not established.** A timing-sensitive difference in layout or compositing remains plausible — the failing assertion is specifically a foreground-over-rendered-background measurement, and axe computes the effective background from what is actually painted — but that is a hypothesis, not a finding. It has not been reproduced or instrumented.

## What is proven and what is not

| Claim | State |
|---|---|
| The contrast requirement is unmet for `.experiment-chamber--v2__meta-note` | **PROVEN** — axe 4.16:1, independent recomputation 3.556:1, both < 4.5:1 |
| The defect exists in `origin/main` application code | **PROVEN** — `globals.css:1423`, `ExperimentChamberV2.tsx:67` |
| This branch did not introduce it | **PROVEN** — no `src/`, `e2e/`, `tests/`, `.css` or `.tsx` path in the diff |
| The gate reports this identical input as both pass and fail | **PROVEN** — tablet/mobile passed at `b7b0d1a`, failed at `4efd1d7` |
| The lazy-loaded canvas is the cause of the nondeterminism | **RETRACTED** — refuted; the badge is static |
| Timing of layout/compositing is the cause | **UNVERIFIED** — plausible, not reproduced |

## How to settle it

1. Run `npm run build` then the accessibility project for `/labs` at tablet and mobile repeatedly against one unchanged head. If it alternates, the nondeterminism is in the page or the spec, not in the diff.
2. Fix the colour regardless of cause. Either raise the foreground to meet 4.5:1 against the composited background, or — if the badge is decorative chrome inside an `aria-hidden` wrapper — reconsider whether an 8px `PROTOTYPE FIELD` label is the right mechanism at all.
3. Only after the colour is fixed can a still-failing run be attributed to something other than this defect.

## Recommended disposition

Track as two separate items with two owners:

- **the contrast defect** — application owner, a real accessibility barrier in shipped UI;
- **the gate's reliability** — the spec asserts on a live-rendered surface without waiting for a stable paint, so its green runs are not proof of accessibility.

Neither blocks the Phase A evidence in this branch, and neither should be closed by weakening the assertion or the threshold. Do not disable, skip, or relax `e2e/accessibility.spec.ts` to clear the job.

## Closure fix implemented on the Phase A branch

The application defect is fixed without changing the Axe assertion, blocking-impact threshold, or accessibility spec. `.experiment-chamber--v2__meta-note` now uses `#a18acb` text on its own solid `#050508` backing surface, with a small padding inset. The declared-colour WCAG contrast is approximately **6.80:1**, above the required 4.5:1.

Giving the badge its own opaque backing also removes the original contrast result's dependence on whatever the animated/canvas field happens to paint underneath it. This addresses the real accessibility defect and makes this specific contrast measurement invariant to the field's compositing state rather than masking test failures.

The branch also incorporates the already-verified PR #30 CI policy from current `main`, so the production dependency audit remains blocking while the known development/tooling advisory stays explicitly visible without falsely representing production exposure.

**Merge remains prohibited until the new exact head passes the repository's full GitHub CI, including CodeQL, lint/types/build/tests/coverage/audits, routes/responsive/accessibility, and Vercel.**