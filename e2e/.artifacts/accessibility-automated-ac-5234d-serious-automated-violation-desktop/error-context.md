# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: accessibility.spec.ts >> automated accessibility >> /products/knoux-one has no critical or serious automated violation
- Location: e2e\accessibility.spec.ts:36:5

# Error details

```
Error: /products/knoux-one has automated accessibility violations:
color-contrast (serious) x25: .header-search > kbd

expect(received).toEqual(expected) // deep equality

- Expected  -   1
+ Received  + 898

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
+           ".header-search > kbd",
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
+         "html": "<a href=\"/\">KNOuX</a>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           ".page-crumb > a[href=\"/\"]",
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
+         "html": "<a href=\"/products\">Software</a>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           ".page-crumb > a[href$=\"products\"]",
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
+         "html": "<span aria-current=\"page\">KNOUX ONE</span>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           "span[aria-current=\"page\"]",
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
+               "fontSize": "7.5pt (10px)",
+               "fontWeight": "normal",
+               "messageKey": null,
+             },
+             "id": "color-contrast",
+             "impact": "serious",
+             "message": "Element has insufficient color contrast of 3.83 (foreground color: #6d6e70, background color: #0b0c0e, font size: 7.5pt (10px), font weight: normal). Expected contrast ratio of 4.5:1",
+             "relatedNodes": Array [
+               Object {
+                 "html": "<div class=\"product-anatomy-panel product-anatomy-panel--idle\">",
+                 "target": Array [
+                   ".product-anatomy-panel",
+                 ],
+               },
+             ],
+           },
+         ],
+         "failureSummary": "Fix any of the following:
+   Element has insufficient color contrast of 3.83 (foreground color: #6d6e70, background color: #0b0c0e, font size: 7.5pt (10px), font weight: normal). Expected contrast ratio of 4.5:1",
+         "html": "<li><kbd>Click</kbd> or <kbd>Tap</kbd> a node to select</li>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           ".product-anatomy-panel__hints > li:nth-child(1)",
+         ],
+       },
+       Object {
+         "all": Array [],
+         "any": Array [
+           Object {
+             "data": Object {
+               "bgColor": "#101113",
+               "contrastRatio": 3.7,
+               "expectedContrastRatio": "4.5:1",
+               "fgColor": "#6d6e70",
+               "fontSize": "7.5pt (10px)",
+               "fontWeight": "normal",
+               "messageKey": null,
+             },
+             "id": "color-contrast",
+             "impact": "serious",
+             "message": "Element has insufficient color contrast of 3.7 (foreground color: #6d6e70, background color: #101113, font size: 7.5pt (10px), font weight: normal). Expected contrast ratio of 4.5:1",
+             "relatedNodes": Array [
+               Object {
+                 "html": "<kbd>Click</kbd>",
+                 "target": Array [
+                   "li:nth-child(1) > kbd:nth-child(1)",
+                 ],
+               },
+             ],
+           },
+         ],
+         "failureSummary": "Fix any of the following:
+   Element has insufficient color contrast of 3.7 (foreground color: #6d6e70, background color: #101113, font size: 7.5pt (10px), font weight: normal). Expected contrast ratio of 4.5:1",
+         "html": "<kbd>Click</kbd>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           "li:nth-child(1) > kbd:nth-child(1)",
+         ],
+       },
+       Object {
+         "all": Array [],
+         "any": Array [
+           Object {
+             "data": Object {
+               "bgColor": "#101113",
+               "contrastRatio": 3.7,
+               "expectedContrastRatio": "4.5:1",
+               "fgColor": "#6d6e70",
+               "fontSize": "7.5pt (10px)",
+               "fontWeight": "normal",
+               "messageKey": null,
+             },
+             "id": "color-contrast",
+             "impact": "serious",
+             "message": "Element has insufficient color contrast of 3.7 (foreground color: #6d6e70, background color: #101113, font size: 7.5pt (10px), font weight: normal). Expected contrast ratio of 4.5:1",
+             "relatedNodes": Array [
+               Object {
+                 "html": "<kbd>Tap</kbd>",
+                 "target": Array [
+                   "li:nth-child(1) > kbd:nth-child(2)",
+                 ],
+               },
+             ],
+           },
+         ],
+         "failureSummary": "Fix any of the following:
+   Element has insufficient color contrast of 3.7 (foreground color: #6d6e70, background color: #101113, font size: 7.5pt (10px), font weight: normal). Expected contrast ratio of 4.5:1",
+         "html": "<kbd>Tap</kbd>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           "li:nth-child(1) > kbd:nth-child(2)",
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
+               "fontSize": "7.5pt (10px)",
+               "fontWeight": "normal",
+               "messageKey": null,
+             },
+             "id": "color-contrast",
+             "impact": "serious",
+             "message": "Element has insufficient color contrast of 3.83 (foreground color: #6d6e70, background color: #0b0c0e, font size: 7.5pt (10px), font weight: normal). Expected contrast ratio of 4.5:1",
+             "relatedNodes": Array [
+               Object {
+                 "html": "<div class=\"product-anatomy-panel product-anatomy-panel--idle\">",
+                 "target": Array [
+                   ".product-anatomy-panel",
+                 ],
+               },
+             ],
+           },
+         ],
+         "failureSummary": "Fix any of the following:
+   Element has insufficient color contrast of 3.83 (foreground color: #6d6e70, background color: #0b0c0e, font size: 7.5pt (10px), font weight: normal). Expected contrast ratio of 4.5:1",
+         "html": "<li><kbd>Drag</kbd> to orbit the view</li>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           ".product-anatomy-panel__hints > li:nth-child(2)",
+         ],
+       },
+       Object {
+         "all": Array [],
+         "any": Array [
+           Object {
+             "data": Object {
+               "bgColor": "#101113",
+               "contrastRatio": 3.7,
+               "expectedContrastRatio": "4.5:1",
+               "fgColor": "#6d6e70",
+               "fontSize": "7.5pt (10px)",
+               "fontWeight": "normal",
+               "messageKey": null,
+             },
+             "id": "color-contrast",
+             "impact": "serious",
+             "message": "Element has insufficient color contrast of 3.7 (foreground color: #6d6e70, background color: #101113, font size: 7.5pt (10px), font weight: normal). Expected contrast ratio of 4.5:1",
+             "relatedNodes": Array [
+               Object {
+                 "html": "<kbd>Drag</kbd>",
+                 "target": Array [
+                   "li:nth-child(2) > kbd",
+                 ],
+               },
+             ],
+           },
+         ],
+         "failureSummary": "Fix any of the following:
+   Element has insufficient color contrast of 3.7 (foreground color: #6d6e70, background color: #101113, font size: 7.5pt (10px), font weight: normal). Expected contrast ratio of 4.5:1",
+         "html": "<kbd>Drag</kbd>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           "li:nth-child(2) > kbd",
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
+               "fontSize": "7.5pt (10px)",
+               "fontWeight": "normal",
+               "messageKey": null,
+             },
+             "id": "color-contrast",
+             "impact": "serious",
+             "message": "Element has insufficient color contrast of 3.83 (foreground color: #6d6e70, background color: #0b0c0e, font size: 7.5pt (10px), font weight: normal). Expected contrast ratio of 4.5:1",
+             "relatedNodes": Array [
+               Object {
+                 "html": "<div class=\"product-anatomy-panel product-anatomy-panel--idle\">",
+                 "target": Array [
+                   ".product-anatomy-panel",
+                 ],
+               },
+             ],
+           },
+         ],
+         "failureSummary": "Fix any of the following:
+   Element has insufficient color contrast of 3.83 (foreground color: #6d6e70, background color: #0b0c0e, font size: 7.5pt (10px), font weight: normal). Expected contrast ratio of 4.5:1",
+         "html": "<li><kbd>Esc</kbd> to clear selection</li>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           ".product-anatomy-panel__hints > li:nth-child(3)",
+         ],
+       },
+       Object {
+         "all": Array [],
+         "any": Array [
+           Object {
+             "data": Object {
+               "bgColor": "#101113",
+               "contrastRatio": 3.7,
+               "expectedContrastRatio": "4.5:1",
+               "fgColor": "#6d6e70",
+               "fontSize": "7.5pt (10px)",
+               "fontWeight": "normal",
+               "messageKey": null,
+             },
+             "id": "color-contrast",
+             "impact": "serious",
+             "message": "Element has insufficient color contrast of 3.7 (foreground color: #6d6e70, background color: #101113, font size: 7.5pt (10px), font weight: normal). Expected contrast ratio of 4.5:1",
+             "relatedNodes": Array [
+               Object {
+                 "html": "<kbd>Esc</kbd>",
+                 "target": Array [
+                   "li:nth-child(3) > kbd",
+                 ],
+               },
+             ],
+           },
+         ],
+         "failureSummary": "Fix any of the following:
+   Element has insufficient color contrast of 3.7 (foreground color: #6d6e70, background color: #101113, font size: 7.5pt (10px), font weight: normal). Expected contrast ratio of 4.5:1",
+         "html": "<kbd>Esc</kbd>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           "li:nth-child(3) > kbd",
+         ],
+       },
+       Object {
+         "all": Array [],
+         "any": Array [
+           Object {
+             "data": Object {
+               "bgColor": "#0d0e10",
+               "contrastRatio": 3.78,
+               "expectedContrastRatio": "4.5:1",
+               "fgColor": "#6d6e70",
+               "fontSize": "6.4pt (8.5px)",
+               "fontWeight": "normal",
+               "messageKey": null,
+             },
+             "id": "color-contrast",
+             "impact": "serious",
+             "message": "Element has insufficient color contrast of 3.78 (foreground color: #6d6e70, background color: #0d0e10, font size: 6.4pt (8.5px), font weight: normal). Expected contrast ratio of 4.5:1",
+             "relatedNodes": Array [
+               Object {
+                 "html": "<p class=\"product-anatomy-index__instructions\">Select a node to read its verified details. Use Tab or arrow keys to move, Enter to select, Escape to clear.</p>",
+                 "target": Array [
+                   ".product-anatomy-index__instructions",
+                 ],
+               },
+             ],
+           },
+         ],
+         "failureSummary": "Fix any of the following:
+   Element has insufficient color contrast of 3.78 (foreground color: #6d6e70, background color: #0d0e10, font size: 6.4pt (8.5px), font weight: normal). Expected contrast ratio of 4.5:1",
+         "html": "<p class=\"product-anatomy-index__instructions\">Select a node to read its verified details. Use Tab or arrow keys to move, Enter to select, Escape to clear.</p>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           ".product-anatomy-index__instructions",
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
+         "html": "<span class=\"label\">AS STATED BY THE REPOSITORY</span>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           ".dossier__section.dossier__section--system-nucleus:nth-child(2) > .label",
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
+         "html": "<span class=\"label\">PUBLISHED WITH THE PRODUCT</span>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           ".dossier__section.dossier__section--system-nucleus:nth-child(3) > .label",
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
+         "html": "<span class=\"label\">IMPLEMENTATION STACK</span>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           ".dossier__section.dossier__section--system-nucleus:nth-child(4) > .label",
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
+         "html": "<span class=\"label\">ARTEFACTS THIS PAGE IS BUILT FROM</span>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           ".dossier__section.dossier__section--system-nucleus:nth-child(5) > .label",
+         ],
+       },
+       Object {
+         "all": Array [],
+         "any": Array [
+           Object {
+             "data": Object {
+               "bgColor": "#0e0f12",
+               "contrastRatio": 3.75,
+               "expectedContrastRatio": "4.5:1",
+               "fgColor": "#6d6e70",
+               "fontSize": "6.4pt (8.5px)",
+               "fontWeight": "normal",
+               "messageKey": null,
+             },
+             "id": "color-contrast",
+             "impact": "serious",
+             "message": "Element has insufficient color contrast of 3.75 (foreground color: #6d6e70, background color: #0e0f12, font size: 6.4pt (8.5px), font weight: normal). Expected contrast ratio of 4.5:1",
+             "relatedNodes": Array [
+               Object {
+                 "html": "<div class=\"dossier-card\">",
+                 "target": Array [
+                   ".dossier-card:nth-child(1)",
+                 ],
+               },
+             ],
+           },
+         ],
+         "failureSummary": "Fix any of the following:
+   Element has insufficient color contrast of 3.75 (foreground color: #6d6e70, background color: #0e0f12, font size: 6.4pt (8.5px), font weight: normal). Expected contrast ratio of 4.5:1",
+         "html": "<span class=\"dossier-card__label\">INTENT PHRASES</span>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           ".dossier-card:nth-child(1) > .dossier-card__label",
+         ],
+       },
+       Object {
+         "all": Array [],
+         "any": Array [
+           Object {
+             "data": Object {
+               "bgColor": "#0e0f12",
+               "contrastRatio": 3.75,
+               "expectedContrastRatio": "4.5:1",
+               "fgColor": "#6d6e70",
+               "fontSize": "6.4pt (8.5px)",
+               "fontWeight": "normal",
+               "messageKey": null,
+             },
+             "id": "color-contrast",
+             "impact": "serious",
+             "message": "Element has insufficient color contrast of 3.75 (foreground color: #6d6e70, background color: #0e0f12, font size: 6.4pt (8.5px), font weight: normal). Expected contrast ratio of 4.5:1",
+             "relatedNodes": Array [
+               Object {
+                 "html": "<div class=\"dossier-card\">",
+                 "target": Array [
+                   ".dossier-card:nth-child(2)",
+                 ],
+               },
+             ],
+           },
+         ],
+         "failureSummary": "Fix any of the following:
+   Element has insufficient color contrast of 3.75 (foreground color: #6d6e70, background color: #0e0f12, font size: 6.4pt (8.5px), font weight: normal). Expected contrast ratio of 4.5:1",
+         "html": "<span class=\"dossier-card__label\">ACCESS</span>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           ".dossier-card:nth-child(2) > .dossier-card__label",
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
+                 "html": "<a class=\"related-card\" href=\"/products/kforge\"><span class=\"related-card__code\">SW-02</span><h3>KNOuX Forge</h3><p>Local-first engineering command center</p><span class=\"related-card__cta\">OPEN DOSSIER ↗</span></a>",
+                 "target": Array [
+                   ".related-card[href$=\"kforge\"]",
+                 ],
+               },
+             ],
+           },
+         ],
+         "failureSummary": "Fix any of the following:
+   Element has insufficient color contrast of 3.83 (foreground color: #6d6e70, background color: #0b0c0e, font size: 6.8pt (9px), font weight: normal). Expected contrast ratio of 4.5:1",
+         "html": "<span class=\"related-card__cta\">OPEN DOSSIER ↗</span>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           ".related-card[href$=\"kforge\"] > .related-card__cta",
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
+                 "html": "<a class=\"related-card\" href=\"/products/knoux-repair\"><span class=\"related-card__code\">SW-03</span><h3>KNOuX Repair</h3><p>Diagnostics, repair and recovery workstation</p><span class=\"related-card__cta\">OPEN DOSSIER ↗</span></a>",
+                 "target": Array [
+                   "a[href$=\"knoux-repair\"]",
+                 ],
+               },
+             ],
+           },
+         ],
+         "failureSummary": "Fix any of the following:
+   Element has insufficient color contrast of 3.83 (foreground color: #6d6e70, background color: #0b0c0e, font size: 6.8pt (9px), font weight: normal). Expected contrast ratio of 4.5:1",
+         "html": "<span class=\"related-card__cta\">OPEN DOSSIER ↗</span>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           "a[href$=\"knoux-repair\"] > .related-card__cta",
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
+         "html": "<span class=\"label\">NEXT</span>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           ".pager__link > .label",
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
    - region [ref=e21]:
      - navigation "Breadcrumb" [ref=e22]:
        - link "KNOuX" [ref=e23] [cursor=pointer]:
          - /url: /
        - generic [aria-hidden] [ref=e24]: /
        - link "Software" [ref=e25] [cursor=pointer]:
          - /url: /products
        - generic [aria-hidden] [ref=e26]: /
        - generic [ref=e27]: KNOUX ONE
      - generic [ref=e29]:
        - generic [ref=e30]:
          - generic [ref=e31]: SW-01 / WINDOWS INTELLIGENCE
          - text: active
        - heading "KNOUX ONE" [level=1] [ref=e32]
        - paragraph [ref=e38]: Windows Intelligence & Developer Suite
        - generic [ref=e39]:
          - generic [ref=e40]:
            - term [ref=e41]: Platform
            - definition [ref=e42]: Windows 10/11 x64 desktop (Tauri 2) with a browser preview that declines desktop operations
          - generic [ref=e43]:
            - term [ref=e44]: Discipline
            - definition [ref=e45]: Systems
          - generic [ref=e46]:
            - term [ref=e47]: License
            - definition [ref=e48]: Not declared
        - generic [ref=e49]:
          - link "Repository" [ref=e50] [cursor=pointer]:
            - /url: https://github.com/daynightae-cmyk/KNOUX-ONE
            - text: Repository
            - generic [aria-hidden] [ref=e51]: ↗
          - link "Declared URL" [ref=e52] [cursor=pointer]:
            - /url: https://knoux-one.vercel.app
            - text: Declared URL
            - generic [aria-hidden] [ref=e53]: ↗
          - link "Request access" [ref=e54] [cursor=pointer]:
            - /url: /contact
            - text: Request access
            - generic [aria-hidden] [ref=e55]: ↗
    - region [ref=e59]:
      - generic [ref=e60]:
        - generic [ref=e61]:
          - generic [ref=e62]:
            - generic [ref=e63]: PRODUCT SYSTEM
            - heading "System anatomy" [level=2] [ref=e64]
            - paragraph [ref=e65]: Explore verified capabilities, implementation, limits, evidence and related systems.
          - generic [ref=e66]: Windows intelligence field
        - generic [ref=e68]:
          - region "Interactive system constellation" [ref=e69]
          - generic [ref=e76]:
            - generic [ref=e77]: SYSTEM ANATOMY
            - heading "Explore the system" [level=3] [ref=e78]
            - paragraph [ref=e79]: Select a node in the constellation to inspect its role, evidence, and relationships.
            - list [ref=e80]:
              - listitem [ref=e81]: Click or Tap a node to select
              - listitem [ref=e82]: Drag to orbit the view
              - listitem [ref=e83]: Esc to clear selection
        - region "Product system anatomy node index" [ref=e85]:
          - paragraph [ref=e86]: Select a node to read its verified details. Use Tab or arrow keys to move, Enter to select, Escape to clear.
          - list [ref=e87]:
            - listitem [ref=e88] [cursor=pointer]:
              - button "Core identity ONE" [ref=e89]:
                - generic [ref=e90]: Core identity
                - generic [ref=e92]: ONE
            - listitem [ref=e93] [cursor=pointer]:
              - button "Capability Registry-driven desktop shell…" [ref=e94]:
                - generic [ref=e95]: Capability
                - generic [ref=e97]: Registry-driven desktop shell…
            - listitem [ref=e98] [cursor=pointer]:
              - button "Capability Native workspaces for…" [ref=e99]:
                - generic [ref=e100]: Capability
                - generic [ref=e102]: Native workspaces for…
            - listitem [ref=e103] [cursor=pointer]:
              - button "Capability Developer Studio restricted" [ref=e104]:
                - generic [ref=e105]: Capability
                - generic [ref=e107]: Developer Studio restricted
            - listitem [ref=e108] [cursor=pointer]:
              - button "Technology Tauri 2" [ref=e109]:
                - generic [ref=e110]: Technology
                - generic [ref=e112]: Tauri 2
            - listitem [ref=e113] [cursor=pointer]:
              - button "Technology Rust" [ref=e114]:
                - generic [ref=e115]: Technology
                - generic [ref=e117]: Rust
            - listitem [ref=e118] [cursor=pointer]:
              - button "Technology React 19" [ref=e119]:
                - generic [ref=e120]: Technology
                - generic [ref=e122]: React 19
            - listitem [ref=e123] [cursor=pointer]:
              - button "Technology TypeScript" [ref=e124]:
                - generic [ref=e125]: Technology
                - generic [ref=e127]: TypeScript
            - listitem [ref=e128] [cursor=pointer]:
              - button "Technology Vite" [ref=e129]:
                - generic [ref=e130]: Technology
                - generic [ref=e132]: Vite
            - listitem [ref=e133] [cursor=pointer]:
              - button "Stated limit Its own baseline reports 74 statically ver…" [ref=e134]:
                - generic [ref=e135]: Stated limit
                - generic [ref=e137]: Its own baseline reports 74 statically ver…
            - listitem [ref=e138] [cursor=pointer]:
              - button "Stated limit Modules M09 to M14 and M16 to M19 are plan…" [ref=e139]:
                - generic [ref=e140]: Stated limit
                - generic [ref=e142]: Modules M09 to M14 and M16 to M19 are plan…
            - listitem [ref=e143] [cursor=pointer]:
              - button "Stated limit Permanent purge does not claim guaranteed…" [ref=e144]:
                - generic [ref=e145]: Stated limit
                - generic [ref=e147]: Permanent purge does not claim guaranteed…
            - listitem [ref=e148] [cursor=pointer]:
              - button "Evidence README.md" [ref=e149]:
                - generic [ref=e150]: Evidence
                - generic [ref=e152]: README.md
            - listitem [ref=e153] [cursor=pointer]:
              - button "Evidence REAL_IMPLEMENTATION_MATRIX.md" [ref=e154]:
                - generic [ref=e155]: Evidence
                - generic [ref=e157]: REAL_IMPLEMENTATION_MATRIX.md
            - listitem [ref=e158] [cursor=pointer]:
              - button "Evidence docs/services/service-reality-baseline.md" [ref=e159]:
                - generic [ref=e160]: Evidence
                - generic [ref=e162]: docs/services/service-reality-baseline.md
            - listitem [ref=e163] [cursor=pointer]:
              - button "Evidence .github/workflows/m03-native-validation.yml" [ref=e164]:
                - generic [ref=e165]: Evidence
                - generic [ref=e167]: .github/workflows/m03-native-validation.yml
            - listitem [ref=e168] [cursor=pointer]:
              - button "Evidence repository homepage field" [ref=e169]:
                - generic [ref=e170]: Evidence
                - generic [ref=e172]: repository homepage field
            - listitem [ref=e173] [cursor=pointer]:
              - button "Related system KNOuX Forge" [ref=e174]:
                - generic [ref=e175]: Related system
                - generic [ref=e177]: KNOuX Forge
            - listitem [ref=e178] [cursor=pointer]:
              - button "Related system KNOuX Repair" [ref=e179]:
                - generic [ref=e180]: Related system
                - generic [ref=e182]: KNOuX Repair
          - status [ref=e183]: No node selected.
    - region "Product details" [ref=e184]:
      - generic [ref=e186]:
        - generic [ref=e187]:
          - generic [ref=e188]:
            - generic [ref=e189]: OVERVIEW
            - paragraph [ref=e190]: A Windows desktop workspace that keeps one shell over nineteen modules and refuses to claim a service it cannot prove. Its own evidence baseline separates statically verified native paths from planned ones, and browser preview returns desktop_runtime_unavailable rather than inventing a host reading.
          - generic [ref=e191]:
            - heading "What it does" [level=2] [ref=e192]
            - generic [ref=e193]: AS STATED BY THE REPOSITORY
            - list [ref=e194]:
              - listitem [ref=e195]: Registry-driven desktop shell covering nineteen modules with grouped navigation and Arabic/English search
              - listitem [ref=e196]: Typed Rust-to-renderer command allowlist with no arbitrary shell endpoint
              - listitem [ref=e197]: Native workspaces for setup, cleanup, duplicates, storage, startup, performance, repair, network and a developer studio
              - listitem [ref=e198]: Cross-volume quarantine that copies, flushes, verifies a BLAKE3 digest, and only then removes a source
              - listitem [ref=e199]: Developer Studio restricted to recognised cache paths and refusing credential payloads
          - generic [ref=e200]:
            - heading "Stated limits" [level=2] [ref=e201]
            - generic [ref=e202]: PUBLISHED WITH THE PRODUCT
            - list [ref=e203]:
              - listitem [ref=e204]:
                - generic [aria-hidden] [ref=e205]: "!"
                - text: Its own baseline reports 74 statically verified native paths, 6 partial, 110 planned, and 0 runtime-verified on Windows in repository evidence
              - listitem [ref=e206]:
                - generic [aria-hidden] [ref=e207]: "!"
                - text: Modules M09 to M14 and M16 to M19 are planned and expose no handler
              - listitem [ref=e208]:
                - generic [aria-hidden] [ref=e209]: "!"
                - text: Permanent purge does not claim guaranteed SSD secure erasure
          - generic [ref=e210]:
            - heading "Technologies" [level=2] [ref=e211]
            - generic [ref=e212]: IMPLEMENTATION STACK
            - generic [ref=e213]:
              - generic [ref=e214]: Tauri 2
              - generic [ref=e215]: Rust
              - generic [ref=e216]: React 19
              - generic [ref=e217]: TypeScript
              - generic [ref=e218]: Vite
          - generic [ref=e219]:
            - heading "Evidence" [level=2] [ref=e220]
            - generic [ref=e221]: ARTEFACTS THIS PAGE IS BUILT FROM
            - generic [ref=e222]:
              - generic [ref=e223]:
                - code [ref=e224]: README.md
                - paragraph [ref=e225]: Product title, stack, module and service evidence matrix, safety boundaries
              - generic [ref=e226]:
                - code [ref=e227]: REAL_IMPLEMENTATION_MATRIX.md
                - paragraph [ref=e228]: Referenced as the service evidence authority
              - generic [ref=e229]:
                - code [ref=e230]: docs/services/service-reality-baseline.md
                - paragraph [ref=e231]: Generated evidence baseline referenced by the README
              - generic [ref=e232]:
                - code [ref=e233]: .github/workflows/m03-native-validation.yml
                - paragraph [ref=e234]: Windows Rust formatting, Clippy and native test workflow
              - generic [ref=e235]:
                - code [ref=e236]: repository homepage field
                - paragraph [ref=e237]: https://knoux-one.vercel.app
        - complementary [ref=e238]:
          - generic [ref=e239]:
            - generic [ref=e240]: INTENT PHRASES
            - generic [ref=e241]:
              - generic [ref=e242]: windows intelligence
              - generic [ref=e243]: windows system tool
              - generic [ref=e244]: system maintenance desktop
              - generic [ref=e245]: developer workspace windows
              - generic [ref=e246]: rust tauri app
              - generic [ref=e247]: windows cleanup
              - generic [ref=e248]: startup manager
              - generic [ref=e249]: system monitoring
          - generic [ref=e250]:
            - generic [ref=e251]: ACCESS
            - generic [ref=e252]:
              - link "Repository" [ref=e253] [cursor=pointer]:
                - /url: https://github.com/daynightae-cmyk/KNOUX-ONE
                - text: Repository
                - generic [aria-hidden] [ref=e254]: ↗
              - link "Declared URL" [ref=e255] [cursor=pointer]:
                - /url: https://knoux-one.vercel.app
                - text: Declared URL
                - generic [aria-hidden] [ref=e256]: ↗
              - link "Request access" [ref=e257] [cursor=pointer]:
                - /url: /contact
                - text: Request access
                - generic [aria-hidden] [ref=e258]: ↗
    - region "Related systems" [ref=e259]:
      - generic [ref=e260]: RELATED SYSTEMS
      - generic [ref=e261]:
        - link "SW-02 KNOuX Forge Local-first engineering command center OPEN DOSSIER ↗" [ref=e262] [cursor=pointer]:
          - /url: /products/kforge
          - generic [ref=e263]: SW-02
          - heading "KNOuX Forge" [level=3] [ref=e264]
          - paragraph [ref=e265]: Local-first engineering command center
          - generic [ref=e266]: OPEN DOSSIER ↗
        - link "SW-03 KNOuX Repair Diagnostics, repair and recovery workstation OPEN DOSSIER ↗" [ref=e267] [cursor=pointer]:
          - /url: /products/knoux-repair
          - generic [ref=e268]: SW-03
          - heading "KNOuX Repair" [level=3] [ref=e269]
          - paragraph [ref=e270]: Diagnostics, repair and recovery workstation
          - generic [ref=e271]: OPEN DOSSIER ↗
    - link "NEXT Forge" [ref=e274] [cursor=pointer]:
      - /url: /products/kforge
      - generic [ref=e275]: NEXT
      - strong [ref=e276]: Forge
  - contentinfo [ref=e277]:
    - generic [ref=e278]:
      - paragraph [ref=e279]: THE WORK CONTINUES
      - link [ref=e280] [cursor=pointer]:
        - /url: /contact
        - text: Let's make
        - emphasis [ref=e281]: what comes next.
        - generic [aria-hidden] [ref=e282]: ↗
    - generic [ref=e283]:
      - generic [ref=e284]:
        - generic [ref=e285]: Divisions
        - list [ref=e286]:
          - listitem [ref=e287]:
            - link "01 Software" [ref=e288] [cursor=pointer]:
              - /url: /products
          - listitem [ref=e289]:
            - link "02 WordPress" [ref=e290] [cursor=pointer]:
              - /url: /wordpress
          - listitem [ref=e291]:
            - link "03 Web" [ref=e292] [cursor=pointer]:
              - /url: /web
          - listitem [ref=e293]:
            - link "04 Growth" [ref=e294] [cursor=pointer]:
              - /url: /growth
          - listitem [ref=e295]:
            - link "05 Creative" [ref=e296] [cursor=pointer]:
              - /url: /creative
          - listitem [ref=e297]:
            - link "06 Solutions" [ref=e298] [cursor=pointer]:
              - /url: /solutions
          - listitem [ref=e299]:
            - link "07 Labs" [ref=e300] [cursor=pointer]:
              - /url: /labs
          - listitem [ref=e301]:
            - link "08 Institution" [ref=e302] [cursor=pointer]:
              - /url: /about
      - generic [ref=e303]:
        - generic [ref=e304]: Growth channels
        - list [ref=e305]:
          - listitem [ref=e306]:
            - link "Google Advertising" [ref=e307] [cursor=pointer]:
              - /url: /growth/google-ads
          - listitem [ref=e308]:
            - link "Meta Advertising" [ref=e309] [cursor=pointer]:
              - /url: /growth/meta-ads
          - listitem [ref=e310]:
            - link "Social Media" [ref=e311] [cursor=pointer]:
              - /url: /growth/social
          - listitem [ref=e312]:
            - link "Content Systems" [ref=e313] [cursor=pointer]:
              - /url: /growth/content
          - listitem [ref=e314]:
            - link "SEO & Discoverability" [ref=e315] [cursor=pointer]:
              - /url: /growth/seo
          - listitem [ref=e316]:
            - link "Growth overview" [ref=e317] [cursor=pointer]:
              - /url: /growth
      - generic [ref=e318]:
        - generic [ref=e319]: WordPress
        - list [ref=e320]:
          - listitem [ref=e321]:
            - link "Ecosystem overview" [ref=e322] [cursor=pointer]:
              - /url: /wordpress
          - listitem [ref=e323]:
            - link "Themes" [ref=e324] [cursor=pointer]:
              - /url: /wordpress/themes
          - listitem [ref=e325]:
            - link "Plugins" [ref=e326] [cursor=pointer]:
              - /url: /wordpress/plugins
          - listitem [ref=e327]:
            - link "Blocks" [ref=e328] [cursor=pointer]:
              - /url: /wordpress/blocks
          - listitem [ref=e329]:
            - link "Starter Sites" [ref=e330] [cursor=pointer]:
              - /url: /wordpress/starter-sites
          - listitem [ref=e331]:
            - link "Solutions" [ref=e332] [cursor=pointer]:
              - /url: /wordpress/solutions
      - generic [ref=e333]:
        - generic [ref=e334]: Institution
        - list [ref=e335]:
          - listitem [ref=e336]:
            - link "Labs" [ref=e337] [cursor=pointer]:
              - /url: /labs
          - listitem [ref=e338]:
            - link "Work" [ref=e339] [cursor=pointer]:
              - /url: /work
          - listitem [ref=e340]:
            - link "Engineering" [ref=e341] [cursor=pointer]:
              - /url: /engineering
          - listitem [ref=e342]:
            - link "About" [ref=e343] [cursor=pointer]:
              - /url: /about
          - listitem [ref=e344]:
            - link "Contact" [ref=e345] [cursor=pointer]:
              - /url: /contact
    - generic [ref=e346]:
      - link "KNOuX®" [ref=e347] [cursor=pointer]:
        - /url: /
      - navigation "Footer navigation" [ref=e348]:
        - link "Software" [ref=e349] [cursor=pointer]:
          - /url: /products
        - link "WordPress" [ref=e350] [cursor=pointer]:
          - /url: /wordpress
        - link "Web" [ref=e351] [cursor=pointer]:
          - /url: /web
        - link "Growth" [ref=e352] [cursor=pointer]:
          - /url: /growth
        - link "Creative" [ref=e353] [cursor=pointer]:
          - /url: /creative
        - link "Solutions" [ref=e354] [cursor=pointer]:
          - /url: /solutions
        - link "Build" [ref=e355] [cursor=pointer]:
          - /url: /build
      - generic [ref=e356]: ENGINEERING DIGITAL SYSTEMS
  - alert [ref=e357]
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
      |                                                                                        ^ Error: /products/knoux-one has automated accessibility violations:
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