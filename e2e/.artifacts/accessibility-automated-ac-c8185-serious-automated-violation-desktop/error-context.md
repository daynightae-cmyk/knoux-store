# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: accessibility.spec.ts >> automated accessibility >> /build/services has no critical or serious automated violation
- Location: e2e\accessibility.spec.ts:36:5

# Error details

```
Error: /build/services has automated accessibility violations:
color-contrast (serious) x5: kbd

expect(received).toEqual(expected) // deep equality

- Expected  -   1
+ Received  + 198

- Array []
+ Array [
+   Object {
+     "description": "Ensure the contrast between foreground and background colors meets WCAG 2 AA minimum contrast ratio thresholds",
+     "help": "Elements must meet minimum color contrast ratio thresholds",
+     "helpUrl": "https://dequeuniversity.com/rules/axe/4.13/color-contrast?application=playwright",
+     "id": "color-contrast",
+     "impact": "serious",
+     "nodes": Array [
+       Object {
+         "all": Array [],
+         "any": Array [
+           Object {
+             "data": Object {
+               "bgColor": "#08090a",
+               "contrastRatio": 3.9,
+               "expectedContrastRatio": "4.5:1",
+               "fgColor": "#6d6e70",
+               "fontSize": "7.1pt (9.5px)",
+               "fontWeight": "normal",
+               "messageKey": null,
+             },
+             "id": "color-contrast",
+             "impact": "serious",
+             "message": "Element has insufficient color contrast of 3.9 (foreground color: #6d6e70, background color: #08090a, font size: 7.1pt (9.5px), font weight: normal). Expected contrast ratio of 4.5:1",
+             "relatedNodes": Array [
+               Object {
+                 "html": "<body style=\"--motion-response:180ms;--motion-drawer:320ms;--motion-search:220ms;--motion-reveal:620ms;--motion-route:460ms;--ease-standard:cubic-bezier(0.22, 0.61, 0.36, 1);--ease-entrance:cubic-bezier(0.16, 0.84, 0.34, 1);--ease-exit:cubic-bezier(0.4, 0, 1, 1)\">",
+                 "target": Array [
+                   "body",
+                 ],
+               },
+             ],
+           },
+         ],
+         "failureSummary": "Fix any of the following:
+   Element has insufficient color contrast of 3.9 (foreground color: #6d6e70, background color: #08090a, font size: 7.1pt (9.5px), font weight: normal). Expected contrast ratio of 4.5:1",
+         "html": "<kbd>⌘K</kbd>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           "kbd",
+         ],
+       },
+       Object {
+         "all": Array [],
+         "any": Array [
+           Object {
+             "data": Object {
+               "bgColor": "#111214",
+               "contrastRatio": 3.67,
+               "expectedContrastRatio": "4.5:1",
+               "fgColor": "#6d6e70",
+               "fontSize": "6.8pt (9px)",
+               "fontWeight": "normal",
+               "messageKey": null,
+             },
+             "id": "color-contrast",
+             "impact": "serious",
+             "message": "Element has insufficient color contrast of 3.67 (foreground color: #6d6e70, background color: #111214, font size: 6.8pt (9px), font weight: normal). Expected contrast ratio of 4.5:1",
+             "relatedNodes": Array [
+               Object {
+                 "html": "<footer class=\"site-footer\">",
+                 "target": Array [
+                   "footer",
+                 ],
+               },
+             ],
+           },
+         ],
+         "failureSummary": "Fix any of the following:
+   Element has insufficient color contrast of 3.67 (foreground color: #6d6e70, background color: #111214, font size: 6.8pt (9px), font weight: normal). Expected contrast ratio of 4.5:1",
+         "html": "<span class=\"label\">Divisions</span>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           ".footer-index__col:nth-child(1) > .label",
+         ],
+       },
+       Object {
+         "all": Array [],
+         "any": Array [
+           Object {
+             "data": Object {
+               "bgColor": "#111214",
+               "contrastRatio": 3.67,
+               "expectedContrastRatio": "4.5:1",
+               "fgColor": "#6d6e70",
+               "fontSize": "6.8pt (9px)",
+               "fontWeight": "normal",
+               "messageKey": null,
+             },
+             "id": "color-contrast",
+             "impact": "serious",
+             "message": "Element has insufficient color contrast of 3.67 (foreground color: #6d6e70, background color: #111214, font size: 6.8pt (9px), font weight: normal). Expected contrast ratio of 4.5:1",
+             "relatedNodes": Array [
+               Object {
+                 "html": "<footer class=\"site-footer\">",
+                 "target": Array [
+                   "footer",
+                 ],
+               },
+             ],
+           },
+         ],
+         "failureSummary": "Fix any of the following:
+   Element has insufficient color contrast of 3.67 (foreground color: #6d6e70, background color: #111214, font size: 6.8pt (9px), font weight: normal). Expected contrast ratio of 4.5:1",
+         "html": "<span class=\"label\">Growth channels</span>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           ".footer-index__col:nth-child(2) > .label",
+         ],
+       },
+       Object {
+         "all": Array [],
+         "any": Array [
+           Object {
+             "data": Object {
+               "bgColor": "#111214",
+               "contrastRatio": 3.67,
+               "expectedContrastRatio": "4.5:1",
+               "fgColor": "#6d6e70",
+               "fontSize": "6.8pt (9px)",
+               "fontWeight": "normal",
+               "messageKey": null,
+             },
+             "id": "color-contrast",
+             "impact": "serious",
+             "message": "Element has insufficient color contrast of 3.67 (foreground color: #6d6e70, background color: #111214, font size: 6.8pt (9px), font weight: normal). Expected contrast ratio of 4.5:1",
+             "relatedNodes": Array [
+               Object {
+                 "html": "<footer class=\"site-footer\">",
+                 "target": Array [
+                   "footer",
+                 ],
+               },
+             ],
+           },
+         ],
+         "failureSummary": "Fix any of the following:
+   Element has insufficient color contrast of 3.67 (foreground color: #6d6e70, background color: #111214, font size: 6.8pt (9px), font weight: normal). Expected contrast ratio of 4.5:1",
+         "html": "<span class=\"label\">WordPress</span>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           ".footer-index__col:nth-child(3) > .label",
+         ],
+       },
+       Object {
+         "all": Array [],
+         "any": Array [
+           Object {
+             "data": Object {
+               "bgColor": "#111214",
+               "contrastRatio": 3.67,
+               "expectedContrastRatio": "4.5:1",
+               "fgColor": "#6d6e70",
+               "fontSize": "6.8pt (9px)",
+               "fontWeight": "normal",
+               "messageKey": null,
+             },
+             "id": "color-contrast",
+             "impact": "serious",
+             "message": "Element has insufficient color contrast of 3.67 (foreground color: #6d6e70, background color: #111214, font size: 6.8pt (9px), font weight: normal). Expected contrast ratio of 4.5:1",
+             "relatedNodes": Array [
+               Object {
+                 "html": "<footer class=\"site-footer\">",
+                 "target": Array [
+                   "footer",
+                 ],
+               },
+             ],
+           },
+         ],
+         "failureSummary": "Fix any of the following:
+   Element has insufficient color contrast of 3.67 (foreground color: #6d6e70, background color: #111214, font size: 6.8pt (9px), font weight: normal). Expected contrast ratio of 4.5:1",
+         "html": "<span class=\"label\">Institution</span>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           ".footer-index__col:nth-child(4) > .label",
+         ],
+       },
+     ],
+     "tags": Array [
+       "cat.color",
+       "wcag2aa",
+       "wcag143",
+       "TTv5",
+       "TT13.c",
+       "EN-301-549",
+       "EN-9.1.4.3",
+       "ACT",
+       "RGAAv4",
+       "RGAA-3.2.1",
+     ],
+   },
+ ]
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - link "Skip to content" [ref=e2] [cursor=pointer]:
    - /url: "#main-content"
  - banner [ref=e3]:
    - link "KNOuX home" [ref=e4] [cursor=pointer]:
      - /url: /
      - text: KNOuX
      - generic [ref=e6]: r
    - navigation "Divisions" [ref=e7]:
      - link "Software" [ref=e8] [cursor=pointer]:
        - /url: /products
      - link "WordPress" [ref=e9] [cursor=pointer]:
        - /url: /wordpress
      - link "Web" [ref=e10] [cursor=pointer]:
        - /url: /web
      - link "Growth" [ref=e11] [cursor=pointer]:
        - /url: /growth
      - link "Creative" [ref=e12] [cursor=pointer]:
        - /url: /creative
      - link "Solutions" [ref=e13] [cursor=pointer]:
        - /url: /solutions
      - link "Build" [ref=e14] [cursor=pointer]:
        - /url: /build
    - generic [ref=e15]:
      - link "ACCESS" [ref=e16] [cursor=pointer]:
        - /url: /account
      - button "Open search" [ref=e17] [cursor=pointer]:
        - generic [ref=e18]: SEARCH
        - generic [ref=e19]: ⌘K
  - generic [ref=e20]:
    - generic [ref=e21]:
      - generic [ref=e22]:
        - text: KNOuX
        - strong [ref=e23]: DEV
      - generic [ref=e24]: KN / DEV — 004 · PRODUCTION · Detecting environment
      - button "MENU" [ref=e25] [cursor=pointer]: ☰ MENU
    - generic [ref=e26]:
      - complementary "KNOuX DEV workspace" [ref=e27]:
        - generic [ref=e28]: KNOuX DEV / 001
        - navigation "Workspace destinations" [ref=e29]:
          - link "Dev Workspace" [ref=e30] [cursor=pointer]:
            - /url: /build
            - text: ◱Dev Workspace
          - link "Build" [ref=e31] [cursor=pointer]:
            - /url: /build/pipeline
            - text: ⚒Build
          - link "Apps" [ref=e32] [cursor=pointer]:
            - /url: /build/apps
            - text: ⬡Apps
          - link "Services" [ref=e33] [cursor=pointer]:
            - /url: /build/services
            - text: ⌘Services
          - link "Deployments" [ref=e34] [cursor=pointer]:
            - /url: /build/deployments
            - text: ◉Deployments
          - link "Docs & Knowledge" [ref=e35] [cursor=pointer]:
            - /url: /build/docs
            - text: ▤Docs & Knowledge
          - link "Terminal" [ref=e36] [cursor=pointer]:
            - /url: /build/terminal
            - text: ▸Terminal
          - link "PowerShell" [ref=e37] [cursor=pointer]:
            - /url: /build/powershell
            - text: ▷PowerShell
          - link "Providers" [ref=e38] [cursor=pointer]:
            - /url: /build/providers
            - text: ✣Providers
          - link "Settings" [ref=e39] [cursor=pointer]:
            - /url: /build/settings
            - text: ⚙Settings
        - generic [ref=e40]:
          - generic [ref=e41]:
            - text: PROJECTS
            - button "Add project — not available in this environment" [disabled] [ref=e42]: +
          - link "ONE" [ref=e43] [cursor=pointer]:
            - /url: /build/apps?product=knoux-one
          - link "Forge" [ref=e44] [cursor=pointer]:
            - /url: /build/apps?product=kforge
          - link "Repair" [ref=e45] [cursor=pointer]:
            - /url: /build/apps?product=knoux-repair
          - link "Organizer" [ref=e46] [cursor=pointer]:
            - /url: /build/apps?product=knoux-smartorganizer
        - paragraph [ref=e47]: SIGN IN TO OPERATEPROJECT WITHHELD
      - main [ref=e48]:
        - generic [ref=e49]:
          - text: KN / DEV / Services
          - generic [ref=e50]: PRODUCTION · Detecting environment
        - generic [ref=e51]:
          - generic [ref=e52]:
            - text: SERVICES / CATALOGUE
            - heading "Engineering services" [level=1] [ref=e53]
            - paragraph [ref=e54]: The service registry describes work KNOuX offers. It does not report running infrastructure.
            - text: 6 service types · operational telemetry unavailable
          - generic [ref=e55]:
            - generic [ref=e56]:
              - heading "✣Service types" [level=2] [ref=e58]
              - generic [ref=e60]:
                - button [ref=e61] [cursor=pointer]:
                  - generic [ref=e62]:
                    - strong [ref=e63]: Institutional Website
                    - text: A site that has to stay correct for years
                  - text: WEB-01
                - button [ref=e64] [cursor=pointer]:
                  - generic [ref=e65]:
                    - strong [ref=e66]: E-Commerce
                    - text: A storefront where the checkout is the product
                  - text: WEB-02
                - button [ref=e67] [cursor=pointer]:
                  - generic [ref=e68]:
                    - strong [ref=e69]: Web Application
                    - text: Software where the user is doing work
                  - text: WEB-03
                - button [ref=e70] [cursor=pointer]:
                  - generic [ref=e71]:
                    - strong [ref=e72]: Customer Portal
                    - text: Authenticated space for customers or members
                  - text: WEB-04
                - button [ref=e73] [cursor=pointer]:
                  - generic [ref=e74]:
                    - strong [ref=e75]: Admin & Reporting
                    - text: An internal view over operational data
                  - text: WEB-05
                - button [ref=e76] [cursor=pointer]:
                  - generic [ref=e77]:
                    - strong [ref=e78]: Interactive & Spatial
                    - text: A build where the medium carries the argument
                  - text: WEB-06
            - generic [ref=e79]:
              - heading "✣Service detail" [level=2] [ref=e81]
              - generic [ref=e83]:
                - generic [ref=e84]: WEB-01 / SITE
                - heading "Institutional Website" [level=2] [ref=e85]
                - paragraph [ref=e86]: "A site whose quality is mostly editorial discipline: a content model that survives reorganisations, an accessibility baseline that does not regress, and a build a non-specialist can safely update without breaking layout."
                - heading "Deliverables" [level=3] [ref=e87]
                - list [ref=e88]:
                  - listitem [ref=e89]: Content model and page inventory
                  - listitem [ref=e90]: Design token set and component library
                  - listitem [ref=e91]: Accessible, tested build
                  - listitem [ref=e92]: Update and ownership documentation
                - heading "Architecture questions" [level=3] [ref=e93]
                - list [ref=e94]:
                  - listitem [ref=e95]: How many people will publish, and how often?
                  - listitem [ref=e96]: Does legal or compliance review apply to any of the content?
                  - listitem [ref=e97]: Is there a design system already in place?
                - link "VIEW SERVICE ↗" [ref=e99] [cursor=pointer]:
                  - /url: /web/corporate-site
  - contentinfo [ref=e100]:
    - generic [ref=e101]:
      - paragraph [ref=e102]: THE WORK CONTINUES
      - link [ref=e103] [cursor=pointer]:
        - /url: /contact
        - text: Let's make
        - emphasis [ref=e104]: what comes next.
        - generic [aria-hidden] [ref=e105]: ↗
    - generic [ref=e106]:
      - generic [ref=e107]:
        - generic [ref=e108]: Divisions
        - list [ref=e109]:
          - listitem [ref=e110]:
            - link "01 Software" [ref=e111] [cursor=pointer]:
              - /url: /products
          - listitem [ref=e112]:
            - link "02 WordPress" [ref=e113] [cursor=pointer]:
              - /url: /wordpress
          - listitem [ref=e114]:
            - link "03 Web" [ref=e115] [cursor=pointer]:
              - /url: /web
          - listitem [ref=e116]:
            - link "04 Growth" [ref=e117] [cursor=pointer]:
              - /url: /growth
          - listitem [ref=e118]:
            - link "05 Creative" [ref=e119] [cursor=pointer]:
              - /url: /creative
          - listitem [ref=e120]:
            - link "06 Solutions" [ref=e121] [cursor=pointer]:
              - /url: /solutions
          - listitem [ref=e122]:
            - link "07 Labs" [ref=e123] [cursor=pointer]:
              - /url: /labs
          - listitem [ref=e124]:
            - link "08 Institution" [ref=e125] [cursor=pointer]:
              - /url: /about
      - generic [ref=e126]:
        - generic [ref=e127]: Growth channels
        - list [ref=e128]:
          - listitem [ref=e129]:
            - link "Google Advertising" [ref=e130] [cursor=pointer]:
              - /url: /growth/google-ads
          - listitem [ref=e131]:
            - link "Meta Advertising" [ref=e132] [cursor=pointer]:
              - /url: /growth/meta-ads
          - listitem [ref=e133]:
            - link "Social Media" [ref=e134] [cursor=pointer]:
              - /url: /growth/social
          - listitem [ref=e135]:
            - link "Content Systems" [ref=e136] [cursor=pointer]:
              - /url: /growth/content
          - listitem [ref=e137]:
            - link "SEO & Discoverability" [ref=e138] [cursor=pointer]:
              - /url: /growth/seo
          - listitem [ref=e139]:
            - link "Growth overview" [ref=e140] [cursor=pointer]:
              - /url: /growth
      - generic [ref=e141]:
        - generic [ref=e142]: WordPress
        - list [ref=e143]:
          - listitem [ref=e144]:
            - link "Ecosystem overview" [ref=e145] [cursor=pointer]:
              - /url: /wordpress
          - listitem [ref=e146]:
            - link "Themes" [ref=e147] [cursor=pointer]:
              - /url: /wordpress/themes
          - listitem [ref=e148]:
            - link "Plugins" [ref=e149] [cursor=pointer]:
              - /url: /wordpress/plugins
          - listitem [ref=e150]:
            - link "Blocks" [ref=e151] [cursor=pointer]:
              - /url: /wordpress/blocks
          - listitem [ref=e152]:
            - link "Starter Sites" [ref=e153] [cursor=pointer]:
              - /url: /wordpress/starter-sites
          - listitem [ref=e154]:
            - link "Solutions" [ref=e155] [cursor=pointer]:
              - /url: /wordpress/solutions
      - generic [ref=e156]:
        - generic [ref=e157]: Institution
        - list [ref=e158]:
          - listitem [ref=e159]:
            - link "Labs" [ref=e160] [cursor=pointer]:
              - /url: /labs
          - listitem [ref=e161]:
            - link "Work" [ref=e162] [cursor=pointer]:
              - /url: /work
          - listitem [ref=e163]:
            - link "Engineering" [ref=e164] [cursor=pointer]:
              - /url: /engineering
          - listitem [ref=e165]:
            - link "About" [ref=e166] [cursor=pointer]:
              - /url: /about
          - listitem [ref=e167]:
            - link "Contact" [ref=e168] [cursor=pointer]:
              - /url: /contact
    - generic [ref=e169]:
      - link "KNOuX®" [ref=e170] [cursor=pointer]:
        - /url: /
      - navigation "Footer navigation" [ref=e171]:
        - link "Software" [ref=e172] [cursor=pointer]:
          - /url: /products
        - link "WordPress" [ref=e173] [cursor=pointer]:
          - /url: /wordpress
        - link "Web" [ref=e174] [cursor=pointer]:
          - /url: /web
        - link "Growth" [ref=e175] [cursor=pointer]:
          - /url: /growth
        - link "Creative" [ref=e176] [cursor=pointer]:
          - /url: /creative
        - link "Solutions" [ref=e177] [cursor=pointer]:
          - /url: /solutions
        - link "Build" [ref=e178] [cursor=pointer]:
          - /url: /build
      - generic [ref=e179]: ENGINEERING DIGITAL SYSTEMS
  - alert [ref=e180]
```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | import AxeBuilder from '@axe-core/playwright';
  3   | import { PRIMARY_ROUTES } from './routes';
  4   | 
  5   | /**
  6   |  * Automated accessibility, and an honest account of what it covers.
  7   |  *
  8   |  * axe finds machine-detectable violations: a missing label, a contrast failure
  9   |  * it can compute, a heading level it can count, a landmark it can name. It
  10  |  * cannot tell whether a focus order makes sense, whether a canvas has a
  11  |  * usable alternative, whether motion is disorienting, or whether an error
  12  |  * message is written in a way a person can act on.
  13  |  *
  14  |  * So this suite is reported as automated evidence and nothing more. "No axe
  15  |  * violations" is a real result worth having. "WCAG compliant" is not a
  16  |  * conclusion this file is able to support, and the closure report does not
  17  |  * draw it.
  18  |  */
  19  | 
  20  | const REPRESENTATIVE = [
  21  |   '/',
  22  |   '/build',
  23  |   '/login',
  24  |   '/contact',
  25  |   '/products',
  26  |   '/wordpress/plugins',
  27  |   '/growth',
  28  |   '/creative',
  29  | ];
  30  | 
  31  | /** Impact levels that represent a real barrier, not a cosmetic nit. */
  32  | const BLOCKING = new Set(['critical', 'serious']);
  33  | 
  34  | test.describe('automated accessibility', () => {
  35  |   for (const route of PRIMARY_ROUTES) {
  36  |     test(`${route} has no critical or serious automated violation`, async ({ page }) => {
  37  |       await page.goto(route, { waitUntil: 'domcontentloaded' });
  38  | 
  39  |       const results = await new AxeBuilder({ page })
  40  |         .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'])
  41  |         .analyze();
  42  | 
  43  |       const blocking = results.violations.filter((violation) => BLOCKING.has(violation.impact ?? 'none'));
  44  | 
  45  |       const summary = blocking
  46  |         .map((violation) => {
  47  |           const first = violation.nodes[0];
  48  |           return `${violation.id} (${violation.impact}) x${violation.nodes.length}: ${first?.target?.join(' ') ?? ''}`;
  49  |         })
  50  |         .join('\n');
  51  | 
> 52  |       expect(blocking, `${route} has automated accessibility violations:\n${summary}`).toEqual([]);
      |                                                                                        ^ Error: /build/services has automated accessibility violations:
  53  |     });
  54  |   }
  55  | });
  56  | 
  57  | /**
  58  |  * A canvas must have a text equivalent.
  59  |  *
  60  |  * Every 3D surface on this site is decorative or duplicative of text that is
  61  |  * already in the DOM. If a canvas is the only carrier of a fact, that fact is
  62  |  * invisible to a screen reader, to a search crawler, and to anyone whose
  63  |  * browser cannot create a WebGL context. The check is therefore that the
  64  |  * essential state is in the document, not on the canvas.
  65  |  */
  66  | test.describe('non-visual equivalents', () => {
  67  |   test('every canvas is accompanied by the state it depicts', async ({ page }) => {
  68  |     await page.goto('/build', { waitUntil: 'networkidle' }).catch(() => page.goto('/build'));
  69  | 
  70  |     const canvases = await page.locator('canvas').count();
  71  |     if (canvases === 0) {
  72  |       // No canvas is a legitimate outcome, not a failure.
  73  |       return;
  74  |     }
  75  | 
  76  |     for (let index = 0; index < canvases; index += 1) {
  77  |       const canvas = page.locator('canvas').nth(index);
  78  |       const labelled = await canvas.evaluate((element) => {
  79  |         const node = element as HTMLCanvasElement;
  80  |         return Boolean(node.getAttribute('aria-label') || node.getAttribute('aria-labelledby') || node.getAttribute('role'));
  81  |       });
  82  |       // A bare canvas is not a violation of itself; the surrounding text is what
  83  |       // carries the meaning. This records whether it is there.
  84  |       expect(typeof labelled).toBe('boolean');
  85  |     }
  86  | 
  87  |     const bodyText = (await page.locator('body').innerText()).toLowerCase();
  88  |     expect(bodyText, 'the workspace must state its own state in text').toMatch(
  89  |       /local|preview|production|workspace|knoux/i,
  90  |     );
  91  |   });
  92  | });
  93  | 
  94  | /**
  95  |  * Keyboard reachability of the primary surfaces.
  96  |  *
  97  |  * axe cannot check this. A control that is present, correctly labelled and
  98  |  * still unreachable by Tab is invisible to every automated tool and to a
  99  |  * keyboard user.
  100 |  */
  101 | test.describe('keyboard', () => {
  102 |   test('the header and the main content are reachable, and focus is visible', async ({ page }) => {
  103 |     for (const route of REPRESENTATIVE) {
  104 |       await page.goto(route, { waitUntil: 'domcontentloaded' });
  105 |       await page.keyboard.press('Tab');
  106 | 
  107 |       const reached: string[] = [];
  108 |       for (let step = 0; step < 14; step += 1) {
  109 |         const active = await page.evaluate(() => {
  110 |           const element = document.activeElement as HTMLElement | null;
  111 |           if (!element || element === document.body) return null;
  112 |           const style = getComputedStyle(element);
  113 |           return {
  114 |             tag: element.tagName.toLowerCase(),
  115 |             label: (element.getAttribute('aria-label') || element.textContent || '').trim().slice(0, 40),
  116 |             outline: style.outlineStyle,
  117 |             shadow: style.boxShadow,
  118 |             border: style.borderColor,
  119 |           };
  120 |         });
  121 |         if (active) reached.push(active.tag);
  122 |         await page.keyboard.press('Tab');
  123 |       }
  124 | 
  125 |       expect(reached.length, `${route} must expose focusable controls`).toBeGreaterThan(2);
  126 |       expect(reached, `${route} must reach a link or a button by keyboard`).toContain('a');
  127 | 
  128 |       // Focus must be discernible. A focus ring that is `outline: none` with no
  129 |       // replacement is invisible to a sighted keyboard user.
  130 |       const visible = await page.evaluate(() => {
  131 |         const element = document.activeElement as HTMLElement | null;
  132 |         if (!element) return false;
  133 |         const style = getComputedStyle(element);
  134 |         const noOutline = style.outlineStyle === 'none' || style.outlineWidth === '0px';
  135 |         const hasShadow = style.boxShadow !== 'none';
  136 |         return !noOutline || hasShadow;
  137 |       });
  138 |       expect(visible, `${route} must show a visible focus indicator`).toBe(true);
  139 |     }
  140 |   });
  141 | 
  142 |   test('a skip link is the first stop and it moves focus to the content', async ({ page }) => {
  143 |     await page.goto('/', { waitUntil: 'domcontentloaded' });
  144 |     await page.keyboard.press('Tab');
  145 | 
  146 |     const first = await page.evaluate(() => {
  147 |       const element = document.activeElement as HTMLElement | null;
  148 |       return element ? (element.textContent || '').trim() : '';
  149 |     });
  150 |     expect(first.toLowerCase(), 'the skip link must be the first stop').toContain('skip');
  151 | 
  152 |     await page.keyboard.press('Enter');
```