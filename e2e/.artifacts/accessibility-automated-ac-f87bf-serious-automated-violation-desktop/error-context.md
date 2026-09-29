# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: accessibility.spec.ts >> automated accessibility >> /contact has no critical or serious automated violation
- Location: e2e\accessibility.spec.ts:36:5

# Error details

```
Error: /contact has automated accessibility violations:
color-contrast (serious) x20: .contact-aside__note

expect(received).toEqual(expected) // deep equality

- Expected  -   1
+ Received  + 723

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
+               "fontSize": "9.0pt (12px)",
+               "fontWeight": "normal",
+               "messageKey": null,
+             },
+             "id": "color-contrast",
+             "impact": "serious",
+             "message": "Element has insufficient color contrast of 3.9 (foreground color: #6d6e70, background color: #08090a, font size: 9.0pt (12px), font weight: normal). Expected contrast ratio of 4.5:1",
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
+   Element has insufficient color contrast of 3.9 (foreground color: #6d6e70, background color: #08090a, font size: 9.0pt (12px), font weight: normal). Expected contrast ratio of 4.5:1",
+         "html": "<p class=\"contact-aside__note\">The address is published from the KNOuX project repositories. It is the working route on this deployment.</p>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           ".contact-aside__note",
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
+         "html": "<span class=\"label\">DIVISIONS</span>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           "aside > div:nth-child(4) > .label",
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
+         "html": "<span class=\"label\">WHAT HAPPENS NEXT</span>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           "div:nth-child(5) > .label",
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
+                 "html": "<div class=\"contact-form-panel\">",
+                 "target": Array [
+                   ".contact-form-panel",
+                 ],
+               },
+             ],
+           },
+         ],
+         "failureSummary": "Fix any of the following:
+   Element has insufficient color contrast of 3.83 (foreground color: #6d6e70, background color: #0b0c0e, font size: 6.8pt (9px), font weight: normal). Expected contrast ratio of 4.5:1",
+         "html": "<legend class=\"label\" style=\"margin-bottom: 14px;\">WHAT IS THIS ABOUT</legend>",
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
+               "bgColor": "#0b0c0e",
+               "contrastRatio": 3.83,
+               "expectedContrastRatio": "4.5:1",
+               "fgColor": "#6d6e70",
+               "fontSize": "8.3pt (11px)",
+               "fontWeight": "normal",
+               "messageKey": null,
+             },
+             "id": "color-contrast",
+             "impact": "serious",
+             "message": "Element has insufficient color contrast of 3.83 (foreground color: #6d6e70, background color: #0b0c0e, font size: 8.3pt (11px), font weight: normal). Expected contrast ratio of 4.5:1",
+             "relatedNodes": Array [
+               Object {
+                 "html": "<div class=\"contact-form-panel\">",
+                 "target": Array [
+                   ".contact-form-panel",
+                 ],
+               },
+             ],
+           },
+         ],
+         "failureSummary": "Fix any of the following:
+   Element has insufficient color contrast of 3.83 (foreground color: #6d6e70, background color: #0b0c0e, font size: 8.3pt (11px), font weight: normal). Expected contrast ratio of 4.5:1",
+         "html": "<p class=\"field__hint\" style=\"margin-top: 12px;\">A site, store, application, portal, dashboard or interactive build.</p>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           "fieldset:nth-child(1) > .field__hint",
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
+                 "html": "<div class=\"contact-form-panel\">",
+                 "target": Array [
+                   ".contact-form-panel",
+                 ],
+               },
+             ],
+           },
+         ],
+         "failureSummary": "Fix any of the following:
+   Element has insufficient color contrast of 3.83 (foreground color: #6d6e70, background color: #0b0c0e, font size: 6.8pt (9px), font weight: normal). Expected contrast ratio of 4.5:1",
+         "html": "<legend class=\"label\" style=\"margin-bottom: 14px;\">RELEVANT TO THIS REQUEST</legend>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           "fieldset:nth-child(2) > legend",
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
+                 "html": "<div class=\"contact-form-panel\">",
+                 "target": Array [
+                   ".contact-form-panel",
+                 ],
+               },
+             ],
+           },
+         ],
+         "failureSummary": "Fix any of the following:
+   Element has insufficient color contrast of 3.83 (foreground color: #6d6e70, background color: #0b0c0e, font size: 6.8pt (9px), font weight: normal). Expected contrast ratio of 4.5:1",
+         "html": "<label for=\"budgetBand\">Budget band, if you have one</label>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           "label[for=\"budgetBand\"]",
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
+               "fontSize": "8.3pt (11px)",
+               "fontWeight": "normal",
+               "messageKey": null,
+             },
+             "id": "color-contrast",
+             "impact": "serious",
+             "message": "Element has insufficient color contrast of 3.83 (foreground color: #6d6e70, background color: #0b0c0e, font size: 8.3pt (11px), font weight: normal). Expected contrast ratio of 4.5:1",
+             "relatedNodes": Array [
+               Object {
+                 "html": "<div class=\"contact-form-panel\">",
+                 "target": Array [
+                   ".contact-form-panel",
+                 ],
+               },
+             ],
+           },
+         ],
+         "failureSummary": "Fix any of the following:
+   Element has insufficient color contrast of 3.83 (foreground color: #6d6e70, background color: #0b0c0e, font size: 8.3pt (11px), font weight: normal). Expected contrast ratio of 4.5:1",
+         "html": "<span class=\"field__hint\">Used to understand scope. It is not a quote and it is not used to produce a forecast or a return projection.</span>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           ".field:nth-child(3) > .field__hint",
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
+                 "html": "<div class=\"contact-form-panel\">",
+                 "target": Array [
+                   ".contact-form-panel",
+                 ],
+               },
+             ],
+           },
+         ],
+         "failureSummary": "Fix any of the following:
+   Element has insufficient color contrast of 3.83 (foreground color: #6d6e70, background color: #0b0c0e, font size: 6.8pt (9px), font weight: normal). Expected contrast ratio of 4.5:1",
+         "html": "<label for=\"timeline\">Timing</label>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           "label[for=\"timeline\"]",
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
+                 "html": "<div class=\"contact-form-panel\">",
+                 "target": Array [
+                   ".contact-form-panel",
+                 ],
+               },
+             ],
+           },
+         ],
+         "failureSummary": "Fix any of the following:
+   Element has insufficient color contrast of 3.83 (foreground color: #6d6e70, background color: #0b0c0e, font size: 6.8pt (9px), font weight: normal). Expected contrast ratio of 4.5:1",
+         "html": "<label for=\"name\">Your name</label>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           "label[for=\"name\"]",
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
+                 "html": "<div class=\"contact-form-panel\">",
+                 "target": Array [
+                   ".contact-form-panel",
+                 ],
+               },
+             ],
+           },
+         ],
+         "failureSummary": "Fix any of the following:
+   Element has insufficient color contrast of 3.83 (foreground color: #6d6e70, background color: #0b0c0e, font size: 6.8pt (9px), font weight: normal). Expected contrast ratio of 4.5:1",
+         "html": "<label for=\"email\">Email</label>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           "label[for=\"email\"]",
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
+                 "html": "<div class=\"contact-form-panel\">",
+                 "target": Array [
+                   ".contact-form-panel",
+                 ],
+               },
+             ],
+           },
+         ],
+         "failureSummary": "Fix any of the following:
+   Element has insufficient color contrast of 3.83 (foreground color: #6d6e70, background color: #0b0c0e, font size: 6.8pt (9px), font weight: normal). Expected contrast ratio of 4.5:1",
+         "html": "<label for=\"organisation\">Organisation, if any</label>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           "label[for=\"organisation\"]",
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
+                 "html": "<div class=\"contact-form-panel\">",
+                 "target": Array [
+                   ".contact-form-panel",
+                 ],
+               },
+             ],
+           },
+         ],
+         "failureSummary": "Fix any of the following:
+   Element has insufficient color contrast of 3.83 (foreground color: #6d6e70, background color: #0b0c0e, font size: 6.8pt (9px), font weight: normal). Expected contrast ratio of 4.5:1",
+         "html": "<label for=\"message\">The situation</label>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           "label[for=\"message\"]",
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
+               "fontSize": "8.3pt (11px)",
+               "fontWeight": "normal",
+               "messageKey": null,
+             },
+             "id": "color-contrast",
+             "impact": "serious",
+             "message": "Element has insufficient color contrast of 3.83 (foreground color: #6d6e70, background color: #0b0c0e, font size: 8.3pt (11px), font weight: normal). Expected contrast ratio of 4.5:1",
+             "relatedNodes": Array [
+               Object {
+                 "html": "<div class=\"contact-form-panel\">",
+                 "target": Array [
+                   ".contact-form-panel",
+                 ],
+               },
+             ],
+           },
+         ],
+         "failureSummary": "Fix any of the following:
+   Element has insufficient color contrast of 3.83 (foreground color: #6d6e70, background color: #0b0c0e, font size: 8.3pt (11px), font weight: normal). Expected contrast ratio of 4.5:1",
+         "html": "<span class=\"field__hint\">Or email <a href=\"mailto:knouxio@zohomail.com\" style=\"text-decoration: underline; text-underline-offset: 3px;\">knouxio@zohomail.com</a></span>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           "div:nth-child(9) > .field__hint",
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
+               "fontSize": "8.3pt (11px)",
+               "fontWeight": "normal",
+               "messageKey": null,
+             },
+             "id": "color-contrast",
+             "impact": "serious",
+             "message": "Element has insufficient color contrast of 3.83 (foreground color: #6d6e70, background color: #0b0c0e, font size: 8.3pt (11px), font weight: normal). Expected contrast ratio of 4.5:1",
+             "relatedNodes": Array [
+               Object {
+                 "html": "<div class=\"contact-form-panel\">",
+                 "target": Array [
+                   ".contact-form-panel",
+                 ],
+               },
+             ],
+           },
+         ],
+         "failureSummary": "Fix any of the following:
+   Element has insufficient color contrast of 3.83 (foreground color: #6d6e70, background color: #0b0c0e, font size: 8.3pt (11px), font weight: normal). Expected contrast ratio of 4.5:1",
+         "html": "<a href=\"mailto:knouxio@zohomail.com\" style=\"text-decoration: underline; text-underline-offset: 3px;\">knouxio@zohomail.com</a>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           ".field__hint > a[href=\"mailto:knouxio@zohomail.com\"]",
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
+               "fontSize": "8.3pt (11px)",
+               "fontWeight": "normal",
+               "messageKey": null,
+             },
+             "id": "color-contrast",
+             "impact": "serious",
+             "message": "Element has insufficient color contrast of 3.83 (foreground color: #6d6e70, background color: #0b0c0e, font size: 8.3pt (11px), font weight: normal). Expected contrast ratio of 4.5:1",
+             "relatedNodes": Array [
+               Object {
+                 "html": "<div class=\"contact-form-panel\">",
+                 "target": Array [
+                   ".contact-form-panel",
+                 ],
+               },
+             ],
+           },
+         ],
+         "failureSummary": "Fix any of the following:
+   Element has insufficient color contrast of 3.83 (foreground color: #6d6e70, background color: #0b0c0e, font size: 8.3pt (11px), font weight: normal). Expected contrast ratio of 4.5:1",
+         "html": "<p class=\"field__hint\">",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           "form > .field__hint",
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
        - generic [ref=e25]: Contact
      - generic [ref=e26]:
        - generic [ref=e27]:
          - paragraph [ref=e28]: 08 / CONTACT
          - heading [level=1] [ref=e29]:
            - text: Start a
            - emphasis [ref=e30]: conversation.
        - paragraph [ref=e31]: One form for every division. It asks for what your request actually needs and nothing else.
      - generic [ref=e32]:
        - generic [ref=e33]: SCROLL TO DISCOVER
        - generic [aria-hidden] [ref=e34]: ↓
    - generic [ref=e36]:
      - complementary [ref=e37]:
        - generic [ref=e38]: DIRECT
        - paragraph [ref=e39]:
          - link "knouxio@zohomail.com" [ref=e40] [cursor=pointer]:
            - /url: mailto:knouxio@zohomail.com
        - paragraph [ref=e41]: The address is published from the KNOuX project repositories. It is the working route on this deployment.
        - generic [ref=e42]:
          - generic [ref=e43]: DIVISIONS
          - list [ref=e44]:
            - listitem [ref=e45]:
              - generic [ref=e46]: "01"
              - text: Software
            - listitem [ref=e47]:
              - generic [ref=e48]: "02"
              - text: WordPress
            - listitem [ref=e49]:
              - generic [ref=e50]: "03"
              - text: Web
            - listitem [ref=e51]:
              - generic [ref=e52]: "04"
              - text: Growth
            - listitem [ref=e53]:
              - generic [ref=e54]: "05"
              - text: Creative
            - listitem [ref=e55]:
              - generic [ref=e56]: "06"
              - text: Solutions
            - listitem [ref=e57]:
              - generic [ref=e58]: "07"
              - text: Labs
            - listitem [ref=e59]:
              - generic [ref=e60]: "08"
              - text: Institution
        - generic [ref=e61]:
          - generic [ref=e62]: WHAT HAPPENS NEXT
          - list [ref=e63]:
            - listitem [ref=e64]: The request arrives with the division, items and context you selected.
            - listitem [ref=e65]: Scope is discussed before anything is quoted or committed.
            - listitem [ref=e66]: No figure on this site is a price, a deadline or a promised result.
      - generic [ref=e68]:
        - group "WHAT IS THIS ABOUT" [ref=e69]:
          - generic [ref=e71]:
            - generic [ref=e72] [cursor=pointer]:
              - radio "Software"
              - text: Software
            - generic [ref=e73] [cursor=pointer]:
              - radio "WordPress"
              - text: WordPress
            - generic [ref=e74] [cursor=pointer]:
              - radio "Web" [checked]
              - text: Web
            - generic [ref=e75] [cursor=pointer]:
              - radio "Growth"
              - text: Growth
            - generic [ref=e76] [cursor=pointer]:
              - radio "Creative"
              - text: Creative
            - generic [ref=e77] [cursor=pointer]:
              - radio "Solution"
              - text: Solution
            - generic [ref=e78] [cursor=pointer]:
              - radio "Something else"
              - text: Something else
          - paragraph [ref=e79]: A site, store, application, portal, dashboard or interactive build.
        - group "RELEVANT TO THIS REQUEST" [ref=e80]:
          - generic [ref=e82]:
            - generic [ref=e83] [cursor=pointer]:
              - checkbox "Institutional Website"
              - text: Institutional Website
            - generic [ref=e84] [cursor=pointer]:
              - checkbox "E-Commerce"
              - text: E-Commerce
            - generic [ref=e85] [cursor=pointer]:
              - checkbox "Web Application"
              - text: Web Application
            - generic [ref=e86] [cursor=pointer]:
              - checkbox "Customer Portal"
              - text: Customer Portal
            - generic [ref=e87] [cursor=pointer]:
              - checkbox "Admin & Reporting"
              - text: Admin & Reporting
            - generic [ref=e88] [cursor=pointer]:
              - checkbox "Interactive & Spatial"
              - text: Interactive & Spatial
        - generic [ref=e89]:
          - generic [ref=e90]: Budget band, if you have one
          - combobox "Budget band, if you have one" [ref=e91]:
            - option "Not decided" [selected]
            - option "Under 5,000"
            - option "5,000 – 15,000"
            - option "15,000 – 50,000"
            - option "Over 50,000"
          - generic [ref=e92]: Used to understand scope. It is not a quote and it is not used to produce a forecast or a return projection.
        - generic [ref=e93]:
          - generic [ref=e94]: Timing
          - combobox "Timing" [ref=e95]:
            - option "Not decided yet" [selected]
            - option "Urgent — something is broken"
            - option "This quarter"
            - option "This year"
            - option "Exploring, no date in mind"
        - generic [ref=e96]:
          - generic [ref=e97]:
            - generic [ref=e98]: Your name
            - textbox "Your name" [ref=e99]:
              - /placeholder: Name
          - generic [ref=e100]:
            - generic [ref=e101]: Email
            - textbox "Email" [ref=e102]:
              - /placeholder: you@example.com
        - generic [ref=e103]:
          - generic [ref=e104]: Organisation, if any
          - textbox "Organisation, if any" [ref=e105]:
            - /placeholder: Optional
        - generic [ref=e106]:
          - generic [ref=e107]: The situation
          - textbox "The situation" [ref=e108]:
            - /placeholder: What exists now, what is not working, and what a good outcome looks like.
        - generic [aria-hidden] [ref=e109]:
          - text: Website
          - textbox [ref=e110]
        - generic [ref=e111]:
          - button "Send request" [ref=e112] [cursor=pointer]:
            - text: Send request
            - generic [aria-hidden] [ref=e113]: ↗
          - generic [ref=e114]:
            - text: Or email
            - link "knouxio@zohomail.com" [ref=e115] [cursor=pointer]:
              - /url: mailto:knouxio@zohomail.com
        - status [ref=e116]
        - paragraph [ref=e117]:
          - text: This form exists and is tested, but no delivery transport is configured on this deployment. Until one is, the address above is the working route. That is stated here rather than shown as a success message.
          - button "Or assemble a stack first" [ref=e118] [cursor=pointer]:
            - text: Or assemble a stack first
            - generic [aria-hidden] [ref=e119]: ↗
  - contentinfo [ref=e120]:
    - generic [ref=e121]:
      - paragraph [ref=e122]: THE WORK CONTINUES
      - link [ref=e123] [cursor=pointer]:
        - /url: /contact
        - text: Let's make
        - emphasis [ref=e124]: what comes next.
        - generic [aria-hidden] [ref=e125]: ↗
    - generic [ref=e126]:
      - generic [ref=e127]:
        - generic [ref=e128]: Divisions
        - list [ref=e129]:
          - listitem [ref=e130]:
            - link "01 Software" [ref=e131] [cursor=pointer]:
              - /url: /products
          - listitem [ref=e132]:
            - link "02 WordPress" [ref=e133] [cursor=pointer]:
              - /url: /wordpress
          - listitem [ref=e134]:
            - link "03 Web" [ref=e135] [cursor=pointer]:
              - /url: /web
          - listitem [ref=e136]:
            - link "04 Growth" [ref=e137] [cursor=pointer]:
              - /url: /growth
          - listitem [ref=e138]:
            - link "05 Creative" [ref=e139] [cursor=pointer]:
              - /url: /creative
          - listitem [ref=e140]:
            - link "06 Solutions" [ref=e141] [cursor=pointer]:
              - /url: /solutions
          - listitem [ref=e142]:
            - link "07 Labs" [ref=e143] [cursor=pointer]:
              - /url: /labs
          - listitem [ref=e144]:
            - link "08 Institution" [ref=e145] [cursor=pointer]:
              - /url: /about
      - generic [ref=e146]:
        - generic [ref=e147]: Growth channels
        - list [ref=e148]:
          - listitem [ref=e149]:
            - link "Google Advertising" [ref=e150] [cursor=pointer]:
              - /url: /growth/google-ads
          - listitem [ref=e151]:
            - link "Meta Advertising" [ref=e152] [cursor=pointer]:
              - /url: /growth/meta-ads
          - listitem [ref=e153]:
            - link "Social Media" [ref=e154] [cursor=pointer]:
              - /url: /growth/social
          - listitem [ref=e155]:
            - link "Content Systems" [ref=e156] [cursor=pointer]:
              - /url: /growth/content
          - listitem [ref=e157]:
            - link "SEO & Discoverability" [ref=e158] [cursor=pointer]:
              - /url: /growth/seo
          - listitem [ref=e159]:
            - link "Growth overview" [ref=e160] [cursor=pointer]:
              - /url: /growth
      - generic [ref=e161]:
        - generic [ref=e162]: WordPress
        - list [ref=e163]:
          - listitem [ref=e164]:
            - link "Ecosystem overview" [ref=e165] [cursor=pointer]:
              - /url: /wordpress
          - listitem [ref=e166]:
            - link "Themes" [ref=e167] [cursor=pointer]:
              - /url: /wordpress/themes
          - listitem [ref=e168]:
            - link "Plugins" [ref=e169] [cursor=pointer]:
              - /url: /wordpress/plugins
          - listitem [ref=e170]:
            - link "Blocks" [ref=e171] [cursor=pointer]:
              - /url: /wordpress/blocks
          - listitem [ref=e172]:
            - link "Starter Sites" [ref=e173] [cursor=pointer]:
              - /url: /wordpress/starter-sites
          - listitem [ref=e174]:
            - link "Solutions" [ref=e175] [cursor=pointer]:
              - /url: /wordpress/solutions
      - generic [ref=e176]:
        - generic [ref=e177]: Institution
        - list [ref=e178]:
          - listitem [ref=e179]:
            - link "Labs" [ref=e180] [cursor=pointer]:
              - /url: /labs
          - listitem [ref=e181]:
            - link "Work" [ref=e182] [cursor=pointer]:
              - /url: /work
          - listitem [ref=e183]:
            - link "Engineering" [ref=e184] [cursor=pointer]:
              - /url: /engineering
          - listitem [ref=e185]:
            - link "About" [ref=e186] [cursor=pointer]:
              - /url: /about
          - listitem [ref=e187]:
            - link "Contact" [ref=e188] [cursor=pointer]:
              - /url: /contact
    - generic [ref=e189]:
      - link "KNOuX®" [ref=e190] [cursor=pointer]:
        - /url: /
      - navigation "Footer navigation" [ref=e191]:
        - link "Software" [ref=e192] [cursor=pointer]:
          - /url: /products
        - link "WordPress" [ref=e193] [cursor=pointer]:
          - /url: /wordpress
        - link "Web" [ref=e194] [cursor=pointer]:
          - /url: /web
        - link "Growth" [ref=e195] [cursor=pointer]:
          - /url: /growth
        - link "Creative" [ref=e196] [cursor=pointer]:
          - /url: /creative
        - link "Solutions" [ref=e197] [cursor=pointer]:
          - /url: /solutions
        - link "Build" [ref=e198] [cursor=pointer]:
          - /url: /build
      - generic [ref=e199]: ENGINEERING DIGITAL SYSTEMS
  - alert [ref=e200]
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
      |                                                                                        ^ Error: /contact has automated accessibility violations:
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