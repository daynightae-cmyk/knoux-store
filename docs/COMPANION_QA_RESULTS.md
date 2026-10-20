# Final Sentinel QA — 2026-10-14

PASS: actual Chrome acceptance, build cisq3n-hoGP514ri1-aFW. Real gemini-3.1-flash-lite answers, not mocks. Desktop 1440×900, tablet 820×1180, mobile 390×844. Exact report: C:\Users\day night\.codex\worktrees\sentinel-visitor-guide\qa\companion\acceptance-1791936842313\report.json.

| Width | Route / language | Actual context | First token ms | Stream total ms | Real deltas |
|---|---|---|---:|---:|---:|
| 1440 | /engineering / en | engineering-dossiers | 2412 | 2548 | 3 |
| 1440 | /products / en | ledger | 2186 | 2504 | 4 |
| 1440 | /solutions / ar | solution-handoff | 1384 | 1980 | 5 |
| 820 | /solutions / ar | solution-layer-detail | 2382 | 2642 | 4 |
| 390 | /solutions / ar | solution-handoff | 1874 | 2151 | 5 |
| 390 | /products / en | ledger | 1309 | 1413 | 3 |

Latencies measure actual cloned SSE arrival from reply fetch, excluding session issuance; click-to-completion and render mutations are separately retained in JSON. Short responses may batch into one React render despite genuine multiple deltas. The desktop video is a continuous three-section journey. FIXED: product facts now use approved statements and documented release status; real desktop/mobile Clipboard AI replies must preserve release-candidate or explicitly unverified readiness. Earlier overgeneralized answers remain archived. Pointer motion is demonstrated before quiet mode prevents unsolicited requests during rapid deliberate questioning. Movement request counts were 0, 0, 0 across 25 moves per viewport; all geometries have zero overflow, one mascot and one global starfield. Page-error arrays and scoped axe violations are empty.

PASS / exit 0: build (qa-companion-build-grounded.log), TypeScript (qa-companion-types-grounded.log), lint (qa-companion-lint-grounded.log, one cleanup-ref warning), 784 unit tests (qa-companion-unit-grounded-accepted.log), 30 relevant Playwright tests (qa-companion-browser-grounded.log), CSS integrity (qa-companion-css-grounded.log: 62 documents, 15 matching stylesheets, 15 route families), live acceptance (qa-companion-grounded-experience.log), live security (qa-companion-security-grounded.log), final bundle (qa-companion-bundle-grounded.log).

The relevant Playwright suite covers keyboard/focus, EN/AR, reduced/hidden motion, ordinary controls, speech without microphone/autoplay, cancellation, private-field handling, Sources dialog and starfield continuity. Full unrelated 654-case site-wide coverage was not completed. Initial default-browser invocation was interrupted; one later 27/30 run overlapped a build and failed. Their logs remain. Final stable-build 30/30 is the accepted result. Failed live runs retain genuine provider 503s and enforced 429 session ceilings. No failure was converted into a fabricated answer.

PASS: isolated PGlite concurrent submitted reservations (40 accepted of 60 same-session), conservative 200 global/day and 600,000 micro-USD limits; anon read/execute denial. PGlite serializes calls, so distributed multi-connection deployment behavior remains BLOCKED pending staging proof. PASS: real injection refusal, duplicate429, cancelled reader, invalid Google key400 in qa/companion/live-security.json.

PASS: 92 final client JavaScript files scanned, zero credential-pattern matches in qa/companion/client-secret-scan.json. Final home decoded JS: 1440: 1781871 bytes; 820: 1658322 bytes; 390: 1658322 bytes; each within the existing 1800KiB ceiling. This measures the whole initial page, not the standalone mascot bundle.

PASS: original SVG defs through closing SVG exactly match qa/companion/pre-ai-1791911173. Genuine motion evidence is recorded; no claimed physical-device FPS benchmark. Browser emulation ran on the owner Windows workstation. UNTESTED: physical mobile, audible voice quality, human screen-reader review, deployed multi-host budget locking. Gemini answers remain fallible and require source review; no whole-catalog accuracy guarantee is asserted.

BLOCKED: public production AI enablement. Read-only production SQL found neither public.companion_budget nor reserve_companion_budget(text,integer); no schema/deploy writes were made. Private Agent/Gateway remain disconnected.

Final visually reviewed images include desktop Engineering, Products, Solutions Arabic and mobile Solutions Arabic/Products English. Video frames were inspected separately; filenames below are genuine raw captures.

- C:\Users\day night\.codex\worktrees\sentinel-visitor-guide\qa\companion\acceptance-1791936842313\1440-engineering-en.png
- C:\Users\day night\.codex\worktrees\sentinel-visitor-guide\qa\companion\acceptance-1791936842313\1440-guide-ar.png
- C:\Users\day night\.codex\worktrees\sentinel-visitor-guide\qa\companion\acceptance-1791936842313\1440-guide-en.png
- C:\Users\day night\.codex\worktrees\sentinel-visitor-guide\qa\companion\acceptance-1791936842313\1440-idle.png
- C:\Users\day night\.codex\worktrees\sentinel-visitor-guide\qa\companion\acceptance-1791936842313\1440-products-en.png
- C:\Users\day night\.codex\worktrees\sentinel-visitor-guide\qa\companion\acceptance-1791936842313\1440-quiet.png
- C:\Users\day night\.codex\worktrees\sentinel-visitor-guide\qa\companion\acceptance-1791936842313\1440-solutions-ar.png
- C:\Users\day night\.codex\worktrees\sentinel-visitor-guide\qa\companion\acceptance-1791936842313\390-guide-ar.png
- C:\Users\day night\.codex\worktrees\sentinel-visitor-guide\qa\companion\acceptance-1791936842313\390-guide-en.png
- C:\Users\day night\.codex\worktrees\sentinel-visitor-guide\qa\companion\acceptance-1791936842313\390-idle.png
- C:\Users\day night\.codex\worktrees\sentinel-visitor-guide\qa\companion\acceptance-1791936842313\390-products-en.png
- C:\Users\day night\.codex\worktrees\sentinel-visitor-guide\qa\companion\acceptance-1791936842313\390-quiet.png
- C:\Users\day night\.codex\worktrees\sentinel-visitor-guide\qa\companion\acceptance-1791936842313\390-solutions-ar.png
- C:\Users\day night\.codex\worktrees\sentinel-visitor-guide\qa\companion\acceptance-1791936842313\820-guide-ar.png
- C:\Users\day night\.codex\worktrees\sentinel-visitor-guide\qa\companion\acceptance-1791936842313\820-idle.png
- C:\Users\day night\.codex\worktrees\sentinel-visitor-guide\qa\companion\acceptance-1791936842313\820-quiet.png
- C:\Users\day night\.codex\worktrees\sentinel-visitor-guide\qa\companion\acceptance-1791936842313\820-solutions-ar.png
- C:\Users\day night\.codex\worktrees\sentinel-visitor-guide\qa\companion\acceptance-1791936842313\desktop-motion-bubble.png
- C:\Users\day night\.codex\worktrees\sentinel-visitor-guide\qa\companion\acceptance-1791936842313\desktop-motion-pointer.png
- C:\Users\day night\.codex\worktrees\sentinel-visitor-guide\qa\companion\acceptance-1791936842313\mobile-motion-dock.png

- 1440: C:\Users\day night\.codex\worktrees\sentinel-visitor-guide\qa\companion\acceptance-1791936842313\page@466d7ed436894bbd5b004f57986cdf3a.webm
- 820: C:\Users\day night\.codex\worktrees\sentinel-visitor-guide\qa\companion\acceptance-1791936842313\page@825577e3d2142674f3fe7f04f3ab741c.webm
- 390: C:\Users\day night\.codex\worktrees\sentinel-visitor-guide\qa\companion\acceptance-1791936842313\page@e63bcf851bdcdce7506a3f72608a8eeb.webm

Before evidence: C:\Users\day night\.codex\worktrees\sentinel-visitor-guide\qa\sentinel\living-motion-1791893435578; protected immediate pre-AI source: C:\Users\day night\.codex\worktrees\sentinel-visitor-guide\qa\companion\pre-ai-1791911173. Final source checkpoint: C:\Users\day night\.codex\worktrees\sentinel-visitor-guide\qa\companion\owner-review-20261014-6718759d.
