# Closure sprint QA evidence

Date: 2026-09-28. Branch: `feat/final-experience-closure`. Feature HEAD verified in this continuation: `9586f2cd75bdbe6db0c613eb3fe6ac578d6eecee` (merge of `4cc1e35` and `61ddcb1`). Baseline `main`: `de6072446d3ee9034b35c61c81004b1f8`.

## Branch reconciliation — COMPLETE

The branch had diverged from its remote by one commit in each direction from the shared base `8d84219f700d477e5712a1daab0e450aa15deaa7`: local `4cc1e35ee19ad1171439e21ad90b94e2bfeb56d7` (Home software field and preview QA closure) and remote `61ddcb1f6319623bda5f7ca2ed662fe5e4778c3c` (KNOuX Sentinel living companion). A normal non-destructive merge resolved it as `9586f2c`, with `4cc1e35` and `61ddcb1` retained as its two parents. No force push, no reset, and no commit was dropped.

The overlap was limited to `src/app/globals.css` and `references/REFERENCE_IMPLEMENTATION_AUDIT.md`, and both sides survived. Against `61ddcb1`, the merge adds the 162 Home `globals.css` lines, the `HomeSoftwareField` serial and canonical-mark emblem, the Composer search-summary correction in `composer-rules.ts`, and the `QA_CLOSURE.md` and `SOFTWARE_FIELD_CLOSURE.md` revisions. Against `4cc1e35`, the merge adds the entire Sentinel surface (`KnouxSentinel.tsx`, `knoux-sentinel.css`, `knoux-sentinel.ts`, the sentinel test), the `layout.tsx` mount, the reduced `PointerField.tsx`, and the `LIVING_COMPANION_CLOSURE.md` update. `QA_CLOSURE.md` and `SOFTWARE_FIELD_CLOSURE.md` were never modified by the remote side, so no QA history was overwritten. The audit row for the living companion was rewritten to name `identity/KnouxSentinel.tsx` while the Home, Composer, About and Work rows kept their `4cc1e35` closure states.

## Local production-build route sweep — COMPLETE

`next start` was served on an isolated port and the sixteen closure routes were requested directly: `/`, `/about`, `/work`, `/products`, `/products/knoux-one`, `/engineering`, `/solutions`, `/web`, `/creative`, `/growth`, `/wordpress`, `/build`, `/contact`, `/login`, `/register` and `/forgot-password`. All returned HTTP 200 with the expected `<h1>`, `rel="canonical"` target, header and footer. All 59 unique internal links discovered across those pages resolved without a 4xx or 5xx, and all 28 unique `/_next/` assets returned 200. No broken asset reference was observed.

`/build` serves the Composer subtree through Next's `BAILOUT_TO_CLIENT_SIDE_RENDERING` boundary because `Composer` reads `useSearchParams()`. This originates in `8ce417e`, predates this sprint, and `Composer.tsx`, `src/app/build/page.tsx` and `src/components/build/` are unchanged across the whole sprint, so it is not a reconciliation regression and the Composer was not modified.

## Sentinel — verified, deliberately unchanged

The Sentinel is treated as a temporary implementation pending the separate Grok authority, so it was checked for defects only and not redesigned, expanded or replaced. `KnouxSentinel` mounts once in `src/app/layout.tsx`; `motion/PointerField.tsx` is now only a re-export alias of it, so no duplicate listener implementation remains. Its stylesheet sets `pointer-events: none`, `position: fixed`, `contain: layout style` and a bounded 52×64 box, so it cannot intercept input or displace layout, and its root is `aria-hidden="true"`. It hides itself under `pointer: coarse` and, under `prefers-reduced-motion: reduce`, parks as a static bottom-right mark with transforms and animations disabled. Its unit tests are part of the 59-test pass. Pointer-follow, state-transition and performance behaviour still need a physical browser pass on the new deployment.

## Source gates — COMPLETE

At the reconciled HEAD, `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` and `git diff --check` each exited 0. Build generated 62 static pages by Next.js 16.3.6. The test count is 59 rather than the 52 recorded before the Sentinel tests landed. Lint has two existing `@next/next/no-img-element` warnings on dormant product logo branches, with zero errors. `npm ci` remains **PARTIAL**: Windows returned `EPERM` while unlinking the loaded Next SWC binary earlier in this sprint. `npm install --no-audit --no-fund` restored dependencies without changing the lockfile; that does not prove a clean install.

## Authenticated PR preview — COMPLETE for inspected routes

The authenticated Vercel preview for feature HEAD `8d84219f700d477e5712a1daab0e450aa15deaa7` was inspected in the Codex in-app browser at `https://knoux-store-git-feat-final-exp-49af54-daynightae-cmyks-projects.vercel.app`. Direct navigation to `/`, `/about`, `/work`, `/products`, `/products/knoux-one`, `/engineering`, `/solutions`, `/web`, `/creative`, `/growth`, `/wordpress`, `/build`, `/contact`, `/login`, `/register`, and `/forgot-password` produced the expected H1, header and footer. None had horizontal page overflow or a completed image with zero natural width at 1440×900. Hard reload, Back and Forward worked on the account routes. Desktop navigation, mobile menu open and route navigation, search-result navigation to Work, the featured product and next-dossier links, and a Composer stack link to `/web/corporate-site` worked. Console had no errors or hydration errors. The existing Three.js `Clock` deprecation warning appeared on WebGL pages without preventing render or interaction.

The preview Home field on that HEAD was visually judged too conventional beside the accepted Hero. A local production build of the revision adds the canonical mark, a large serial, a spatial signature layer and typographic record selection. At 1280×720 the identity panel and caption have equal client/scroll heights of 620px, so the dossier link is not clipped. At 390×844 the field stacks without page overflow. This revised field still requires confirmation on its **new** Vercel deployment before merge.

About's living mark was inspected at desktop and 390×844. It rendered within its identity frame with balanced text and negative space; the mobile stack had no page overflow or collision. Work's fixed contextual identity and scrolling real product records were inspected at desktop and 390×844. Record evidence and links remained readable, with no invented client outcomes or card wall. The product dossier rendered its canonical SVG in place of an absent local product logo; zero product logo `<img>` elements were mounted on the checked product route.

## Composer Orb — COMPLETE for pointer and keyboard browser QA

The actual preview Canvas was measured after settling at 1600×1000 (`1413×560`), 1440×900 (`1270×560`), 1366×768 (`1204×560`), 1024×768 (`898×492` CSS), 768×1024 (`670×369` CSS), 430×932 (`365×340`), 390×844 (`325×340`), and 375×812 (`310×340`). Backing dimensions matched CSS exactly or differed by one rounding pixel. None caused horizontal page overflow. No control overlap was observed in the checked layouts.

The Restaurant preset resolved five real entities across three divisions. Selecting its semantic Website node exposed a verified route, and Escape cleared the selection. Add grew the stack from five to six; Remove returned it to five; Clear returned it to idle. The Ecommerce preset also resolved real entries on mobile. Pointer drag kept one Canvas and the model intact; normal wheel scrolling over the Canvas moved the page. The semantic index remained present in the DOM, so essential data is not locked in WebGL. The same core editing paths had passed earlier local production-build QA.

## Device-mode limits — PARTIAL

The connected in-app browser exposes viewport and visibility controls, but no touch-device, `prefers-reduced-motion`, or WebGL-disable emulation. Touch, OS-level reduced motion, and forced WebGL failure therefore have source-path inspection only, not a physical PASS. The Orb's source provides a visible semantic DOM fallback, `prefers-reduced-motion` handling, an offscreen/hidden-tab render pause, and capped DPR; About's particle mark likewise pauses offscreen/hidden and caps DPR. Those source properties do not replace device-mode testing.

## External services and release — BLOCKED / PENDING

Auth remains truthfully unconfigured, contact delivery requires `CONTACT_WEBHOOK_URL`, and no analytics provider is connected. These are external setup limits outside this run. The earlier preview, route and Orb observations above were taken at `8d84219` and are retained as recorded history; they do not cover the reconciled HEAD. CI checks, the revised Vercel preview review, merge and the production-SHA verification must be recorded against the new push, and this record does not treat the pre-sprint live apex as the new release.
