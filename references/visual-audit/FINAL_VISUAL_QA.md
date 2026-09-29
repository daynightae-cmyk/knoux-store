# Visual QA: production build review

This review uses the running `next start` build at 1440×900 and 390×844. The six curated captures in [`verified/`](verified/) were taken from this repository on 29 September 2026. The top-level `after-*.png` files under `closure/` are stale local files from another project; they are excluded from this report and from the pull request.

| Surface | Direct observation | Evidence |
| --- | --- | --- |
| `/build` entry, desktop | Matte black field, off-white title and button, violet limited to small labels; intent input and Enter behavior retained | [`desktop-build-gate.png`](verified/desktop-build-gate.png) |
| `/build` entry, 390px | Title and input fit; CTA stacks below the input | [`mobile-build-gate.png`](verified/mobile-build-gate.png) |
| `/build` workspace, desktop | Hero spans the page; sidebar starts below it; composer, preview and three following panels occupy usable columns | [`desktop-build-workspace.png`](verified/desktop-build-workspace.png) |
| `/build` workspace, 390px | Dashboard stacks in one column; intent, CTA and preview remain reachable | [`mobile-build-workspace.png`](verified/mobile-build-workspace.png) |
| `/growth` | Editorial heading, dark neutral surfaces and section index render | [`desktop-growth.png`](verified/desktop-growth.png) |
| `/wordpress` | Editorial heading and catalogue entry render | [`desktop-wordpress.png`](verified/desktop-wordpress.png) |

## Defects caught by inspecting the current build

- The earlier `after-build.png`, `after-growth.png` and `after-wordpress.png` showed an unrelated Arabic application or a 404. They could not support any KNOuX claim. This report points only to newly captured, checked images.
- The `/build` entry had a large violet radial wash and a violet CTA. The entry now uses the canonical dark and text tokens, with violet as a small signal.
- The desktop workspace composer was about 90px wide, while a large blank gap separated it from the preview. CSS targeted old `.dev-panel--composer` and `.dev-panel--preview` names; the current markup uses `.dev-dashboard__composer` and `.dev-dashboard__preview`. The selectors now match the markup. A Playwright assertion checks useful panel widths.
- The sidebar project marker contained a garbled character sequence. It is now a single bullet.

The six images are first-viewport evidence. They do not prove all lower-page sections, interactions, or WCAG conformance. The Playwright route matrix checks rendering and overflow across routes and sizes; its generated captures are uploaded as the CI `route-captures` artifact and are not committed wholesale.
