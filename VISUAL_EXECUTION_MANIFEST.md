# VISUAL EXECUTION MANIFEST — KNOuX Store Visual Singularity

- Branch: `feat/visual-singularity-platform`
- Baseline main SHA at branch creation: `899f95dd76f57f51e8a9ebb1c9b93c79dc0a98c5` (verified, includes merged PR #53)
- Worktree: `K:\Knoux Projects\_Integration\knoux-store-visual`
- PR #52 (Arabic/Urdu i18n) remains OPEN and untouched. No i18n duplication in this branch.
- Open historical PRs #45/#46: untouched.
- Evidence directory: `visual-audit/` (baseline captures in `visual-audit/baseline/`, route captures in `visual-audit/<route>/`). Not staged raw into git; manifests reference file names.

## Execution status

| Route | Family | Status | Commit | Notes |
| --- | --- | --- | --- | --- |
| 01 | Home / Headquarters | DONE | b99a666 | Mission selection by choice (PR #53 contract), registry facts on records, reactive division core, underline-draw hover. Gates green. |
| 02 | Software Universe | DONE | c9fc216 | Chapter panels pinned via runtime-driven `data-ksu-chapter` (fixed positioning); stacked-chapter overlap fixed; chapter copy scrim + brighter body. Dossier detail (desktop/mobile/arrival/anatomy selector) verified with no defects. Gates green. |
| 03 | Engineering | DONE | 702c0d7 | Readable source records, bounded navigation and clearer constraints. Build, typecheck, CSS integrity and responsive keyboard checks pass; growth build-ID false positive fixed, site suite 7/7. |
| 04 | WordPress Ecosystem | DONE | 896fa70 | First-party alignment, goal-to-request context and category-preserving reset fixed. Production screenshots 1440/820/390; live empty theme search and intake checked. Build, focused lint, typecheck, CSS integrity and all 849 tests pass. |
| 05 | Web Systems Studio | DONE | d56ce5e | Deep links resolve on the server (no hydration mismatch); three-column studio layout; legible discipline/matrix type; keyboard-reachable capability matrix. Deep links, fallback, reload, no-JS render and 1440/820/390 all verified. |
| 06 | Growth | PASS | 4ee8feb | Swept at 1440/820/390: no overflow, clipping, unnamed controls or broken images. Three-question flow, budget scope and channel index render and read correctly. |
| 07 | Creative | PASS | 4ee8feb | The honest-state block ("No project archive is published") was permanently invisible and is now restored. Eight disciplines, material lab and pairs-with index verified. |
| 08 | Solutions | PASS | 4ee8feb | ~700px void after the mission rows filled: the explanation, bridge and next link never revealed. PR #53 contract re-verified — hover does not select, click and arrow keys do, handoff follows. |
| 09 | Composer / Build | DONE | ea92250 | Entry gate states what it does and offers the shared starter intents; gate contract verified (required, Escape-proof, remembered per tab). Workspace status rail no longer runs under the Sentinel launcher. |
| 10 | Command / Provider OS | DONE | ea92250 | DEMO/FIXTURE labelling intact and honest. Currency metric renders the code as a unit so the amount no longer breaks across lines. Status rail unblocked. |
| 11 | Work | PASS | 4ee8feb | Case-file archive renders and discloses; sweep clean at all three viewports. |
| 12 | Labs | PASS | 4ee8feb | Experiment chamber and both evidence disclosures render; sweep clean. |
| 13 | About / Institution | PASS | 4ee8feb | Origin room, division registry and countable-state list render; sweep clean. |
| 14 | Contact | PASS | 4ee8feb | Request form, division aside and next-steps render; sweep clean. |
| 15 | Auth / Account | DONE | 4ee8feb | Hydration mismatch on every auth route removed (the chamber arms `<html>` before paint; React now expects that attribute). |
| 16 | Signal | PASS | 4ee8feb | Renders with no client-side errors on the application routes. |

## Cross-route defects fixed in this pass

| Defect | Cause | Fixed in |
| --- | --- | --- |
| Reveal blocks invisible for the life of the page | `[data-reveal]` renders at opacity 0 and only `RevealGroup` ever added `is-visible`, so a block authored outside a group never appeared | 4ee8feb |
| Auth routes report a hydration mismatch | The chamber's pre-paint script sets `data-chamber` on `<html>`, which React never rendered | 4ee8feb |
| Workspace status painted over by the Sentinel launcher | The rail runs along the same bottom edge the launcher floats above | ea92250 |
| `/web?system=…` mismatched server and client markup | The selector read `window.location` inside a `useState` initialiser | d56ce5e |

## Verification tooling (committed, `scripts/`)

- `route-sweep.mjs` — every public route at 1440/820/390: overflow, clipped copy, unrevealed blocks, unnamed controls, broken images, console and HTTP errors.
- `verify-build-gate.mjs` — the required entry gate: starters, submit availability, entry, persistence, Escape, overflow.
- `verify-solutions-selection.mjs` — the merged PR #53 contract.
- `shoot-element.mjs` — photographs one reveal-gated block in the viewport, which a stitched full-page shot cannot do honestly.
- `visual-capture.mjs` / `visual-scrollcheck.mjs` — route captures and per-scroll-position diagnosis.

## Baseline findings (from live Playwright captures, `visual-audit/baseline/`)

- Home: hero copy reveal fires at ~2.5–4s (settle-gated). Works, no change to protected arrival sequence.
- Products: real defect confirmed — the pinned chapter panels ("One core. Every surface.", "Capture. Build. Publish.", "Navigate by intent.") stack at full opacity with no exit fade; CSS sticky engages only partially under this construction (s4 headline clips off-viewport). Full-page-only overlap of the hero is a pinned-scroll artifact, not a defect.
- Web: the `SystemsStudio` grid could not become three columns because the shared `.option-grid` is flex, and the deep-linked system was only resolved on the client.
- Engineering: dossier stack/contract monospace blocks render at unreadably small sizes; heavy repetition.
- Command: functional, honest DEMO labelling. The "overlap" in the sidebar was the Next.js dev-tools indicator, which does not exist in production; the genuine overlap is the Sentinel launcher over the workspace status rail.
- Global: Sentinel floating pill overlaps page content bottom-right on public pages.
- All 14 route families return HTTP 200; `/build` has long-lived connections (networkidle times out — use `domcontentloaded` for capture).

## Rules

- Protected: arrival sequence + LivingParticleMark on Home; StoreStarfield single global instance; PR #53 Solutions click-to-select behavior; all existing security/authorization tests; DEMO labelling contracts.
- No new animation libraries. No full-screen particle renderer beyond StoreStarfield. No fake data, fake screenshots, fake operations.
- Screenshots only from the running app via Playwright.
