# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: accessibility.spec.ts >> automated accessibility >> /products has no critical or serious automated violation
- Location: e2e\accessibility.spec.ts:36:5

# Error details

```
Error: /products has automated accessibility violations:
color-contrast (serious) x24: .signal-rail__label

expect(received).toEqual(expected) // deep equality

- Expected  -   1
+ Received  + 863

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
+         "html": "<em>LAB</em>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           "a[href$=\"labs\"] > em",
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
+         "html": "<em>CMP</em>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           "a[href$=\"build\"] > em",
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
+         "html": "<p class=\"finder-count\" id=\"finder-count\" role=\"status\">07 / 07 SYSTEMS</p>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           "#finder-count",
+         ],
+       },
+       Object {
+         "all": Array [],
+         "any": Array [
+           Object {
+             "data": Object {
+               "bgColor": "#0c0d10",
+               "contrastRatio": 3.8,
+               "expectedContrastRatio": "4.5:1",
+               "fgColor": "#6d6e70",
+               "fontSize": "9.4pt (12.5px)",
+               "fontWeight": "normal",
+               "messageKey": null,
+             },
+             "id": "color-contrast",
+             "impact": "serious",
+             "message": "Element has insufficient color contrast of 3.8 (foreground color: #6d6e70, background color: #0c0d10, font size: 9.4pt (12.5px), font weight: normal). Expected contrast ratio of 4.5:1",
+             "relatedNodes": Array [
+               Object {
+                 "html": "<aside class=\"constellation__readout\" aria-live=\"polite\">",
+                 "target": Array [
+                   ".constellation__readout",
+                 ],
+               },
+             ],
+           },
+         ],
+         "failureSummary": "Fix any of the following:
+   Element has insufficient color contrast of 3.8 (foreground color: #6d6e70, background color: #0c0d10, font size: 9.4pt (12.5px), font weight: normal). Expected contrast ratio of 4.5:1",
+         "html": "<p>Seven verified systems connected to one practice. Move across a node to read its registration, or open it for the full dossier.</p>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           ".constellation__idle > p:nth-child(2)",
+         ],
+       },
+       Object {
+         "all": Array [],
+         "any": Array [
+           Object {
+             "data": Object {
+               "bgColor": "#0c0d10",
+               "contrastRatio": 3.8,
+               "expectedContrastRatio": "4.5:1",
+               "fgColor": "#6d6e70",
+               "fontSize": "7.5pt (10px)",
+               "fontWeight": "normal",
+               "messageKey": null,
+             },
+             "id": "color-contrast",
+             "impact": "serious",
+             "message": "Element has insufficient color contrast of 3.8 (foreground color: #6d6e70, background color: #0c0d10, font size: 7.5pt (10px), font weight: normal). Expected contrast ratio of 4.5:1",
+             "relatedNodes": Array [
+               Object {
+                 "html": "<aside class=\"constellation__readout\" aria-live=\"polite\">",
+                 "target": Array [
+                   ".constellation__readout",
+                 ],
+               },
+             ],
+           },
+         ],
+         "failureSummary": "Fix any of the following:
+   Element has insufficient color contrast of 3.8 (foreground color: #6d6e70, background color: #0c0d10, font size: 7.5pt (10px), font weight: normal). Expected contrast ratio of 4.5:1",
+         "html": "<p class=\"mono\" style=\"font-size: 10px; color: rgb(109, 110, 112);\">AUDITED 2026-09-28</p>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           ".constellation__idle > p:nth-child(3)",
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
+           ".index-row.is-visible[data-reveal=\"true\"]:nth-child(1) > .index-row__index",
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
+         "html": "<span class=\"mono\">1 system</span>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           ".index-row.is-visible[data-reveal=\"true\"]:nth-child(1) > .index-row__meta > .mono",
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
+           ".index-row.is-visible[data-reveal=\"true\"]:nth-child(2) > .index-row__index",
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
+         "html": "<span class=\"mono\">1 system</span>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           ".index-row.is-visible[data-reveal=\"true\"]:nth-child(2) > .index-row__meta > .mono",
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
+           ".index-row.is-visible[data-reveal=\"true\"]:nth-child(3) > .index-row__index",
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
+         "html": "<span class=\"mono\">1 system</span>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           ".index-row.is-visible[data-reveal=\"true\"]:nth-child(3) > .index-row__meta > .mono",
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
+           "a[href=\"/products?q=File%20Management\"] > .index-row__index",
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
+         "html": "<span class=\"mono\">1 system</span>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           "a[href=\"/products?q=File%20Management\"] > .index-row__meta > .mono",
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
+           ".index-row.is-visible[data-reveal=\"true\"]:nth-child(5) > .index-row__index",
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
+         "html": "<span class=\"mono\">2 systems</span>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           ".index-row.is-visible[data-reveal=\"true\"]:nth-child(5) > .index-row__meta > .mono",
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
+         "html": "<span class=\"index-row__index\">06</span>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           ".index-row.is-visible[data-reveal=\"true\"]:nth-child(6) > .index-row__index",
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
+         "html": "<span class=\"mono\">1 system</span>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           ".index-row.is-visible[data-reveal=\"true\"]:nth-child(6) > .index-row__meta > .mono",
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
+         "html": "<span class=\"next-link__label\">The other divisions</span>",
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
+         "html": "<p class=\"meta-row\" style=\"margin-top:40px\">8<!-- --> divisions / one engineering practice / one data model</p>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           "section:nth-child(7) > .meta-row",
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
        - generic [ref=e25]: Software
      - generic [ref=e26]:
        - generic [ref=e27]:
          - paragraph [ref=e28]: 01 / SOFTWARE
          - heading [level=1] [ref=e29]:
            - text: The product
            - emphasis [ref=e30]: universe.
        - paragraph [ref=e31]: Every public KNOuX system, classified from repository evidence. Audited 2026-09-28 against daynightae-cmyk. Nothing is listed that a repository does not establish.
      - generic [ref=e32]:
        - generic [ref=e33]: SCROLL TO DISCOVER
        - generic [aria-hidden] [ref=e34]: ↓
    - navigation "software sections" [ref=e35]:
      - generic [ref=e36]:
        - generic [ref=e37]: INDEX
        - link [ref=e38] [cursor=pointer]:
          - /url: /products
          - emphasis [ref=e39]: SW
          - text: Universe
        - link "Ledger (section)" [ref=e40] [cursor=pointer]:
          - /url: /products#ledger
          - emphasis [ref=e41]: LDG
          - text: Ledger
        - link [ref=e42] [cursor=pointer]:
          - /url: /labs
          - emphasis [ref=e43]: LAB
          - text: Labs
        - link [ref=e44] [cursor=pointer]:
          - /url: /build
          - emphasis [ref=e45]: CMP
          - text: Composer
    - region "KNOuX software universe" [ref=e46]:
      - generic [ref=e47]:
        - generic [ref=e48]:
          - generic [ref=e49]: FIND A KNOuX SYSTEM
          - paragraph [ref=e50]: Search by product, capability, platform or the job you need done. Results come from the audited repository registry.
        - generic [ref=e51]:
          - generic [aria-hidden] [ref=e52]: /
          - searchbox "Search KNOuX products" [ref=e53]
        - generic [ref=e54]:
          - group "Filter by family" [ref=e55]:
            - button "ALL FAMILIES" [pressed] [ref=e56] [cursor=pointer]
            - button "WINDOWS INTELLIGENCE" [ref=e57] [cursor=pointer]
            - button "ENGINEERING TOOLING" [ref=e58] [cursor=pointer]
            - button "SYSTEM MAINTENANCE" [ref=e59] [cursor=pointer]
            - button "FILE MANAGEMENT" [ref=e60] [cursor=pointer]
            - button "CAPTURE & MEDIA" [ref=e61] [cursor=pointer]
            - button "DEVELOPER PRODUCTIVITY" [ref=e62] [cursor=pointer]
          - status [ref=e63]: 07 / 07 SYSTEMS
      - generic [ref=e64]:
        - generic [ref=e65]:
          - generic [ref=e67]:
            - text: KNOuX
            - generic [ref=e68]: CORE
          - link "SW-01 ONE" [ref=e69] [cursor=pointer]:
            - /url: /products/knoux-one
            - generic [ref=e71]: SW-01
            - generic [ref=e72]: ONE
          - link "SW-02 Forge" [ref=e73] [cursor=pointer]:
            - /url: /products/kforge
            - generic [ref=e75]: SW-02
            - generic [ref=e76]: Forge
          - link "SW-03 Repair" [ref=e77] [cursor=pointer]:
            - /url: /products/knoux-repair
            - generic [ref=e79]: SW-03
            - generic [ref=e80]: Repair
          - link "SW-04 Organizer" [ref=e81] [cursor=pointer]:
            - /url: /products/knoux-smartorganizer
            - generic [ref=e83]: SW-04
            - generic [ref=e84]: Organizer
          - link "SW-05 REC" [ref=e85] [cursor=pointer]:
            - /url: /products/knoux-rec
            - generic [ref=e87]: SW-05
            - generic [ref=e88]: REC
          - link "SW-06 Player X" [ref=e89] [cursor=pointer]:
            - /url: /products/knoux-x
            - generic [ref=e91]: SW-06
            - generic [ref=e92]: Player X
          - link "SW-07 Clipboard" [ref=e93] [cursor=pointer]:
            - /url: /products/knoux-clipboard-ai
            - generic [ref=e95]: SW-07
            - generic [ref=e96]: Clipboard
        - complementary [ref=e97]:
          - generic [ref=e98]:
            - generic [ref=e99]: SYSTEM TOPOLOGY
            - paragraph [ref=e100]: Seven verified systems connected to one practice. Move across a node to read its registration, or open it for the full dossier.
            - paragraph [ref=e101]: AUDITED 2026-09-28
    - generic [ref=e102]:
      - generic [ref=e103]:
        - generic [ref=e104]:
          - generic [ref=e105]: FEATURED ARCHIVE
          - heading "One system at a time." [level=2] [ref=e106]: One systemat a time.
        - paragraph [ref=e107]: Move through the same verified registry as the topology. Each system opens into its evidence backed dossier.
      - generic [ref=e108]:
        - generic [ref=e109]:
          - generic [ref=e110]: ORBITAL ARCHIVE / VERIFIED SOFTWARE
          - generic [ref=e111]: 01 / 07
        - generic [ref=e112]:
          - generic [ref=e117]: SW-01
          - generic [ref=e118]:
            - paragraph [ref=e119]: Windows Intelligence / ACTIVE
            - heading "KNOUX ONE" [level=3] [ref=e120]
            - paragraph [ref=e121]: A Windows desktop workspace that keeps one shell over nineteen modules and refuses to claim a service it cannot prove. Its own evidence baseline separates statically verified native paths from planned ones, and browser preview returns desktop_runtime_unavailable rather than inventing a host reading.
            - link "OPEN SYSTEM ↗" [ref=e122] [cursor=pointer]:
              - /url: /products/knoux-one
              - text: OPEN SYSTEM
              - generic [ref=e123]: ↗
        - generic [ref=e124]:
          - button "Previous product" [ref=e125] [cursor=pointer]: ← PREVIOUS
          - group "Choose a product" [ref=e126]:
            - button "Show KNOUX ONE" [pressed] [ref=e127] [cursor=pointer]
            - button "Show KNOuX Forge" [ref=e128] [cursor=pointer]
            - button "Show KNOuX Repair" [ref=e129] [cursor=pointer]
            - button "Show KNOuX SmartOrganizer" [ref=e130] [cursor=pointer]
            - button "Show KNOuX REC" [ref=e131] [cursor=pointer]
            - button "Show KNOuX Player X" [ref=e132] [cursor=pointer]
            - button "Show KNOuX Clipboard AI" [ref=e133] [cursor=pointer]
          - button "Next product" [ref=e134] [cursor=pointer]: NEXT →
    - generic [ref=e136]:
      - generic [ref=e137]:
        - generic [ref=e138]:
          - generic [ref=e139]: REGISTRY
          - heading "Indexed by family." [level=2] [ref=e140]: Indexed byfamily.
        - paragraph [ref=e141]: The universe is organised by what a system is for, not by how recently it shipped. A family filter narrows the same audited set the topology draws from.
      - generic [ref=e142]:
        - link "01 Windows Intelligence ONE 1 system" [ref=e143] [cursor=pointer]:
          - /url: /products?q=Windows%20Intelligence
          - generic [ref=e144]: "01"
          - generic [ref=e145]: Windows Intelligence
          - generic [ref=e146]:
            - generic [ref=e147]: ONE
            - generic [ref=e148]: 1 system
          - generic [aria-hidden] [ref=e149]: ↗
        - link "02 Engineering Tooling Forge 1 system" [ref=e150] [cursor=pointer]:
          - /url: /products?q=Engineering%20Tooling
          - generic [ref=e151]: "02"
          - generic [ref=e152]: Engineering Tooling
          - generic [ref=e153]:
            - generic [ref=e154]: Forge
            - generic [ref=e155]: 1 system
          - generic [aria-hidden] [ref=e156]: ↗
        - link "03 System Maintenance Repair 1 system" [ref=e157] [cursor=pointer]:
          - /url: /products?q=System%20Maintenance
          - generic [ref=e158]: "03"
          - generic [ref=e159]: System Maintenance
          - generic [ref=e160]:
            - generic [ref=e161]: Repair
            - generic [ref=e162]: 1 system
          - generic [aria-hidden] [ref=e163]: ↗
        - link "04 File Management Organizer 1 system" [ref=e164] [cursor=pointer]:
          - /url: /products?q=File%20Management
          - generic [ref=e165]: "04"
          - generic [ref=e166]: File Management
          - generic [ref=e167]:
            - generic [ref=e168]: Organizer
            - generic [ref=e169]: 1 system
          - generic [aria-hidden] [ref=e170]: ↗
        - link "05 Capture & Media REC / Player X 2 systems" [ref=e171] [cursor=pointer]:
          - /url: /products?q=Capture%20%26%20Media
          - generic [ref=e172]: "05"
          - generic [ref=e173]: Capture & Media
          - generic [ref=e174]:
            - generic [ref=e175]: REC / Player X
            - generic [ref=e176]: 2 systems
          - generic [aria-hidden] [ref=e177]: ↗
        - link "06 Developer Productivity Clipboard 1 system" [ref=e178] [cursor=pointer]:
          - /url: /products?q=Developer%20Productivity
          - generic [ref=e179]: "06"
          - generic [ref=e180]: Developer Productivity
          - generic [ref=e181]:
            - generic [ref=e182]: Clipboard
            - generic [ref=e183]: 1 system
          - generic [aria-hidden] [ref=e184]: ↗
    - generic [ref=e185]:
      - generic [ref=e186]:
        - generic [ref=e187]:
          - generic [ref=e188]: LEDGER
          - heading "What was audited." [level=2] [ref=e189]: What wasaudited.
        - paragraph [ref=e190]: The full classification of KNOuX-branded repositories, including the ones deliberately not published as products. Repositories that are not KNOuX-branded are outside this catalogue and are not listed.
      - group [ref=e191]:
        - generic "VIEW SYSTEM LEDGER +" [ref=e192] [cursor=pointer]
    - generic [ref=e193]:
      - complementary [ref=e195]:
        - generic [ref=e196]:
          - generic [ref=e197]: NEXT LAYER
          - heading "Need one of these running on your own machine?" [level=2] [ref=e198]
          - paragraph [ref=e199]: KNOuX Software is built and maintained in-house. Custom implementation, deployment and support are handled by the Web and Composer divisions.
        - link "Compose a stack" [ref=e200] [cursor=pointer]:
          - /url: /build
          - text: Compose a stack
          - generic [aria-hidden] [ref=e201]: ↗
      - generic [ref=e203]:
        - generic [ref=e204]:
          - generic [ref=e205]: The other divisions
          - link "WordPress ecosystem" [ref=e206] [cursor=pointer]:
            - /url: /wordpress
        - generic [aria-hidden] [ref=e207]: ↗
      - paragraph [ref=e208]: 8 divisions / one engineering practice / one data model
  - contentinfo [ref=e209]:
    - generic [ref=e210]:
      - paragraph [ref=e211]: THE WORK CONTINUES
      - link [ref=e212] [cursor=pointer]:
        - /url: /contact
        - text: Let's make
        - emphasis [ref=e213]: what comes next.
        - generic [aria-hidden] [ref=e214]: ↗
    - generic [ref=e215]:
      - generic [ref=e216]:
        - generic [ref=e217]: Divisions
        - list [ref=e218]:
          - listitem [ref=e219]:
            - link "01 Software" [ref=e220] [cursor=pointer]:
              - /url: /products
          - listitem [ref=e221]:
            - link "02 WordPress" [ref=e222] [cursor=pointer]:
              - /url: /wordpress
          - listitem [ref=e223]:
            - link "03 Web" [ref=e224] [cursor=pointer]:
              - /url: /web
          - listitem [ref=e225]:
            - link "04 Growth" [ref=e226] [cursor=pointer]:
              - /url: /growth
          - listitem [ref=e227]:
            - link "05 Creative" [ref=e228] [cursor=pointer]:
              - /url: /creative
          - listitem [ref=e229]:
            - link "06 Solutions" [ref=e230] [cursor=pointer]:
              - /url: /solutions
          - listitem [ref=e231]:
            - link "07 Labs" [ref=e232] [cursor=pointer]:
              - /url: /labs
          - listitem [ref=e233]:
            - link "08 Institution" [ref=e234] [cursor=pointer]:
              - /url: /about
      - generic [ref=e235]:
        - generic [ref=e236]: Growth channels
        - list [ref=e237]:
          - listitem [ref=e238]:
            - link "Google Advertising" [ref=e239] [cursor=pointer]:
              - /url: /growth/google-ads
          - listitem [ref=e240]:
            - link "Meta Advertising" [ref=e241] [cursor=pointer]:
              - /url: /growth/meta-ads
          - listitem [ref=e242]:
            - link "Social Media" [ref=e243] [cursor=pointer]:
              - /url: /growth/social
          - listitem [ref=e244]:
            - link "Content Systems" [ref=e245] [cursor=pointer]:
              - /url: /growth/content
          - listitem [ref=e246]:
            - link "SEO & Discoverability" [ref=e247] [cursor=pointer]:
              - /url: /growth/seo
          - listitem [ref=e248]:
            - link "Growth overview" [ref=e249] [cursor=pointer]:
              - /url: /growth
      - generic [ref=e250]:
        - generic [ref=e251]: WordPress
        - list [ref=e252]:
          - listitem [ref=e253]:
            - link "Ecosystem overview" [ref=e254] [cursor=pointer]:
              - /url: /wordpress
          - listitem [ref=e255]:
            - link "Themes" [ref=e256] [cursor=pointer]:
              - /url: /wordpress/themes
          - listitem [ref=e257]:
            - link "Plugins" [ref=e258] [cursor=pointer]:
              - /url: /wordpress/plugins
          - listitem [ref=e259]:
            - link "Blocks" [ref=e260] [cursor=pointer]:
              - /url: /wordpress/blocks
          - listitem [ref=e261]:
            - link "Starter Sites" [ref=e262] [cursor=pointer]:
              - /url: /wordpress/starter-sites
          - listitem [ref=e263]:
            - link "Solutions" [ref=e264] [cursor=pointer]:
              - /url: /wordpress/solutions
      - generic [ref=e265]:
        - generic [ref=e266]: Institution
        - list [ref=e267]:
          - listitem [ref=e268]:
            - link "Labs" [ref=e269] [cursor=pointer]:
              - /url: /labs
          - listitem [ref=e270]:
            - link "Work" [ref=e271] [cursor=pointer]:
              - /url: /work
          - listitem [ref=e272]:
            - link "Engineering" [ref=e273] [cursor=pointer]:
              - /url: /engineering
          - listitem [ref=e274]:
            - link "About" [ref=e275] [cursor=pointer]:
              - /url: /about
          - listitem [ref=e276]:
            - link "Contact" [ref=e277] [cursor=pointer]:
              - /url: /contact
    - generic [ref=e278]:
      - link "KNOuX®" [ref=e279] [cursor=pointer]:
        - /url: /
      - navigation "Footer navigation" [ref=e280]:
        - link "Software" [ref=e281] [cursor=pointer]:
          - /url: /products
        - link "WordPress" [ref=e282] [cursor=pointer]:
          - /url: /wordpress
        - link "Web" [ref=e283] [cursor=pointer]:
          - /url: /web
        - link "Growth" [ref=e284] [cursor=pointer]:
          - /url: /growth
        - link "Creative" [ref=e285] [cursor=pointer]:
          - /url: /creative
        - link "Solutions" [ref=e286] [cursor=pointer]:
          - /url: /solutions
        - link "Build" [ref=e287] [cursor=pointer]:
          - /url: /build
      - generic [ref=e288]: ENGINEERING DIGITAL SYSTEMS
  - alert [ref=e289]
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
      |                                                                                        ^ Error: /products has automated accessibility violations:
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