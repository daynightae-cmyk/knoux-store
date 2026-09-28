# Closure sprint QA evidence

Date: 2026-09-28. Branch: `feat/final-experience-closure`. Baseline: `de6072446d3ee9034b3d7143b35c61c81004b1f8`.

## Local source gates

`npm run lint`, `npm run typecheck`, `npm run build` and `npm test` exited 0. The build generated 62 static pages; the test run passed 52/52. Lint reported two existing `@next/next/no-img-element` warnings on dormant product logo branches. `npm ci` did not pass: Windows returned `EPERM` while unlinking the loaded Next SWC binary. A later `npm install --no-audit --no-fund` restored dependencies without a lockfile change. This is not evidence of a clean-install gate.

## Production-build browser checks

The local `next start` build was checked in the Codex in-app browser. `/`, `/about`, `/work`, `/build`, `/products/knoux-one` and `/contact` had `documentElement.scrollWidth <= innerWidth` at 1600×1000, 1440×900, 1366×768, 1024×768, 768×1024, 430×932, 390×844 and 375×812. The 1440 result came from direct visual inspection; the other sizes were included in the responsive route matrix. The accepted Home arrival, About split and living mark, Home editorial software field, Work archive, product Hero and mobile menu were visually inspected. The mobile menu opened and exposed the real navigation routes. No page-level horizontal overflow was observed.

The Composer preset produced real registry matches. Remove changed a five-item stack to four; Add returned it to five; Clear returned the Orb to idle. The Repair preset produced one software entity. Selecting its semantic button exposed its verified route and Escape cleared the selection. Drag left the model and canvas intact. The Orb's settled physical Canvas equaled its CSS and parent dimensions at 375×812 (`310×340`) and 1600×1000 (`1413×560`); the earlier 390×844 observation was `325×340`. It did not cover the controls or overflow horizontally at those sizes.

The browser console reported no errors during the checked routes. A Three.js `Clock` deprecation warning appeared when the existing React Three Fiber Orb mounted. This is a dependency warning; the Orb still rendered and responded.

## Remaining gates and limits

Touch input, OS-level reduced-motion emulation and a forced WebGL-unavailable browser were not physically simulated. Their source paths exist, but no physical pass is claimed. External auth, contact delivery and analytics provider verification are blocked by missing provider setup or access. GitHub CI, preview review, merge, and post-merge production SHA verification require a pushed PR and green external checks. The live apex and `www` checks in the audit describe the pre-sprint baseline only.
