# Visual acceptance — owner-reported workspace defects (2026-11-27)

Scope: the five owner-reported screens plus the two shared workspace routes that
carry the same runtime hero (`/build/terminal`, `/build/engineering`).

Every number below was measured against the **production bundle**
(`next build` → `next start -p 3311`) with Chromium at 1920×1080, 1440×900,
1366×768, 820×1180 and 390×844. The raw measurement dump is
[`measurements.json`](./measurements.json); the viewport screenshots are kept
beside it (PNG is git-ignored by repository convention).

## Root causes fixed (not symptoms)

| # | Root cause | Fix |
|---|------------|-----|
| 1 | `.dev-cinematic .dev-route { max-width: 1400px }` capped the Providers, PowerShell, Deployments and Services routes | Scoped opt-out `dev-route--wide` for the four workspace routes that own the stage; readable-content caps elsewhere are untouched |
| 2 | A 69px in-flow mode switch pushed the full-height Providers hero down, so **Get API** fell 15px below the fold | Constellation mode floats the switch over the sky (≥900px); the hero now starts at the top of the stage |
| 3 | Production CSS Modules emit short hashed classes (`YMVlbG_orbit`), so the `:global(.dev-route .scene/.window/.windowBody)` rules in `operational-v3.module.css` never matched anything | Dead rules removed; every fix below is asserted to match a rendered element |
| 4 | The runtime hero painted an opaque `#07050e` rectangle, and the release masthead an opaque `#07050e` rectangle — visible rectangular seams at the hero edge | Both bases are now transparent; only the atmospheric gradients remain |
| 5 | The One Platform glass card was a flex row: `cardDetail` sat **beside** the title/body/auth status instead of under them | Card is a grid (`tile text` / `detail detail`), so icon, title, description and capability reading occupy separate rows |
| 6 | The Providers orbit arc passed through the title band and the central instrument overlapped the orbit labels | Orbit centre 53.5%, radius 21.5%, instrument height `clamp(240px, 30vh, 460px)`, viewport-aware title type (`min(cqw, vh)`) |

## Measured result (before → after)

### `/build/providers`

| Metric | Before | After (1920×1080) | After (1440×900) | After (1366×768) |
|---|---|---|---|---|
| Route width | 1400 | **1920** | **1440** | **1366** |
| Unused right gap | **520px** | **0** | **0** | **0** |
| Hero | 1400×1080 | **1920×1080** | 1440×900 | 1366×768 |
| Get API fully visible | no (bottom 1095 > 1080) | **yes** (968–1026) | **yes** (797–855) | **yes** |
| Orbit nodes | x 62…1338 | **x 97…1823** | x 65…1375 | x 60…1306 |
| Title band vs top node | overlap | **0 px²** | **0 px²** | **0 px²** |
| Hard planetary-limb seam | visible band | **none** | none | none |

### `/build/powershell` and `/build/terminal`

| Metric | Before | After (1920×1080) | After (1440×900) |
|---|---|---|---|
| Hero height | 553 | **360** | 360 |
| Session column | 692 (equal) | **974** (1.55fr) | 682 |
| Facts column | 692 (equal) | 628 | 440 |
| Console | 692×293 | **974×454** | 682×378 |
| Hero rectangle seam | visible | **none** | none |
| Hero status line 05 | covered by the doors | **visible** | visible |

The disconnected state is unchanged and honest: `SIGN IN REQUIRED` and
`NO FACTS — pair a bridge to see PowerShell facts`. No connectivity is fabricated.

### `/build/deployments`

| Metric | Before | After |
|---|---|---|
| Route width | 1400 | **1618** (full stage minus content padding) |
| Masthead | 1464×296, opaque `#07050e` | **1682×296, transparent** |
| Station row | 1150 (4 × ~270) | **1618 (4 × 390)** at 1920 |
| Station label | 15px | 16px, saucer 190 → 240px |

### `/build/platform` (One Platform)

| Metric | Before | After |
|---|---|---|
| Card internals | flex row — detail beside the auth reading | grid — detail on its own row, **14px below** the title block |
| Card↔card overlap | reported collisions | **0** at 1920 / 1440 / 1366 / 820 / 390 |
| Tile↔text overlap | — | **0** |
| Orbital geometry, core, brand, nav | — | **preserved unchanged** |

### `/build/services`

| Metric | Before | After |
|---|---|---|
| Route width | 1400 | **1618** |
| Card line length | ~1000px | **≤501px** (`max-width: 72ch`) |
| Card hierarchy | title/code/state, tagline, statement, actions | unchanged order, 16px title, separated action row |

## Regression guards

- `e2e/wordpress-responsive-canvas.spec.ts` — the preview is an `HTMLElement`;
  `offsetWidth` is the **logical** layout width (1920 / 1024 / 390) and the
  bounding rect is the **visual** geometry (`logical × zoom`). The 125% zoom
  case changes the rendered geometry only. Passing on all three Playwright
  projects (desktop, tablet, mobile).
- `document.documentElement.scrollWidth === innerWidth` on every route at every
  measured viewport — no horizontal overflow was introduced.
- `tests/generated-project.test.mjs` — 24/24 pass: bounded artifacts, measured
  build hashes, deterministic ZIP, preview/stop, idempotent retries, cancellation
  (including after the publish commit point), publish ownership, symlink
  containment and exact deployment confirmation.

## Production verification (post-merge, `main` @ `0c4aef1`)

PR #132 was squash-merged into `main` as `0c4aef1` and the Vercel production
deployment (`Production – knoux-store`) succeeded. The live site was then
measured with the same probe that produced the pre-merge baseline, at 1920×1080
and 1440×900. Raw dump:
[`production-measurements.json`](./production-measurements.json).

| Screen | Metric | Production before | Production after |
|---|---|---|---|
| `/build/providers` | route width / unused right gap @1920 | 1400 / 520px | **1920 / 0px** |
| `/build/providers` | Get API in viewport @1920 / @1440 | clipped below the fold | **visible** (bottom 1026 / 855) |
| `/build/providers` | title band vs top orbit node | — | **0 px²**; nodes span x 97→1823 at 1920 |
| `/build/powershell` | hero height @1920 | 553px | **360px** |
| `/build/powershell` | console @1920 | 692×293 | **974×454** |
| `/build/deployments` | masthead background | `rgb(7, 5, 14)` | **`rgba(0, 0, 0, 0)`** |
| `/build/deployments` | station widths @1920 | 4×277px | **4×390px** |
| `/build/platform` | card↔card overlaps @1440 | 1 | **0** |
| `/build/services` | route width / unused gap @1920 | 1400 / 250px | **1618 / 32px**; 6 services, copy capped |
| all five routes | horizontal overflow | none | **none** |

Comparison screenshots of the live site (1920×1080):
`providers-1920.png`, `powershell-1920.png`, `deployments-1920.png`,
`platform-1920.png`, `services-1920.png` (PNG is git-ignored by repository
convention; the files live beside this report on the verification machine).
