# KNOuX: The Awakening — verification record

**Date:** 2026-11-14 (local)
**Repository:** `K:\Knoux Projects\KNOuX Store\Base`
**Branch:** `feat/knoux-awakening-20261114`
**Base commit:** `dbda9ea952669ed7ab8f74f754727e3881e4ff5c`
**Worktree state:** uncommitted; nothing pushed, merged or deployed.
**Preview:** `http://127.0.0.1:4178` (production `next start`, HTTP 200)
**Browser:** Google Chrome via Playwright (`channel: 'chrome'`)

This file records what was executed and observed. It does not claim a
deployment, a manual screen-reader audit, or cross-browser coverage.

---

## 1. Commands and exit codes

| # | Command | Result | Notes |
| --- | --- | --- | --- |
| 1 | `npm run lint` | **PASS** (exit 0) | 0 errors; 3 pre-existing warnings in `RequestForm.tsx`, `SystemsRegister.tsx`, `SentinelGuidePanel.tsx` (untouched) |
| 2 | `npm run typecheck` | **PASS** (exit 0) | Also re-run by `next build` in the final build |
| 3 | `npm run build` | **PASS** (exit 0) | Next.js 16.4.2 (Turbopack); 103 generated pages; final build after the reduced-motion CSS fix |
| 4 | `npm run audit:css-integrity` | **PASS** (exit 0) | 66 emitted documents, 19 byte-matched HTTP 200 stylesheets, 15 route families |
| 5 | `npm test` | **PASS** (exit 0) | **944 tests, 944 pass, 0 fail, 0 skipped**; 7 suites |
| 6 | `KNOUX_E2E_BROWSER_CHANNEL=chrome npx playwright test e2e/awakening.spec.ts` | **PASS** (exit 0) | Final build: **18 passed, 18 skipped, 0 failed** (36 total across desktop/tablet/mobile); 1.4 min |

The 18 E2E skips are deliberate applicability guards in the spec (for example,
the mobile menu test only runs on the mobile project; timing/fracture tests are
desktop-only). They are not unexecuted failures.

Axe is executed inside E2E test 9 (`the reveal has no blocking automated
accessibility violation`) and reported no critical or serious violations.

### Evidence logs

Logs are outside the repository, in `D:\Temp\opencode`:

| File | Content |
| --- | --- |
| `final-lint.log` | lint output (final pre-CSS-fix run; CSS is not linted) |
| `final-test-2.log` | 944/944 unit run on the final build |
| `final-build-2.log` | final production build |
| `final-css-integrity-2.log` | final CSS integrity pass |
| `final-css-integrity-3.log` | CSS integrity re-run on the latest build (same 66/19/15 numbers) |
| `final-e2e-2.log` | earlier 30-test Playwright run on the feature build (16 pass, 14 applicability-skips) |
| `final-capture.json` | final browser metrics (reveal, cascade, overcharge, fracture, mobile, RTL, idle) |

---

## 2. Browser QA matrix (final build)

| Scenario | Viewport / motion | Result |
| --- | --- | --- |
| Hero + dock | 1440×900, reduced motion | Hero intact; dock "The Awakening / Click to play / Press K" visible; header K→AWAKEN visible |
| Hero dock, short laptops | 1280×800, 1366×768, 1440×900, 1536×864, 1600×900 | Mascot/key installation sits between the wordmark and the particle mark; caption hidden below 1020 px height; no collision; key ≥100×84 at 1440×900 |
| Hero dock, full desktop | 1920×1080, reduced motion | Full dock caption visible; mascot and key centred above the copy |
| Hero stacking, phones | 390×844, 360×800, 375×667, 412×915, 320×568 | Mark, dock and wordmark do not overlap (1 px box touch at 320×568 only); no horizontal overflow |
| Hero stacking, short phone | 375×667 and below 700 px height | Compact rule hides the description, shrinks the mark to an identity stamp and raises the copy; dock remains centred |
| Direct reveal | 1440×900, reduced motion | `data-state="explore"`, 5 cards, 5/5 images loaded, **0 running animations** |
| Cascade | 1440×900, no preference | `data-state="cascade"`, exactly 3 real nodes: KNOUX ONE, KNOuX Forge, KNOuX Repair; no fracture layer |
| Overcharge | 1440×900, no preference | `data-state="overcharge"`, exactly 5 real nodes: KNOUX ONE, KNOuX Forge, KNOuX Repair, KNOuX REC, KNOuX Player X |
| Fracture | 1440×900, no preference | `data-state="fracture"`; SVG present with 17 lines / 9 shards; computed `pointer-events: none` |
| Mobile menu entry | 390×844, reduced motion | Menu entry visible; opening it closes the panel (`panel: false`) |
| Mobile reveal | 390×844, reduced motion | 5 cards; no horizontal overflow (390 = 390); stage scroll height 1197 / client 844 |
| Arabic desktop | 1440×900, RTL | `dir="rtl"`, `lang="ar"`, heading "خمسة أنظمة. مسارات حقيقية."; first product "KNOUX ONE"; no horizontal overflow |
| Arabic mobile | 390×844, RTL | Same direction/lang/heading; no horizontal overflow (390 = 390) |
| Tablet | 820×1180 | E2E RTL, focus and hero reveal passed |
| Errors | All scenarios | No page errors, no console errors, no hydration errors observed |
| Scroll lock | Open stage | `body { overflow: hidden }`; restored after close (E2E asserts cleanup) |

### Measured desktop reveal (1440×900)

| Metric | Value |
| --- | ---: |
| Stage DOM nodes | 113 |
| Product cards | 5 |
| Images loaded | 5 / 5 |
| Canvases in stage | 0 |
| Horizontal overflow | none (1440 = 1440) |
| Stage z-index | 90 |
| Body overflow while open | hidden |
| JS heap after reveal | ~30 MB |
| Running animations under reduced motion | **0** |
| Long tasks in 3 s idle window | **0** |

### Thumbnails

Five 256×256 WebP files in `public/knoux-universe/forge/`, 59,710 bytes total:

| File | Bytes |
| --- | ---: |
| `knoux-one.webp` | 11,242 |
| `kforge.webp` | 12,862 |
| `knoux-repair.webp` | 11,872 |
| `knoux-rec.webp` | 11,800 |
| `knoux-x.webp` | 11,934 |

---

## 3. Screenshots

Final-build screenshots, outside the repository in `D:\Temp\opencode`:

| File | What it shows |
| --- | --- |
| `prod-awakening-hero.png` | Homepage hero, header K key, dock |
| `prod-awakening-reveal.png` | Direct reveal (reduced motion), five real cards |
| `prod-awakening-cascade.png` | Cascade, three emitted systems |
| `prod-awakening-cinematic.png` | Overcharge, five emitted systems |
| `prod-awakening-fracture.png` | Fracture, painting-only SVG |
| `prod-awakening-mobile-menu.png` | Mobile menu with "The Awakening" entry |
| `prod-awakening-mobile-reveal.png` | Mobile reveal |
| `prod-awakening-ar-desktop.png` | Arabic RTL desktop reveal |
| `prod-awakening-ar-mobile.png` | Arabic RTL mobile reveal |

Earlier development screenshots (phase captures) also remain in the same
folder but are superseded by the set above.

These are evidence images, not committed visual-regression baselines.

The hero-dock geometry pass is captured in `D:\Temp\opencode\knoux-shots`:

| File | What it shows |
| --- | --- |
| `hero2-1920x1080.png` | Full desktop dock with caption between wordmark and particle mark |
| `hero2-1440x900.png` | Laptop-height dock (compact, caption hidden) |
| `hero2-1366x768.png` | Short laptop dock at the 30% top threshold |
| `hero3-390x844.png` | Phone stacking: mark, dock, wordmark and copy |
| `hero3-375x667.png` | Short-phone composition with the description hidden |
| `prod-hero-mobile.png` | Production mobile hero at 390×844, reduced motion |
| `prod-final-1440.png` | Production final reveal at 1440×900, reduced motion |
| `prod-ar-390.png`, `prod-ar-375.png` | Arabic RTL mobile hero (dock does not collide with the wordmark) |
| `prod-320x568.png` | Smallest reviewed phone; 1 px mark/dock box touch, no overflow |

---

## 4. What each test layer proves

**Unit/contract tests (`tests/awakening.test.mjs`, 26 tests of the 944):**
phase list and order, timing table, emission counts, reducer transitions
(pause/resume/skip/replay/error/close), registry projection fidelity and
completeness failure, deterministic fracture geometry and bounds, pointer
non-interception, audio gesture gating and cleanup, no `Math.random` in the
Sentinel/fracture, one interactive Sentinel, reduced-motion direct reveal,
focus contract, and absence of `requestAnimationFrame` in the scene model.

**E2E (`e2e/awakening.spec.ts`):**
hero activation and focus return, real dossier navigation, shared `K`/header
trigger, non-home hand-off and query cleanup, mobile menu, real-timer
advance/pause/resume/skip/replay, full cinematic cleanup, RTL and token
preservation, axe, focus containment.

**Not covered by automation:**
manual screen-reader review, Safari/Firefox, acoustic listening, real mobile
hardware, public deployment.

**Known limitation (pre-existing, outside this feature):** on narrow RTL
viewports the site-wide fixed Sentinel companion launcher (`.launcher`,
`z-index:145`) overlaps the bottom-right corner of the right-aligned secondary
hero CTA. The overlap was measured at 390×844 Arabic (launcher 302–366 ×
740–820; CTA 297–366 × 730–774) on the previous hero geometry as well, so it
is not caused by the Awakening dock and was left untouched to keep this change
scoped.

---

## 5. Status summary

| Claim | Status |
| --- | --- |
| Feature implemented in the real codebase | VERIFIED |
| Lint / typecheck / build | VERIFIED |
| 944 unit tests | VERIFIED |
| 36-test browser suite (18 run-pass, 18 applicability-skips) | VERIFIED |
| Real product cards and routes from the canonical registry | VERIFIED |
| Fracture non-destructive and pointer-neutral | VERIFIED |
| Reduced-motion direct reveal and zero running animations | VERIFIED |
| EN/AR RTL at desktop/mobile widths | VERIFIED |
| Automated axe pass (no critical/serious) | VERIFIED |
| Manual screen-reader audit | NOT-IMPLEMENTED |
| Safari/Firefox browser matrix | NOT-IMPLEMENTED |
| Acoustic/subjective audio review | NOT-IMPLEMENTED |
| Push / merge / production deploy | NOT-IMPLEMENTED (not authorized) |
