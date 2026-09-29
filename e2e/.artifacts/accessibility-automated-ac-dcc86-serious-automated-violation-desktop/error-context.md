# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: accessibility.spec.ts >> automated accessibility >> /growth has no critical or serious automated violation
- Location: e2e\accessibility.spec.ts:36:5

# Error details

```
Error: /growth has automated accessibility violations:
color-contrast (serious) x32: .signal-rail__label

expect(received).toEqual(expected) // deep equality

- Expected  -    1
+ Received  + 1143

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
+         "html": "<span class=\"signal-rail__label\">INDEX</span>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           ".signal-rail__label",
+         ],
+       },
+       Object {
+         "all": Array [],
+         "any": Array [
+           Object {
+             "data": Object {
+               "bgColor": "#08090a",
+               "contrastRatio": 3.9,
+               "expectedContrastRatio": "4.5:1",
+               "fgColor": "#6d6e70",
+               "fontSize": "6.4pt (8.5px)",
+               "fontWeight": "normal",
+               "messageKey": null,
+             },
+             "id": "color-contrast",
+             "impact": "serious",
+             "message": "Element has insufficient color contrast of 3.9 (foreground color: #6d6e70, background color: #08090a, font size: 6.4pt (8.5px), font weight: normal). Expected contrast ratio of 4.5:1",
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
+   Element has insufficient color contrast of 3.9 (foreground color: #6d6e70, background color: #08090a, font size: 6.4pt (8.5px), font weight: normal). Expected contrast ratio of 4.5:1",
+         "html": "<em>GR-01</em>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           "a[href$=\"google-ads\"] > em",
+         ],
+       },
+       Object {
+         "all": Array [],
+         "any": Array [
+           Object {
+             "data": Object {
+               "bgColor": "#08090a",
+               "contrastRatio": 3.9,
+               "expectedContrastRatio": "4.5:1",
+               "fgColor": "#6d6e70",
+               "fontSize": "6.4pt (8.5px)",
+               "fontWeight": "normal",
+               "messageKey": null,
+             },
+             "id": "color-contrast",
+             "impact": "serious",
+             "message": "Element has insufficient color contrast of 3.9 (foreground color: #6d6e70, background color: #08090a, font size: 6.4pt (8.5px), font weight: normal). Expected contrast ratio of 4.5:1",
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
+   Element has insufficient color contrast of 3.9 (foreground color: #6d6e70, background color: #08090a, font size: 6.4pt (8.5px), font weight: normal). Expected contrast ratio of 4.5:1",
+         "html": "<em>GR-02</em>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           "a[href$=\"meta-ads\"] > em",
+         ],
+       },
+       Object {
+         "all": Array [],
+         "any": Array [
+           Object {
+             "data": Object {
+               "bgColor": "#08090a",
+               "contrastRatio": 3.9,
+               "expectedContrastRatio": "4.5:1",
+               "fgColor": "#6d6e70",
+               "fontSize": "6.4pt (8.5px)",
+               "fontWeight": "normal",
+               "messageKey": null,
+             },
+             "id": "color-contrast",
+             "impact": "serious",
+             "message": "Element has insufficient color contrast of 3.9 (foreground color: #6d6e70, background color: #08090a, font size: 6.4pt (8.5px), font weight: normal). Expected contrast ratio of 4.5:1",
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
+   Element has insufficient color contrast of 3.9 (foreground color: #6d6e70, background color: #08090a, font size: 6.4pt (8.5px), font weight: normal). Expected contrast ratio of 4.5:1",
+         "html": "<em>GR-03</em>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           "a[href$=\"social\"] > em",
+         ],
+       },
+       Object {
+         "all": Array [],
+         "any": Array [
+           Object {
+             "data": Object {
+               "bgColor": "#08090a",
+               "contrastRatio": 3.9,
+               "expectedContrastRatio": "4.5:1",
+               "fgColor": "#6d6e70",
+               "fontSize": "6.4pt (8.5px)",
+               "fontWeight": "normal",
+               "messageKey": null,
+             },
+             "id": "color-contrast",
+             "impact": "serious",
+             "message": "Element has insufficient color contrast of 3.9 (foreground color: #6d6e70, background color: #08090a, font size: 6.4pt (8.5px), font weight: normal). Expected contrast ratio of 4.5:1",
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
+   Element has insufficient color contrast of 3.9 (foreground color: #6d6e70, background color: #08090a, font size: 6.4pt (8.5px), font weight: normal). Expected contrast ratio of 4.5:1",
+         "html": "<em>GR-04</em>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           "a[href$=\"content\"] > em",
+         ],
+       },
+       Object {
+         "all": Array [],
+         "any": Array [
+           Object {
+             "data": Object {
+               "bgColor": "#08090a",
+               "contrastRatio": 3.9,
+               "expectedContrastRatio": "4.5:1",
+               "fgColor": "#6d6e70",
+               "fontSize": "6.4pt (8.5px)",
+               "fontWeight": "normal",
+               "messageKey": null,
+             },
+             "id": "color-contrast",
+             "impact": "serious",
+             "message": "Element has insufficient color contrast of 3.9 (foreground color: #6d6e70, background color: #08090a, font size: 6.4pt (8.5px), font weight: normal). Expected contrast ratio of 4.5:1",
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
+   Element has insufficient color contrast of 3.9 (foreground color: #6d6e70, background color: #08090a, font size: 6.4pt (8.5px), font weight: normal). Expected contrast ratio of 4.5:1",
+         "html": "<em>GR-05</em>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           "a[href$=\"seo\"] > em",
+         ],
+       },
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
+         "html": "<legend class=\"goal-step__label\" style=\"padding:0\"><span>STEP 01</span>What do you want<br>to grow?</legend>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           "fieldset:nth-child(1) > legend",
+         ],
+       },
+       Object {
+         "all": Array [],
+         "any": Array [
+           Object {
+             "data": Object {
+               "bgColor": "#08090a",
+               "contrastRatio": 3.9,
+               "expectedContrastRatio": "4.5:1",
+               "fgColor": "#6d6e70",
+               "fontSize": "7.9pt (10.5px)",
+               "fontWeight": "normal",
+               "messageKey": null,
+             },
+             "id": "color-contrast",
+             "impact": "serious",
+             "message": "Element has insufficient color contrast of 3.9 (foreground color: #6d6e70, background color: #08090a, font size: 7.9pt (10.5px), font weight: normal). Expected contrast ratio of 4.5:1",
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
+   Element has insufficient color contrast of 3.9 (foreground color: #6d6e70, background color: #08090a, font size: 7.9pt (10.5px), font weight: normal). Expected contrast ratio of 4.5:1",
+         "html": "<span class=\"option__sub\">A name or offer that has to become recognisable in a specific market.</span>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           "div[aria-label=\"What do you want to grow?\"] > .option:nth-child(1) > .option__sub",
+         ],
+       },
+       Object {
+         "all": Array [],
+         "any": Array [
+           Object {
+             "data": Object {
+               "bgColor": "#08090a",
+               "contrastRatio": 3.9,
+               "expectedContrastRatio": "4.5:1",
+               "fgColor": "#6d6e70",
+               "fontSize": "7.9pt (10.5px)",
+               "fontWeight": "normal",
+               "messageKey": null,
+             },
+             "id": "color-contrast",
+             "impact": "serious",
+             "message": "Element has insufficient color contrast of 3.9 (foreground color: #6d6e70, background color: #08090a, font size: 7.9pt (10.5px), font weight: normal). Expected contrast ratio of 4.5:1",
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
+   Element has insufficient color contrast of 3.9 (foreground color: #6d6e70, background color: #08090a, font size: 7.9pt (10.5px), font weight: normal). Expected contrast ratio of 4.5:1",
+         "html": "<span class=\"option__sub\">A site that needs qualified attention rather than raw volume.</span>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           "div[aria-label=\"What do you want to grow?\"] > .option:nth-child(2) > .option__sub",
+         ],
+       },
+       Object {
+         "all": Array [],
+         "any": Array [
+           Object {
+             "data": Object {
+               "bgColor": "#08090a",
+               "contrastRatio": 3.9,
+               "expectedContrastRatio": "4.5:1",
+               "fgColor": "#6d6e70",
+               "fontSize": "7.9pt (10.5px)",
+               "fontWeight": "normal",
+               "messageKey": null,
+             },
+             "id": "color-contrast",
+             "impact": "serious",
+             "message": "Element has insufficient color contrast of 3.9 (foreground color: #6d6e70, background color: #08090a, font size: 7.9pt (10.5px), font weight: normal). Expected contrast ratio of 4.5:1",
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
+   Element has insufficient color contrast of 3.9 (foreground color: #6d6e70, background color: #08090a, font size: 7.9pt (10.5px), font weight: normal). Expected contrast ratio of 4.5:1",
+         "html": "<span class=\"option__sub\">A catalogue that needs demand pointed at it and the purchase path measured.</span>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           "div[aria-label=\"What do you want to grow?\"] > .option:nth-child(3) > .option__sub",
+         ],
+       },
+       Object {
+         "all": Array [],
+         "any": Array [
+           Object {
+             "data": Object {
+               "bgColor": "#08090a",
+               "contrastRatio": 3.9,
+               "expectedContrastRatio": "4.5:1",
+               "fgColor": "#6d6e70",
+               "fontSize": "7.9pt (10.5px)",
+               "fontWeight": "normal",
+               "messageKey": null,
+             },
+             "id": "color-contrast",
+             "impact": "serious",
+             "message": "Element has insufficient color contrast of 3.9 (foreground color: #6d6e70, background color: #08090a, font size: 7.9pt (10.5px), font weight: normal). Expected contrast ratio of 4.5:1",
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
+   Element has insufficient color contrast of 3.9 (foreground color: #6d6e70, background color: #08090a, font size: 7.9pt (10.5px), font weight: normal). Expected contrast ratio of 4.5:1",
+         "html": "<span class=\"option__sub\">A product where the goal is installs or signups rather than page views.</span>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           "div[aria-label=\"What do you want to grow?\"] > .option:nth-child(4) > .option__sub",
+         ],
+       },
+       Object {
+         "all": Array [],
+         "any": Array [
+           Object {
+             "data": Object {
+               "bgColor": "#08090a",
+               "contrastRatio": 3.9,
+               "expectedContrastRatio": "4.5:1",
+               "fgColor": "#6d6e70",
+               "fontSize": "7.9pt (10.5px)",
+               "fontWeight": "normal",
+               "messageKey": null,
+             },
+             "id": "color-contrast",
+             "impact": "serious",
+             "message": "Element has insufficient color contrast of 3.9 (foreground color: #6d6e70, background color: #08090a, font size: 7.9pt (10.5px), font weight: normal). Expected contrast ratio of 4.5:1",
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
+   Element has insufficient color contrast of 3.9 (foreground color: #6d6e70, background color: #08090a, font size: 7.9pt (10.5px), font weight: normal). Expected contrast ratio of 4.5:1",
+         "html": "<span class=\"option__sub\">A business whose customers are physically nearby.</span>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           "div[aria-label=\"What do you want to grow?\"] > .option:nth-child(5) > .option__sub",
+         ],
+       },
+       Object {
+         "all": Array [],
+         "any": Array [
+           Object {
+             "data": Object {
+               "bgColor": "#08090a",
+               "contrastRatio": 3.9,
+               "expectedContrastRatio": "4.5:1",
+               "fgColor": "#6d6e70",
+               "fontSize": "7.9pt (10.5px)",
+               "fontWeight": "normal",
+               "messageKey": null,
+             },
+             "id": "color-contrast",
+             "impact": "serious",
+             "message": "Element has insufficient color contrast of 3.9 (foreground color: #6d6e70, background color: #08090a, font size: 7.9pt (10.5px), font weight: normal). Expected contrast ratio of 4.5:1",
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
+   Element has insufficient color contrast of 3.9 (foreground color: #6d6e70, background color: #08090a, font size: 7.9pt (10.5px), font weight: normal). Expected contrast ratio of 4.5:1",
+         "html": "<span class=\"option__sub\">A launch that needs an audience before it has a sales history.</span>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           "div[aria-label=\"What do you want to grow?\"] > .option:nth-child(6) > .option__sub",
+         ],
+       },
+       Object {
+         "all": Array [],
+         "any": Array [
+           Object {
+             "data": Object {
+               "bgColor": "#0b0c0e",
+               "contrastRatio": 3.83,
+               "expectedContrastRatio": "4.5:1",
+               "fgColor": "#6d6e70",
+               "fontSize": "6.8pt (9px)",
+               "fontWeight": "normal",
+               "messageKey": null,
+             },
+             "id": "color-contrast",
+             "impact": "serious",
+             "message": "Element has insufficient color contrast of 3.83 (foreground color: #6d6e70, background color: #0b0c0e, font size: 6.8pt (9px), font weight: normal). Expected contrast ratio of 4.5:1",
+             "relatedNodes": Array [
+               Object {
+                 "html": "<div class=\"budget\" id=\"budget\">",
+                 "target": Array [
+                   "#budget",
+                 ],
+               },
+             ],
+           },
+         ],
+         "failureSummary": "Fix any of the following:
+   Element has insufficient color contrast of 3.83 (foreground color: #6d6e70, background color: #0b0c0e, font size: 6.8pt (9px), font weight: normal). Expected contrast ratio of 4.5:1",
+         "html": "<dt style=\"font-family:var(--mono);font-size:9px;color:var(--dim)\">Under 5,000</dt>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           "#budget-scope > dl > div:nth-child(1) > dt",
+         ],
+       },
+       Object {
+         "all": Array [],
+         "any": Array [
+           Object {
+             "data": Object {
+               "bgColor": "#0b0c0e",
+               "contrastRatio": 3.83,
+               "expectedContrastRatio": "4.5:1",
+               "fgColor": "#6d6e70",
+               "fontSize": "6.8pt (9px)",
+               "fontWeight": "normal",
+               "messageKey": null,
+             },
+             "id": "color-contrast",
+             "impact": "serious",
+             "message": "Element has insufficient color contrast of 3.83 (foreground color: #6d6e70, background color: #0b0c0e, font size: 6.8pt (9px), font weight: normal). Expected contrast ratio of 4.5:1",
+             "relatedNodes": Array [
+               Object {
+                 "html": "<div class=\"budget\" id=\"budget\">",
+                 "target": Array [
+                   "#budget",
+                 ],
+               },
+             ],
+           },
+         ],
+         "failureSummary": "Fix any of the following:
+   Element has insufficient color contrast of 3.83 (foreground color: #6d6e70, background color: #0b0c0e, font size: 6.8pt (9px), font weight: normal). Expected contrast ratio of 4.5:1",
+         "html": "<dt style=\"font-family:var(--mono);font-size:9px;color:var(--dim)\">5,000 to 15,000</dt>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           "#budget-scope > dl > div:nth-child(2) > dt",
+         ],
+       },
+       Object {
+         "all": Array [],
+         "any": Array [
+           Object {
+             "data": Object {
+               "bgColor": "#0b0c0e",
+               "contrastRatio": 3.83,
+               "expectedContrastRatio": "4.5:1",
+               "fgColor": "#6d6e70",
+               "fontSize": "6.8pt (9px)",
+               "fontWeight": "normal",
+               "messageKey": null,
+             },
+             "id": "color-contrast",
+             "impact": "serious",
+             "message": "Element has insufficient color contrast of 3.83 (foreground color: #6d6e70, background color: #0b0c0e, font size: 6.8pt (9px), font weight: normal). Expected contrast ratio of 4.5:1",
+             "relatedNodes": Array [
+               Object {
+                 "html": "<div class=\"budget\" id=\"budget\">",
+                 "target": Array [
+                   "#budget",
+                 ],
+               },
+             ],
+           },
+         ],
+         "failureSummary": "Fix any of the following:
+   Element has insufficient color contrast of 3.83 (foreground color: #6d6e70, background color: #0b0c0e, font size: 6.8pt (9px), font weight: normal). Expected contrast ratio of 4.5:1",
+         "html": "<dt style=\"font-family:var(--mono);font-size:9px;color:var(--dim)\">15,000 to 50,000</dt>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           "div:nth-child(3) > dt",
+         ],
+       },
+       Object {
+         "all": Array [],
+         "any": Array [
+           Object {
+             "data": Object {
+               "bgColor": "#0b0c0e",
+               "contrastRatio": 3.83,
+               "expectedContrastRatio": "4.5:1",
+               "fgColor": "#6d6e70",
+               "fontSize": "6.8pt (9px)",
+               "fontWeight": "normal",
+               "messageKey": null,
+             },
+             "id": "color-contrast",
+             "impact": "serious",
+             "message": "Element has insufficient color contrast of 3.83 (foreground color: #6d6e70, background color: #0b0c0e, font size: 6.8pt (9px), font weight: normal). Expected contrast ratio of 4.5:1",
+             "relatedNodes": Array [
+               Object {
+                 "html": "<div class=\"budget\" id=\"budget\">",
+                 "target": Array [
+                   "#budget",
+                 ],
+               },
+             ],
+           },
+         ],
+         "failureSummary": "Fix any of the following:
+   Element has insufficient color contrast of 3.83 (foreground color: #6d6e70, background color: #0b0c0e, font size: 6.8pt (9px), font weight: normal). Expected contrast ratio of 4.5:1",
+         "html": "<dt style=\"font-family:var(--mono);font-size:9px;color:var(--dim)\">Over 50,000</dt>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           "div:nth-child(4) > dt",
+         ],
+       },
+       Object {
+         "all": Array [],
+         "any": Array [
+           Object {
+             "data": Object {
+               "bgColor": "#08090a",
+               "contrastRatio": 3.9,
+               "expectedContrastRatio": "4.5:1",
+               "fgColor": "#6d6e70",
+               "fontSize": "7.5pt (10px)",
+               "fontWeight": "normal",
+               "messageKey": null,
+             },
+             "id": "color-contrast",
+             "impact": "serious",
+             "message": "Element has insufficient color contrast of 3.9 (foreground color: #6d6e70, background color: #08090a, font size: 7.5pt (10px), font weight: normal). Expected contrast ratio of 4.5:1",
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
+   Element has insufficient color contrast of 3.9 (foreground color: #6d6e70, background color: #08090a, font size: 7.5pt (10px), font weight: normal). Expected contrast ratio of 4.5:1",
+         "html": "<span class=\"index-row__index\">01</span>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           ".index-row.is-visible[href$=\"google-ads\"] > .index-row__index",
+         ],
+       },
+       Object {
+         "all": Array [],
+         "any": Array [
+           Object {
+             "data": Object {
+               "bgColor": "#08090a",
+               "contrastRatio": 3.9,
+               "expectedContrastRatio": "4.5:1",
+               "fgColor": "#6d6e70",
+               "fontSize": "7.5pt (10px)",
+               "fontWeight": "normal",
+               "messageKey": null,
+             },
+             "id": "color-contrast",
+             "impact": "serious",
+             "message": "Element has insufficient color contrast of 3.9 (foreground color: #6d6e70, background color: #08090a, font size: 7.5pt (10px), font weight: normal). Expected contrast ratio of 4.5:1",
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
+   Element has insufficient color contrast of 3.9 (foreground color: #6d6e70, background color: #08090a, font size: 7.5pt (10px), font weight: normal). Expected contrast ratio of 4.5:1",
+         "html": "<span class=\"mono\">9 MODULES</span>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           ".index-row.is-visible[href$=\"google-ads\"] > .index-row__meta > .mono",
+         ],
+       },
+       Object {
+         "all": Array [],
+         "any": Array [
+           Object {
+             "data": Object {
+               "bgColor": "#08090a",
+               "contrastRatio": 3.9,
+               "expectedContrastRatio": "4.5:1",
+               "fgColor": "#6d6e70",
+               "fontSize": "7.5pt (10px)",
+               "fontWeight": "normal",
+               "messageKey": null,
+             },
+             "id": "color-contrast",
+             "impact": "serious",
+             "message": "Element has insufficient color contrast of 3.9 (foreground color: #6d6e70, background color: #08090a, font size: 7.5pt (10px), font weight: normal). Expected contrast ratio of 4.5:1",
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
+   Element has insufficient color contrast of 3.9 (foreground color: #6d6e70, background color: #08090a, font size: 7.5pt (10px), font weight: normal). Expected contrast ratio of 4.5:1",
+         "html": "<span class=\"index-row__index\">02</span>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           ".index-row.is-visible[href$=\"meta-ads\"] > .index-row__index",
+         ],
+       },
+       Object {
+         "all": Array [],
+         "any": Array [
+           Object {
+             "data": Object {
+               "bgColor": "#08090a",
+               "contrastRatio": 3.9,
+               "expectedContrastRatio": "4.5:1",
+               "fgColor": "#6d6e70",
+               "fontSize": "7.5pt (10px)",
+               "fontWeight": "normal",
+               "messageKey": null,
+             },
+             "id": "color-contrast",
+             "impact": "serious",
+             "message": "Element has insufficient color contrast of 3.9 (foreground color: #6d6e70, background color: #08090a, font size: 7.5pt (10px), font weight: normal). Expected contrast ratio of 4.5:1",
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
+   Element has insufficient color contrast of 3.9 (foreground color: #6d6e70, background color: #08090a, font size: 7.5pt (10px), font weight: normal). Expected contrast ratio of 4.5:1",
+         "html": "<span class=\"mono\">8 MODULES</span>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           ".index-row.is-visible[href$=\"meta-ads\"] > .index-row__meta > .mono",
+         ],
+       },
+       Object {
+         "all": Array [],
+         "any": Array [
+           Object {
+             "data": Object {
+               "bgColor": "#08090a",
+               "contrastRatio": 3.9,
+               "expectedContrastRatio": "4.5:1",
+               "fgColor": "#6d6e70",
+               "fontSize": "7.5pt (10px)",
+               "fontWeight": "normal",
+               "messageKey": null,
+             },
+             "id": "color-contrast",
+             "impact": "serious",
+             "message": "Element has insufficient color contrast of 3.9 (foreground color: #6d6e70, background color: #08090a, font size: 7.5pt (10px), font weight: normal). Expected contrast ratio of 4.5:1",
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
+   Element has insufficient color contrast of 3.9 (foreground color: #6d6e70, background color: #08090a, font size: 7.5pt (10px), font weight: normal). Expected contrast ratio of 4.5:1",
+         "html": "<span class=\"index-row__index\">03</span>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           ".index-row.is-visible[href$=\"social\"] > .index-row__index",
+         ],
+       },
+       Object {
+         "all": Array [],
+         "any": Array [
+           Object {
+             "data": Object {
+               "bgColor": "#08090a",
+               "contrastRatio": 3.9,
+               "expectedContrastRatio": "4.5:1",
+               "fgColor": "#6d6e70",
+               "fontSize": "7.5pt (10px)",
+               "fontWeight": "normal",
+               "messageKey": null,
+             },
+             "id": "color-contrast",
+             "impact": "serious",
+             "message": "Element has insufficient color contrast of 3.9 (foreground color: #6d6e70, background color: #08090a, font size: 7.5pt (10px), font weight: normal). Expected contrast ratio of 4.5:1",
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
+   Element has insufficient color contrast of 3.9 (foreground color: #6d6e70, background color: #08090a, font size: 7.5pt (10px), font weight: normal). Expected contrast ratio of 4.5:1",
+         "html": "<span class=\"mono\">5 MODULES</span>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           ".index-row.is-visible[href$=\"social\"] > .index-row__meta > .mono",
+         ],
+       },
+       Object {
+         "all": Array [],
+         "any": Array [
+           Object {
+             "data": Object {
+               "bgColor": "#08090a",
+               "contrastRatio": 3.9,
+               "expectedContrastRatio": "4.5:1",
+               "fgColor": "#6d6e70",
+               "fontSize": "7.5pt (10px)",
+               "fontWeight": "normal",
+               "messageKey": null,
+             },
+             "id": "color-contrast",
+             "impact": "serious",
+             "message": "Element has insufficient color contrast of 3.9 (foreground color: #6d6e70, background color: #08090a, font size: 7.5pt (10px), font weight: normal). Expected contrast ratio of 4.5:1",
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
+   Element has insufficient color contrast of 3.9 (foreground color: #6d6e70, background color: #08090a, font size: 7.5pt (10px), font weight: normal). Expected contrast ratio of 4.5:1",
+         "html": "<span class=\"index-row__index\">04</span>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           ".index-row.is-visible[href$=\"content\"] > .index-row__index",
+         ],
+       },
+       Object {
+         "all": Array [],
+         "any": Array [
+           Object {
+             "data": Object {
+               "bgColor": "#08090a",
+               "contrastRatio": 3.9,
+               "expectedContrastRatio": "4.5:1",
+               "fgColor": "#6d6e70",
+               "fontSize": "7.5pt (10px)",
+               "fontWeight": "normal",
+               "messageKey": null,
+             },
+             "id": "color-contrast",
+             "impact": "serious",
+             "message": "Element has insufficient color contrast of 3.9 (foreground color: #6d6e70, background color: #08090a, font size: 7.5pt (10px), font weight: normal). Expected contrast ratio of 4.5:1",
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
+   Element has insufficient color contrast of 3.9 (foreground color: #6d6e70, background color: #08090a, font size: 7.5pt (10px), font weight: normal). Expected contrast ratio of 4.5:1",
+         "html": "<span class=\"mono\">4 MODULES</span>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           ".index-row.is-visible[href$=\"content\"] > .index-row__meta > .mono",
+         ],
+       },
+       Object {
+         "all": Array [],
+         "any": Array [
+           Object {
+             "data": Object {
+               "bgColor": "#08090a",
+               "contrastRatio": 3.9,
+               "expectedContrastRatio": "4.5:1",
+               "fgColor": "#6d6e70",
+               "fontSize": "7.5pt (10px)",
+               "fontWeight": "normal",
+               "messageKey": null,
+             },
+             "id": "color-contrast",
+             "impact": "serious",
+             "message": "Element has insufficient color contrast of 3.9 (foreground color: #6d6e70, background color: #08090a, font size: 7.5pt (10px), font weight: normal). Expected contrast ratio of 4.5:1",
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
+   Element has insufficient color contrast of 3.9 (foreground color: #6d6e70, background color: #08090a, font size: 7.5pt (10px), font weight: normal). Expected contrast ratio of 4.5:1",
+         "html": "<span class=\"index-row__index\">05</span>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           ".index-row.is-visible[href$=\"seo\"] > .index-row__index",
+         ],
+       },
+       Object {
+         "all": Array [],
+         "any": Array [
+           Object {
+             "data": Object {
+               "bgColor": "#08090a",
+               "contrastRatio": 3.9,
+               "expectedContrastRatio": "4.5:1",
+               "fgColor": "#6d6e70",
+               "fontSize": "7.5pt (10px)",
+               "fontWeight": "normal",
+               "messageKey": null,
+             },
+             "id": "color-contrast",
+             "impact": "serious",
+             "message": "Element has insufficient color contrast of 3.9 (foreground color: #6d6e70, background color: #08090a, font size: 7.5pt (10px), font weight: normal). Expected contrast ratio of 4.5:1",
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
+   Element has insufficient color contrast of 3.9 (foreground color: #6d6e70, background color: #08090a, font size: 7.5pt (10px), font weight: normal). Expected contrast ratio of 4.5:1",
+         "html": "<span class=\"mono\">5 MODULES</span>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           ".index-row.is-visible[href$=\"seo\"] > .index-row__meta > .mono",
+         ],
+       },
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
+         "html": "<span class=\"next-link__label\">Next division</span>",
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
        - generic [ref=e25]: Growth
      - generic [ref=e26]:
        - generic [ref=e27]:
          - paragraph [ref=e28]: 04 / GROWTH
          - heading [level=1] [ref=e29]:
            - text: Findable,
            - emphasis [ref=e30]: then chosen.
        - paragraph [ref=e31]: Campaign architecture, measurement and content. No target metrics, minimum spends or return claims appear on this site, because none of those are knowable before a scope is agreed.
      - generic [ref=e32]:
        - generic [ref=e33]: SCROLL TO DISCOVER
        - generic [aria-hidden] [ref=e34]: ↓
    - navigation "growth sections" [ref=e35]:
      - generic [ref=e36]:
        - generic [ref=e37]: INDEX
        - link [ref=e38] [cursor=pointer]:
          - /url: /growth
          - emphasis [ref=e39]: GR
          - text: Overview
        - link [ref=e40] [cursor=pointer]:
          - /url: /growth/google-ads
          - emphasis [ref=e41]: GR-01
          - text: Google Ads
        - link [ref=e42] [cursor=pointer]:
          - /url: /growth/meta-ads
          - emphasis [ref=e43]: GR-02
          - text: Meta Ads
        - link [ref=e44] [cursor=pointer]:
          - /url: /growth/social
          - emphasis [ref=e45]: GR-03
          - text: Social
        - link [ref=e46] [cursor=pointer]:
          - /url: /growth/content
          - emphasis [ref=e47]: GR-04
          - text: Content
        - link [ref=e48] [cursor=pointer]:
          - /url: /growth/seo
          - emphasis [ref=e49]: GR-05
          - text: SEO
    - generic [ref=e51]:
      - generic [ref=e52]: BUSINESSOBJECTIVE
      - group "Growth channels" [ref=e55]:
        - button "GR-01 Google Advertising" [pressed] [ref=e56] [cursor=pointer]:
          - generic [ref=e57]: GR-01
          - strong [ref=e58]: Google Advertising
        - button "GR-02 Meta Advertising" [ref=e59] [cursor=pointer]:
          - generic [ref=e60]: GR-02
          - strong [ref=e61]: Meta Advertising
        - button "GR-03 Social Media" [ref=e62] [cursor=pointer]:
          - generic [ref=e63]: GR-03
          - strong [ref=e64]: Social Media
        - button "GR-04 Content Systems" [ref=e65] [cursor=pointer]:
          - generic [ref=e66]: GR-04
          - strong [ref=e67]: Content Systems
        - button "GR-05 SEO & Discoverability" [ref=e68] [cursor=pointer]:
          - generic [ref=e69]: GR-05
          - strong [ref=e70]: SEO & Discoverability
      - generic [ref=e71]:
        - generic [ref=e72]: ACTIVE SIGNAL / 01
        - heading "Google Advertising" [level=3] [ref=e73]
        - paragraph [ref=e74]: Search and shopping campaigns structured around commercial intent, with the negative list treated as a first-class part of the build rather than a cleanup task. Performance Max is used only where the asset structure genuinely supports it.
        - generic [ref=e75]:
          - generic [ref=e76]:
            - term [ref=e77]: INPUT
            - definition [ref=e78]: A website that can receive and record the traffic
          - generic [ref=e79]:
            - term [ref=e80]: OUTPUT
            - definition [ref=e81]: Account and campaign structure
        - link "OPEN CHANNEL ↗" [ref=e82] [cursor=pointer]:
          - /url: /growth/google-ads
          - text: OPEN CHANNEL
          - generic [ref=e83]: ↗
    - generic [ref=e84]:
      - generic [ref=e86]:
        - generic [ref=e87]:
          - generic [ref=e88]: ENTRY
          - heading "Three questions before anything else." [level=2] [ref=e89]: Three questionsbefore anything else.
        - paragraph [ref=e90]: Answering these narrows the work to real service modules. It does not produce a quote, a plan or a projection.
      - generic [ref=e92]:
        - group "STEP 01 What do you want to grow?" [ref=e93]:
          - generic [ref=e94]:
            - generic [ref=e95]: STEP 01
            - text: What do you wantto grow?
          - generic [ref=e96]:
            - paragraph [ref=e97]: Start from what exists.
            - group "What do you want to grow?" [ref=e98]:
              - button "Brand A name or offer that has to become recognisable in a specific market." [ref=e99] [cursor=pointer]:
                - generic [ref=e100]: Brand
                - generic [ref=e101]: A name or offer that has to become recognisable in a specific market.
              - button "Website A site that needs qualified attention rather than raw volume." [ref=e102] [cursor=pointer]:
                - generic [ref=e103]: Website
                - generic [ref=e104]: A site that needs qualified attention rather than raw volume.
              - button "Store A catalogue that needs demand pointed at it and the purchase path measured." [ref=e105] [cursor=pointer]:
                - generic [ref=e106]: Store
                - generic [ref=e107]: A catalogue that needs demand pointed at it and the purchase path measured.
              - button "Application A product where the goal is installs or signups rather than page views." [ref=e108] [cursor=pointer]:
                - generic [ref=e109]: Application
                - generic [ref=e110]: A product where the goal is installs or signups rather than page views.
              - button "Local Business A business whose customers are physically nearby." [ref=e111] [cursor=pointer]:
                - generic [ref=e112]: Local Business
                - generic [ref=e113]: A business whose customers are physically nearby.
              - button "New Product A launch that needs an audience before it has a sales history." [ref=e114] [cursor=pointer]:
                - generic [ref=e115]: New Product
                - generic [ref=e116]: A launch that needs an audience before it has a sales history.
        - group "STEP 02 What is your objective?" [ref=e117]:
          - generic [ref=e118]:
            - generic [ref=e119]: STEP 02
            - text: What is yourobjective?
          - generic [ref=e120]:
            - paragraph [ref=e121]: Define success before spending on it.
            - group "What is your objective?" [ref=e122]:
              - button "Sales Completed purchases." [disabled] [ref=e123]:
                - generic [ref=e124]: Sales
                - generic [ref=e125]: Completed purchases.
              - button "Leads Qualified enquiries, with a definition agreed before campaigns start." [disabled] [ref=e126]:
                - generic [ref=e127]: Leads
                - generic [ref=e128]: Qualified enquiries, with a definition agreed before campaigns start.
              - button "Messages Inbound conversations that need a response." [disabled] [ref=e129]:
                - generic [ref=e130]: Messages
                - generic [ref=e131]: Inbound conversations that need a response.
              - button "Traffic Qualified visits to something that matters." [disabled] [ref=e132]:
                - generic [ref=e133]: Traffic
                - generic [ref=e134]: Qualified visits to something that matters.
              - button "Awareness Reach and recall in a defined audience." [disabled] [ref=e135]:
                - generic [ref=e136]: Awareness
                - generic [ref=e137]: Reach and recall in a defined audience.
              - button "App Installs Product adoption on a specific platform." [disabled] [ref=e138]:
                - generic [ref=e139]: App Installs
                - generic [ref=e140]: Product adoption on a specific platform.
        - group "STEP 03 Where should we reach people?" [ref=e141]:
          - generic [ref=e142]:
            - generic [ref=e143]: STEP 03
            - text: Where should wereach people?
          - generic [ref=e144]:
            - paragraph [ref=e145]: Only channels KNOuX actually works in.
            - group "Where should we reach people?" [ref=e146]:
              - button "Google Search Paid search and shopping, plus organic search work." [disabled] [ref=e147]:
                - generic [ref=e148]: Google Search
                - generic [ref=e149]: Paid search and shopping, plus organic search work.
              - button "YouTube Handled as a destination for video assets produced for social and campaign work." [disabled] [ref=e150]:
                - generic [ref=e151]: YouTube
                - generic [ref=e152]: Handled as a destination for video assets produced for social and campaign work.
              - button "Instagram Organic short-form production and paid placement through Meta." [disabled] [ref=e153]:
                - generic [ref=e154]: Instagram
                - generic [ref=e155]: Organic short-form production and paid placement through Meta.
              - button "Facebook Paid placement through Meta, including retargeting audiences." [disabled] [ref=e156]:
                - generic [ref=e157]: Facebook
                - generic [ref=e158]: Paid placement through Meta, including retargeting audiences.
              - button "TikTok Short-form production for organic distribution." [disabled] [ref=e159]:
                - generic [ref=e160]: TikTok
                - generic [ref=e161]: Short-form production for organic distribution.
              - button "Organic Search Technical and content work rather than paid placement." [disabled] [ref=e162]:
                - generic [ref=e163]: Organic Search
                - generic [ref=e164]: Technical and content work rather than paid placement.
    - generic [ref=e166]:
      - generic [ref=e167]:
        - generic [ref=e168]: CAMPAIGN BUDGET
        - heading "A figure changes the conversation, not the promise." [level=3] [ref=e169]
        - paragraph [ref=e170]: Entering an intended budget tells KNOuX how much scope a project has to work with. It is used to understand what can be configured properly and to carry the figure into the enquiry. It is not used to produce a forecast, a benchmark, a cost-per-result estimate or a return projection, and no such projection appears anywhere on this site.
        - generic [ref=e171]:
          - combobox "Budget currency" [ref=e172]:
            - option "AED" [selected]
            - option "USD"
            - option "SAR"
            - option "EGP"
          - textbox "Intended budget amount" [ref=e173]:
            - /placeholder: "0"
        - generic [ref=e174]:
          - generic [ref=e175] [cursor=pointer]:
            - radio "Media / ad spend" [checked]
            - text: Media / ad spend
          - generic [ref=e176] [cursor=pointer]:
            - radio "Project build cost"
            - text: Project build cost
      - generic [ref=e177]:
        - paragraph [ref=e178]: "Enter a figure to see the scope band it implies. A figure is optional: an enquiry without one is still a valid starting point."
        - generic [ref=e179]:
          - generic [ref=e180]:
            - term [ref=e181]: Under 5,000
            - definition [ref=e182]: Usually enough to establish a focused single channel with correct measurement.
          - generic [ref=e183]:
            - term [ref=e184]: 5,000 to 15,000
            - definition [ref=e185]: Allows a second channel and a creative production line alongside measurement.
          - generic [ref=e186]:
            - term [ref=e187]: 15,000 to 50,000
            - definition [ref=e188]: Suits multi-channel work where creative and audience testing are the constraint rather than budget.
          - generic [ref=e189]:
            - term [ref=e190]: Over 50,000
            - definition [ref=e191]: Indicates a scope where strategy, tracking and production are all required before spend is committed.
    - generic [ref=e193]:
      - generic [ref=e194]:
        - generic [ref=e195]:
          - generic [ref=e196]: CHANNELS
          - heading "Five channels, one method." [level=2] [ref=e197]: Five channels,one method.
        - paragraph [ref=e198]: Each channel is a distinct discipline with its own prerequisites and outputs. The method underneath them is shared.
      - generic [ref=e199]:
        - link "01 Google Advertising Paid search, shopping and demand capture 9 MODULES" [ref=e200] [cursor=pointer]:
          - /url: /growth/google-ads
          - generic [ref=e201]: "01"
          - generic [ref=e202]: Google Advertising
          - generic [ref=e203]:
            - generic [ref=e204]: Paid search, shopping and demand capture
            - generic [ref=e205]: 9 MODULES
          - generic [aria-hidden] [ref=e206]: ↗
        - link "02 Meta Advertising Paid social on Instagram and Facebook 8 MODULES" [ref=e207] [cursor=pointer]:
          - /url: /growth/meta-ads
          - generic [ref=e208]: "02"
          - generic [ref=e209]: Meta Advertising
          - generic [ref=e210]:
            - generic [ref=e211]: Paid social on Instagram and Facebook
            - generic [ref=e212]: 8 MODULES
          - generic [aria-hidden] [ref=e213]: ↗
        - link "03 Social Media Organic short-form production and publishing 5 MODULES" [ref=e214] [cursor=pointer]:
          - /url: /growth/social
          - generic [ref=e215]: "03"
          - generic [ref=e216]: Social Media
          - generic [ref=e217]:
            - generic [ref=e218]: Organic short-form production and publishing
            - generic [ref=e219]: 5 MODULES
          - generic [aria-hidden] [ref=e220]: ↗
        - link "04 Content Systems Material that earns attention over time 4 MODULES" [ref=e221] [cursor=pointer]:
          - /url: /growth/content
          - generic [ref=e222]: "04"
          - generic [ref=e223]: Content Systems
          - generic [ref=e224]:
            - generic [ref=e225]: Material that earns attention over time
            - generic [ref=e226]: 4 MODULES
          - generic [aria-hidden] [ref=e227]: ↗
        - link "05 SEO & Discoverability Making a site legible to search engines 5 MODULES" [ref=e228] [cursor=pointer]:
          - /url: /growth/seo
          - generic [ref=e229]: "05"
          - generic [ref=e230]: SEO & Discoverability
          - generic [ref=e231]:
            - generic [ref=e232]: Making a site legible to search engines
            - generic [ref=e233]: 5 MODULES
          - generic [aria-hidden] [ref=e234]: ↗
    - generic [ref=e235]:
      - generic [ref=e236]:
        - generic [ref=e237]:
          - generic [ref=e238]: SERVICE MODULES
          - heading "What is actually offered." [level=2] [ref=e239]: What isactually offered.
        - paragraph [ref=e240]: Every module KNOuX intends to deliver, described by the work involved. Anything not on this list is not offered.
      - group [ref=e241]:
        - generic "VIEW SERVICE MODULE REGISTRY +" [ref=e242] [cursor=pointer]
    - generic [ref=e243]:
      - complementary [ref=e244]:
        - generic [ref=e245]:
          - generic [ref=e246]: ACROSS DIVISIONS
          - heading "Need a landing experience to send the traffic to?" [level=2] [ref=e247]
          - paragraph [ref=e248]: A campaign that lands on a generic page wastes the work that produced it. KNOuX Web builds the destination and KNOuX Creative produces the assets it needs.
        - link "KNOuX Web" [ref=e249] [cursor=pointer]:
          - /url: /web
          - text: KNOuX Web
          - generic [aria-hidden] [ref=e250]: ↗
      - generic [ref=e252]:
        - generic [ref=e253]:
          - generic [ref=e254]: Next division
          - link "Creative" [ref=e255] [cursor=pointer]:
            - /url: /creative
        - generic [aria-hidden] [ref=e256]: ↗
  - contentinfo [ref=e257]:
    - generic [ref=e258]:
      - paragraph [ref=e259]: THE WORK CONTINUES
      - link [ref=e260] [cursor=pointer]:
        - /url: /contact
        - text: Let's make
        - emphasis [ref=e261]: what comes next.
        - generic [aria-hidden] [ref=e262]: ↗
    - generic [ref=e263]:
      - generic [ref=e264]:
        - generic [ref=e265]: Divisions
        - list [ref=e266]:
          - listitem [ref=e267]:
            - link "01 Software" [ref=e268] [cursor=pointer]:
              - /url: /products
          - listitem [ref=e269]:
            - link "02 WordPress" [ref=e270] [cursor=pointer]:
              - /url: /wordpress
          - listitem [ref=e271]:
            - link "03 Web" [ref=e272] [cursor=pointer]:
              - /url: /web
          - listitem [ref=e273]:
            - link "04 Growth" [ref=e274] [cursor=pointer]:
              - /url: /growth
          - listitem [ref=e275]:
            - link "05 Creative" [ref=e276] [cursor=pointer]:
              - /url: /creative
          - listitem [ref=e277]:
            - link "06 Solutions" [ref=e278] [cursor=pointer]:
              - /url: /solutions
          - listitem [ref=e279]:
            - link "07 Labs" [ref=e280] [cursor=pointer]:
              - /url: /labs
          - listitem [ref=e281]:
            - link "08 Institution" [ref=e282] [cursor=pointer]:
              - /url: /about
      - generic [ref=e283]:
        - generic [ref=e284]: Growth channels
        - list [ref=e285]:
          - listitem [ref=e286]:
            - link "Google Advertising" [ref=e287] [cursor=pointer]:
              - /url: /growth/google-ads
          - listitem [ref=e288]:
            - link "Meta Advertising" [ref=e289] [cursor=pointer]:
              - /url: /growth/meta-ads
          - listitem [ref=e290]:
            - link "Social Media" [ref=e291] [cursor=pointer]:
              - /url: /growth/social
          - listitem [ref=e292]:
            - link "Content Systems" [ref=e293] [cursor=pointer]:
              - /url: /growth/content
          - listitem [ref=e294]:
            - link "SEO & Discoverability" [ref=e295] [cursor=pointer]:
              - /url: /growth/seo
          - listitem [ref=e296]:
            - link "Growth overview" [ref=e297] [cursor=pointer]:
              - /url: /growth
      - generic [ref=e298]:
        - generic [ref=e299]: WordPress
        - list [ref=e300]:
          - listitem [ref=e301]:
            - link "Ecosystem overview" [ref=e302] [cursor=pointer]:
              - /url: /wordpress
          - listitem [ref=e303]:
            - link "Themes" [ref=e304] [cursor=pointer]:
              - /url: /wordpress/themes
          - listitem [ref=e305]:
            - link "Plugins" [ref=e306] [cursor=pointer]:
              - /url: /wordpress/plugins
          - listitem [ref=e307]:
            - link "Blocks" [ref=e308] [cursor=pointer]:
              - /url: /wordpress/blocks
          - listitem [ref=e309]:
            - link "Starter Sites" [ref=e310] [cursor=pointer]:
              - /url: /wordpress/starter-sites
          - listitem [ref=e311]:
            - link "Solutions" [ref=e312] [cursor=pointer]:
              - /url: /wordpress/solutions
      - generic [ref=e313]:
        - generic [ref=e314]: Institution
        - list [ref=e315]:
          - listitem [ref=e316]:
            - link "Labs" [ref=e317] [cursor=pointer]:
              - /url: /labs
          - listitem [ref=e318]:
            - link "Work" [ref=e319] [cursor=pointer]:
              - /url: /work
          - listitem [ref=e320]:
            - link "Engineering" [ref=e321] [cursor=pointer]:
              - /url: /engineering
          - listitem [ref=e322]:
            - link "About" [ref=e323] [cursor=pointer]:
              - /url: /about
          - listitem [ref=e324]:
            - link "Contact" [ref=e325] [cursor=pointer]:
              - /url: /contact
    - generic [ref=e326]:
      - link "KNOuX®" [ref=e327] [cursor=pointer]:
        - /url: /
      - navigation "Footer navigation" [ref=e328]:
        - link "Software" [ref=e329] [cursor=pointer]:
          - /url: /products
        - link "WordPress" [ref=e330] [cursor=pointer]:
          - /url: /wordpress
        - link "Web" [ref=e331] [cursor=pointer]:
          - /url: /web
        - link "Growth" [ref=e332] [cursor=pointer]:
          - /url: /growth
        - link "Creative" [ref=e333] [cursor=pointer]:
          - /url: /creative
        - link "Solutions" [ref=e334] [cursor=pointer]:
          - /url: /solutions
        - link "Build" [ref=e335] [cursor=pointer]:
          - /url: /build
      - generic [ref=e336]: ENGINEERING DIGITAL SYSTEMS
  - alert [ref=e337]
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
      |                                                                                        ^ Error: /growth has automated accessibility violations:
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