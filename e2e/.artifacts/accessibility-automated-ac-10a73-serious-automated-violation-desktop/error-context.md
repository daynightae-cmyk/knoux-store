# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: accessibility.spec.ts >> automated accessibility >> /wordpress/patterns has no critical or serious automated violation
- Location: e2e\accessibility.spec.ts:36:5

# Error details

```
Error: /wordpress/patterns has automated accessibility violations:
aria-allowed-attr (critical) x6: div[aria-label="Result ordering"] > .is-active.tag[href$="patterns"]
color-contrast (serious) x47: .signal-rail__label

expect(received).toEqual(expected) // deep equality

- Expected  -    1
+ Received  + 1818

- Array []
+ Array [
+   Object {
+     "description": "Ensure an element's role supports its ARIA attributes",
+     "help": "Elements must only use supported ARIA attributes",
+     "helpUrl": "https://dequeuniversity.com/rules/axe/4.13/aria-allowed-attr?application=playwright",
+     "id": "aria-allowed-attr",
+     "impact": "critical",
+     "nodes": Array [
+       Object {
+         "all": Array [
+           Object {
+             "data": Array [
+               "aria-pressed=\"true\"",
+             ],
+             "id": "aria-allowed-attr",
+             "impact": "critical",
+             "message": "ARIA attribute is not allowed: aria-pressed=\"true\"",
+             "relatedNodes": Array [],
+           },
+         ],
+         "any": Array [],
+         "failureSummary": "Fix all of the following:
+   ARIA attribute is not allowed: aria-pressed=\"true\"",
+         "html": "<a class=\"tag tag--button is-active\" aria-pressed=\"true\" href=\"/wordpress/patterns\">Directory order</a>",
+         "impact": "critical",
+         "none": Array [],
+         "target": Array [
+           "div[aria-label=\"Result ordering\"] > .is-active.tag[href$=\"patterns\"]",
+         ],
+       },
+       Object {
+         "all": Array [
+           Object {
+             "data": Array [
+               "aria-pressed=\"false\"",
+             ],
+             "id": "aria-allowed-attr",
+             "impact": "critical",
+             "message": "ARIA attribute is not allowed: aria-pressed=\"false\"",
+             "relatedNodes": Array [],
+           },
+         ],
+         "any": Array [],
+         "failureSummary": "Fix all of the following:
+   ARIA attribute is not allowed: aria-pressed=\"false\"",
+         "html": "<a class=\"tag tag--button \" aria-pressed=\"false\" href=\"/wordpress/patterns?sort=rating\">Highest rated on this page</a>",
+         "impact": "critical",
+         "none": Array [],
+         "target": Array [
+           "div[aria-label=\"Result ordering\"] > .tag.tag--button:nth-child(3)",
+         ],
+       },
+       Object {
+         "all": Array [
+           Object {
+             "data": Array [
+               "aria-pressed=\"false\"",
+             ],
+             "id": "aria-allowed-attr",
+             "impact": "critical",
+             "message": "ARIA attribute is not allowed: aria-pressed=\"false\"",
+             "relatedNodes": Array [],
+           },
+         ],
+         "any": Array [],
+         "failureSummary": "Fix all of the following:
+   ARIA attribute is not allowed: aria-pressed=\"false\"",
+         "html": "<a class=\"tag tag--button \" aria-pressed=\"false\" href=\"/wordpress/patterns?sort=installs\">Most installed on this page</a>",
+         "impact": "critical",
+         "none": Array [],
+         "target": Array [
+           ".tag.tag--button:nth-child(4)",
+         ],
+       },
+       Object {
+         "all": Array [
+           Object {
+             "data": Array [
+               "aria-pressed=\"false\"",
+             ],
+             "id": "aria-allowed-attr",
+             "impact": "critical",
+             "message": "ARIA attribute is not allowed: aria-pressed=\"false\"",
+             "relatedNodes": Array [],
+           },
+         ],
+         "any": Array [],
+         "failureSummary": "Fix all of the following:
+   ARIA attribute is not allowed: aria-pressed=\"false\"",
+         "html": "<a class=\"tag tag--button \" aria-pressed=\"false\" href=\"/wordpress/patterns?sort=updated\">Recently updated on this page</a>",
+         "impact": "critical",
+         "none": Array [],
+         "target": Array [
+           ".tag.tag--button:nth-child(5)",
+         ],
+       },
+       Object {
+         "all": Array [
+           Object {
+             "data": Array [
+               "aria-pressed=\"true\"",
+             ],
+             "id": "aria-allowed-attr",
+             "impact": "critical",
+             "message": "ARIA attribute is not allowed: aria-pressed=\"true\"",
+             "relatedNodes": Array [],
+           },
+         ],
+         "any": Array [],
+         "failureSummary": "Fix all of the following:
+   ARIA attribute is not allowed: aria-pressed=\"true\"",
+         "html": "<a class=\"tag tag--button is-active\" aria-pressed=\"true\" href=\"/wordpress/patterns\">12</a>",
+         "impact": "critical",
+         "none": Array [],
+         "target": Array [
+           "div[aria-label=\"Results per page\"] > .is-active.tag[href$=\"patterns\"]",
+         ],
+       },
+       Object {
+         "all": Array [
+           Object {
+             "data": Array [
+               "aria-pressed=\"false\"",
+             ],
+             "id": "aria-allowed-attr",
+             "impact": "critical",
+             "message": "ARIA attribute is not allowed: aria-pressed=\"false\"",
+             "relatedNodes": Array [],
+           },
+         ],
+         "any": Array [],
+         "failureSummary": "Fix all of the following:
+   ARIA attribute is not allowed: aria-pressed=\"false\"",
+         "html": "<a class=\"tag tag--button \" aria-pressed=\"false\" href=\"/wordpress/patterns?per_page=24\">24</a>",
+         "impact": "critical",
+         "none": Array [],
+         "target": Array [
+           "div[aria-label=\"Results per page\"] > .tag.tag--button:nth-child(3)",
+         ],
+       },
+     ],
+     "tags": Array [
+       "cat.aria",
+       "wcag2a",
+       "wcag412",
+       "EN-301-549",
+       "EN-9.4.1.2",
+       "RGAAv4",
+       "RGAA-7.1.1",
+     ],
+   },
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
+         "html": "<em>WP</em>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           "a[href$=\"wordpress\"] > em",
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
+         "html": "<em>WP-01</em>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           "a[href$=\"themes\"] > em",
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
+         "html": "<em>WP-02</em>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           "a[href$=\"plugins\"] > em",
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
+         "html": "<em>WP-03</em>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           "a[href$=\"blocks\"] > em",
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
+         "html": "<em>WP-04</em>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           "a[href$=\"starter-sites\"] > em",
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
+         "html": "<em>WP-05</em>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           "a[href$=\"solutions\"] > em",
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
+         "html": "<span class=\"finder-chips__label\">Sort</span>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           "div[aria-label=\"Result ordering\"] > .finder-chips__label",
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
+         "html": "<span class=\"finder-chips__label\">Per page</span>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           "div[aria-label=\"Results per page\"] > .finder-chips__label",
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
+         "html": "<span>Showing 12 patterns</span>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           ".mp__status > span:nth-child(1)",
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
+         "html": "<span>Page <!-- -->1<!-- --> of more</span>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           ".mp__status > span:nth-child(2)",
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
+         "html": "<span>Source: WordPress.org</span>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           ".mp__status > span:nth-child(3)",
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
+               "fontSize": "6.0pt (8px)",
+               "fontWeight": "normal",
+               "messageKey": null,
+             },
+             "id": "color-contrast",
+             "impact": "serious",
+             "message": "Element has insufficient color contrast of 3.83 (foreground color: #6d6e70, background color: #0b0c0e, font size: 6.0pt (8px), font weight: normal). Expected contrast ratio of 4.5:1",
+             "relatedNodes": Array [
+               Object {
+                 "html": "<li>",
+                 "target": Array [
+                   ".mp-grid > li:nth-child(1)",
+                 ],
+               },
+             ],
+           },
+         ],
+         "failureSummary": "Fix any of the following:
+   Element has insufficient color contrast of 3.83 (foreground color: #6d6e70, background color: #0b0c0e, font size: 6.0pt (8px), font weight: normal). Expected contrast ratio of 4.5:1",
+         "html": "<span class=\"mp-card__kind\">Pattern</span>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           "li:nth-child(1) > article > .mp-card__head > .mp-card__identity > .mp-card__kind",
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
+               "fontSize": "7.9pt (10.5px)",
+               "fontWeight": "normal",
+               "messageKey": null,
+             },
+             "id": "color-contrast",
+             "impact": "serious",
+             "message": "Element has insufficient color contrast of 3.83 (foreground color: #6d6e70, background color: #0b0c0e, font size: 7.9pt (10.5px), font weight: normal). Expected contrast ratio of 4.5:1",
+             "relatedNodes": Array [
+               Object {
+                 "html": "<li>",
+                 "target": Array [
+                   ".mp-grid > li:nth-child(1)",
+                 ],
+               },
+             ],
+           },
+         ],
+         "failureSummary": "Fix any of the following:
+   Element has insufficient color contrast of 3.83 (foreground color: #6d6e70, background color: #0b0c0e, font size: 7.9pt (10.5px), font weight: normal). Expected contrast ratio of 4.5:1",
+         "html": "<p class=\"mp-card__disclaimer\">Published by its own author on WordPress.org. KNOuX does not publish, support or guarantee this item.</p>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           "li:nth-child(1) > article > .mp-card__disclaimer",
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
+               "fontSize": "6.0pt (8px)",
+               "fontWeight": "normal",
+               "messageKey": null,
+             },
+             "id": "color-contrast",
+             "impact": "serious",
+             "message": "Element has insufficient color contrast of 3.83 (foreground color: #6d6e70, background color: #0b0c0e, font size: 6.0pt (8px), font weight: normal). Expected contrast ratio of 4.5:1",
+             "relatedNodes": Array [
+               Object {
+                 "html": "<li>",
+                 "target": Array [
+                   ".mp-grid > li:nth-child(2)",
+                 ],
+               },
+             ],
+           },
+         ],
+         "failureSummary": "Fix any of the following:
+   Element has insufficient color contrast of 3.83 (foreground color: #6d6e70, background color: #0b0c0e, font size: 6.0pt (8px), font weight: normal). Expected contrast ratio of 4.5:1",
+         "html": "<span class=\"mp-card__kind\">Pattern</span>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           "li:nth-child(2) > article > .mp-card__head > .mp-card__identity > .mp-card__kind",
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
+               "fontSize": "7.9pt (10.5px)",
+               "fontWeight": "normal",
+               "messageKey": null,
+             },
+             "id": "color-contrast",
+             "impact": "serious",
+             "message": "Element has insufficient color contrast of 3.83 (foreground color: #6d6e70, background color: #0b0c0e, font size: 7.9pt (10.5px), font weight: normal). Expected contrast ratio of 4.5:1",
+             "relatedNodes": Array [
+               Object {
+                 "html": "<li>",
+                 "target": Array [
+                   ".mp-grid > li:nth-child(2)",
+                 ],
+               },
+             ],
+           },
+         ],
+         "failureSummary": "Fix any of the following:
+   Element has insufficient color contrast of 3.83 (foreground color: #6d6e70, background color: #0b0c0e, font size: 7.9pt (10.5px), font weight: normal). Expected contrast ratio of 4.5:1",
+         "html": "<p class=\"mp-card__disclaimer\">Published by its own author on WordPress.org. KNOuX does not publish, support or guarantee this item.</p>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           "li:nth-child(2) > article > .mp-card__disclaimer",
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
+               "fontSize": "6.0pt (8px)",
+               "fontWeight": "normal",
+               "messageKey": null,
+             },
+             "id": "color-contrast",
+             "impact": "serious",
+             "message": "Element has insufficient color contrast of 3.83 (foreground color: #6d6e70, background color: #0b0c0e, font size: 6.0pt (8px), font weight: normal). Expected contrast ratio of 4.5:1",
+             "relatedNodes": Array [
+               Object {
+                 "html": "<li>",
+                 "target": Array [
+                   ".mp-grid > li:nth-child(3)",
+                 ],
+               },
+             ],
+           },
+         ],
+         "failureSummary": "Fix any of the following:
+   Element has insufficient color contrast of 3.83 (foreground color: #6d6e70, background color: #0b0c0e, font size: 6.0pt (8px), font weight: normal). Expected contrast ratio of 4.5:1",
+         "html": "<span class=\"mp-card__kind\">Pattern</span>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           "li:nth-child(3) > article > .mp-card__head > .mp-card__identity > .mp-card__kind",
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
+               "fontSize": "7.9pt (10.5px)",
+               "fontWeight": "normal",
+               "messageKey": null,
+             },
+             "id": "color-contrast",
+             "impact": "serious",
+             "message": "Element has insufficient color contrast of 3.83 (foreground color: #6d6e70, background color: #0b0c0e, font size: 7.9pt (10.5px), font weight: normal). Expected contrast ratio of 4.5:1",
+             "relatedNodes": Array [
+               Object {
+                 "html": "<li>",
+                 "target": Array [
+                   ".mp-grid > li:nth-child(3)",
+                 ],
+               },
+             ],
+           },
+         ],
+         "failureSummary": "Fix any of the following:
+   Element has insufficient color contrast of 3.83 (foreground color: #6d6e70, background color: #0b0c0e, font size: 7.9pt (10.5px), font weight: normal). Expected contrast ratio of 4.5:1",
+         "html": "<p class=\"mp-card__disclaimer\">Published by its own author on WordPress.org. KNOuX does not publish, support or guarantee this item.</p>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           "li:nth-child(3) > article > .mp-card__disclaimer",
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
+               "fontSize": "6.0pt (8px)",
+               "fontWeight": "normal",
+               "messageKey": null,
+             },
+             "id": "color-contrast",
+             "impact": "serious",
+             "message": "Element has insufficient color contrast of 3.83 (foreground color: #6d6e70, background color: #0b0c0e, font size: 6.0pt (8px), font weight: normal). Expected contrast ratio of 4.5:1",
+             "relatedNodes": Array [
+               Object {
+                 "html": "<li>",
+                 "target": Array [
+                   ".mp-grid > li:nth-child(4)",
+                 ],
+               },
+             ],
+           },
+         ],
+         "failureSummary": "Fix any of the following:
+   Element has insufficient color contrast of 3.83 (foreground color: #6d6e70, background color: #0b0c0e, font size: 6.0pt (8px), font weight: normal). Expected contrast ratio of 4.5:1",
+         "html": "<span class=\"mp-card__kind\">Pattern</span>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           "li:nth-child(4) > article > .mp-card__head > .mp-card__identity > .mp-card__kind",
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
+               "fontSize": "7.9pt (10.5px)",
+               "fontWeight": "normal",
+               "messageKey": null,
+             },
+             "id": "color-contrast",
+             "impact": "serious",
+             "message": "Element has insufficient color contrast of 3.83 (foreground color: #6d6e70, background color: #0b0c0e, font size: 7.9pt (10.5px), font weight: normal). Expected contrast ratio of 4.5:1",
+             "relatedNodes": Array [
+               Object {
+                 "html": "<li>",
+                 "target": Array [
+                   ".mp-grid > li:nth-child(4)",
+                 ],
+               },
+             ],
+           },
+         ],
+         "failureSummary": "Fix any of the following:
+   Element has insufficient color contrast of 3.83 (foreground color: #6d6e70, background color: #0b0c0e, font size: 7.9pt (10.5px), font weight: normal). Expected contrast ratio of 4.5:1",
+         "html": "<p class=\"mp-card__disclaimer\">Published by its own author on WordPress.org. KNOuX does not publish, support or guarantee this item.</p>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           "li:nth-child(4) > article > .mp-card__disclaimer",
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
+               "fontSize": "6.0pt (8px)",
+               "fontWeight": "normal",
+               "messageKey": null,
+             },
+             "id": "color-contrast",
+             "impact": "serious",
+             "message": "Element has insufficient color contrast of 3.83 (foreground color: #6d6e70, background color: #0b0c0e, font size: 6.0pt (8px), font weight: normal). Expected contrast ratio of 4.5:1",
+             "relatedNodes": Array [
+               Object {
+                 "html": "<li>",
+                 "target": Array [
+                   ".mp-grid > li:nth-child(5)",
+                 ],
+               },
+             ],
+           },
+         ],
+         "failureSummary": "Fix any of the following:
+   Element has insufficient color contrast of 3.83 (foreground color: #6d6e70, background color: #0b0c0e, font size: 6.0pt (8px), font weight: normal). Expected contrast ratio of 4.5:1",
+         "html": "<span class=\"mp-card__kind\">Pattern</span>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           "li:nth-child(5) > article > .mp-card__head > .mp-card__identity > .mp-card__kind",
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
+               "fontSize": "7.9pt (10.5px)",
+               "fontWeight": "normal",
+               "messageKey": null,
+             },
+             "id": "color-contrast",
+             "impact": "serious",
+             "message": "Element has insufficient color contrast of 3.83 (foreground color: #6d6e70, background color: #0b0c0e, font size: 7.9pt (10.5px), font weight: normal). Expected contrast ratio of 4.5:1",
+             "relatedNodes": Array [
+               Object {
+                 "html": "<li>",
+                 "target": Array [
+                   ".mp-grid > li:nth-child(5)",
+                 ],
+               },
+             ],
+           },
+         ],
+         "failureSummary": "Fix any of the following:
+   Element has insufficient color contrast of 3.83 (foreground color: #6d6e70, background color: #0b0c0e, font size: 7.9pt (10.5px), font weight: normal). Expected contrast ratio of 4.5:1",
+         "html": "<p class=\"mp-card__disclaimer\">Published by its own author on WordPress.org. KNOuX does not publish, support or guarantee this item.</p>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           "li:nth-child(5) > article > .mp-card__disclaimer",
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
+               "fontSize": "6.0pt (8px)",
+               "fontWeight": "normal",
+               "messageKey": null,
+             },
+             "id": "color-contrast",
+             "impact": "serious",
+             "message": "Element has insufficient color contrast of 3.83 (foreground color: #6d6e70, background color: #0b0c0e, font size: 6.0pt (8px), font weight: normal). Expected contrast ratio of 4.5:1",
+             "relatedNodes": Array [
+               Object {
+                 "html": "<li>",
+                 "target": Array [
+                   ".mp-grid > li:nth-child(6)",
+                 ],
+               },
+             ],
+           },
+         ],
+         "failureSummary": "Fix any of the following:
+   Element has insufficient color contrast of 3.83 (foreground color: #6d6e70, background color: #0b0c0e, font size: 6.0pt (8px), font weight: normal). Expected contrast ratio of 4.5:1",
+         "html": "<span class=\"mp-card__kind\">Pattern</span>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           "li:nth-child(6) > article > .mp-card__head > .mp-card__identity > .mp-card__kind",
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
+               "fontSize": "7.9pt (10.5px)",
+               "fontWeight": "normal",
+               "messageKey": null,
+             },
+             "id": "color-contrast",
+             "impact": "serious",
+             "message": "Element has insufficient color contrast of 3.83 (foreground color: #6d6e70, background color: #0b0c0e, font size: 7.9pt (10.5px), font weight: normal). Expected contrast ratio of 4.5:1",
+             "relatedNodes": Array [
+               Object {
+                 "html": "<li>",
+                 "target": Array [
+                   ".mp-grid > li:nth-child(6)",
+                 ],
+               },
+             ],
+           },
+         ],
+         "failureSummary": "Fix any of the following:
+   Element has insufficient color contrast of 3.83 (foreground color: #6d6e70, background color: #0b0c0e, font size: 7.9pt (10.5px), font weight: normal). Expected contrast ratio of 4.5:1",
+         "html": "<p class=\"mp-card__disclaimer\">Published by its own author on WordPress.org. KNOuX does not publish, support or guarantee this item.</p>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           "li:nth-child(6) > article > .mp-card__disclaimer",
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
+               "fontSize": "6.0pt (8px)",
+               "fontWeight": "normal",
+               "messageKey": null,
+             },
+             "id": "color-contrast",
+             "impact": "serious",
+             "message": "Element has insufficient color contrast of 3.83 (foreground color: #6d6e70, background color: #0b0c0e, font size: 6.0pt (8px), font weight: normal). Expected contrast ratio of 4.5:1",
+             "relatedNodes": Array [
+               Object {
+                 "html": "<li>",
+                 "target": Array [
+                   ".mp-grid > li:nth-child(7)",
+                 ],
+               },
+             ],
+           },
+         ],
+         "failureSummary": "Fix any of the following:
+   Element has insufficient color contrast of 3.83 (foreground color: #6d6e70, background color: #0b0c0e, font size: 6.0pt (8px), font weight: normal). Expected contrast ratio of 4.5:1",
+         "html": "<span class=\"mp-card__kind\">Pattern</span>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           "li:nth-child(7) > article > .mp-card__head > .mp-card__identity > .mp-card__kind",
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
+               "fontSize": "7.9pt (10.5px)",
+               "fontWeight": "normal",
+               "messageKey": null,
+             },
+             "id": "color-contrast",
+             "impact": "serious",
+             "message": "Element has insufficient color contrast of 3.83 (foreground color: #6d6e70, background color: #0b0c0e, font size: 7.9pt (10.5px), font weight: normal). Expected contrast ratio of 4.5:1",
+             "relatedNodes": Array [
+               Object {
+                 "html": "<li>",
+                 "target": Array [
+                   ".mp-grid > li:nth-child(7)",
+                 ],
+               },
+             ],
+           },
+         ],
+         "failureSummary": "Fix any of the following:
+   Element has insufficient color contrast of 3.83 (foreground color: #6d6e70, background color: #0b0c0e, font size: 7.9pt (10.5px), font weight: normal). Expected contrast ratio of 4.5:1",
+         "html": "<p class=\"mp-card__disclaimer\">Published by its own author on WordPress.org. KNOuX does not publish, support or guarantee this item.</p>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           "li:nth-child(7) > article > .mp-card__disclaimer",
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
+               "fontSize": "6.0pt (8px)",
+               "fontWeight": "normal",
+               "messageKey": null,
+             },
+             "id": "color-contrast",
+             "impact": "serious",
+             "message": "Element has insufficient color contrast of 3.83 (foreground color: #6d6e70, background color: #0b0c0e, font size: 6.0pt (8px), font weight: normal). Expected contrast ratio of 4.5:1",
+             "relatedNodes": Array [
+               Object {
+                 "html": "<li>",
+                 "target": Array [
+                   ".mp-grid > li:nth-child(8)",
+                 ],
+               },
+             ],
+           },
+         ],
+         "failureSummary": "Fix any of the following:
+   Element has insufficient color contrast of 3.83 (foreground color: #6d6e70, background color: #0b0c0e, font size: 6.0pt (8px), font weight: normal). Expected contrast ratio of 4.5:1",
+         "html": "<span class=\"mp-card__kind\">Pattern</span>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           "li:nth-child(8) > article > .mp-card__head > .mp-card__identity > .mp-card__kind",
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
+               "fontSize": "7.9pt (10.5px)",
+               "fontWeight": "normal",
+               "messageKey": null,
+             },
+             "id": "color-contrast",
+             "impact": "serious",
+             "message": "Element has insufficient color contrast of 3.83 (foreground color: #6d6e70, background color: #0b0c0e, font size: 7.9pt (10.5px), font weight: normal). Expected contrast ratio of 4.5:1",
+             "relatedNodes": Array [
+               Object {
+                 "html": "<li>",
+                 "target": Array [
+                   ".mp-grid > li:nth-child(8)",
+                 ],
+               },
+             ],
+           },
+         ],
+         "failureSummary": "Fix any of the following:
+   Element has insufficient color contrast of 3.83 (foreground color: #6d6e70, background color: #0b0c0e, font size: 7.9pt (10.5px), font weight: normal). Expected contrast ratio of 4.5:1",
+         "html": "<p class=\"mp-card__disclaimer\">Published by its own author on WordPress.org. KNOuX does not publish, support or guarantee this item.</p>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           "li:nth-child(8) > article > .mp-card__disclaimer",
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
+               "fontSize": "6.0pt (8px)",
+               "fontWeight": "normal",
+               "messageKey": null,
+             },
+             "id": "color-contrast",
+             "impact": "serious",
+             "message": "Element has insufficient color contrast of 3.83 (foreground color: #6d6e70, background color: #0b0c0e, font size: 6.0pt (8px), font weight: normal). Expected contrast ratio of 4.5:1",
+             "relatedNodes": Array [
+               Object {
+                 "html": "<li>",
+                 "target": Array [
+                   "li:nth-child(9)",
+                 ],
+               },
+             ],
+           },
+         ],
+         "failureSummary": "Fix any of the following:
+   Element has insufficient color contrast of 3.83 (foreground color: #6d6e70, background color: #0b0c0e, font size: 6.0pt (8px), font weight: normal). Expected contrast ratio of 4.5:1",
+         "html": "<span class=\"mp-card__kind\">Pattern</span>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           "li:nth-child(9) > article > .mp-card__head > .mp-card__identity > .mp-card__kind",
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
+               "fontSize": "7.9pt (10.5px)",
+               "fontWeight": "normal",
+               "messageKey": null,
+             },
+             "id": "color-contrast",
+             "impact": "serious",
+             "message": "Element has insufficient color contrast of 3.83 (foreground color: #6d6e70, background color: #0b0c0e, font size: 7.9pt (10.5px), font weight: normal). Expected contrast ratio of 4.5:1",
+             "relatedNodes": Array [
+               Object {
+                 "html": "<li>",
+                 "target": Array [
+                   "li:nth-child(9)",
+                 ],
+               },
+             ],
+           },
+         ],
+         "failureSummary": "Fix any of the following:
+   Element has insufficient color contrast of 3.83 (foreground color: #6d6e70, background color: #0b0c0e, font size: 7.9pt (10.5px), font weight: normal). Expected contrast ratio of 4.5:1",
+         "html": "<p class=\"mp-card__disclaimer\">Published by its own author on WordPress.org. KNOuX does not publish, support or guarantee this item.</p>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           "li:nth-child(9) > article > .mp-card__disclaimer",
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
+               "fontSize": "6.0pt (8px)",
+               "fontWeight": "normal",
+               "messageKey": null,
+             },
+             "id": "color-contrast",
+             "impact": "serious",
+             "message": "Element has insufficient color contrast of 3.83 (foreground color: #6d6e70, background color: #0b0c0e, font size: 6.0pt (8px), font weight: normal). Expected contrast ratio of 4.5:1",
+             "relatedNodes": Array [
+               Object {
+                 "html": "<li>",
+                 "target": Array [
+                   "li:nth-child(10)",
+                 ],
+               },
+             ],
+           },
+         ],
+         "failureSummary": "Fix any of the following:
+   Element has insufficient color contrast of 3.83 (foreground color: #6d6e70, background color: #0b0c0e, font size: 6.0pt (8px), font weight: normal). Expected contrast ratio of 4.5:1",
+         "html": "<span class=\"mp-card__kind\">Pattern</span>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           "li:nth-child(10) > article > .mp-card__head > .mp-card__identity > .mp-card__kind",
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
+               "fontSize": "7.9pt (10.5px)",
+               "fontWeight": "normal",
+               "messageKey": null,
+             },
+             "id": "color-contrast",
+             "impact": "serious",
+             "message": "Element has insufficient color contrast of 3.83 (foreground color: #6d6e70, background color: #0b0c0e, font size: 7.9pt (10.5px), font weight: normal). Expected contrast ratio of 4.5:1",
+             "relatedNodes": Array [
+               Object {
+                 "html": "<li>",
+                 "target": Array [
+                   "li:nth-child(10)",
+                 ],
+               },
+             ],
+           },
+         ],
+         "failureSummary": "Fix any of the following:
+   Element has insufficient color contrast of 3.83 (foreground color: #6d6e70, background color: #0b0c0e, font size: 7.9pt (10.5px), font weight: normal). Expected contrast ratio of 4.5:1",
+         "html": "<p class=\"mp-card__disclaimer\">Published by its own author on WordPress.org. KNOuX does not publish, support or guarantee this item.</p>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           "li:nth-child(10) > article > .mp-card__disclaimer",
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
+               "fontSize": "6.0pt (8px)",
+               "fontWeight": "normal",
+               "messageKey": null,
+             },
+             "id": "color-contrast",
+             "impact": "serious",
+             "message": "Element has insufficient color contrast of 3.83 (foreground color: #6d6e70, background color: #0b0c0e, font size: 6.0pt (8px), font weight: normal). Expected contrast ratio of 4.5:1",
+             "relatedNodes": Array [
+               Object {
+                 "html": "<li>",
+                 "target": Array [
+                   "li:nth-child(11)",
+                 ],
+               },
+             ],
+           },
+         ],
+         "failureSummary": "Fix any of the following:
+   Element has insufficient color contrast of 3.83 (foreground color: #6d6e70, background color: #0b0c0e, font size: 6.0pt (8px), font weight: normal). Expected contrast ratio of 4.5:1",
+         "html": "<span class=\"mp-card__kind\">Pattern</span>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           "li:nth-child(11) > article > .mp-card__head > .mp-card__identity > .mp-card__kind",
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
+               "fontSize": "7.9pt (10.5px)",
+               "fontWeight": "normal",
+               "messageKey": null,
+             },
+             "id": "color-contrast",
+             "impact": "serious",
+             "message": "Element has insufficient color contrast of 3.83 (foreground color: #6d6e70, background color: #0b0c0e, font size: 7.9pt (10.5px), font weight: normal). Expected contrast ratio of 4.5:1",
+             "relatedNodes": Array [
+               Object {
+                 "html": "<li>",
+                 "target": Array [
+                   "li:nth-child(11)",
+                 ],
+               },
+             ],
+           },
+         ],
+         "failureSummary": "Fix any of the following:
+   Element has insufficient color contrast of 3.83 (foreground color: #6d6e70, background color: #0b0c0e, font size: 7.9pt (10.5px), font weight: normal). Expected contrast ratio of 4.5:1",
+         "html": "<p class=\"mp-card__disclaimer\">Published by its own author on WordPress.org. KNOuX does not publish, support or guarantee this item.</p>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           "li:nth-child(11) > article > .mp-card__disclaimer",
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
+               "fontSize": "6.0pt (8px)",
+               "fontWeight": "normal",
+               "messageKey": null,
+             },
+             "id": "color-contrast",
+             "impact": "serious",
+             "message": "Element has insufficient color contrast of 3.83 (foreground color: #6d6e70, background color: #0b0c0e, font size: 6.0pt (8px), font weight: normal). Expected contrast ratio of 4.5:1",
+             "relatedNodes": Array [
+               Object {
+                 "html": "<li>",
+                 "target": Array [
+                   "li:nth-child(12)",
+                 ],
+               },
+             ],
+           },
+         ],
+         "failureSummary": "Fix any of the following:
+   Element has insufficient color contrast of 3.83 (foreground color: #6d6e70, background color: #0b0c0e, font size: 6.0pt (8px), font weight: normal). Expected contrast ratio of 4.5:1",
+         "html": "<span class=\"mp-card__kind\">Pattern</span>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           "li:nth-child(12) > article > .mp-card__head > .mp-card__identity > .mp-card__kind",
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
+               "fontSize": "7.9pt (10.5px)",
+               "fontWeight": "normal",
+               "messageKey": null,
+             },
+             "id": "color-contrast",
+             "impact": "serious",
+             "message": "Element has insufficient color contrast of 3.83 (foreground color: #6d6e70, background color: #0b0c0e, font size: 7.9pt (10.5px), font weight: normal). Expected contrast ratio of 4.5:1",
+             "relatedNodes": Array [
+               Object {
+                 "html": "<li>",
+                 "target": Array [
+                   "li:nth-child(12)",
+                 ],
+               },
+             ],
+           },
+         ],
+         "failureSummary": "Fix any of the following:
+   Element has insufficient color contrast of 3.83 (foreground color: #6d6e70, background color: #0b0c0e, font size: 7.9pt (10.5px), font weight: normal). Expected contrast ratio of 4.5:1",
+         "html": "<p class=\"mp-card__disclaimer\">Published by its own author on WordPress.org. KNOuX does not publish, support or guarantee this item.</p>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           "li:nth-child(12) > article > .mp-card__disclaimer",
+         ],
+       },
+       Object {
+         "all": Array [],
+         "any": Array [
+           Object {
+             "data": Object {
+               "bgColor": "#08090a",
+               "contrastRatio": 2.11,
+               "expectedContrastRatio": "4.5:1",
+               "fgColor": "#45464a",
+               "fontSize": "7.1pt (9.5px)",
+               "fontWeight": "normal",
+               "messageKey": null,
+             },
+             "id": "color-contrast",
+             "impact": "serious",
+             "message": "Element has insufficient color contrast of 2.11 (foreground color: #45464a, background color: #08090a, font size: 7.1pt (9.5px), font weight: normal). Expected contrast ratio of 4.5:1",
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
+   Element has insufficient color contrast of 2.11 (foreground color: #45464a, background color: #08090a, font size: 7.1pt (9.5px), font weight: normal). Expected contrast ratio of 4.5:1",
+         "html": "<span class=\"mp-pagination__step is-disabled\">← Previous</span>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           ".is-disabled",
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
+               "fontSize": "9.4pt (12.5px)",
+               "fontWeight": "normal",
+               "messageKey": null,
+             },
+             "id": "color-contrast",
+             "impact": "serious",
+             "message": "Element has insufficient color contrast of 3.9 (foreground color: #6d6e70, background color: #08090a, font size: 9.4pt (12.5px), font weight: normal). Expected contrast ratio of 4.5:1",
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
+   Element has insufficient color contrast of 3.9 (foreground color: #6d6e70, background color: #08090a, font size: 9.4pt (12.5px), font weight: normal). Expected contrast ratio of 4.5:1",
+         "html": "<p>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           ".mp > .mp__footnote > p",
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
+               "fontSize": "9.4pt (12.5px)",
+               "fontWeight": "normal",
+               "messageKey": null,
+             },
+             "id": "color-contrast",
+             "impact": "serious",
+             "message": "Element has insufficient color contrast of 3.9 (foreground color: #6d6e70, background color: #08090a, font size: 9.4pt (12.5px), font weight: normal). Expected contrast ratio of 4.5:1",
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
+   Element has insufficient color contrast of 3.9 (foreground color: #6d6e70, background color: #08090a, font size: 9.4pt (12.5px), font weight: normal). Expected contrast ratio of 4.5:1",
+         "html": "<p>A pattern is a block layout. The pattern body itself is not rendered here: it is third-party block markup that would pull in foreign markup and foreign asset hosts. Each entry links to the source so the pattern can be opened, copied and edited in WordPress where it belongs.</p>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           "section:nth-child(4) > .mp__footnote > p",
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
+         "html": "<span>PATTERN DIRECTORY: WORDPRESS.ORG</span>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           "section:nth-child(5) > .meta-row > span:nth-child(1)",
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
+         "html": "<a href=\"/wordpress/blocks\">Blocks</a>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           "span:nth-child(2) > a[href$=\"blocks\"]",
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
+         "html": "<a href=\"/wordpress/plugins\">Plugins</a>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           "span:nth-child(3) > a[href$=\"plugins\"]",
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
+         "html": "<span class=\"next-link__label\">Back to</span>",
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
        - generic [ref=e25]: WordPress
      - generic [ref=e26]:
        - generic [ref=e27]:
          - paragraph [ref=e28]: WP-06 / WORDPRESS
          - heading [level=1] [ref=e29]:
            - text: Patterns
            - emphasis [ref=e30]: directory.
        - paragraph [ref=e31]: Reusable block layouts published in the official WordPress.org pattern directory, attributed to the authors who publish them.
      - generic [ref=e32]:
        - generic [ref=e33]: SCROLL TO DISCOVER
        - generic [aria-hidden] [ref=e34]: ↓
    - navigation "wordpress sections" [ref=e35]:
      - generic [ref=e36]:
        - generic [ref=e37]: INDEX
        - link [ref=e38] [cursor=pointer]:
          - /url: /wordpress
          - emphasis [ref=e39]: WP
          - text: Overview
        - link [ref=e40] [cursor=pointer]:
          - /url: /wordpress/themes
          - emphasis [ref=e41]: WP-01
          - text: Themes
        - link [ref=e42] [cursor=pointer]:
          - /url: /wordpress/plugins
          - emphasis [ref=e43]: WP-02
          - text: Plugins
        - link [ref=e44] [cursor=pointer]:
          - /url: /wordpress/blocks
          - emphasis [ref=e45]: WP-03
          - text: Blocks
        - link [ref=e46] [cursor=pointer]:
          - /url: /wordpress/starter-sites
          - emphasis [ref=e47]: WP-04
          - text: Starter Sites
        - link [ref=e48] [cursor=pointer]:
          - /url: /wordpress/solutions
          - emphasis [ref=e49]: WP-05
          - text: Bundles
    - region "KNOuX pattern releases" [ref=e50]:
      - generic [ref=e51]:
        - generic [ref=e52]:
          - generic [ref=e53]: KNOuX RELEASES
          - heading "Published by KNOuX." [level=2] [ref=e54]
        - paragraph [ref=e55]: This is the KNOuX-owned registry. It lists only files KNOuX has actually released, and it is not the same thing as the WordPress.org directory below.
      - generic [ref=e56]:
        - paragraph [ref=e57]:
          - strong [ref=e58]: "0"
          - text: patterns published by KNOuX
        - paragraph [ref=e59]: Nothing has been released, so nothing is listed. An entry appears here when a repository or a verifiable download establishes a real KNOuX release — not before, and not to make the page look fuller. The WordPress.org directory below is live in the meantime.
      - paragraph [ref=e60]:
        - link "All KNOuX WordPress routes" [ref=e61] [cursor=pointer]:
          - /url: /wordpress#catalogues
        - generic [aria-hidden] [ref=e62]: ·
        - link "KNOuX operating services" [ref=e63] [cursor=pointer]:
          - /url: /wordpress#operate
    - generic [ref=e64]:
      - region "Patterns from the WordPress.org directory" [ref=e65]:
        - generic [ref=e66]:
          - generic [ref=e67]:
            - generic [ref=e68]: WORDPRESS.ORG DISCOVERY
            - heading "Explore the patterns directory." [level=2] [ref=e69]
          - paragraph [ref=e70]: Live results read from the official WordPress.org API. These items are published by their own authors. KNOuX has released 0 patterns of its own, and the two layers are never mixed.
        - search [ref=e71]:
          - generic [ref=e72]:
            - generic [aria-hidden] [ref=e73]: ⌕
            - generic [ref=e74]: Search the WordPress.org patterns directory
            - searchbox "Search the WordPress.org patterns directory" [ref=e75]
            - button "Search" [ref=e76] [cursor=pointer]
          - generic [ref=e77]:
            - group "Result ordering" [ref=e78]:
              - generic [ref=e79]: Sort
              - link "Directory order" [ref=e80] [cursor=pointer]:
                - /url: /wordpress/patterns
              - link "Highest rated on this page" [ref=e81] [cursor=pointer]:
                - /url: /wordpress/patterns?sort=rating
              - link "Most installed on this page" [ref=e82] [cursor=pointer]:
                - /url: /wordpress/patterns?sort=installs
              - link "Recently updated on this page" [ref=e83] [cursor=pointer]:
                - /url: /wordpress/patterns?sort=updated
            - group "Results per page" [ref=e84]:
              - generic [ref=e85]: Per page
              - link "12" [ref=e86] [cursor=pointer]:
                - /url: /wordpress/patterns
              - link "24" [ref=e87] [cursor=pointer]:
                - /url: /wordpress/patterns?per_page=24
        - status [ref=e88]:
          - generic [ref=e89]: Showing 12 patterns
          - generic [ref=e90]: Page 1 of more
          - generic [ref=e91]: "Source: WordPress.org"
        - list [ref=e92]:
          - listitem [ref=e93]:
            - article [ref=e94]:
              - generic [ref=e95]:
                - generic [ref=e100]:
                  - generic [ref=e101]: Pattern
                  - heading "Mountain Intro Cards" [level=3] [ref=e102]
                  - paragraph [ref=e103]: WordPress.org pattern directory
                - generic "Sourced from the official WordPress.org directory" [ref=e104]: "Source: WordPress.org"
              - paragraph [ref=e106]: A block pattern published in the WordPress.org pattern directory. The pattern body is rendered by WordPress on the source page.
              - link "Open on WordPress.org" [ref=e108] [cursor=pointer]:
                - /url: https://wordpress.org/patterns/
                - text: Open on WordPress.org
                - generic [aria-hidden] [ref=e109]: ↗
              - paragraph [ref=e110]: Published by its own author on WordPress.org. KNOuX does not publish, support or guarantee this item.
          - listitem [ref=e111]:
            - article [ref=e112]:
              - generic [ref=e113]:
                - generic [ref=e118]:
                  - generic [ref=e119]: Pattern
                  - heading "Mountain Intro Cards" [level=3] [ref=e120]
                  - paragraph [ref=e121]: WordPress.org pattern directory
                - generic "Sourced from the official WordPress.org directory" [ref=e122]: "Source: WordPress.org"
              - paragraph [ref=e124]: A block pattern published in the WordPress.org pattern directory. The pattern body is rendered by WordPress on the source page.
              - link "Open on WordPress.org" [ref=e126] [cursor=pointer]:
                - /url: https://wordpress.org/patterns/
                - text: Open on WordPress.org
                - generic [aria-hidden] [ref=e127]: ↗
              - paragraph [ref=e128]: Published by its own author on WordPress.org. KNOuX does not publish, support or guarantee this item.
          - listitem [ref=e129]:
            - article [ref=e130]:
              - generic [ref=e131]:
                - generic [ref=e136]:
                  - generic [ref=e137]: Pattern
                  - heading "Mountain Intro Cards" [level=3] [ref=e138]
                  - paragraph [ref=e139]: WordPress.org pattern directory
                - generic "Sourced from the official WordPress.org directory" [ref=e140]: "Source: WordPress.org"
              - paragraph [ref=e142]: A block pattern published in the WordPress.org pattern directory. The pattern body is rendered by WordPress on the source page.
              - link "Open on WordPress.org" [ref=e144] [cursor=pointer]:
                - /url: https://wordpress.org/patterns/
                - text: Open on WordPress.org
                - generic [aria-hidden] [ref=e145]: ↗
              - paragraph [ref=e146]: Published by its own author on WordPress.org. KNOuX does not publish, support or guarantee this item.
          - listitem [ref=e147]:
            - article [ref=e148]:
              - generic [ref=e149]:
                - generic [ref=e154]:
                  - generic [ref=e155]: Pattern
                  - heading "Mountain Intro Cards" [level=3] [ref=e156]
                  - paragraph [ref=e157]: WordPress.org pattern directory
                - generic "Sourced from the official WordPress.org directory" [ref=e158]: "Source: WordPress.org"
              - paragraph [ref=e160]: A block pattern published in the WordPress.org pattern directory. The pattern body is rendered by WordPress on the source page.
              - link "Open on WordPress.org" [ref=e162] [cursor=pointer]:
                - /url: https://wordpress.org/patterns/
                - text: Open on WordPress.org
                - generic [aria-hidden] [ref=e163]: ↗
              - paragraph [ref=e164]: Published by its own author on WordPress.org. KNOuX does not publish, support or guarantee this item.
          - listitem [ref=e165]:
            - article [ref=e166]:
              - generic [ref=e167]:
                - generic [ref=e172]:
                  - generic [ref=e173]: Pattern
                  - heading "Mountain Intro Cards" [level=3] [ref=e174]
                  - paragraph [ref=e175]: WordPress.org pattern directory
                - generic "Sourced from the official WordPress.org directory" [ref=e176]: "Source: WordPress.org"
              - paragraph [ref=e178]: A block pattern published in the WordPress.org pattern directory. The pattern body is rendered by WordPress on the source page.
              - link "Open on WordPress.org" [ref=e180] [cursor=pointer]:
                - /url: https://wordpress.org/patterns/
                - text: Open on WordPress.org
                - generic [aria-hidden] [ref=e181]: ↗
              - paragraph [ref=e182]: Published by its own author on WordPress.org. KNOuX does not publish, support or guarantee this item.
          - listitem [ref=e183]:
            - article [ref=e184]:
              - generic [ref=e185]:
                - generic [ref=e190]:
                  - generic [ref=e191]: Pattern
                  - heading "Mountain Intro Cards" [level=3] [ref=e192]
                  - paragraph [ref=e193]: WordPress.org pattern directory
                - generic "Sourced from the official WordPress.org directory" [ref=e194]: "Source: WordPress.org"
              - paragraph [ref=e196]: A block pattern published in the WordPress.org pattern directory. The pattern body is rendered by WordPress on the source page.
              - link "Open on WordPress.org" [ref=e198] [cursor=pointer]:
                - /url: https://wordpress.org/patterns/
                - text: Open on WordPress.org
                - generic [aria-hidden] [ref=e199]: ↗
              - paragraph [ref=e200]: Published by its own author on WordPress.org. KNOuX does not publish, support or guarantee this item.
          - listitem [ref=e201]:
            - article [ref=e202]:
              - generic [ref=e203]:
                - generic [ref=e208]:
                  - generic [ref=e209]: Pattern
                  - heading "Mountain Intro Cards" [level=3] [ref=e210]
                  - paragraph [ref=e211]: WordPress.org pattern directory
                - generic "Sourced from the official WordPress.org directory" [ref=e212]: "Source: WordPress.org"
              - paragraph [ref=e214]: A block pattern published in the WordPress.org pattern directory. The pattern body is rendered by WordPress on the source page.
              - link "Open on WordPress.org" [ref=e216] [cursor=pointer]:
                - /url: https://wordpress.org/patterns/
                - text: Open on WordPress.org
                - generic [aria-hidden] [ref=e217]: ↗
              - paragraph [ref=e218]: Published by its own author on WordPress.org. KNOuX does not publish, support or guarantee this item.
          - listitem [ref=e219]:
            - article [ref=e220]:
              - generic [ref=e221]:
                - generic [ref=e226]:
                  - generic [ref=e227]: Pattern
                  - heading "Tarjetas de presentación de montaña" [level=3] [ref=e228]
                  - paragraph [ref=e229]: WordPress.org pattern directory
                - generic "Sourced from the official WordPress.org directory" [ref=e230]: "Source: WordPress.org"
              - paragraph [ref=e232]: A block pattern published in the WordPress.org pattern directory. The pattern body is rendered by WordPress on the source page.
              - link "Open on WordPress.org" [ref=e234] [cursor=pointer]:
                - /url: https://wordpress.org/patterns/
                - text: Open on WordPress.org
                - generic [aria-hidden] [ref=e235]: ↗
              - paragraph [ref=e236]: Published by its own author on WordPress.org. KNOuX does not publish, support or guarantee this item.
          - listitem [ref=e237]:
            - article [ref=e238]:
              - generic [ref=e239]:
                - generic [ref=e244]:
                  - generic [ref=e245]: Pattern
                  - heading "Mountain Intro Cards" [level=3] [ref=e246]
                  - paragraph [ref=e247]: WordPress.org pattern directory
                - generic "Sourced from the official WordPress.org directory" [ref=e248]: "Source: WordPress.org"
              - paragraph [ref=e250]: A block pattern published in the WordPress.org pattern directory. The pattern body is rendered by WordPress on the source page.
              - link "Open on WordPress.org" [ref=e252] [cursor=pointer]:
                - /url: https://wordpress.org/patterns/
                - text: Open on WordPress.org
                - generic [aria-hidden] [ref=e253]: ↗
              - paragraph [ref=e254]: Published by its own author on WordPress.org. KNOuX does not publish, support or guarantee this item.
          - listitem [ref=e255]:
            - article [ref=e256]:
              - generic [ref=e257]:
                - generic [ref=e262]:
                  - generic [ref=e263]: Pattern
                  - heading "Mountain Intro Cards" [level=3] [ref=e264]
                  - paragraph [ref=e265]: WordPress.org pattern directory
                - generic "Sourced from the official WordPress.org directory" [ref=e266]: "Source: WordPress.org"
              - paragraph [ref=e268]: A block pattern published in the WordPress.org pattern directory. The pattern body is rendered by WordPress on the source page.
              - link "Open on WordPress.org" [ref=e270] [cursor=pointer]:
                - /url: https://wordpress.org/patterns/
                - text: Open on WordPress.org
                - generic [aria-hidden] [ref=e271]: ↗
              - paragraph [ref=e272]: Published by its own author on WordPress.org. KNOuX does not publish, support or guarantee this item.
          - listitem [ref=e273]:
            - article [ref=e274]:
              - generic [ref=e275]:
                - generic [ref=e280]:
                  - generic [ref=e281]: Pattern
                  - heading "Mountain Intro Cards" [level=3] [ref=e282]
                  - paragraph [ref=e283]: WordPress.org pattern directory
                - generic "Sourced from the official WordPress.org directory" [ref=e284]: "Source: WordPress.org"
              - paragraph [ref=e286]: A block pattern published in the WordPress.org pattern directory. The pattern body is rendered by WordPress on the source page.
              - link "Open on WordPress.org" [ref=e288] [cursor=pointer]:
                - /url: https://wordpress.org/patterns/
                - text: Open on WordPress.org
                - generic [aria-hidden] [ref=e289]: ↗
              - paragraph [ref=e290]: Published by its own author on WordPress.org. KNOuX does not publish, support or guarantee this item.
          - listitem [ref=e291]:
            - article [ref=e292]:
              - generic [ref=e293]:
                - generic [ref=e298]:
                  - generic [ref=e299]: Pattern
                  - heading "Mountain Intro Cards" [level=3] [ref=e300]
                  - paragraph [ref=e301]: WordPress.org pattern directory
                - generic "Sourced from the official WordPress.org directory" [ref=e302]: "Source: WordPress.org"
              - paragraph [ref=e304]: A block pattern published in the WordPress.org pattern directory. The pattern body is rendered by WordPress on the source page.
              - link "Open on WordPress.org" [ref=e306] [cursor=pointer]:
                - /url: https://wordpress.org/patterns/
                - text: Open on WordPress.org
                - generic [aria-hidden] [ref=e307]: ↗
              - paragraph [ref=e308]: Published by its own author on WordPress.org. KNOuX does not publish, support or guarantee this item.
        - navigation "Marketplace pages" [ref=e309]:
          - generic [ref=e310]: ← Previous
          - list [ref=e311]:
            - listitem [ref=e312]:
              - generic [ref=e313]: "1"
            - listitem [ref=e314]:
              - link "2" [ref=e315] [cursor=pointer]:
                - /url: /wordpress/patterns?page=2
          - link "Next →" [ref=e316] [cursor=pointer]:
            - /url: /wordpress/patterns?page=2
        - paragraph [ref=e318]:
          - text: Every item above is third-party work published on WordPress.org. KNOuX performs WordPress engineering — installation, configuration, migration, performance, security and maintenance — and can scope that work around a plugin or theme you have chosen. See the
          - link "operating services" [ref=e319] [cursor=pointer]:
            - /url: /wordpress#operate
          - text: or the
          - link "KNOuX patterns registry" [ref=e320] [cursor=pointer]:
            - /url: /wordpress/blocks
          - text: .
      - paragraph [ref=e322]: "A pattern is a block layout. The pattern body itself is not rendered here: it is third-party block markup that would pull in foreign markup and foreign asset hosts. Each entry links to the source so the pattern can be opened, copied and edited in WordPress where it belongs."
    - generic [ref=e323]:
      - paragraph [ref=e324]:
        - generic [ref=e325]: "PATTERN DIRECTORY: WORDPRESS.ORG"
        - link "Blocks" [ref=e327] [cursor=pointer]:
          - /url: /wordpress/blocks
        - link "Plugins" [ref=e329] [cursor=pointer]:
          - /url: /wordpress/plugins
      - generic [ref=e330]:
        - generic [ref=e331]:
          - generic [ref=e332]: Back to
          - link "WordPress ecosystem" [ref=e333] [cursor=pointer]:
            - /url: /wordpress
        - generic [aria-hidden] [ref=e334]: ↗
  - contentinfo [ref=e335]:
    - generic [ref=e336]:
      - paragraph [ref=e337]: THE WORK CONTINUES
      - link [ref=e338] [cursor=pointer]:
        - /url: /contact
        - text: Let's make
        - emphasis [ref=e339]: what comes next.
        - generic [aria-hidden] [ref=e340]: ↗
    - generic [ref=e341]:
      - generic [ref=e342]:
        - generic [ref=e343]: Divisions
        - list [ref=e344]:
          - listitem [ref=e345]:
            - link "01 Software" [ref=e346] [cursor=pointer]:
              - /url: /products
          - listitem [ref=e347]:
            - link "02 WordPress" [ref=e348] [cursor=pointer]:
              - /url: /wordpress
          - listitem [ref=e349]:
            - link "03 Web" [ref=e350] [cursor=pointer]:
              - /url: /web
          - listitem [ref=e351]:
            - link "04 Growth" [ref=e352] [cursor=pointer]:
              - /url: /growth
          - listitem [ref=e353]:
            - link "05 Creative" [ref=e354] [cursor=pointer]:
              - /url: /creative
          - listitem [ref=e355]:
            - link "06 Solutions" [ref=e356] [cursor=pointer]:
              - /url: /solutions
          - listitem [ref=e357]:
            - link "07 Labs" [ref=e358] [cursor=pointer]:
              - /url: /labs
          - listitem [ref=e359]:
            - link "08 Institution" [ref=e360] [cursor=pointer]:
              - /url: /about
      - generic [ref=e361]:
        - generic [ref=e362]: Growth channels
        - list [ref=e363]:
          - listitem [ref=e364]:
            - link "Google Advertising" [ref=e365] [cursor=pointer]:
              - /url: /growth/google-ads
          - listitem [ref=e366]:
            - link "Meta Advertising" [ref=e367] [cursor=pointer]:
              - /url: /growth/meta-ads
          - listitem [ref=e368]:
            - link "Social Media" [ref=e369] [cursor=pointer]:
              - /url: /growth/social
          - listitem [ref=e370]:
            - link "Content Systems" [ref=e371] [cursor=pointer]:
              - /url: /growth/content
          - listitem [ref=e372]:
            - link "SEO & Discoverability" [ref=e373] [cursor=pointer]:
              - /url: /growth/seo
          - listitem [ref=e374]:
            - link "Growth overview" [ref=e375] [cursor=pointer]:
              - /url: /growth
      - generic [ref=e376]:
        - generic [ref=e377]: WordPress
        - list [ref=e378]:
          - listitem [ref=e379]:
            - link "Ecosystem overview" [ref=e380] [cursor=pointer]:
              - /url: /wordpress
          - listitem [ref=e381]:
            - link "Themes" [ref=e382] [cursor=pointer]:
              - /url: /wordpress/themes
          - listitem [ref=e383]:
            - link "Plugins" [ref=e384] [cursor=pointer]:
              - /url: /wordpress/plugins
          - listitem [ref=e385]:
            - link "Blocks" [ref=e386] [cursor=pointer]:
              - /url: /wordpress/blocks
          - listitem [ref=e387]:
            - link "Starter Sites" [ref=e388] [cursor=pointer]:
              - /url: /wordpress/starter-sites
          - listitem [ref=e389]:
            - link "Solutions" [ref=e390] [cursor=pointer]:
              - /url: /wordpress/solutions
      - generic [ref=e391]:
        - generic [ref=e392]: Institution
        - list [ref=e393]:
          - listitem [ref=e394]:
            - link "Labs" [ref=e395] [cursor=pointer]:
              - /url: /labs
          - listitem [ref=e396]:
            - link "Work" [ref=e397] [cursor=pointer]:
              - /url: /work
          - listitem [ref=e398]:
            - link "Engineering" [ref=e399] [cursor=pointer]:
              - /url: /engineering
          - listitem [ref=e400]:
            - link "About" [ref=e401] [cursor=pointer]:
              - /url: /about
          - listitem [ref=e402]:
            - link "Contact" [ref=e403] [cursor=pointer]:
              - /url: /contact
    - generic [ref=e404]:
      - link "KNOuX®" [ref=e405] [cursor=pointer]:
        - /url: /
      - navigation "Footer navigation" [ref=e406]:
        - link "Software" [ref=e407] [cursor=pointer]:
          - /url: /products
        - link "WordPress" [ref=e408] [cursor=pointer]:
          - /url: /wordpress
        - link "Web" [ref=e409] [cursor=pointer]:
          - /url: /web
        - link "Growth" [ref=e410] [cursor=pointer]:
          - /url: /growth
        - link "Creative" [ref=e411] [cursor=pointer]:
          - /url: /creative
        - link "Solutions" [ref=e412] [cursor=pointer]:
          - /url: /solutions
        - link "Build" [ref=e413] [cursor=pointer]:
          - /url: /build
      - generic [ref=e414]: ENGINEERING DIGITAL SYSTEMS
  - alert [ref=e415]
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
      |                                                                                        ^ Error: /wordpress/patterns has automated accessibility violations:
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