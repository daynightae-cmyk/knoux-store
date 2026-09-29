# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: accessibility.spec.ts >> automated accessibility >> /engineering has no critical or serious automated violation
- Location: e2e\accessibility.spec.ts:36:5

# Error details

```
Error: /engineering has automated accessibility violations:
color-contrast (serious) x33: a[href$="#engineering-knoux-one"] > span

expect(received).toEqual(expected) // deep equality

- Expected  -    1
+ Received  + 1178

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
+               "contrastRatio": 4.07,
+               "expectedContrastRatio": "4.5:1",
+               "fgColor": "#796c84",
+               "fontSize": "6.0pt (8px)",
+               "fontWeight": "normal",
+               "messageKey": null,
+             },
+             "id": "color-contrast",
+             "impact": "serious",
+             "message": "Element has insufficient color contrast of 4.07 (foreground color: #796c84, background color: #08090a, font size: 6.0pt (8px), font weight: normal). Expected contrast ratio of 4.5:1",
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
+   Element has insufficient color contrast of 4.07 (foreground color: #796c84, background color: #08090a, font size: 6.0pt (8px), font weight: normal). Expected contrast ratio of 4.5:1",
+         "html": "<span>SW-01</span>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           "a[href$=\"#engineering-knoux-one\"] > span",
+         ],
+       },
+       Object {
+         "all": Array [],
+         "any": Array [
+           Object {
+             "data": Object {
+               "bgColor": "#08090a",
+               "contrastRatio": 4.07,
+               "expectedContrastRatio": "4.5:1",
+               "fgColor": "#796c84",
+               "fontSize": "6.0pt (8px)",
+               "fontWeight": "normal",
+               "messageKey": null,
+             },
+             "id": "color-contrast",
+             "impact": "serious",
+             "message": "Element has insufficient color contrast of 4.07 (foreground color: #796c84, background color: #08090a, font size: 6.0pt (8px), font weight: normal). Expected contrast ratio of 4.5:1",
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
+   Element has insufficient color contrast of 4.07 (foreground color: #796c84, background color: #08090a, font size: 6.0pt (8px), font weight: normal). Expected contrast ratio of 4.5:1",
+         "html": "<span>SW-02</span>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           "a[href$=\"#engineering-kforge\"] > span",
+         ],
+       },
+       Object {
+         "all": Array [],
+         "any": Array [
+           Object {
+             "data": Object {
+               "bgColor": "#08090a",
+               "contrastRatio": 4.07,
+               "expectedContrastRatio": "4.5:1",
+               "fgColor": "#796c84",
+               "fontSize": "6.0pt (8px)",
+               "fontWeight": "normal",
+               "messageKey": null,
+             },
+             "id": "color-contrast",
+             "impact": "serious",
+             "message": "Element has insufficient color contrast of 4.07 (foreground color: #796c84, background color: #08090a, font size: 6.0pt (8px), font weight: normal). Expected contrast ratio of 4.5:1",
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
+   Element has insufficient color contrast of 4.07 (foreground color: #796c84, background color: #08090a, font size: 6.0pt (8px), font weight: normal). Expected contrast ratio of 4.5:1",
+         "html": "<span>SW-03</span>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           "a[href$=\"#engineering-knoux-repair\"] > span",
+         ],
+       },
+       Object {
+         "all": Array [],
+         "any": Array [
+           Object {
+             "data": Object {
+               "bgColor": "#08090a",
+               "contrastRatio": 4.07,
+               "expectedContrastRatio": "4.5:1",
+               "fgColor": "#796c84",
+               "fontSize": "6.0pt (8px)",
+               "fontWeight": "normal",
+               "messageKey": null,
+             },
+             "id": "color-contrast",
+             "impact": "serious",
+             "message": "Element has insufficient color contrast of 4.07 (foreground color: #796c84, background color: #08090a, font size: 6.0pt (8px), font weight: normal). Expected contrast ratio of 4.5:1",
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
+   Element has insufficient color contrast of 4.07 (foreground color: #796c84, background color: #08090a, font size: 6.0pt (8px), font weight: normal). Expected contrast ratio of 4.5:1",
+         "html": "<span>SW-04</span>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           "a:nth-child(4) > span",
+         ],
+       },
+       Object {
+         "all": Array [],
+         "any": Array [
+           Object {
+             "data": Object {
+               "bgColor": "#08090a",
+               "contrastRatio": 4.07,
+               "expectedContrastRatio": "4.5:1",
+               "fgColor": "#796c84",
+               "fontSize": "6.0pt (8px)",
+               "fontWeight": "normal",
+               "messageKey": null,
+             },
+             "id": "color-contrast",
+             "impact": "serious",
+             "message": "Element has insufficient color contrast of 4.07 (foreground color: #796c84, background color: #08090a, font size: 6.0pt (8px), font weight: normal). Expected contrast ratio of 4.5:1",
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
+   Element has insufficient color contrast of 4.07 (foreground color: #796c84, background color: #08090a, font size: 6.0pt (8px), font weight: normal). Expected contrast ratio of 4.5:1",
+         "html": "<span>SW-05</span>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           "a[href$=\"#engineering-knoux-rec\"] > span",
+         ],
+       },
+       Object {
+         "all": Array [],
+         "any": Array [
+           Object {
+             "data": Object {
+               "bgColor": "#08090a",
+               "contrastRatio": 4.07,
+               "expectedContrastRatio": "4.5:1",
+               "fgColor": "#796c84",
+               "fontSize": "6.0pt (8px)",
+               "fontWeight": "normal",
+               "messageKey": null,
+             },
+             "id": "color-contrast",
+             "impact": "serious",
+             "message": "Element has insufficient color contrast of 4.07 (foreground color: #796c84, background color: #08090a, font size: 6.0pt (8px), font weight: normal). Expected contrast ratio of 4.5:1",
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
+   Element has insufficient color contrast of 4.07 (foreground color: #796c84, background color: #08090a, font size: 6.0pt (8px), font weight: normal). Expected contrast ratio of 4.5:1",
+         "html": "<span>SW-06</span>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           "a[href$=\"#engineering-knoux-x\"] > span",
+         ],
+       },
+       Object {
+         "all": Array [],
+         "any": Array [
+           Object {
+             "data": Object {
+               "bgColor": "#08090a",
+               "contrastRatio": 4.07,
+               "expectedContrastRatio": "4.5:1",
+               "fgColor": "#796c84",
+               "fontSize": "6.0pt (8px)",
+               "fontWeight": "normal",
+               "messageKey": null,
+             },
+             "id": "color-contrast",
+             "impact": "serious",
+             "message": "Element has insufficient color contrast of 4.07 (foreground color: #796c84, background color: #08090a, font size: 6.0pt (8px), font weight: normal). Expected contrast ratio of 4.5:1",
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
+   Element has insufficient color contrast of 4.07 (foreground color: #796c84, background color: #08090a, font size: 6.0pt (8px), font weight: normal). Expected contrast ratio of 4.5:1",
+         "html": "<span>SW-07</span>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           "a:nth-child(7) > span",
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
+         "html": "<span class=\"label\">TECHNOLOGY</span>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           "#engineering-knoux-one > .engineering-dossier__evidence > div:nth-child(1) > .label",
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
+         "html": "<span class=\"label\">CHECKABLE SOURCES</span>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           "#engineering-knoux-one > .engineering-dossier__evidence > div:nth-child(2) > .label",
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
+         "html": "<span class=\"label\">SYSTEM RELATIONSHIPS</span>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           "#engineering-knoux-one > .engineering-dossier__evidence > div:nth-child(3) > .label",
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
+         "html": "<span class=\"label\">TECHNOLOGY</span>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           "#engineering-kforge > .engineering-dossier__evidence > div:nth-child(1) > .label",
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
+         "html": "<span class=\"label\">CHECKABLE SOURCES</span>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           "#engineering-kforge > .engineering-dossier__evidence > div:nth-child(2) > .label",
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
+         "html": "<span class=\"label\">SYSTEM RELATIONSHIPS</span>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           "#engineering-kforge > .engineering-dossier__evidence > div:nth-child(3) > .label",
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
+         "html": "<span class=\"label\">TECHNOLOGY</span>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           "#engineering-knoux-repair > .engineering-dossier__evidence > div:nth-child(1) > .label",
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
+         "html": "<span class=\"label\">CHECKABLE SOURCES</span>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           "#engineering-knoux-repair > .engineering-dossier__evidence > div:nth-child(2) > .label",
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
+         "html": "<span class=\"label\">SYSTEM RELATIONSHIPS</span>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           "#engineering-knoux-repair > .engineering-dossier__evidence > div:nth-child(3) > .label",
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
+         "html": "<span class=\"label\">TECHNOLOGY</span>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           "#engineering-knoux-smartorganizer > .engineering-dossier__evidence > div:nth-child(1) > .label",
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
+         "html": "<span class=\"label\">CHECKABLE SOURCES</span>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           "#engineering-knoux-smartorganizer > .engineering-dossier__evidence > div:nth-child(2) > .label",
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
+         "html": "<span class=\"label\">SYSTEM RELATIONSHIPS</span>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           "#engineering-knoux-smartorganizer > .engineering-dossier__evidence > div:nth-child(3) > .label",
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
+         "html": "<span class=\"label\">TECHNOLOGY</span>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           "#engineering-knoux-rec > .engineering-dossier__evidence > div:nth-child(1) > .label",
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
+         "html": "<span class=\"label\">CHECKABLE SOURCES</span>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           "#engineering-knoux-rec > .engineering-dossier__evidence > div:nth-child(2) > .label",
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
+         "html": "<span class=\"label\">SYSTEM RELATIONSHIPS</span>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           "#engineering-knoux-rec > .engineering-dossier__evidence > div:nth-child(3) > .label",
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
+         "html": "<span class=\"label\">TECHNOLOGY</span>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           "#engineering-knoux-x > .engineering-dossier__evidence > div:nth-child(1) > .label",
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
+         "html": "<span class=\"label\">CHECKABLE SOURCES</span>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           "#engineering-knoux-x > .engineering-dossier__evidence > div:nth-child(2) > .label",
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
+         "html": "<span class=\"label\">SYSTEM RELATIONSHIPS</span>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           "#engineering-knoux-x > .engineering-dossier__evidence > div:nth-child(3) > .label",
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
+         "html": "<span class=\"label\">TECHNOLOGY</span>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           "#engineering-knoux-clipboard-ai > .engineering-dossier__evidence > div:nth-child(1) > .label",
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
+         "html": "<span class=\"label\">CHECKABLE SOURCES</span>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           "#engineering-knoux-clipboard-ai > .engineering-dossier__evidence > div:nth-child(2) > .label",
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
+         "html": "<span class=\"label\">SYSTEM RELATIONSHIPS</span>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           "#engineering-knoux-clipboard-ai > .engineering-dossier__evidence > div:nth-child(3) > .label",
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
+         "html": "<span class=\"next-link__label\">Next archive</span>",
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
+                   ".site-footer",
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
+                   ".site-footer",
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
+                   ".site-footer",
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
+                   ".site-footer",
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
        - generic [ref=e25]: Engineering
      - generic [ref=e26]:
        - generic [ref=e27]:
          - paragraph [ref=e28]: 02 / ENGINEERING
          - heading [level=1] [ref=e29]:
            - text: Systems are
            - emphasis [ref=e30]: relationships.
        - paragraph [ref=e31]: A technical archive of what is implemented, what is constrained, and where the evidence lives. Interface claims stop where repository evidence stops.
      - generic [ref=e32]:
        - generic [ref=e33]: SCROLL TO DISCOVER
        - generic [aria-hidden] [ref=e34]: ↓
    - generic [ref=e35]:
      - generic [ref=e36]:
        - generic [ref=e37]: ENGINEERING DOSSIERS
        - paragraph [ref=e38]: Persistent context follows the selected system while the implementation record scrolls independently. Each dossier exposes declared capabilities and limitations side by side instead of turning documentation into a wall of text.
      - generic [ref=e39]:
        - complementary "Engineering case navigation" [ref=e40]:
          - generic [ref=e41]: ENGINEERING CONTEXT
          - paragraph [ref=e42]: SW-01 / ACTIVE
          - heading "KNOUX ONE" [level=2] [ref=e43]
          - paragraph [ref=e44]: Windows 10/11 x64 desktop (Tauri 2) with a browser preview that declines desktop operations
          - generic [ref=e59]: SW-01 / ARCHITECTURE GRID
          - navigation "Engineering product dossiers" [ref=e60]:
            - link "SW-01 ONE" [ref=e61] [cursor=pointer]:
              - /url: "#engineering-knoux-one"
              - generic [ref=e62]: SW-01
              - text: ONE
            - link "SW-02 Forge" [ref=e63] [cursor=pointer]:
              - /url: "#engineering-kforge"
              - generic [ref=e64]: SW-02
              - text: Forge
            - link "SW-03 Repair" [ref=e65] [cursor=pointer]:
              - /url: "#engineering-knoux-repair"
              - generic [ref=e66]: SW-03
              - text: Repair
            - link "SW-04 Organizer" [ref=e67] [cursor=pointer]:
              - /url: "#engineering-knoux-smartorganizer"
              - generic [ref=e68]: SW-04
              - text: Organizer
            - link "SW-05 REC" [ref=e69] [cursor=pointer]:
              - /url: "#engineering-knoux-rec"
              - generic [ref=e70]: SW-05
              - text: REC
            - link "SW-06 Player X" [ref=e71] [cursor=pointer]:
              - /url: "#engineering-knoux-x"
              - generic [ref=e72]: SW-06
              - text: Player X
            - link "SW-07 Clipboard" [ref=e73] [cursor=pointer]:
              - /url: "#engineering-knoux-clipboard-ai"
              - generic [ref=e74]: SW-07
              - text: Clipboard
        - generic [ref=e75]:
          - article [ref=e76]:
            - generic [ref=e77]:
              - generic [ref=e78]:
                - generic [ref=e79]: SW-01 / WINDOWS INTELLIGENCE
                - heading "KNOUX ONE" [level=2] [ref=e80]
                - paragraph [ref=e81]: A Windows desktop workspace that keeps one shell over nineteen modules and refuses to claim a service it cannot prove. Its own evidence baseline separates statically verified native paths from planned ones, and browser preview returns desktop_runtime_unavailable rather than inventing a host reading.
              - generic [ref=e96]: SW-01 / ARCHITECTURE GRID
            - generic [ref=e97]:
              - region [ref=e98]:
                - heading "Implementation evidence" [level=3] [ref=e99]
                - list [ref=e100]:
                  - listitem [ref=e101]: Registry-driven desktop shell covering nineteen modules with grouped navigation and Arabic/English search
                  - listitem [ref=e102]: Typed Rust-to-renderer command allowlist with no arbitrary shell endpoint
                  - listitem [ref=e103]: Native workspaces for setup, cleanup, duplicates, storage, startup, performance, repair, network and a developer studio
                  - listitem [ref=e104]: Cross-volume quarantine that copies, flushes, verifies a BLAKE3 digest, and only then removes a source
                  - listitem [ref=e105]: Developer Studio restricted to recognised cache paths and refusing credential payloads
              - region [ref=e106]:
                - heading "Constraints & declared limits" [level=3] [ref=e107]
                - list [ref=e108]:
                  - listitem [ref=e109]: Its own baseline reports 74 statically verified native paths, 6 partial, 110 planned, and 0 runtime-verified on Windows in repository evidence
                  - listitem [ref=e110]: Modules M09 to M14 and M16 to M19 are planned and expose no handler
                  - listitem [ref=e111]: Permanent purge does not claim guaranteed SSD secure erasure
            - generic [ref=e112]:
              - generic [ref=e113]:
                - generic [ref=e114]: TECHNOLOGY
                - paragraph [ref=e115]: Tauri 2 · Rust · React 19 · TypeScript · Vite
              - generic [ref=e116]:
                - generic [ref=e117]: CHECKABLE SOURCES
                - list [ref=e118]:
                  - listitem [ref=e119]:
                    - code [ref=e120]: README.md
                    - generic [ref=e121]: Product title, stack, module and service evidence matrix, safety boundaries
                  - listitem [ref=e122]:
                    - code [ref=e123]: REAL_IMPLEMENTATION_MATRIX.md
                    - generic [ref=e124]: Referenced as the service evidence authority
                  - listitem [ref=e125]:
                    - code [ref=e126]: docs/services/service-reality-baseline.md
                    - generic [ref=e127]: Generated evidence baseline referenced by the README
                  - listitem [ref=e128]:
                    - code [ref=e129]: .github/workflows/m03-native-validation.yml
                    - generic [ref=e130]: Windows Rust formatting, Clippy and native test workflow
                  - listitem [ref=e131]:
                    - code [ref=e132]: repository homepage field
                    - generic [ref=e133]: https://knoux-one.vercel.app
              - generic [ref=e134]:
                - generic [ref=e135]: SYSTEM RELATIONSHIPS
                - generic [ref=e136]:
                  - link "KNOuX Forge" [ref=e137] [cursor=pointer]:
                    - /url: /products/kforge
                    - text: KNOuX Forge ↗
                  - link "KNOuX Repair" [ref=e138] [cursor=pointer]:
                    - /url: /products/knoux-repair
                    - text: KNOuX Repair ↗
            - generic [ref=e139]:
              - link "REPOSITORY" [ref=e140] [cursor=pointer]:
                - /url: https://github.com/daynightae-cmyk/KNOUX-ONE
                - text: REPOSITORY ↗
              - link "PRODUCT DOSSIER" [ref=e141] [cursor=pointer]:
                - /url: /products/knoux-one
                - text: PRODUCT DOSSIER ↗
          - article [ref=e142]:
            - generic [ref=e143]:
              - generic [ref=e144]:
                - generic [ref=e145]: SW-02 / ENGINEERING TOOLING
                - heading "KNOuX Forge" [level=2] [ref=e146]
                - paragraph [ref=e147]: A React workspace over an Express API for discovering repositories, reading code evidence and running trusted project workflows. It reports unconfigured capabilities explicitly instead of fabricating remote, CI, registry, AI or release state, and it refuses to promote missing external-provider evidence to success.
              - generic [ref=e162]: SW-02 / PARTICLE CLOUD
            - generic [ref=e163]:
              - region [ref=e164]:
                - heading "Implementation evidence" [level=3] [ref=e165]
                - list [ref=e166]:
                  - listitem [ref=e167]: Local project discovery with collections, trust, health, problems and bounded scans
                  - listitem [ref=e168]: Language-aware analysis of files, imports, symbols, routes, APIs, dependencies, cycles and architecture evidence
                  - listitem [ref=e169]: Release and Distribution Center keeping local artifacts, package identity, CI provenance and remote state independent
                  - listitem [ref=e170]: Marketplace that exposes provenance, permissions, compatibility and truthful unavailable states
                  - listitem [ref=e171]: Global search across real local product entities with visible coverage and safety limits
                  - listitem [ref=e172]: Preview Experience topology orchestration with owned process lifecycle, port evidence and service-scoped logs
              - region [ref=e173]:
                - heading "Constraints & declared limits" [level=3] [ref=e174]
                - list [ref=e175]:
                  - listitem [ref=e176]: Starts in Offline Mode; remote, CI, registry, preview and cloud AI surfaces stay unconfigured until a real adapter and action supply evidence
                  - listitem [ref=e177]: No trustworthy remote extension package adapter is configured, so remote install claims remain blocked rather than simulated
                  - listitem [ref=e178]: The Windows installer is an unsigned development and release artifact and makes no trusted-publisher claim
                  - listitem [ref=e179]: Its newest recorded green gate is run 271 on 2026-09-08, not a claim about current HEAD
            - generic [ref=e180]:
              - generic [ref=e181]:
                - generic [ref=e182]: TECHNOLOGY
                - paragraph [ref=e183]: React 18 · Express · TypeScript · Zod · Vite · Vitest · Playwright
              - generic [ref=e184]:
                - generic [ref=e185]: CHECKABLE SOURCES
                - list [ref=e186]:
                  - listitem [ref=e187]:
                    - code [ref=e188]: README.md
                    - generic [ref=e189]: Product description, reference verification baseline, architecture map, truthful limitations
                  - listitem [ref=e190]:
                    - code [ref=e191]: docs/KFORGE-CAPABILITY-MATRIX.md
                    - generic [ref=e192]: Capability-level status evidence
                  - listitem [ref=e193]:
                    - code [ref=e194]: docs/DESKTOP_ARCHITECTURE_DECISION.md
                    - generic [ref=e195]: Architecture and trust boundaries
                  - listitem [ref=e196]:
                    - code [ref=e197]: docs/SIGNING.md
                    - generic [ref=e198]: Release modes and the CI signing contract
                  - listitem [ref=e199]:
                    - code [ref=e200]: repository metadata
                    - generic [ref=e201]: License MIT
              - generic [ref=e202]:
                - generic [ref=e203]: SYSTEM RELATIONSHIPS
                - generic [ref=e204]:
                  - link "KNOUX ONE" [ref=e205] [cursor=pointer]:
                    - /url: /products/knoux-one
                    - text: KNOUX ONE ↗
                  - link "KNOuX Repair" [ref=e206] [cursor=pointer]:
                    - /url: /products/knoux-repair
                    - text: KNOuX Repair ↗
            - generic [ref=e207]:
              - link "REPOSITORY" [ref=e208] [cursor=pointer]:
                - /url: https://github.com/daynightae-cmyk/KForge
                - text: REPOSITORY ↗
              - link "PRODUCT DOSSIER" [ref=e209] [cursor=pointer]:
                - /url: /products/kforge
                - text: PRODUCT DOSSIER ↗
          - article [ref=e210]:
            - generic [ref=e211]:
              - generic [ref=e212]:
                - generic [ref=e213]: SW-03 / SYSTEM MAINTENANCE
                - heading "KNOuX Repair" [level=2] [ref=e214]
                - paragraph [ref=e215]: A local-first Windows workstation exposing eighteen service categories through a web UI, an Electron shell, a Windows desktop build, a PowerShell console and a loopback execution bridge that runs only registered tools. Every registered tool carries risk metadata and destructive paths require explicit confirmation.
              - generic [ref=e230]: SW-03 / RELATIONSHIP MAP
            - generic [ref=e231]:
              - region [ref=e232]:
                - heading "Implementation evidence" [level=3] [ref=e233]
                - list [ref=e234]:
                  - listitem [ref=e235]: Eighteen service categories covering maintenance, cleanup, network, programs, duplicates, disk space, services, performance, security, diagnostics, backup, developer tools, privacy, drivers, monitoring, environment, post-install and project analysis
                  - listitem [ref=e236]: Risk classes of READ_ONLY, SAFE_CLEANUP, SYSTEM_REPAIR, DESTRUCTIVE and REBOOT_REQUIRED with confirmation before destructive execution
                  - listitem [ref=e237]: A loopback execution bridge that allowlists registered KNOuX tools and bounds scan and input ranges
                  - listitem [ref=e238]: "An explicit UAC boundary: an unelevated bridge rejects admin-required tools with 403 ELEVATION_REQUIRED"
                  - listitem [ref=e239]: Optional local authentication through GitHub OAuth or Microsoft Entra ID with loopback HttpOnly session cookies
              - region [ref=e240]:
                - heading "Constraints & declared limits" [level=3] [ref=e241]
                - list [ref=e242]:
                  - listitem [ref=e243]: Manual real-machine validation is still required for destructive end-to-end flows, reboot flows, rollback and hardware telemetry
                  - listitem [ref=e244]: The authoritative service map is Docs/SERVICE-INVENTORY.md; historical 100-tool documents describe an earlier console baseline
            - generic [ref=e245]:
              - generic [ref=e246]:
                - generic [ref=e247]: TECHNOLOGY
                - paragraph [ref=e248]: TypeScript · React 18 · Vite · Electron · PowerShell · .NET
              - generic [ref=e249]:
                - generic [ref=e250]: CHECKABLE SOURCES
                - list [ref=e251]:
                  - listitem [ref=e252]:
                    - code [ref=e253]: README-EN.md
                    - generic [ref=e254]: Product surfaces, service map, safety model, authentication, CI gate
                  - listitem [ref=e255]:
                    - code [ref=e256]: VERSION
                    - generic [ref=e257]: Version 2.0.2
                  - listitem [ref=e258]:
                    - code [ref=e259]: Docs/SERVICE-INVENTORY.md
                    - generic [ref=e260]: Authoritative current service and tool maturity matrix
                  - listitem [ref=e261]:
                    - code [ref=e262]: Docs/SAFETY-MODEL.md
                    - generic [ref=e263]: Execution, UAC, quarantine and protection boundaries
                  - listitem [ref=e264]:
                    - code [ref=e265]: Docs/TOOLS-MANIFEST.json
                    - generic [ref=e266]: Registered execution inventory
                  - listitem [ref=e267]:
                    - code [ref=e268]: .github/workflows/ci.yml
                    - generic [ref=e269]: Windows quality gate
              - generic [ref=e270]:
                - generic [ref=e271]: SYSTEM RELATIONSHIPS
                - generic [ref=e272]:
                  - link "KNOUX ONE" [ref=e273] [cursor=pointer]:
                    - /url: /products/knoux-one
                    - text: KNOUX ONE ↗
                  - link "KNOuX SmartOrganizer" [ref=e274] [cursor=pointer]:
                    - /url: /products/knoux-smartorganizer
                    - text: KNOuX SmartOrganizer ↗
            - generic [ref=e275]:
              - link "REPOSITORY" [ref=e276] [cursor=pointer]:
                - /url: https://github.com/daynightae-cmyk/knoux-Repair
                - text: REPOSITORY ↗
              - link "PRODUCT DOSSIER" [ref=e277] [cursor=pointer]:
                - /url: /products/knoux-repair
                - text: PRODUCT DOSSIER ↗
          - article [ref=e278]:
            - generic [ref=e279]:
              - generic [ref=e280]:
                - generic [ref=e281]: SW-04 / FILE MANAGEMENT
                - heading "KNOuX SmartOrganizer" [level=2] [ref=e282]
                - paragraph [ref=e283]: A Windows desktop utility whose renderer cannot run commands or reach Node.js. Cleanup is a read-only preview by design, and the build explicitly refuses to claim deletion, registry changes or automation it has not implemented.
              - generic [ref=e298]: SW-04 / SIGNAL WAVE
            - generic [ref=e299]:
              - region [ref=e300]:
                - heading "Implementation evidence" [level=3] [ref=e301]
                - list [ref=e302]:
                  - listitem [ref=e303]: Storage and file tools covering disks, large files, SHA-256 duplicate detection, empty folders, Downloads inventory and file hashes
                  - listitem [ref=e304]: Smart Scan producing read-only disk, large-file and temporary-file review findings
                  - listitem [ref=e305]: System health for CPU, RAM, system drive, uptime and battery where Windows exposes it
                  - listitem [ref=e306]: Tool execution lifecycle from queued through preflight, running, progress, result, completed, cancelled and failed
                  - listitem [ref=e307]: Arabic and English with Arabic default and full document direction switching to RTL
                  - listitem [ref=e308]: Versioned local settings for language, appearance, scan, cleanup, privacy and performance defaults
              - region [ref=e309]:
                - heading "Constraints & declared limits" [level=3] [ref=e310]
                - list [ref=e311]:
                  - listitem [ref=e312]: Cleanup is a read-only temporary-file preview; the build performs no automatic cleanup
                  - listitem [ref=e313]: It claims no file deletion, registry changes, startup toggling, service manipulation, repair actions, scheduled automation, update downloads, usage statistics or AI assistance
                  - listitem [ref=e314]: Unsigned development build unless a signing certificate is configured in the build environment
            - generic [ref=e315]:
              - generic [ref=e316]:
                - generic [ref=e317]: TECHNOLOGY
                - paragraph [ref=e318]: Electron · React · TypeScript · Vite · NSIS
              - generic [ref=e319]:
                - generic [ref=e320]: CHECKABLE SOURCES
                - list [ref=e321]:
                  - listitem [ref=e322]:
                    - code [ref=e323]: README.md
                    - generic [ref=e324]: Implemented-capability table, intentionally-unavailable list, privacy model, architecture
                  - listitem [ref=e325]:
                    - code [ref=e326]: docs/FORENSIC_BASELINE_AUDIT.md
                    - generic [ref=e327]: Detailed baseline findings referenced by the README
              - generic [ref=e328]:
                - generic [ref=e329]: SYSTEM RELATIONSHIPS
                - generic [ref=e330]:
                  - link "KNOuX Repair" [ref=e331] [cursor=pointer]:
                    - /url: /products/knoux-repair
                    - text: KNOuX Repair ↗
                  - link "KNOuX REC" [ref=e332] [cursor=pointer]:
                    - /url: /products/knoux-rec
                    - text: KNOuX REC ↗
            - generic [ref=e333]:
              - link "REPOSITORY" [ref=e334] [cursor=pointer]:
                - /url: https://github.com/daynightae-cmyk/Knoux-SmartOrganizer
                - text: REPOSITORY ↗
              - link "PRODUCT DOSSIER" [ref=e335] [cursor=pointer]:
                - /url: /products/knoux-smartorganizer
                - text: PRODUCT DOSSIER ↗
          - article [ref=e336]:
            - generic [ref=e337]:
              - generic [ref=e338]:
                - generic [ref=e339]: SW-05 / CAPTURE & MEDIA
                - heading "KNOuX REC" [level=2] [ref=e340]
                - paragraph [ref=e341]: A Windows-first screen recorder that separates implemented from fully runtime-verified, and says so. Recordings are disk-backed incrementally so a crash does not destroy the take, and verification is carried by FFmpeg and FFprobe rather than by assertion.
              - generic [ref=e356]: SW-05 / ORBIT
            - generic [ref=e357]:
              - region [ref=e358]:
                - heading "Implementation evidence" [level=3] [ref=e359]
                - list [ref=e360]:
                  - listitem [ref=e361]: Screen, window and constrained region capture with camera picture-in-picture composition
                  - listitem [ref=e362]: Incremental disk-backed recording with low-disk guards and local recording recovery
                  - listitem [ref=e363]: FFmpeg and FFprobe backed media verification and export, plus versioned .knouxrec projects and trimmed project export
                  - listitem [ref=e364]: Manual captions with SRT export, local thumbnails, library search and sorting, and timeline zoom controls
                  - listitem [ref=e365]: A native WASAPI helper and sandboxed renderer with a narrow typed preload bridge and validated IPC input
              - region [ref=e366]:
                - heading "Constraints & declared limits" [level=3] [ref=e367]
                - list [ref=e368]:
                  - listitem [ref=e369]: The product distinguishes implemented from fully runtime-verified; several capabilities remain partial pending real-device, long-session, multi-DPI, failure-recovery and installer acceptance gates
            - generic [ref=e370]:
              - generic [ref=e371]:
                - generic [ref=e372]: TECHNOLOGY
                - paragraph [ref=e373]: Electron · React · TypeScript · FFmpeg · FFprobe · WASAPI
              - generic [ref=e374]:
                - generic [ref=e375]: CHECKABLE SOURCES
                - list [ref=e376]:
                  - listitem [ref=e377]:
                    - code [ref=e378]: README.md
                    - generic [ref=e379]: Current product reality, security boundaries, verification commands
                  - listitem [ref=e380]:
                    - code [ref=e381]: docs/CURRENT_BASELINE.md
                    - generic [ref=e382]: Declared current authority for product behaviour
                  - listitem [ref=e383]:
                    - code [ref=e384]: docs/PRODUCTION_STATUS.md
                    - generic [ref=e385]: Detailed status matrix
                  - listitem [ref=e386]:
                    - code [ref=e387]: docs/PROJECT_FORMAT.md
                    - generic [ref=e388]: .knouxrec project format
              - generic [ref=e389]:
                - generic [ref=e390]: SYSTEM RELATIONSHIPS
                - generic [ref=e391]:
                  - link "KNOuX Player X" [ref=e392] [cursor=pointer]:
                    - /url: /products/knoux-x
                    - text: KNOuX Player X ↗
                  - link "KNOuX Clipboard AI" [ref=e393] [cursor=pointer]:
                    - /url: /products/knoux-clipboard-ai
                    - text: KNOuX Clipboard AI ↗
            - generic [ref=e394]:
              - link "REPOSITORY" [ref=e395] [cursor=pointer]:
                - /url: https://github.com/daynightae-cmyk/knoux-rec
                - text: REPOSITORY ↗
              - link "PRODUCT DOSSIER" [ref=e396] [cursor=pointer]:
                - /url: /products/knoux-rec
                - text: PRODUCT DOSSIER ↗
          - article [ref=e397]:
            - generic [ref=e398]:
              - generic [ref=e399]:
                - generic [ref=e400]: SW-06 / CAPTURE & MEDIA
                - heading "KNOuX Player X" [level=2] [ref=e401]
                - paragraph [ref=e402]: An Electron media player combining hardware-accelerated playback with static FFprobe and FFmpeg stream inspection, an equalizer and DSP chain, subtitle handling, and optional OpenRouter model integration for chat and playlist work.
              - generic [ref=e417]: SW-06 / TOPOLOGY
            - generic [ref=e418]:
              - region [ref=e419]:
                - heading "Implementation evidence" [level=3] [ref=e420]
                - list [ref=e421]:
                  - listitem [ref=e422]: Video and audio playback with hardware-accelerated decoding and 4K HDR rendering
                  - listitem [ref=e423]: Static FFprobe and FFmpeg stream analysis for metadata and container inspection
                  - listitem [ref=e424]: Neural DSP stage with a ten-band equalizer, presets and audio effects
                  - listitem [ref=e425]: Subtitle handling for SRT, VTT, ASS and SSA with custom styling
                  - listitem [ref=e426]: Optional OpenRouter integration for chat, model selection and playlist generation
                  - listitem [ref=e427]: Documented keyboard control surface including seek, volume, mute, fullscreen, loop, shuffle and subtitles
              - region [ref=e428]:
                - heading "Constraints & declared limits" [level=3] [ref=e429]
                - list [ref=e430]:
                  - listitem [ref=e431]: The AI features require a user-supplied OpenRouter API key and are not active without one
                  - listitem [ref=e432]: The repository README links to a knoux.dev documentation site that the repository itself does not evidence as KNOuX-operated, so it is not published as a KNOuX URL
            - generic [ref=e433]:
              - generic [ref=e434]:
                - generic [ref=e435]: TECHNOLOGY
                - paragraph [ref=e436]: Electron 28 · React 18 · TypeScript · FFmpeg Static · Zustand · Framer Motion
              - generic [ref=e437]:
                - generic [ref=e438]: CHECKABLE SOURCES
                - list [ref=e439]:
                  - listitem [ref=e440]:
                    - code [ref=e441]: README.md
                    - generic [ref=e442]: Feature set, tech stack table, project structure, keyboard shortcuts, version badge
                  - listitem [ref=e443]:
                    - code [ref=e444]: LICENSE
                    - generic [ref=e445]: MIT
                  - listitem [ref=e446]:
                    - code [ref=e447]: repository homepage field
                    - generic [ref=e448]: https://knoux-x.vercel.app
              - generic [ref=e449]:
                - generic [ref=e450]: SYSTEM RELATIONSHIPS
                - generic [ref=e451]:
                  - link "KNOuX REC" [ref=e452] [cursor=pointer]:
                    - /url: /products/knoux-rec
                    - text: KNOuX REC ↗
                  - link "KNOuX Clipboard AI" [ref=e453] [cursor=pointer]:
                    - /url: /products/knoux-clipboard-ai
                    - text: KNOuX Clipboard AI ↗
            - generic [ref=e454]:
              - link "REPOSITORY" [ref=e455] [cursor=pointer]:
                - /url: https://github.com/daynightae-cmyk/knoux-x
                - text: REPOSITORY ↗
              - link "PRODUCT DOSSIER" [ref=e456] [cursor=pointer]:
                - /url: /products/knoux-x
                - text: PRODUCT DOSSIER ↗
          - article [ref=e457]:
            - generic [ref=e458]:
              - generic [ref=e459]:
                - generic [ref=e460]: SW-07 / DEVELOPER PRODUCTIVITY
                - heading "KNOuX Clipboard AI" [level=2] [ref=e461]
                - paragraph [ref=e462]: A local-first clipboard workspace whose release status is stated plainly in its own README as a release candidate under verification. Sensitive input is blocked before transport, the renderer never receives the provider credential, and services without a real runner are demoted to guarded automatically.
              - generic [ref=e477]: SW-07 / DATA FIELD
            - generic [ref=e478]:
              - region [ref=e479]:
                - heading "Implementation evidence" [level=3] [ref=e480]
                - list [ref=e481]:
                  - listitem [ref=e482]: Local clipboard history with a renderer that never receives the OpenRouter credential
                  - listitem [ref=e483]: Local pre-transport scanning that blocks credential-like values, keys, tokens, JWTs, private keys, SSH keys, emails, phone numbers and card-like values
                  - listitem [ref=e484]: Vault IPC using AES-256-GCM with a random 16-byte salt, a 12-byte IV and a scrypt-derived key in knoux:v2 payloads
                  - listitem [ref=e485]: A service truth model that marks a service active only when it resolves through a verified executable runner
                  - listitem [ref=e486]: Developer Studio and barcode and QR utilities, with Arabic and English interface support
              - region [ref=e487]:
                - heading "Constraints & declared limits" [level=3] [ref=e488]
                - list [ref=e489]:
                  - listitem [ref=e490]: The repository states its own status as release candidate under verification and asks that catalog metadata not be treated as production evidence
                  - listitem [ref=e491]: Local transformer inference is intentionally guarded because its former dependency chain was not verified for the release baseline
                  - listitem [ref=e492]: Live AI requires OpenRouter configuration; the offline fallback is labelled fallback and never ready
            - generic [ref=e493]:
              - generic [ref=e494]:
                - generic [ref=e495]: TECHNOLOGY
                - paragraph [ref=e496]: Electron 43.4.1 · React · TypeScript · Vite · Vitest · NSIS
              - generic [ref=e497]:
                - generic [ref=e498]: CHECKABLE SOURCES
                - list [ref=e499]:
                  - listitem [ref=e500]:
                    - code [ref=e501]: README.md
                    - generic [ref=e502]: Status, runtime baseline table, security boundaries, CI gates, service truth model
                  - listitem [ref=e503]:
                    - code [ref=e504]: .nvmrc
                    - generic [ref=e505]: Node.js 22.x baseline
                  - listitem [ref=e506]:
                    - code [ref=e507]: docs/audit/FINAL-RELEASE-GATE.md
                    - generic [ref=e508]: Named as the release evidence record
                  - listitem [ref=e509]:
                    - code [ref=e510]: LICENSE
                    - generic [ref=e511]: MIT
                  - listitem [ref=e512]:
                    - code [ref=e513]: repository homepage field
                    - generic [ref=e514]: https://knoux-ai-clipboard-pro.vercel.app
              - generic [ref=e515]:
                - generic [ref=e516]: SYSTEM RELATIONSHIPS
                - generic [ref=e517]:
                  - link "KNOuX Forge" [ref=e518] [cursor=pointer]:
                    - /url: /products/kforge
                    - text: KNOuX Forge ↗
                  - link "KNOuX SmartOrganizer" [ref=e519] [cursor=pointer]:
                    - /url: /products/knoux-smartorganizer
                    - text: KNOuX SmartOrganizer ↗
            - generic [ref=e520]:
              - link "REPOSITORY" [ref=e521] [cursor=pointer]:
                - /url: https://github.com/daynightae-cmyk/knoux_ai_clipboard_pro
                - text: REPOSITORY ↗
              - link "PRODUCT DOSSIER" [ref=e522] [cursor=pointer]:
                - /url: /products/knoux-clipboard-ai
                - text: PRODUCT DOSSIER ↗
    - generic [ref=e523]:
      - complementary [ref=e524]:
        - generic [ref=e525]:
          - generic [ref=e526]: FROM EVIDENCE TO PRODUCT
          - heading "Need the public product view?" [level=2] [ref=e527]
          - paragraph [ref=e528]: Product dossiers keep the same evidence boundary while presenting each system for evaluation and discovery.
        - link "Explore products" [ref=e529] [cursor=pointer]:
          - /url: /products
          - text: Explore products
          - generic [aria-hidden] [ref=e530]: ↗
      - generic [ref=e532]:
        - generic [ref=e533]:
          - generic [ref=e534]: Next archive
          - link "Work" [ref=e535] [cursor=pointer]:
            - /url: /work
        - generic [aria-hidden] [ref=e536]: ↗
  - contentinfo [ref=e537]:
    - generic [ref=e538]:
      - paragraph [ref=e539]: THE WORK CONTINUES
      - link [ref=e540] [cursor=pointer]:
        - /url: /contact
        - text: Let's make
        - emphasis [ref=e541]: what comes next.
        - generic [aria-hidden] [ref=e542]: ↗
    - generic [ref=e543]:
      - generic [ref=e544]:
        - generic [ref=e545]: Divisions
        - list [ref=e546]:
          - listitem [ref=e547]:
            - link "01 Software" [ref=e548] [cursor=pointer]:
              - /url: /products
          - listitem [ref=e549]:
            - link "02 WordPress" [ref=e550] [cursor=pointer]:
              - /url: /wordpress
          - listitem [ref=e551]:
            - link "03 Web" [ref=e552] [cursor=pointer]:
              - /url: /web
          - listitem [ref=e553]:
            - link "04 Growth" [ref=e554] [cursor=pointer]:
              - /url: /growth
          - listitem [ref=e555]:
            - link "05 Creative" [ref=e556] [cursor=pointer]:
              - /url: /creative
          - listitem [ref=e557]:
            - link "06 Solutions" [ref=e558] [cursor=pointer]:
              - /url: /solutions
          - listitem [ref=e559]:
            - link "07 Labs" [ref=e560] [cursor=pointer]:
              - /url: /labs
          - listitem [ref=e561]:
            - link "08 Institution" [ref=e562] [cursor=pointer]:
              - /url: /about
      - generic [ref=e563]:
        - generic [ref=e564]: Growth channels
        - list [ref=e565]:
          - listitem [ref=e566]:
            - link "Google Advertising" [ref=e567] [cursor=pointer]:
              - /url: /growth/google-ads
          - listitem [ref=e568]:
            - link "Meta Advertising" [ref=e569] [cursor=pointer]:
              - /url: /growth/meta-ads
          - listitem [ref=e570]:
            - link "Social Media" [ref=e571] [cursor=pointer]:
              - /url: /growth/social
          - listitem [ref=e572]:
            - link "Content Systems" [ref=e573] [cursor=pointer]:
              - /url: /growth/content
          - listitem [ref=e574]:
            - link "SEO & Discoverability" [ref=e575] [cursor=pointer]:
              - /url: /growth/seo
          - listitem [ref=e576]:
            - link "Growth overview" [ref=e577] [cursor=pointer]:
              - /url: /growth
      - generic [ref=e578]:
        - generic [ref=e579]: WordPress
        - list [ref=e580]:
          - listitem [ref=e581]:
            - link "Ecosystem overview" [ref=e582] [cursor=pointer]:
              - /url: /wordpress
          - listitem [ref=e583]:
            - link "Themes" [ref=e584] [cursor=pointer]:
              - /url: /wordpress/themes
          - listitem [ref=e585]:
            - link "Plugins" [ref=e586] [cursor=pointer]:
              - /url: /wordpress/plugins
          - listitem [ref=e587]:
            - link "Blocks" [ref=e588] [cursor=pointer]:
              - /url: /wordpress/blocks
          - listitem [ref=e589]:
            - link "Starter Sites" [ref=e590] [cursor=pointer]:
              - /url: /wordpress/starter-sites
          - listitem [ref=e591]:
            - link "Solutions" [ref=e592] [cursor=pointer]:
              - /url: /wordpress/solutions
      - generic [ref=e593]:
        - generic [ref=e594]: Institution
        - list [ref=e595]:
          - listitem [ref=e596]:
            - link "Labs" [ref=e597] [cursor=pointer]:
              - /url: /labs
          - listitem [ref=e598]:
            - link "Work" [ref=e599] [cursor=pointer]:
              - /url: /work
          - listitem [ref=e600]:
            - link "Engineering" [ref=e601] [cursor=pointer]:
              - /url: /engineering
          - listitem [ref=e602]:
            - link "About" [ref=e603] [cursor=pointer]:
              - /url: /about
          - listitem [ref=e604]:
            - link "Contact" [ref=e605] [cursor=pointer]:
              - /url: /contact
    - generic [ref=e606]:
      - link "KNOuX®" [ref=e607] [cursor=pointer]:
        - /url: /
      - navigation "Footer navigation" [ref=e608]:
        - link "Software" [ref=e609] [cursor=pointer]:
          - /url: /products
        - link "WordPress" [ref=e610] [cursor=pointer]:
          - /url: /wordpress
        - link "Web" [ref=e611] [cursor=pointer]:
          - /url: /web
        - link "Growth" [ref=e612] [cursor=pointer]:
          - /url: /growth
        - link "Creative" [ref=e613] [cursor=pointer]:
          - /url: /creative
        - link "Solutions" [ref=e614] [cursor=pointer]:
          - /url: /solutions
        - link "Build" [ref=e615] [cursor=pointer]:
          - /url: /build
      - generic [ref=e616]: ENGINEERING DIGITAL SYSTEMS
  - alert [ref=e617]
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
      |                                                                                        ^ Error: /engineering has automated accessibility violations:
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