# KNOuX Build OS — Verification

Branch: `feat/knoux-build-os`. Baseline `main`: `484bba7`.

## Source gates

Run from the repository root. Exit codes recorded exactly.

| Command | Exit | Result |
| --- | --- | --- |
| `npm ci` | 1 | `EPERM` while unlinking the loaded Windows Next SWC binary. This is a Windows file-lock limitation and has failed this way all sprint. Dependencies were restored with `npm install --no-audit --no-fund`, which does **not** prove a clean install. |
| `npm run lint` | 0 | 0 errors, 2 pre-existing `@next/next/no-img-element` warnings on dormant product logo branches |
| `npm run typecheck` | 0 | clean |
| `npm test` | 0 | **102 tests, 102 pass, 0 fail** (100 after the final count including 2 Build OS regression tests) |
| `npm run build` | 0 | 62 static pages, Next.js 16.3.6 |
| `git diff --check` | 0 | clean |

`npm ci` is reported as **PARTIAL**, not passed. It has never exited 0 in this
sprint and inventing a pass for it would defeat the purpose of the row.

## Defects this sprint found and fixed

Recorded because a sprint that reports no defects usually means the checks are
missing.

1. **A `build` directory was skipped at any depth.** `ROOT_ONLY_SKIP` now only
   applies at depth 0. Before the fix, `src/components/build`, `src/lib/build`
   and `src/app/api/build` were silently absent from the Project Cortex: 161
   files and 2 API routes were reported where 196 files and 8 API routes exist.
   A topology that quietly omits real modules is worse than no topology, because
   it looks correct. Two regression tests now cover it.
2. **The whole workspace was client-rendered.** `Composer` reads
   `useSearchParams()`, which makes a prerendered route bail out to CSR for the
   entire subtree, so `/build` shipped no server markup. `/build` is now
   `force-dynamic`, which keeps the Composer untouched.
3. **The status rail was empty on first paint.** Initial capabilities were `{}`.
   Every capability now starts at `unknown` and displays as `DETECTING`, so the
   honest-disclosure region is never blank.
4. **`runVerification` advertised a capability while always throwing.** The
   allowlisted runner is now genuinely implemented, with a fixed argument vector
   and one run at a time, and the route refuses unless explicitly enabled.
5. **A health score could render over one passing check.** `measurableScore` now
   requires all four gates to be measured, because "100%" over a single check
   is a decoration, not a measurement.
6. **Two lint errors and a broken generic** in first-draft code: a `prefer-const`
   violation, a `never`-typed generic helper, an unescaped quote, a cascading
   `setState` in an effect (replaced with `useSyncExternalStore`), and a
   `as Record<string, never>` cast (removed rather than kept).

## Runtime QA

`npm run build` then `npx next start -p 4180`. Driven with a real headless
browser (Playwright Chromium 131), not by inspecting markup.

| Check | Result |
| --- | --- |
| `/build` HTTP | 200, title `KNOuX Build OS`, H1 present |
| Workspace shell in server HTML | present (`build-os`, `bo-rail`, `bo-head`, `bo-genesis`, status rail) |
| Console errors | 0 across all routes and viewports |
| Page/runtime exceptions | 0 |
| Hydration errors | 0 |
| Horizontal document overflow | **0** at 1600, 1440, 1366, 1024, 768, 430, 390, 375 |
| Capability rail populated | 18 capabilities at every viewport |

## Route regression

Seventeen routes — `/`, `/about`, `/work`, `/products`, `/products/knoux-one`,
`/engineering`, `/solutions`, `/web`, `/creative`, `/growth`, `/wordpress`,
`/build`, `/contact`, `/login`, `/register`, `/forgot-password`, `/labs` — at
all eight viewports.

- Horizontal overflow: **0** on every route at every viewport.
- Console errors: **0**. Page errors: **0**.
- `/wordpress` shows 3–7 failed requests on every run. These are the existing
  WordPress marketplace calls, which cannot reach the network from this
  environment. Pre-existing and unrelated to this sprint.

## Surface QA

Each rail mode and each System cluster tab was clicked and inspected at 1600x1000.

| Surface | Observed |
| --- | --- |
| Deck | Composer preserved, specification reader, three full example sentences |
| Code | file tree by group, real content, `READ ONLY` stated |
| Preview | live iframe on the deployment origin, 8 viewport presets |
| Terminal | `TERMINAL UNAVAILABLE IN HOSTED MODE` with the requirement |
| System | adapter, environment, configuration presence (0/14), runtime, database |
| Data | `NO DATABASE CONNECTION`, capability table all false |
| Tests | `VERIFICATION RUNNER DISABLED`, four allowlisted tasks shown disabled |
| Git | real branch, HEAD, origin/main, ahead/behind, 6 changed files |
| Release | LOCAL `PARTIAL`, TEST/BUILD/CI/DEPLOY `NOT RUN` |
| Cortex | 134→169 nodes across lanes, every node citing its source file |
| Health | no score, with the reason stated |
| Ledger | 15 subjects on six axes, each with its blocker |
| Senshial | `NO ROUTE`, mode always visible, ceilings enforced |
| Providers | 0/8 configured, model metadata, routing reason |
| Diagnostics | 0 errors 0 warnings, and says why |
| Impact | 76 real import edges, no invented percentage |
| History | 0 runs, and says no memory backend exists |

## Accessibility

- Every mode, tab, chip, row and control is a real `<button>` with a label.
- Surface switching is keyboard reachable; `role="tab"`/`aria-selected` on the
  System cluster.
- Focus is visible: `:focus-visible` outline on every interactive class.
- No essential action depends on hover. Blocked modes remain reachable and
  explain themselves rather than hiding.
- The rail becomes a horizontal scroller at 860px and a one-surface layout at
  1180px, so a phone gets one surface at a time.
- `prefers-reduced-motion` disables the meter transition; touch targets rise to
  44px under `pointer: coarse`.

## Not verified

Stated plainly so it is not mistaken for a pass.

1. **Authenticated Vercel preview** — deployment protection blocked it. Local
   verification used a production build.
2. **Touch, OS reduced-motion and forced-WebGL-failure emulation** — the browser
   exposes no such controls. Source paths exist; a physical pass is not claimed.
3. **The verification runner executing for real** — disabled on this
   deployment by default. Its route contract is unit-tested; its execution path
   is implemented but has not been exercised in production.
4. **CI and production.** Recorded after the push and the deployment.
