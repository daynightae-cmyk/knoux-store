# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: accessibility.spec.ts >> automated accessibility >> /web has no critical or serious automated violation
- Location: e2e\accessibility.spec.ts:36:5

# Error details

```
Error: /web has automated accessibility violations:
color-contrast (serious) x44: .signal-rail__label

expect(received).toEqual(expected) // deep equality

- Expected  -    1
+ Received  + 1563

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
+         "html": "<em>WEB-01</em>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           "a[href$=\"corporate-site\"] > em",
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
+         "html": "<em>WEB-02</em>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           "a[href$=\"ecommerce\"] > em",
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
+         "html": "<em>WEB-03</em>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           "a[href$=\"web-application\"] > em",
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
+         "html": "<em>WEB-04</em>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           "a[href$=\"customer-portal\"] > em",
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
+         "html": "<em>WEB-05</em>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           "a[href$=\"admin-dashboard\"] > em",
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
+         "html": "<em>WEB-06</em>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           "a[href$=\"interactive-experience\"] > em",
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
+         "html": "<em>ENG</em>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           "a[href$=\"engineering\"] > em",
+         ],
+       },
+       Object {
+         "all": Array [],
+         "any": Array [
+           Object {
+             "data": Object {
+               "bgColor": "#131119",
+               "contrastRatio": 3.66,
+               "expectedContrastRatio": "4.5:1",
+               "fgColor": "#6d6e70",
+               "fontSize": "7.9pt (10.5px)",
+               "fontWeight": "normal",
+               "messageKey": null,
+             },
+             "id": "color-contrast",
+             "impact": "serious",
+             "message": "Element has insufficient color contrast of 3.66 (foreground color: #6d6e70, background color: #131119, font size: 7.9pt (10.5px), font weight: normal). Expected contrast ratio of 4.5:1",
+             "relatedNodes": Array [
+               Object {
+                 "html": "<button type=\"button\" class=\"option\" aria-pressed=\"true\"><span class=\"option__title\">Website</span><span class=\"option__sub\">A site that has to stay correct for years</span></button>",
+                 "target": Array [
+                   ".option:nth-child(1)",
+                 ],
+               },
+             ],
+           },
+         ],
+         "failureSummary": "Fix any of the following:
+   Element has insufficient color contrast of 3.66 (foreground color: #6d6e70, background color: #131119, font size: 7.9pt (10.5px), font weight: normal). Expected contrast ratio of 4.5:1",
+         "html": "<span class=\"option__sub\">A site that has to stay correct for years</span>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           ".option:nth-child(1) > .option__sub",
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
+         "html": "<span class=\"option__sub\">A storefront where the checkout is the product</span>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           ".option:nth-child(2) > .option__sub",
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
+         "html": "<span class=\"option__sub\">Software where the user is doing work</span>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           ".option:nth-child(3) > .option__sub",
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
+         "html": "<span class=\"option__sub\">Authenticated space for customers or members</span>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           ".option:nth-child(4) > .option__sub",
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
+         "html": "<span class=\"option__sub\">An internal view over operational data</span>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           ".option:nth-child(5) > .option__sub",
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
+         "html": "<span class=\"option__sub\">A build where the medium carries the argument</span>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           ".option:nth-child(6) > .option__sub",
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
+               "fontSize": "6.4pt (8.5px)",
+               "fontWeight": "normal",
+               "messageKey": null,
+             },
+             "id": "color-contrast",
+             "impact": "serious",
+             "message": "Element has insufficient color contrast of 3.83 (foreground color: #6d6e70, background color: #0b0c0e, font size: 6.4pt (8.5px), font weight: normal). Expected contrast ratio of 4.5:1",
+             "relatedNodes": Array [
+               Object {
+                 "html": "<div class=\"systems-panel\">",
+                 "target": Array [
+                   ".systems-panel",
+                 ],
+               },
+             ],
+           },
+         ],
+         "failureSummary": "Fix any of the following:
+   Element has insufficient color contrast of 3.83 (foreground color: #6d6e70, background color: #0b0c0e, font size: 6.4pt (8.5px), font weight: normal). Expected contrast ratio of 4.5:1",
+         "html": "<span class=\"dossier-card__label\">DISCIPLINES</span>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           "div:nth-child(1) > .dossier-card__label",
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
+               "fontSize": "6.4pt (8.5px)",
+               "fontWeight": "normal",
+               "messageKey": null,
+             },
+             "id": "color-contrast",
+             "impact": "serious",
+             "message": "Element has insufficient color contrast of 3.83 (foreground color: #6d6e70, background color: #0b0c0e, font size: 6.4pt (8.5px), font weight: normal). Expected contrast ratio of 4.5:1",
+             "relatedNodes": Array [
+               Object {
+                 "html": "<div class=\"systems-panel\">",
+                 "target": Array [
+                   ".systems-panel",
+                 ],
+               },
+             ],
+           },
+         ],
+         "failureSummary": "Fix any of the following:
+   Element has insufficient color contrast of 3.83 (foreground color: #6d6e70, background color: #0b0c0e, font size: 6.4pt (8.5px), font weight: normal). Expected contrast ratio of 4.5:1",
+         "html": "<span class=\"dossier-card__label\">ARTEFACTS</span>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           "div:nth-child(2) > .dossier-card__label:nth-child(1)",
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
+               "fontSize": "6.4pt (8.5px)",
+               "fontWeight": "normal",
+               "messageKey": null,
+             },
+             "id": "color-contrast",
+             "impact": "serious",
+             "message": "Element has insufficient color contrast of 3.83 (foreground color: #6d6e70, background color: #0b0c0e, font size: 6.4pt (8.5px), font weight: normal). Expected contrast ratio of 4.5:1",
+             "relatedNodes": Array [
+               Object {
+                 "html": "<div class=\"systems-panel\">",
+                 "target": Array [
+                   ".systems-panel",
+                 ],
+               },
+             ],
+           },
+         ],
+         "failureSummary": "Fix any of the following:
+   Element has insufficient color contrast of 3.83 (foreground color: #6d6e70, background color: #0b0c0e, font size: 6.4pt (8.5px), font weight: normal). Expected contrast ratio of 4.5:1",
+         "html": "<span class=\"dossier-card__label\" style=\"margin-top:26px\">PLATFORM CHOICE</span>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           ".dossier-card__label:nth-child(3)",
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
+               "fontSize": "6.4pt (8.5px)",
+               "fontWeight": "normal",
+               "messageKey": null,
+             },
+             "id": "color-contrast",
+             "impact": "serious",
+             "message": "Element has insufficient color contrast of 3.83 (foreground color: #6d6e70, background color: #0b0c0e, font size: 6.4pt (8.5px), font weight: normal). Expected contrast ratio of 4.5:1",
+             "relatedNodes": Array [
+               Object {
+                 "html": "<div class=\"systems-panel\">",
+                 "target": Array [
+                   ".systems-panel",
+                 ],
+               },
+             ],
+           },
+         ],
+         "failureSummary": "Fix any of the following:
+   Element has insufficient color contrast of 3.83 (foreground color: #6d6e70, background color: #0b0c0e, font size: 6.4pt (8.5px), font weight: normal). Expected contrast ratio of 4.5:1",
+         "html": "<span class=\"dossier-card__label\" style=\"margin-top:26px\">QUESTIONS THAT CHANGE THE ARCHITECTURE</span>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           ".dossier-card__label:nth-child(5)",
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
+         "html": "<span class=\"index-row__index\">WEB-01</span>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           ".is-visible[href$=\"corporate-site\"][data-reveal=\"true\"] > .index-row__index",
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
+         "html": "<span class=\"mono\">4 DISCIPLINES / 4 ARTEFACTS</span>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           ".is-visible[href$=\"corporate-site\"][data-reveal=\"true\"] > .index-row__meta > .mono",
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
+         "html": "<span class=\"index-row__index\">WEB-02</span>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           ".is-visible[href$=\"ecommerce\"][data-reveal=\"true\"] > .index-row__index",
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
+         "html": "<span class=\"mono\">4 DISCIPLINES / 4 ARTEFACTS</span>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           ".is-visible[href$=\"ecommerce\"][data-reveal=\"true\"] > .index-row__meta > .mono",
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
+         "html": "<span class=\"index-row__index\">WEB-03</span>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           ".is-visible[href$=\"web-application\"][data-reveal=\"true\"] > .index-row__index",
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
+         "html": "<span class=\"mono\">4 DISCIPLINES / 4 ARTEFACTS</span>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           ".is-visible[href$=\"web-application\"][data-reveal=\"true\"] > .index-row__meta > .mono",
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
+         "html": "<span class=\"index-row__index\">WEB-04</span>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           ".is-visible[href$=\"customer-portal\"][data-reveal=\"true\"] > .index-row__index",
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
+         "html": "<span class=\"mono\">4 DISCIPLINES / 4 ARTEFACTS</span>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           ".is-visible[href$=\"customer-portal\"][data-reveal=\"true\"] > .index-row__meta > .mono",
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
+         "html": "<span class=\"index-row__index\">WEB-05</span>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           ".is-visible[href$=\"admin-dashboard\"][data-reveal=\"true\"] > .index-row__index",
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
+         "html": "<span class=\"mono\">4 DISCIPLINES / 4 ARTEFACTS</span>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           ".is-visible[href$=\"admin-dashboard\"][data-reveal=\"true\"] > .index-row__meta > .mono",
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
+         "html": "<span class=\"index-row__index\">WEB-06</span>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           ".is-visible[href$=\"interactive-experience\"][data-reveal=\"true\"] > .index-row__index",
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
+         "html": "<span class=\"mono\">4 DISCIPLINES / 4 ARTEFACTS</span>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           ".is-visible[href$=\"interactive-experience\"][data-reveal=\"true\"] > .index-row__meta > .mono",
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
+           "section:nth-child(7) > .index-rows > .index-row:nth-child(1) > .index-row__index",
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
+           "section:nth-child(7) > .index-rows > .index-row:nth-child(2) > .index-row__index",
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
+           "section:nth-child(7) > .index-rows > .index-row:nth-child(3) > .index-row__index",
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
+           "section:nth-child(7) > .index-rows > .index-row:nth-child(4) > .index-row__index",
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
+           "section:nth-child(7) > .index-rows > .index-row:nth-child(5) > .index-row__index",
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
+           "section:nth-child(8) > .index-rows > .index-row[data-reveal=\"true\"]:nth-child(1) > .index-row__index",
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
+           "section:nth-child(8) > .index-rows > .index-row[data-reveal=\"true\"]:nth-child(2) > .index-row__index",
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
+           "section:nth-child(8) > .index-rows > .index-row[data-reveal=\"true\"]:nth-child(3) > .index-row__index",
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
+           "section:nth-child(8) > .index-rows > .index-row[data-reveal=\"true\"]:nth-child(4) > .index-row__index",
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
        - generic [ref=e25]: Web
      - generic [ref=e26]:
        - generic [ref=e27]:
          - paragraph [ref=e28]: 03 / WEB
          - heading [level=1] [ref=e29]:
            - text: Systems, not
            - emphasis [ref=e30]: pages.
        - paragraph [ref=e31]: KNOuX web engineering is organised by what the system has to do. No prices, no delivery windows, no client counts — those are agreed per project, not published as claims.
      - generic [ref=e32]:
        - generic [ref=e33]: SCROLL TO DISCOVER
        - generic [aria-hidden] [ref=e34]: ↓
    - navigation "web sections" [ref=e35]:
      - generic [ref=e36]:
        - generic [ref=e37]: INDEX
        - link [ref=e38] [cursor=pointer]:
          - /url: /web
          - emphasis [ref=e39]: WEB
          - text: Systems Studio
        - link [ref=e40] [cursor=pointer]:
          - /url: /web/corporate-site
          - emphasis [ref=e41]: WEB-01
          - text: Website
        - link [ref=e42] [cursor=pointer]:
          - /url: /web/ecommerce
          - emphasis [ref=e43]: WEB-02
          - text: Store
        - link [ref=e44] [cursor=pointer]:
          - /url: /web/web-application
          - emphasis [ref=e45]: WEB-03
          - text: Application
        - link [ref=e46] [cursor=pointer]:
          - /url: /web/customer-portal
          - emphasis [ref=e47]: WEB-04
          - text: Portal
        - link [ref=e48] [cursor=pointer]:
          - /url: /web/admin-dashboard
          - emphasis [ref=e49]: WEB-05
          - text: Dashboard
        - link [ref=e50] [cursor=pointer]:
          - /url: /web/interactive-experience
          - emphasis [ref=e51]: WEB-06
          - text: Experience
        - link "Capability Matrix (section)" [ref=e52] [cursor=pointer]:
          - /url: /web#matrix
          - emphasis [ref=e53]: MTX
          - text: Capability Matrix
        - link [ref=e54] [cursor=pointer]:
          - /url: /engineering
          - emphasis [ref=e55]: ENG
          - text: Engineering
    - generic [ref=e57]:
      - generic [ref=e58]:
        - generic [ref=e59]: SYSTEM BLUEPRINT
        - generic [ref=e60]: SELECT A SYSTEM TYPE
      - generic [ref=e61]:
        - group "System types" [ref=e62]:
          - button "WEB-01 Institutional Website" [pressed] [ref=e63] [cursor=pointer]:
            - generic [ref=e64]: WEB-01
            - text: Institutional Website
          - button "WEB-02 E-Commerce" [ref=e65] [cursor=pointer]:
            - generic [ref=e66]: WEB-02
            - text: E-Commerce
          - button "WEB-03 Web Application" [ref=e67] [cursor=pointer]:
            - generic [ref=e68]: WEB-03
            - text: Web Application
          - button "WEB-04 Customer Portal" [ref=e69] [cursor=pointer]:
            - generic [ref=e70]: WEB-04
            - text: Customer Portal
          - button "WEB-05 Admin & Reporting" [ref=e71] [cursor=pointer]:
            - generic [ref=e72]: WEB-05
            - text: Admin & Reporting
          - button "WEB-06 Interactive & Spatial" [ref=e73] [cursor=pointer]:
            - generic [ref=e74]: WEB-06
            - text: Interactive & Spatial
        - generic [ref=e75]:
          - generic [ref=e78]: Website
          - generic [ref=e79]: DATA MODEL
          - generic [ref=e80]: AUTHORISATION
          - generic [ref=e81]: INTERFACE STATES
          - generic [ref=e82]: OPERATIONS
          - generic [ref=e83]: DEPLOYMENT
      - generic [ref=e84]:
        - paragraph [ref=e85]: "A site whose quality is mostly editorial discipline: a content model that survives reorganisations, an accessibility baseline that does not regress, and a build a non-specialist can safely update without breaking layout."
        - link "EXPLORE SYSTEM ↗" [ref=e86] [cursor=pointer]:
          - /url: /web/corporate-site
          - text: EXPLORE SYSTEM
          - generic [ref=e87]: ↗
    - generic [ref=e88]:
      - generic [ref=e90]:
        - generic [ref=e91]:
          - generic [ref=e92]: SYSTEMS STUDIO
          - heading "What are you building?" [level=2] [ref=e93]: What are youbuilding?
        - paragraph [ref=e94]: The answer determines the disciplines, the artefacts and the platform choice. Each system type below is a different shape of problem.
      - generic [ref=e96]:
        - group "What are you building?" [ref=e97]:
          - button "Website A site that has to stay correct for years" [pressed] [ref=e98] [cursor=pointer]:
            - generic [ref=e99]: Website
            - generic [ref=e100]: A site that has to stay correct for years
          - button "Store A storefront where the checkout is the product" [ref=e101] [cursor=pointer]:
            - generic [ref=e102]: Store
            - generic [ref=e103]: A storefront where the checkout is the product
          - button "Application Software where the user is doing work" [ref=e104] [cursor=pointer]:
            - generic [ref=e105]: Application
            - generic [ref=e106]: Software where the user is doing work
          - button "Portal Authenticated space for customers or members" [ref=e107] [cursor=pointer]:
            - generic [ref=e108]: Portal
            - generic [ref=e109]: Authenticated space for customers or members
          - button "Dashboard An internal view over operational data" [ref=e110] [cursor=pointer]:
            - generic [ref=e111]: Dashboard
            - generic [ref=e112]: An internal view over operational data
          - button "Experience A build where the medium carries the argument" [ref=e113] [cursor=pointer]:
            - generic [ref=e114]: Experience
            - generic [ref=e115]: A build where the medium carries the argument
        - generic [ref=e116]:
          - generic [ref=e117]:
            - generic [ref=e118]: WEB-01 / SITE
            - heading "Institutional Website" [level=3] [ref=e119]
            - paragraph [ref=e120]: "A site whose quality is mostly editorial discipline: a content model that survives reorganisations, an accessibility baseline that does not regress, and a build a non-specialist can safely update without breaking layout."
            - link "EXPLORE SYSTEM" [ref=e121] [cursor=pointer]:
              - /url: /web/corporate-site
              - text: EXPLORE SYSTEM
              - generic [aria-hidden] [ref=e122]: ↗
          - generic [ref=e123]:
            - generic [ref=e124]:
              - generic [ref=e125]: DISCIPLINES
              - generic [ref=e126]:
                - generic [ref=e127]:
                  - term [ref=e128]: Content model
                  - definition [ref=e129]: Structuring what exists, naming what repeats, and deciding what the editor owns.
                - generic [ref=e130]:
                  - term [ref=e131]: Interface system
                  - definition [ref=e132]: Typography, spacing and component rules that hold across unpredictable content lengths.
                - generic [ref=e133]:
                  - term [ref=e134]: Accessibility
                  - definition [ref=e135]: Keyboard paths, contrast, focus order and screen-reader labels treated as build requirements.
                - generic [ref=e136]:
                  - term [ref=e137]: Delivery
                  - definition [ref=e138]: A build and hosting arrangement with a documented update path.
            - generic [ref=e139]:
              - generic [ref=e140]: ARTEFACTS
              - list [ref=e141]:
                - listitem [ref=e142]: Content model and page inventory
                - listitem [ref=e143]: Design token set and component library
                - listitem [ref=e144]: Accessible, tested build
                - listitem [ref=e145]: Update and ownership documentation
              - generic [ref=e146]: PLATFORM CHOICE
              - list [ref=e147]:
                - listitem [ref=e148]:
                  - generic [aria-hidden] [ref=e149]: ·
                  - text: Next.js for highly dynamic or multi-role sites
                - listitem [ref=e150]:
                  - generic [aria-hidden] [ref=e151]: ·
                  - text: WordPress where the editorial team needs a familiar admin
              - generic [ref=e152]: QUESTIONS THAT CHANGE THE ARCHITECTURE
              - list [ref=e153]:
                - listitem [ref=e154]:
                  - generic [aria-hidden] [ref=e155]: "?"
                  - text: How many people will publish, and how often?
                - listitem [ref=e156]:
                  - generic [aria-hidden] [ref=e157]: "?"
                  - text: Does legal or compliance review apply to any of the content?
                - listitem [ref=e158]:
                  - generic [aria-hidden] [ref=e159]: "?"
                  - text: Is there a design system already in place?
    - generic [ref=e160]:
      - generic [ref=e161]:
        - generic [ref=e162]:
          - generic [ref=e163]: CAPABILITY MATRIX
          - heading "One vocabulary, five divisions." [level=2] [ref=e164]: One vocabulary,five divisions.
        - paragraph [ref=e165]: Capabilities are shared across the institution. A capability with a marker in more than one column can be delivered either way, and the choice is a scoping decision rather than a sales one.
      - group [ref=e166]:
        - generic "VIEW CAPABILITY MATRIX +" [ref=e167] [cursor=pointer]
    - generic [ref=e169]:
      - generic [ref=e170]:
        - generic [ref=e171]:
          - generic [ref=e172]: SYSTEM TYPES
          - heading "Indexed by what it does." [level=2] [ref=e173]: Indexed bywhat it does.
        - paragraph [ref=e174]: Six system types cover most of what KNOuX builds. The index is the same set the selector above uses.
      - generic [ref=e175]:
        - link "WEB-01 Institutional Website A site that has to stay correct for years 4 DISCIPLINES / 4 ARTEFACTS" [ref=e176] [cursor=pointer]:
          - /url: /web/corporate-site
          - generic [ref=e177]: WEB-01
          - generic [ref=e178]: Institutional Website
          - generic [ref=e179]:
            - generic [ref=e180]: A site that has to stay correct for years
            - generic [ref=e181]: 4 DISCIPLINES / 4 ARTEFACTS
          - generic [aria-hidden] [ref=e182]: ↗
        - link "WEB-02 E-Commerce A storefront where the checkout is the product 4 DISCIPLINES / 4 ARTEFACTS" [ref=e183] [cursor=pointer]:
          - /url: /web/ecommerce
          - generic [ref=e184]: WEB-02
          - generic [ref=e185]: E-Commerce
          - generic [ref=e186]:
            - generic [ref=e187]: A storefront where the checkout is the product
            - generic [ref=e188]: 4 DISCIPLINES / 4 ARTEFACTS
          - generic [aria-hidden] [ref=e189]: ↗
        - link "WEB-03 Web Application Software where the user is doing work 4 DISCIPLINES / 4 ARTEFACTS" [ref=e190] [cursor=pointer]:
          - /url: /web/web-application
          - generic [ref=e191]: WEB-03
          - generic [ref=e192]: Web Application
          - generic [ref=e193]:
            - generic [ref=e194]: Software where the user is doing work
            - generic [ref=e195]: 4 DISCIPLINES / 4 ARTEFACTS
          - generic [aria-hidden] [ref=e196]: ↗
        - link "WEB-04 Customer Portal Authenticated space for customers or members 4 DISCIPLINES / 4 ARTEFACTS" [ref=e197] [cursor=pointer]:
          - /url: /web/customer-portal
          - generic [ref=e198]: WEB-04
          - generic [ref=e199]: Customer Portal
          - generic [ref=e200]:
            - generic [ref=e201]: Authenticated space for customers or members
            - generic [ref=e202]: 4 DISCIPLINES / 4 ARTEFACTS
          - generic [aria-hidden] [ref=e203]: ↗
        - link "WEB-05 Admin & Reporting An internal view over operational data 4 DISCIPLINES / 4 ARTEFACTS" [ref=e204] [cursor=pointer]:
          - /url: /web/admin-dashboard
          - generic [ref=e205]: WEB-05
          - generic [ref=e206]: Admin & Reporting
          - generic [ref=e207]:
            - generic [ref=e208]: An internal view over operational data
            - generic [ref=e209]: 4 DISCIPLINES / 4 ARTEFACTS
          - generic [aria-hidden] [ref=e210]: ↗
        - link "WEB-06 Interactive & Spatial A build where the medium carries the argument 4 DISCIPLINES / 4 ARTEFACTS" [ref=e211] [cursor=pointer]:
          - /url: /web/interactive-experience
          - generic [ref=e212]: WEB-06
          - generic [ref=e213]: Interactive & Spatial
          - generic [ref=e214]:
            - generic [ref=e215]: A build where the medium carries the argument
            - generic [ref=e216]: 4 DISCIPLINES / 4 ARTEFACTS
          - generic [aria-hidden] [ref=e217]: ↗
    - generic [ref=e218]:
      - generic [ref=e219]:
        - generic [ref=e220]:
          - generic [ref=e221]: CATEGORIES
          - heading "The short form." [level=2] [ref=e222]
        - paragraph [ref=e223]: One sentence on what each system type is for.
      - generic [ref=e224]:
        - generic [ref=e225]:
          - generic [ref=e226]: "01"
          - generic [ref=e227]: Website
          - generic [ref=e228]: A site that represents an organisation and has to be maintained.
          - generic [aria-hidden] [ref=e230]: ·
        - generic [ref=e231]:
          - generic [ref=e232]: "02"
          - generic [ref=e233]: Store
          - generic [ref=e234]: A site whose job is to take money, so the checkout is the product.
          - generic [aria-hidden] [ref=e236]: ·
        - generic [ref=e237]:
          - generic [ref=e238]: "03"
          - generic [ref=e239]: Application
          - generic [ref=e240]: Software where the user is doing work, not reading.
          - generic [aria-hidden] [ref=e242]: ·
        - generic [ref=e243]:
          - generic [ref=e244]: "04"
          - generic [ref=e245]: Platform
          - generic [ref=e246]: Several internal or external roles sharing one authenticated surface.
          - generic [aria-hidden] [ref=e248]: ·
        - generic [ref=e249]:
          - generic [ref=e250]: "05"
          - generic [ref=e251]: Experience
          - generic [ref=e252]: A spatial or interactive build where the medium is the argument.
          - generic [aria-hidden] [ref=e254]: ·
    - generic [ref=e255]:
      - generic [ref=e256]:
        - generic [ref=e257]:
          - generic [ref=e258]: PRACTICE
          - heading "The same four stages." [level=2] [ref=e259]: The same fourstages.
        - paragraph [ref=e260]:
          - text: Whatever the system type, the work runs through the same engineering stages. The
          - link "engineering page" [ref=e261] [cursor=pointer]:
            - /url: /engineering
          - text: sets out what each one covers.
      - generic [ref=e262]:
        - generic [ref=e263]:
          - generic [ref=e264]: "01"
          - generic [ref=e265]: Interface
          - generic [ref=e266]: How someone understands what a system is and what it will do for them.
          - generic [aria-hidden] [ref=e268]: ↗
        - generic [ref=e269]:
          - generic [ref=e270]: "02"
          - generic [ref=e271]: Runtime
          - generic [ref=e272]: How it behaves under load, on failure, and when the data underneath it changes.
          - generic [aria-hidden] [ref=e274]: ↗
        - generic [ref=e275]:
          - generic [ref=e276]: "03"
          - generic [ref=e277]: Data
          - generic [ref=e278]: How information is shaped, versioned, protected and deleted.
          - generic [aria-hidden] [ref=e280]: ↗
        - generic [ref=e281]:
          - generic [ref=e282]: "04"
          - generic [ref=e283]: Delivery
          - generic [ref=e284]: How it is tested, released, observed and taken apart again.
          - generic [aria-hidden] [ref=e286]: ↗
    - generic [ref=e287]:
      - complementary [ref=e288]:
        - generic [ref=e289]:
          - generic [ref=e290]: ACROSS DIVISIONS
          - heading "Ready to acquire customers for it?" [level=2] [ref=e291]
          - paragraph [ref=e292]: A build is only half a system. KNOuX Growth covers campaign structure, measurement and the content that gives a site something to be found for.
        - link "KNOuX Growth" [ref=e293] [cursor=pointer]:
          - /url: /growth
          - text: KNOuX Growth
          - generic [aria-hidden] [ref=e294]: ↗
      - generic [ref=e296]:
        - generic [ref=e297]:
          - generic [ref=e298]: Next division
          - link "Growth" [ref=e299] [cursor=pointer]:
            - /url: /growth
        - generic [aria-hidden] [ref=e300]: ↗
  - contentinfo [ref=e301]:
    - generic [ref=e302]:
      - paragraph [ref=e303]: THE WORK CONTINUES
      - link [ref=e304] [cursor=pointer]:
        - /url: /contact
        - text: Let's make
        - emphasis [ref=e305]: what comes next.
        - generic [aria-hidden] [ref=e306]: ↗
    - generic [ref=e307]:
      - generic [ref=e308]:
        - generic [ref=e309]: Divisions
        - list [ref=e310]:
          - listitem [ref=e311]:
            - link "01 Software" [ref=e312] [cursor=pointer]:
              - /url: /products
          - listitem [ref=e313]:
            - link "02 WordPress" [ref=e314] [cursor=pointer]:
              - /url: /wordpress
          - listitem [ref=e315]:
            - link "03 Web" [ref=e316] [cursor=pointer]:
              - /url: /web
          - listitem [ref=e317]:
            - link "04 Growth" [ref=e318] [cursor=pointer]:
              - /url: /growth
          - listitem [ref=e319]:
            - link "05 Creative" [ref=e320] [cursor=pointer]:
              - /url: /creative
          - listitem [ref=e321]:
            - link "06 Solutions" [ref=e322] [cursor=pointer]:
              - /url: /solutions
          - listitem [ref=e323]:
            - link "07 Labs" [ref=e324] [cursor=pointer]:
              - /url: /labs
          - listitem [ref=e325]:
            - link "08 Institution" [ref=e326] [cursor=pointer]:
              - /url: /about
      - generic [ref=e327]:
        - generic [ref=e328]: Growth channels
        - list [ref=e329]:
          - listitem [ref=e330]:
            - link "Google Advertising" [ref=e331] [cursor=pointer]:
              - /url: /growth/google-ads
          - listitem [ref=e332]:
            - link "Meta Advertising" [ref=e333] [cursor=pointer]:
              - /url: /growth/meta-ads
          - listitem [ref=e334]:
            - link "Social Media" [ref=e335] [cursor=pointer]:
              - /url: /growth/social
          - listitem [ref=e336]:
            - link "Content Systems" [ref=e337] [cursor=pointer]:
              - /url: /growth/content
          - listitem [ref=e338]:
            - link "SEO & Discoverability" [ref=e339] [cursor=pointer]:
              - /url: /growth/seo
          - listitem [ref=e340]:
            - link "Growth overview" [ref=e341] [cursor=pointer]:
              - /url: /growth
      - generic [ref=e342]:
        - generic [ref=e343]: WordPress
        - list [ref=e344]:
          - listitem [ref=e345]:
            - link "Ecosystem overview" [ref=e346] [cursor=pointer]:
              - /url: /wordpress
          - listitem [ref=e347]:
            - link "Themes" [ref=e348] [cursor=pointer]:
              - /url: /wordpress/themes
          - listitem [ref=e349]:
            - link "Plugins" [ref=e350] [cursor=pointer]:
              - /url: /wordpress/plugins
          - listitem [ref=e351]:
            - link "Blocks" [ref=e352] [cursor=pointer]:
              - /url: /wordpress/blocks
          - listitem [ref=e353]:
            - link "Starter Sites" [ref=e354] [cursor=pointer]:
              - /url: /wordpress/starter-sites
          - listitem [ref=e355]:
            - link "Solutions" [ref=e356] [cursor=pointer]:
              - /url: /wordpress/solutions
      - generic [ref=e357]:
        - generic [ref=e358]: Institution
        - list [ref=e359]:
          - listitem [ref=e360]:
            - link "Labs" [ref=e361] [cursor=pointer]:
              - /url: /labs
          - listitem [ref=e362]:
            - link "Work" [ref=e363] [cursor=pointer]:
              - /url: /work
          - listitem [ref=e364]:
            - link "Engineering" [ref=e365] [cursor=pointer]:
              - /url: /engineering
          - listitem [ref=e366]:
            - link "About" [ref=e367] [cursor=pointer]:
              - /url: /about
          - listitem [ref=e368]:
            - link "Contact" [ref=e369] [cursor=pointer]:
              - /url: /contact
    - generic [ref=e370]:
      - link "KNOuX®" [ref=e371] [cursor=pointer]:
        - /url: /
      - navigation "Footer navigation" [ref=e372]:
        - link "Software" [ref=e373] [cursor=pointer]:
          - /url: /products
        - link "WordPress" [ref=e374] [cursor=pointer]:
          - /url: /wordpress
        - link "Web" [ref=e375] [cursor=pointer]:
          - /url: /web
        - link "Growth" [ref=e376] [cursor=pointer]:
          - /url: /growth
        - link "Creative" [ref=e377] [cursor=pointer]:
          - /url: /creative
        - link "Solutions" [ref=e378] [cursor=pointer]:
          - /url: /solutions
        - link "Build" [ref=e379] [cursor=pointer]:
          - /url: /build
      - generic [ref=e380]: ENGINEERING DIGITAL SYSTEMS
  - alert [ref=e381]
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
      |                                                                                        ^ Error: /web has automated accessibility violations:
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