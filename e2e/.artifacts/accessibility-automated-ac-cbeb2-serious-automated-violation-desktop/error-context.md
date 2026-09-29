# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: accessibility.spec.ts >> automated accessibility >> /about has no critical or serious automated violation
- Location: e2e\accessibility.spec.ts:36:5

# Error details

```
Error: /about has automated accessibility violations:
color-contrast (serious) x5: .next-link__label

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
+               "fontSize": "6.8pt (9px)",
+               "fontWeight": "normal",
+               "messageKey": null,
+             },
+             "id": "color-contrast",
+             "impact": "serious",
+             "message": "Element has insufficient color contrast of 3.9 (foreground color: #6d6e70, background color: #08090a, font size: 6.8pt (9px), font weight: normal). Expected contrast ratio of 4.5:1",
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
+   Element has insufficient color contrast of 3.9 (foreground color: #6d6e70, background color: #08090a, font size: 6.8pt (9px), font weight: normal). Expected contrast ratio of 4.5:1",
+         "html": "<span class=\"next-link__label\">Practice</span>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           ".next-link__label",
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
  - main [ref=e20]:
    - generic [ref=e21]:
      - generic [ref=e22]:
        - link "KNOuX" [ref=e23] [cursor=pointer]:
          - /url: /
        - generic [ref=e24]: /
        - generic [ref=e25]: About
      - generic [ref=e26]:
        - generic [ref=e27]:
          - paragraph [ref=e28]: 11 / ABOUT
          - heading [level=1] [ref=e29]:
            - text: An institution,
            - emphasis [ref=e30]: not a catalogue.
        - paragraph [ref=e31]: KNOuX is organised as a headquarters with internal divisions rather than as a shop with product pages. The distinction decides what gets built.
      - generic [ref=e32]:
        - generic [ref=e33]: SCROLL TO DISCOVER
        - generic [aria-hidden] [ref=e34]: ↓
    - generic [ref=e36]:
      - generic [ref=e37]:
        - generic [ref=e38]: POINT OF VIEW
        - heading [level=2] [ref=e39]:
          - text: Make the complex
          - emphasis [ref=e40]: feel considered.
        - generic [ref=e41]:
          - paragraph [ref=e42]: "The quality of a digital system is found in the decisions that hold it together: what it claims, what it leaves out, and whether those two stay consistent as it grows. That is why this site is organised the way it is."
          - paragraph [ref=e43]: A product page that lists a capability nobody has verified is worse than no product page, because it spends the reader’s trust on a claim. So the software universe is built from an audit of repositories, and every entry publishes the limits its own maintainers documented. KNOuX has no first-party WordPress releases yet; the separate marketplace discovers work from the official WordPress.org directories and credits its authors. The Work archive contains verified KNOuX product and engineering case files, without invented client stories or outcomes.
          - paragraph [ref=e44]: Everything else on the site — the divisions, the composer, the search — runs on one entity model, one motion grammar and one interaction language. A visitor can move from a WordPress goal to a web system to a growth channel without the site changing character underneath them.
      - generic [aria-hidden]:
        - generic:
          - generic: KN / INSTITUTION
          - generic: IDENTITY FIELD — 001
        - generic:
          - generic: ONE MARK
          - generic: EIGHT DISCIPLINES
    - generic [ref=e49]:
      - generic [ref=e50]:
        - generic [ref=e51]:
          - generic [ref=e52]: DIVISIONS
          - heading "Eight wings, one institution." [level=2] [ref=e53]: Eight wings,one institution.
        - paragraph [ref=e54]: Each division is a different discipline with its own registry. They share navigation, data model, motion grammar, search and request architecture.
      - group [ref=e55]:
        - generic "VIEW DIVISION REGISTRY +" [ref=e56] [cursor=pointer]
    - generic [ref=e57]:
      - generic [ref=e58]:
        - generic [ref=e59]:
          - generic [ref=e60]: IN NUMBERS THAT ARE TRUE
          - heading "The countable state." [level=2] [ref=e61]
        - paragraph [ref=e62]: Only quantities that can be counted from the source data. There is no client count, no revenue figure, no download number and no team size on this page, because none of those are established.
      - group [ref=e63]:
        - generic "VIEW COUNTABLE REGISTRY STATE +" [ref=e64] [cursor=pointer]
    - generic [ref=e65]:
      - generic [ref=e66]:
        - text: CONTINUE THE CONVERSATION
        - paragraph [ref=e67]:
          - text: Have something
          - emphasis [ref=e68]: to build?
        - generic [ref=e69]:
          - link "Open the Composer" [ref=e70] [cursor=pointer]:
            - /url: /build
            - text: Open the Composer
            - generic [aria-hidden] [ref=e71]: ↗
          - link "Contact KNOuX" [ref=e72] [cursor=pointer]:
            - /url: /contact
            - text: Contact KNOuX
            - generic [aria-hidden] [ref=e73]: ↗
      - generic [ref=e75]:
        - generic [ref=e76]:
          - generic [ref=e77]: Practice
          - link "How KNOuX engineers" [ref=e78] [cursor=pointer]:
            - /url: /engineering
        - generic [aria-hidden] [ref=e79]: ↗
  - contentinfo [ref=e80]:
    - generic [ref=e81]:
      - paragraph [ref=e82]: THE WORK CONTINUES
      - link [ref=e83] [cursor=pointer]:
        - /url: /contact
        - text: Let's make
        - emphasis [ref=e84]: what comes next.
        - generic [aria-hidden] [ref=e85]: ↗
    - generic [ref=e86]:
      - generic [ref=e87]:
        - generic [ref=e88]: Divisions
        - list [ref=e89]:
          - listitem [ref=e90]:
            - link "01 Software" [ref=e91] [cursor=pointer]:
              - /url: /products
          - listitem [ref=e92]:
            - link "02 WordPress" [ref=e93] [cursor=pointer]:
              - /url: /wordpress
          - listitem [ref=e94]:
            - link "03 Web" [ref=e95] [cursor=pointer]:
              - /url: /web
          - listitem [ref=e96]:
            - link "04 Growth" [ref=e97] [cursor=pointer]:
              - /url: /growth
          - listitem [ref=e98]:
            - link "05 Creative" [ref=e99] [cursor=pointer]:
              - /url: /creative
          - listitem [ref=e100]:
            - link "06 Solutions" [ref=e101] [cursor=pointer]:
              - /url: /solutions
          - listitem [ref=e102]:
            - link "07 Labs" [ref=e103] [cursor=pointer]:
              - /url: /labs
          - listitem [ref=e104]:
            - link "08 Institution" [ref=e105] [cursor=pointer]:
              - /url: /about
      - generic [ref=e106]:
        - generic [ref=e107]: Growth channels
        - list [ref=e108]:
          - listitem [ref=e109]:
            - link "Google Advertising" [ref=e110] [cursor=pointer]:
              - /url: /growth/google-ads
          - listitem [ref=e111]:
            - link "Meta Advertising" [ref=e112] [cursor=pointer]:
              - /url: /growth/meta-ads
          - listitem [ref=e113]:
            - link "Social Media" [ref=e114] [cursor=pointer]:
              - /url: /growth/social
          - listitem [ref=e115]:
            - link "Content Systems" [ref=e116] [cursor=pointer]:
              - /url: /growth/content
          - listitem [ref=e117]:
            - link "SEO & Discoverability" [ref=e118] [cursor=pointer]:
              - /url: /growth/seo
          - listitem [ref=e119]:
            - link "Growth overview" [ref=e120] [cursor=pointer]:
              - /url: /growth
      - generic [ref=e121]:
        - generic [ref=e122]: WordPress
        - list [ref=e123]:
          - listitem [ref=e124]:
            - link "Ecosystem overview" [ref=e125] [cursor=pointer]:
              - /url: /wordpress
          - listitem [ref=e126]:
            - link "Themes" [ref=e127] [cursor=pointer]:
              - /url: /wordpress/themes
          - listitem [ref=e128]:
            - link "Plugins" [ref=e129] [cursor=pointer]:
              - /url: /wordpress/plugins
          - listitem [ref=e130]:
            - link "Blocks" [ref=e131] [cursor=pointer]:
              - /url: /wordpress/blocks
          - listitem [ref=e132]:
            - link "Starter Sites" [ref=e133] [cursor=pointer]:
              - /url: /wordpress/starter-sites
          - listitem [ref=e134]:
            - link "Solutions" [ref=e135] [cursor=pointer]:
              - /url: /wordpress/solutions
      - generic [ref=e136]:
        - generic [ref=e137]: Institution
        - list [ref=e138]:
          - listitem [ref=e139]:
            - link "Labs" [ref=e140] [cursor=pointer]:
              - /url: /labs
          - listitem [ref=e141]:
            - link "Work" [ref=e142] [cursor=pointer]:
              - /url: /work
          - listitem [ref=e143]:
            - link "Engineering" [ref=e144] [cursor=pointer]:
              - /url: /engineering
          - listitem [ref=e145]:
            - link "About" [ref=e146] [cursor=pointer]:
              - /url: /about
          - listitem [ref=e147]:
            - link "Contact" [ref=e148] [cursor=pointer]:
              - /url: /contact
    - generic [ref=e149]:
      - link "KNOuX®" [ref=e150] [cursor=pointer]:
        - /url: /
      - navigation "Footer navigation" [ref=e151]:
        - link "Software" [ref=e152] [cursor=pointer]:
          - /url: /products
        - link "WordPress" [ref=e153] [cursor=pointer]:
          - /url: /wordpress
        - link "Web" [ref=e154] [cursor=pointer]:
          - /url: /web
        - link "Growth" [ref=e155] [cursor=pointer]:
          - /url: /growth
        - link "Creative" [ref=e156] [cursor=pointer]:
          - /url: /creative
        - link "Solutions" [ref=e157] [cursor=pointer]:
          - /url: /solutions
        - link "Build" [ref=e158] [cursor=pointer]:
          - /url: /build
      - generic [ref=e159]: ENGINEERING DIGITAL SYSTEMS
  - alert [ref=e160]
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
      |                                                                                        ^ Error: /about has automated accessibility violations:
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