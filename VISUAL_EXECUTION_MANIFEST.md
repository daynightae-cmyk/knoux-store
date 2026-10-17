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
| 03 | Engineering | PENDING | — | — |
| 04 | WordPress Ecosystem | PENDING | — | — |
| 05 | Web Systems Studio | PENDING | — | — |
| 06 | Growth | PENDING | — | — |
| 07 | Creative | PENDING | — | — |
| 08 | Solutions | PENDING | — | — |
| 09 | Composer / Build | PENDING | — | — |
| 10 | Command / Provider OS | PENDING | — | — |
| 11 | Work | PENDING | — | — |
| 12 | Labs | PENDING | — | — |
| 13 | About / Institution | PENDING | — | — |
| 14 | Contact | PENDING | — | — |

## Baseline findings (from live Playwright captures, `visual-audit/baseline/`)

- Home: hero copy reveal fires at ~2.5–4s (settle-gated). Works, no change to protected arrival sequence.
- Products: real defect confirmed — the pinned chapter panels ("One core. Every surface.", "Capture. Build. Publish.", "Navigate by intent.") stack at full opacity with no exit fade; CSS sticky engages only partially under this construction (s4 headline clips off-viewport). Full-page-only overlap of the hero is a pinned-scroll artifact, not a defect.
- Web: "Indexed by what it does." and "The same four stages." sections render as black voids — content not visible.
- Engineering: dossier stack/contract monospace blocks render at unreadably small sizes; heavy repetition.
- Command: functional, honest DEMO labelling; Sentinel pill overlaps sidebar "Creative Studio" item.
- Global: Sentinel floating pill overlaps page content bottom-right on public pages.
- All 14 route families return HTTP 200; `/build` has long-lived connections (networkidle times out — use `domcontentloaded` for capture).

## Rules

- Protected: arrival sequence + LivingParticleMark on Home; StoreStarfield single global instance; PR #53 Solutions click-to-select behavior; all existing security/authorization tests; DEMO labelling contracts.
- No new animation libraries. No full-screen particle renderer beyond StoreStarfield. No fake data, fake screenshots, fake operations.
- Screenshots only from the running app via Playwright.
