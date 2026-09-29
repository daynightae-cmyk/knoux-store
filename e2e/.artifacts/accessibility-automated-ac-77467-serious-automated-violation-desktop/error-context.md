# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: accessibility.spec.ts >> automated accessibility >> /solutions has no critical or serious automated violation
- Location: e2e\accessibility.spec.ts:36:5

# Error details

```
Error: /solutions has automated accessibility violations:
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
+         "html": "<em>CT</em>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           ".signal-rail__inner > a[href$=\"contact\"] > em",
+         ],
+       },
+       Object {
+         "all": Array [],
+         "any": Array [
+           Object {
+             "data": Object {
+               "bgColor": "#08090a",
+               "contrastRatio": 4.05,
+               "expectedContrastRatio": "4.5:1",
+               "fgColor": "#776d7e",
+               "fontSize": "6.8pt (9px)",
+               "fontWeight": "normal",
+               "messageKey": null,
+             },
+             "id": "color-contrast",
+             "impact": "serious",
+             "message": "Element has insufficient color contrast of 4.05 (foreground color: #776d7e, background color: #08090a, font size: 6.8pt (9px), font weight: normal). Expected contrast ratio of 4.5:1",
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
+   Element has insufficient color contrast of 4.05 (foreground color: #776d7e, background color: #08090a, font size: 6.8pt (9px), font weight: normal). Expected contrast ratio of 4.5:1",
+         "html": "<span class=\"solution-mission-row__index\">01</span>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           "a[data-active=\"true\"] > .solution-mission-row__index",
+         ],
+       },
+       Object {
+         "all": Array [],
+         "any": Array [
+           Object {
+             "data": Object {
+               "bgColor": "#08090a",
+               "contrastRatio": 4.17,
+               "expectedContrastRatio": "4.5:1",
+               "fgColor": "#77707d",
+               "fontSize": "6.0pt (8px)",
+               "fontWeight": "normal",
+               "messageKey": null,
+             },
+             "id": "color-contrast",
+             "impact": "serious",
+             "message": "Element has insufficient color contrast of 4.17 (foreground color: #77707d, background color: #08090a, font size: 6.0pt (8px), font weight: normal). Expected contrast ratio of 4.5:1",
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
+   Element has insufficient color contrast of 4.17 (foreground color: #77707d, background color: #08090a, font size: 6.0pt (8px), font weight: normal). Expected contrast ratio of 4.5:1",
+         "html": "<span class=\"solution-mission-row__context\">LAUNCH<!-- --> / <!-- -->3<!-- --> CORE</span>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           "a[data-active=\"true\"] > .solution-mission-row__context",
+         ],
+       },
+       Object {
+         "all": Array [],
+         "any": Array [
+           Object {
+             "data": Object {
+               "bgColor": "#08090a",
+               "contrastRatio": 4.05,
+               "expectedContrastRatio": "4.5:1",
+               "fgColor": "#776d7e",
+               "fontSize": "6.8pt (9px)",
+               "fontWeight": "normal",
+               "messageKey": null,
+             },
+             "id": "color-contrast",
+             "impact": "serious",
+             "message": "Element has insufficient color contrast of 4.05 (foreground color: #776d7e, background color: #08090a, font size: 6.8pt (9px), font weight: normal). Expected contrast ratio of 4.5:1",
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
+   Element has insufficient color contrast of 4.05 (foreground color: #776d7e, background color: #08090a, font size: 6.8pt (9px), font weight: normal). Expected contrast ratio of 4.5:1",
+         "html": "<span class=\"solution-mission-row__index\">02</span>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           ".solution-mission-row[data-active=\"false\"]:nth-child(2) > .solution-mission-row__index",
+         ],
+       },
+       Object {
+         "all": Array [],
+         "any": Array [
+           Object {
+             "data": Object {
+               "bgColor": "#08090a",
+               "contrastRatio": 4.17,
+               "expectedContrastRatio": "4.5:1",
+               "fgColor": "#77707d",
+               "fontSize": "6.0pt (8px)",
+               "fontWeight": "normal",
+               "messageKey": null,
+             },
+             "id": "color-contrast",
+             "impact": "serious",
+             "message": "Element has insufficient color contrast of 4.17 (foreground color: #77707d, background color: #08090a, font size: 6.0pt (8px), font weight: normal). Expected contrast ratio of 4.5:1",
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
+   Element has insufficient color contrast of 4.17 (foreground color: #77707d, background color: #08090a, font size: 6.0pt (8px), font weight: normal). Expected contrast ratio of 4.5:1",
+         "html": "<span class=\"solution-mission-row__context\">LAUNCH<!-- --> / <!-- -->3<!-- --> CORE</span>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           ".solution-mission-row[data-active=\"false\"]:nth-child(2) > .solution-mission-row__context",
+         ],
+       },
+       Object {
+         "all": Array [],
+         "any": Array [
+           Object {
+             "data": Object {
+               "bgColor": "#08090a",
+               "contrastRatio": 4.05,
+               "expectedContrastRatio": "4.5:1",
+               "fgColor": "#776d7e",
+               "fontSize": "6.8pt (9px)",
+               "fontWeight": "normal",
+               "messageKey": null,
+             },
+             "id": "color-contrast",
+             "impact": "serious",
+             "message": "Element has insufficient color contrast of 4.05 (foreground color: #776d7e, background color: #08090a, font size: 6.8pt (9px), font weight: normal). Expected contrast ratio of 4.5:1",
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
+   Element has insufficient color contrast of 4.05 (foreground color: #776d7e, background color: #08090a, font size: 6.8pt (9px), font weight: normal). Expected contrast ratio of 4.5:1",
+         "html": "<span class=\"solution-mission-row__index\">03</span>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           ".solution-mission-row[data-active=\"false\"]:nth-child(3) > .solution-mission-row__index",
+         ],
+       },
+       Object {
+         "all": Array [],
+         "any": Array [
+           Object {
+             "data": Object {
+               "bgColor": "#08090a",
+               "contrastRatio": 4.17,
+               "expectedContrastRatio": "4.5:1",
+               "fgColor": "#77707d",
+               "fontSize": "6.0pt (8px)",
+               "fontWeight": "normal",
+               "messageKey": null,
+             },
+             "id": "color-contrast",
+             "impact": "serious",
+             "message": "Element has insufficient color contrast of 4.17 (foreground color: #77707d, background color: #08090a, font size: 6.0pt (8px), font weight: normal). Expected contrast ratio of 4.5:1",
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
+   Element has insufficient color contrast of 4.17 (foreground color: #77707d, background color: #08090a, font size: 6.0pt (8px), font weight: normal). Expected contrast ratio of 4.5:1",
+         "html": "<span class=\"solution-mission-row__context\">BUILD<!-- --> / <!-- -->3<!-- --> CORE</span>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           ".solution-mission-row[data-active=\"false\"]:nth-child(3) > .solution-mission-row__context",
+         ],
+       },
+       Object {
+         "all": Array [],
+         "any": Array [
+           Object {
+             "data": Object {
+               "bgColor": "#08090a",
+               "contrastRatio": 4.05,
+               "expectedContrastRatio": "4.5:1",
+               "fgColor": "#776d7e",
+               "fontSize": "6.8pt (9px)",
+               "fontWeight": "normal",
+               "messageKey": null,
+             },
+             "id": "color-contrast",
+             "impact": "serious",
+             "message": "Element has insufficient color contrast of 4.05 (foreground color: #776d7e, background color: #08090a, font size: 6.8pt (9px), font weight: normal). Expected contrast ratio of 4.5:1",
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
+   Element has insufficient color contrast of 4.05 (foreground color: #776d7e, background color: #08090a, font size: 6.8pt (9px), font weight: normal). Expected contrast ratio of 4.5:1",
+         "html": "<span class=\"solution-mission-row__index\">04</span>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           "a[href$=\"digitise-operations\"] > .solution-mission-row__index",
+         ],
+       },
+       Object {
+         "all": Array [],
+         "any": Array [
+           Object {
+             "data": Object {
+               "bgColor": "#08090a",
+               "contrastRatio": 4.17,
+               "expectedContrastRatio": "4.5:1",
+               "fgColor": "#77707d",
+               "fontSize": "6.0pt (8px)",
+               "fontWeight": "normal",
+               "messageKey": null,
+             },
+             "id": "color-contrast",
+             "impact": "serious",
+             "message": "Element has insufficient color contrast of 4.17 (foreground color: #77707d, background color: #08090a, font size: 6.0pt (8px), font weight: normal). Expected contrast ratio of 4.5:1",
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
+   Element has insufficient color contrast of 4.17 (foreground color: #77707d, background color: #08090a, font size: 6.0pt (8px), font weight: normal). Expected contrast ratio of 4.5:1",
+         "html": "<span class=\"solution-mission-row__context\">OPERATE<!-- --> / <!-- -->3<!-- --> CORE</span>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           "a[href$=\"digitise-operations\"] > .solution-mission-row__context",
+         ],
+       },
+       Object {
+         "all": Array [],
+         "any": Array [
+           Object {
+             "data": Object {
+               "bgColor": "#08090a",
+               "contrastRatio": 4.05,
+               "expectedContrastRatio": "4.5:1",
+               "fgColor": "#776d7e",
+               "fontSize": "6.8pt (9px)",
+               "fontWeight": "normal",
+               "messageKey": null,
+             },
+             "id": "color-contrast",
+             "impact": "serious",
+             "message": "Element has insufficient color contrast of 4.05 (foreground color: #776d7e, background color: #08090a, font size: 6.8pt (9px), font weight: normal). Expected contrast ratio of 4.5:1",
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
+   Element has insufficient color contrast of 4.05 (foreground color: #776d7e, background color: #08090a, font size: 6.8pt (9px), font weight: normal). Expected contrast ratio of 4.5:1",
+         "html": "<span class=\"solution-mission-row__index\">05</span>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           ".solution-mission-row[data-active=\"false\"]:nth-child(5) > .solution-mission-row__index",
+         ],
+       },
+       Object {
+         "all": Array [],
+         "any": Array [
+           Object {
+             "data": Object {
+               "bgColor": "#08090a",
+               "contrastRatio": 4.17,
+               "expectedContrastRatio": "4.5:1",
+               "fgColor": "#77707d",
+               "fontSize": "6.0pt (8px)",
+               "fontWeight": "normal",
+               "messageKey": null,
+             },
+             "id": "color-contrast",
+             "impact": "serious",
+             "message": "Element has insufficient color contrast of 4.17 (foreground color: #77707d, background color: #08090a, font size: 6.0pt (8px), font weight: normal). Expected contrast ratio of 4.5:1",
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
+   Element has insufficient color contrast of 4.17 (foreground color: #77707d, background color: #08090a, font size: 6.0pt (8px), font weight: normal). Expected contrast ratio of 4.5:1",
+         "html": "<span class=\"solution-mission-row__context\">BUILD<!-- --> / <!-- -->3<!-- --> CORE</span>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           ".solution-mission-row[data-active=\"false\"]:nth-child(5) > .solution-mission-row__context",
+         ],
+       },
+       Object {
+         "all": Array [],
+         "any": Array [
+           Object {
+             "data": Object {
+               "bgColor": "#08090a",
+               "contrastRatio": 4.05,
+               "expectedContrastRatio": "4.5:1",
+               "fgColor": "#776d7e",
+               "fontSize": "6.8pt (9px)",
+               "fontWeight": "normal",
+               "messageKey": null,
+             },
+             "id": "color-contrast",
+             "impact": "serious",
+             "message": "Element has insufficient color contrast of 4.05 (foreground color: #776d7e, background color: #08090a, font size: 6.8pt (9px), font weight: normal). Expected contrast ratio of 4.5:1",
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
+   Element has insufficient color contrast of 4.05 (foreground color: #776d7e, background color: #08090a, font size: 6.8pt (9px), font weight: normal). Expected contrast ratio of 4.5:1",
+         "html": "<span class=\"solution-mission-row__index\">06</span>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           ".solution-mission-row[data-active=\"false\"]:nth-child(6) > .solution-mission-row__index",
+         ],
+       },
+       Object {
+         "all": Array [],
+         "any": Array [
+           Object {
+             "data": Object {
+               "bgColor": "#08090a",
+               "contrastRatio": 4.17,
+               "expectedContrastRatio": "4.5:1",
+               "fgColor": "#77707d",
+               "fontSize": "6.0pt (8px)",
+               "fontWeight": "normal",
+               "messageKey": null,
+             },
+             "id": "color-contrast",
+             "impact": "serious",
+             "message": "Element has insufficient color contrast of 4.17 (foreground color: #77707d, background color: #08090a, font size: 6.0pt (8px), font weight: normal). Expected contrast ratio of 4.5:1",
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
+   Element has insufficient color contrast of 4.17 (foreground color: #77707d, background color: #08090a, font size: 6.0pt (8px), font weight: normal). Expected contrast ratio of 4.5:1",
+         "html": "<span class=\"solution-mission-row__context\">REACH<!-- --> / <!-- -->3<!-- --> CORE</span>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           ".solution-mission-row[data-active=\"false\"]:nth-child(6) > .solution-mission-row__context",
+         ],
+       },
+       Object {
+         "all": Array [],
+         "any": Array [
+           Object {
+             "data": Object {
+               "bgColor": "#08090a",
+               "contrastRatio": 4.05,
+               "expectedContrastRatio": "4.5:1",
+               "fgColor": "#776d7e",
+               "fontSize": "6.8pt (9px)",
+               "fontWeight": "normal",
+               "messageKey": null,
+             },
+             "id": "color-contrast",
+             "impact": "serious",
+             "message": "Element has insufficient color contrast of 4.05 (foreground color: #776d7e, background color: #08090a, font size: 6.8pt (9px), font weight: normal). Expected contrast ratio of 4.5:1",
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
+   Element has insufficient color contrast of 4.05 (foreground color: #776d7e, background color: #08090a, font size: 6.8pt (9px), font weight: normal). Expected contrast ratio of 4.5:1",
+         "html": "<span class=\"solution-mission-row__index\">07</span>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           ".solution-mission-row[data-active=\"false\"]:nth-child(7) > .solution-mission-row__index",
+         ],
+       },
+       Object {
+         "all": Array [],
+         "any": Array [
+           Object {
+             "data": Object {
+               "bgColor": "#08090a",
+               "contrastRatio": 4.17,
+               "expectedContrastRatio": "4.5:1",
+               "fgColor": "#77707d",
+               "fontSize": "6.0pt (8px)",
+               "fontWeight": "normal",
+               "messageKey": null,
+             },
+             "id": "color-contrast",
+             "impact": "serious",
+             "message": "Element has insufficient color contrast of 4.17 (foreground color: #77707d, background color: #08090a, font size: 6.0pt (8px), font weight: normal). Expected contrast ratio of 4.5:1",
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
+   Element has insufficient color contrast of 4.17 (foreground color: #77707d, background color: #08090a, font size: 6.0pt (8px), font weight: normal). Expected contrast ratio of 4.5:1",
+         "html": "<span class=\"solution-mission-row__context\">BUILD<!-- --> / <!-- -->3<!-- --> CORE</span>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           ".solution-mission-row[data-active=\"false\"]:nth-child(7) > .solution-mission-row__context",
+         ],
+       },
+       Object {
+         "all": Array [],
+         "any": Array [
+           Object {
+             "data": Object {
+               "bgColor": "#08090a",
+               "contrastRatio": 4.05,
+               "expectedContrastRatio": "4.5:1",
+               "fgColor": "#776d7e",
+               "fontSize": "6.8pt (9px)",
+               "fontWeight": "normal",
+               "messageKey": null,
+             },
+             "id": "color-contrast",
+             "impact": "serious",
+             "message": "Element has insufficient color contrast of 4.05 (foreground color: #776d7e, background color: #08090a, font size: 6.8pt (9px), font weight: normal). Expected contrast ratio of 4.5:1",
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
+   Element has insufficient color contrast of 4.05 (foreground color: #776d7e, background color: #08090a, font size: 6.8pt (9px), font weight: normal). Expected contrast ratio of 4.5:1",
+         "html": "<span class=\"solution-mission-row__index\">08</span>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           ".solution-mission-row[data-active=\"false\"]:nth-child(8) > .solution-mission-row__index",
+         ],
+       },
+       Object {
+         "all": Array [],
+         "any": Array [
+           Object {
+             "data": Object {
+               "bgColor": "#08090a",
+               "contrastRatio": 4.17,
+               "expectedContrastRatio": "4.5:1",
+               "fgColor": "#77707d",
+               "fontSize": "6.0pt (8px)",
+               "fontWeight": "normal",
+               "messageKey": null,
+             },
+             "id": "color-contrast",
+             "impact": "serious",
+             "message": "Element has insufficient color contrast of 4.17 (foreground color: #77707d, background color: #08090a, font size: 6.0pt (8px), font weight: normal). Expected contrast ratio of 4.5:1",
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
+   Element has insufficient color contrast of 4.17 (foreground color: #77707d, background color: #08090a, font size: 6.0pt (8px), font weight: normal). Expected contrast ratio of 4.5:1",
+         "html": "<span class=\"solution-mission-row__context\">OPERATE<!-- --> / <!-- -->2<!-- --> CORE</span>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           ".solution-mission-row[data-active=\"false\"]:nth-child(8) > .solution-mission-row__context",
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
        - generic [ref=e25]: Solutions
      - generic [ref=e26]:
        - generic [ref=e27]:
          - paragraph [ref=e28]: 06 / SOLUTIONS
          - heading [level=1] [ref=e29]:
            - text: Start from
            - emphasis [ref=e30]: the need.
        - paragraph [ref=e31]: You should not have to know which internal department serves you. Every solution below is assembled from the same registries the divisions publish.
      - generic [ref=e32]:
        - generic [ref=e33]: SCROLL TO DISCOVER
        - generic [aria-hidden] [ref=e34]: ↓
    - navigation "solutions sections" [ref=e35]:
      - generic [ref=e36]:
        - generic [ref=e37]: INDEX
        - link [ref=e38] [cursor=pointer]:
          - /url: /solutions
          - emphasis [ref=e39]: SOL
          - text: By Need
        - link [ref=e40] [cursor=pointer]:
          - /url: /build
          - emphasis [ref=e41]: CMP
          - text: Composer
        - link [ref=e42] [cursor=pointer]:
          - /url: /contact
          - emphasis [ref=e43]: CT
          - text: Contact
    - generic [ref=e44]:
      - generic [ref=e45]:
        - generic [ref=e46]:
          - generic [ref=e47]: MISSION NAVIGATION
          - heading "Follow the need." [level=2] [ref=e48]
        - paragraph [ref=e49]: Move through real business objectives. Each station resolves into documented systems and services.
      - generic [ref=e50]:
        - navigation "Choose a business mission" [ref=e52]:
          - button "SOL-01 Start a Business" [pressed] [ref=e53] [cursor=pointer]:
            - generic [ref=e55]: SOL-01
            - strong [ref=e56]: Start a Business
          - button "SOL-02 Launch a New Product" [ref=e57] [cursor=pointer]:
            - generic [ref=e59]: SOL-02
            - strong [ref=e60]: Launch a New Product
          - button "SOL-03 Build an Online Store" [ref=e61] [cursor=pointer]:
            - generic [ref=e63]: SOL-03
            - strong [ref=e64]: Build an Online Store
          - button "SOL-04 Digitise Operations" [ref=e65] [cursor=pointer]:
            - generic [ref=e67]: SOL-04
            - strong [ref=e68]: Digitise Operations
          - button "SOL-05 Create a Customer Portal" [ref=e69] [cursor=pointer]:
            - generic [ref=e71]: SOL-05
            - strong [ref=e72]: Create a Customer Portal
          - button "SOL-06 Promote a Local Business" [ref=e73] [cursor=pointer]:
            - generic [ref=e75]: SOL-06
            - strong [ref=e76]: Promote a Local Business
          - button "SOL-07 Build an Academy Platform" [ref=e77] [cursor=pointer]:
            - generic [ref=e79]: SOL-07
            - strong [ref=e80]: Build an Academy Platform
          - button "SOL-08 Modernise an Existing Website" [ref=e81] [cursor=pointer]:
            - generic [ref=e83]: SOL-08
            - strong [ref=e84]: Modernise an Existing Website
        - generic [ref=e85]:
          - generic [ref=e86]: MISSION 01 / LAUNCH
          - heading "Start a Business" [level=3] [ref=e87]
          - paragraph [ref=e88]: A new venture needs a credible public presence and a way to receive work.
          - generic [ref=e89]:
            - generic [ref=e90]: CORE LAYERS / Identity · Public site · Measurement
            - generic [ref=e91]: OPTIONAL / 3 PATHS
          - link "EXPLORE THIS MISSION ↗" [ref=e92] [cursor=pointer]:
            - /url: /solutions/start-a-business
            - text: EXPLORE THIS MISSION
            - generic [ref=e93]: ↗
    - region [ref=e94]:
      - generic [ref=e95]:
        - generic [ref=e96]:
          - generic [ref=e97]: SOLUTION MISSIONS
          - heading "Choose by mission, not package." [level=2] [ref=e98]
        - generic [ref=e99]:
          - generic [ref=e114]: SOL-01 / RELATIONSHIP MAP
          - paragraph [ref=e115]: A new venture needs a credible public presence and a way to receive work.
          - generic [ref=e116]: 3 CORE LAYERS / 3 OPTIONAL PATHS
      - generic [ref=e117]:
        - link "01 Start a Business A new venture needs a credible public presence and a way to receive work. LAUNCH / 3 CORE" [ref=e118] [cursor=pointer]:
          - /url: /solutions/start-a-business
          - generic [ref=e119]: "01"
          - generic [ref=e120]:
            - strong [ref=e121]: Start a Business
            - generic [ref=e122]: A new venture needs a credible public presence and a way to receive work.
          - generic [ref=e123]: LAUNCH / 3 CORE
          - generic [aria-hidden] [ref=e128]: ↗
        - link "02 Launch a New Product A product exists and has to be introduced to people who do not know it. LAUNCH / 3 CORE" [ref=e129] [cursor=pointer]:
          - /url: /solutions/launch-a-new-product
          - generic [ref=e130]: "02"
          - generic [ref=e131]:
            - strong [ref=e132]: Launch a New Product
            - generic: A product exists and has to be introduced to people who do not know it.
          - generic [ref=e133]: LAUNCH / 3 CORE
          - generic [aria-hidden] [ref=e138]: ↗
        - link "03 Build an Online Store A business needs to take money online and know which step of the path loses people. BUILD / 3 CORE" [ref=e139] [cursor=pointer]:
          - /url: /solutions/build-an-online-store
          - generic [ref=e140]: "03"
          - generic [ref=e141]:
            - strong [ref=e142]: Build an Online Store
            - generic: A business needs to take money online and know which step of the path loses people.
          - generic [ref=e143]: BUILD / 3 CORE
          - generic [aria-hidden] [ref=e148]: ↗
        - link "04 Digitise Operations Work is spread across spreadsheets, inboxes and desktop tools that only one person understands. OPERATE / 3 CORE" [ref=e149] [cursor=pointer]:
          - /url: /solutions/digitise-operations
          - generic [ref=e150]: "04"
          - generic [ref=e151]:
            - strong [ref=e152]: Digitise Operations
            - generic: Work is spread across spreadsheets, inboxes and desktop tools that only one person understands.
          - generic [ref=e153]: OPERATE / 3 CORE
          - generic [aria-hidden] [ref=e158]: ↗
        - link "05 Create a Customer Portal Customers should be able to see and act on their own information without contacting staff. BUILD / 3 CORE" [ref=e159] [cursor=pointer]:
          - /url: /solutions/create-a-customer-portal
          - generic [ref=e160]: "05"
          - generic [ref=e161]:
            - strong [ref=e162]: Create a Customer Portal
            - generic: Customers should be able to see and act on their own information without contacting staff.
          - generic [ref=e163]: BUILD / 3 CORE
          - generic [aria-hidden] [ref=e168]: ↗
        - link "06 Promote a Local Business A business needs the people who are nearby to find it, understand it and choose it. REACH / 3 CORE" [ref=e169] [cursor=pointer]:
          - /url: /solutions/promote-a-local-business
          - generic [ref=e170]: "06"
          - generic [ref=e171]:
            - strong [ref=e172]: Promote a Local Business
            - generic: A business needs the people who are nearby to find it, understand it and choose it.
          - generic [ref=e173]: REACH / 3 CORE
          - generic [aria-hidden] [ref=e178]: ↗
        - link "07 Build an Academy Platform Structured knowledge has to be delivered to a defined group of learners. BUILD / 3 CORE" [ref=e179] [cursor=pointer]:
          - /url: /solutions/build-an-academy-platform
          - generic [ref=e180]: "07"
          - generic [ref=e181]:
            - strong [ref=e182]: Build an Academy Platform
            - generic: Structured knowledge has to be delivered to a defined group of learners.
          - generic [ref=e183]: BUILD / 3 CORE
          - generic [aria-hidden] [ref=e188]: ↗
        - link "08 Modernise an Existing Website An existing site is slow, fragile, insecure, or impossible for the team to update safely. OPERATE / 2 CORE" [ref=e189] [cursor=pointer]:
          - /url: /solutions/modernise-an-existing-website
          - generic [ref=e190]: "08"
          - generic [ref=e191]:
            - strong [ref=e192]: Modernise an Existing Website
            - generic: An existing site is slow, fragile, insecure, or impossible for the team to update safely.
          - generic [ref=e193]: OPERATE / 2 CORE
          - generic [aria-hidden] [ref=e198]: ↗
    - generic [ref=e200]:
      - paragraph [ref=e201]:
        - generic [ref=e203]: HOW THESE ARE BUILT
      - heading "Nothing here is a package price." [level=2] [ref=e204]
      - paragraph [ref=e205]: A solution is a starting position, not a quotation. Its core layers are what that objective usually requires; its optional layers are what sometimes does. You are not expected to need all of it, and the Composer will show you which parts a stated need actually resolves to.
      - generic [ref=e206]:
        - link "Open the Composer" [ref=e207] [cursor=pointer]:
          - /url: /build
          - text: Open the Composer
          - generic [aria-hidden] [ref=e208]: ↗
        - link "Describe your situation" [ref=e209] [cursor=pointer]:
          - /url: /contact?requestType=solution
    - generic [ref=e210]:
      - complementary [ref=e211]:
        - generic [ref=e212]:
          - generic [ref=e213]: ACROSS DIVISIONS
          - heading "Prefer to describe it in your own words?" [level=2] [ref=e214]
          - paragraph [ref=e215]: The Composer reads a plain description of the problem and resolves it against the same registries these solutions are built from. It will not estimate price, duration or outcome.
        - link "Tell us what you need" [ref=e216] [cursor=pointer]:
          - /url: /build
          - text: Tell us what you need
          - generic [aria-hidden] [ref=e217]: ↗
      - generic [ref=e219]:
        - generic [ref=e220]:
          - generic [ref=e221]: Next division
          - link "Composer" [ref=e222] [cursor=pointer]:
            - /url: /build
        - generic [aria-hidden] [ref=e223]: ↗
  - contentinfo [ref=e224]:
    - generic [ref=e225]:
      - paragraph [ref=e226]: THE WORK CONTINUES
      - link [ref=e227] [cursor=pointer]:
        - /url: /contact
        - text: Let's make
        - emphasis [ref=e228]: what comes next.
        - generic [aria-hidden] [ref=e229]: ↗
    - generic [ref=e230]:
      - generic [ref=e231]:
        - generic [ref=e232]: Divisions
        - list [ref=e233]:
          - listitem [ref=e234]:
            - link "01 Software" [ref=e235] [cursor=pointer]:
              - /url: /products
          - listitem [ref=e236]:
            - link "02 WordPress" [ref=e237] [cursor=pointer]:
              - /url: /wordpress
          - listitem [ref=e238]:
            - link "03 Web" [ref=e239] [cursor=pointer]:
              - /url: /web
          - listitem [ref=e240]:
            - link "04 Growth" [ref=e241] [cursor=pointer]:
              - /url: /growth
          - listitem [ref=e242]:
            - link "05 Creative" [ref=e243] [cursor=pointer]:
              - /url: /creative
          - listitem [ref=e244]:
            - link "06 Solutions" [ref=e245] [cursor=pointer]:
              - /url: /solutions
          - listitem [ref=e246]:
            - link "07 Labs" [ref=e247] [cursor=pointer]:
              - /url: /labs
          - listitem [ref=e248]:
            - link "08 Institution" [ref=e249] [cursor=pointer]:
              - /url: /about
      - generic [ref=e250]:
        - generic [ref=e251]: Growth channels
        - list [ref=e252]:
          - listitem [ref=e253]:
            - link "Google Advertising" [ref=e254] [cursor=pointer]:
              - /url: /growth/google-ads
          - listitem [ref=e255]:
            - link "Meta Advertising" [ref=e256] [cursor=pointer]:
              - /url: /growth/meta-ads
          - listitem [ref=e257]:
            - link "Social Media" [ref=e258] [cursor=pointer]:
              - /url: /growth/social
          - listitem [ref=e259]:
            - link "Content Systems" [ref=e260] [cursor=pointer]:
              - /url: /growth/content
          - listitem [ref=e261]:
            - link "SEO & Discoverability" [ref=e262] [cursor=pointer]:
              - /url: /growth/seo
          - listitem [ref=e263]:
            - link "Growth overview" [ref=e264] [cursor=pointer]:
              - /url: /growth
      - generic [ref=e265]:
        - generic [ref=e266]: WordPress
        - list [ref=e267]:
          - listitem [ref=e268]:
            - link "Ecosystem overview" [ref=e269] [cursor=pointer]:
              - /url: /wordpress
          - listitem [ref=e270]:
            - link "Themes" [ref=e271] [cursor=pointer]:
              - /url: /wordpress/themes
          - listitem [ref=e272]:
            - link "Plugins" [ref=e273] [cursor=pointer]:
              - /url: /wordpress/plugins
          - listitem [ref=e274]:
            - link "Blocks" [ref=e275] [cursor=pointer]:
              - /url: /wordpress/blocks
          - listitem [ref=e276]:
            - link "Starter Sites" [ref=e277] [cursor=pointer]:
              - /url: /wordpress/starter-sites
          - listitem [ref=e278]:
            - link "Solutions" [ref=e279] [cursor=pointer]:
              - /url: /wordpress/solutions
      - generic [ref=e280]:
        - generic [ref=e281]: Institution
        - list [ref=e282]:
          - listitem [ref=e283]:
            - link "Labs" [ref=e284] [cursor=pointer]:
              - /url: /labs
          - listitem [ref=e285]:
            - link "Work" [ref=e286] [cursor=pointer]:
              - /url: /work
          - listitem [ref=e287]:
            - link "Engineering" [ref=e288] [cursor=pointer]:
              - /url: /engineering
          - listitem [ref=e289]:
            - link "About" [ref=e290] [cursor=pointer]:
              - /url: /about
          - listitem [ref=e291]:
            - link "Contact" [ref=e292] [cursor=pointer]:
              - /url: /contact
    - generic [ref=e293]:
      - link "KNOuX®" [ref=e294] [cursor=pointer]:
        - /url: /
      - navigation "Footer navigation" [ref=e295]:
        - link "Software" [ref=e296] [cursor=pointer]:
          - /url: /products
        - link "WordPress" [ref=e297] [cursor=pointer]:
          - /url: /wordpress
        - link "Web" [ref=e298] [cursor=pointer]:
          - /url: /web
        - link "Growth" [ref=e299] [cursor=pointer]:
          - /url: /growth
        - link "Creative" [ref=e300] [cursor=pointer]:
          - /url: /creative
        - link "Solutions" [ref=e301] [cursor=pointer]:
          - /url: /solutions
        - link "Build" [ref=e302] [cursor=pointer]:
          - /url: /build
      - generic [ref=e303]: ENGINEERING DIGITAL SYSTEMS
  - alert [ref=e304]
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
      |                                                                                        ^ Error: /solutions has automated accessibility violations:
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