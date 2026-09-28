# Closure sprint QA evidence

Date: 2026-09-28. Branch: `feat/final-experience-closure`. Starting feature HEAD for this continuation: `8d84219f700d477e5712a1daab0e450aa15deaa7`. Baseline `main`: `de6072446d3ee9034b35c61c81004b1f8`.

## Source gates — COMPLETE

After the Home field and search-copy changes, `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, and `git diff --check` exited 0. Build generated 62 static pages; tests passed 52/52. Lint has two existing `@next/next/no-img-element` warnings on dormant product logo branches, with zero errors. `npm ci` remains **PARTIAL**: Windows returned `EPERM` while unlinking the loaded Next SWC binary earlier in this sprint. `npm install --no-audit --no-fund` restored dependencies without changing the lockfile; that does not prove a clean install.

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

Auth remains truthfully unconfigured, contact delivery requires `CONTACT_WEBHOOK_URL`, and no analytics provider is connected. These are external setup limits outside this run. CI checks, revised Vercel preview review, merge, and production-SHA verification must be updated after the next push; this record does not treat the pre-sprint live apex as the new release.
