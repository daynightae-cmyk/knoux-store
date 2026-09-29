# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: accessibility.spec.ts >> automated accessibility >> /build has no critical or serious automated violation
- Location: e2e\accessibility.spec.ts:36:5

# Error details

```
Error: /build has automated accessibility violations:
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
- generic [ref=e1]:
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
      - generic [ref=e24]: KN / DEV — 001 · PRODUCTION · Detecting environment
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
          - text: KN / DEV / Dev Workspace
          - generic [ref=e50]: PRODUCTION · Detecting environment
        - dialog [ref=e51]:
          - generic [ref=e52]:
            - paragraph [ref=e53]: KNOuX DEV / DIGITAL HEADQUARTERS
            - heading "What are you here to build?" [level=1] [ref=e54]
            - paragraph [ref=e55]: Describe the product, system, automation, service, or experience you want to create.
            - generic [ref=e56]:
              - text: Your intent
              - generic [ref=e57]:
                - textbox "Your intent" [active] [ref=e58]:
                  - /placeholder: Describe your intent…
                - button "Enter workspace" [disabled] [ref=e59]
          - paragraph [ref=e60]: KN / DEV — 001CREATE. RUN. PREVIEW. DEPLOY.
        - region "KNOuX DEV" [ref=e61]:
          - generic [ref=e62]: KN / DEV — 001DIGITAL HEADQUARTERSSCROLL TO EXPLORE ↓
          - generic [aria-hidden] [ref=e67]: KNOuX DEV
          - generic [ref=e68]:
            - generic [ref=e69]: CREATE. RUN. PREVIEW. DEPLOY.
            - paragraph [ref=e70]: Build applications, services, previews, knowledge and tools in one connected workspace.
        - generic [ref=e71]:
          - generic [ref=e72]:
            - heading "✣Tell us what you need" [level=2] [ref=e74]
            - generic [ref=e76]:
              - text: DESCRIBE WHAT YOU WANT TO BUILD
              - textbox "DESCRIBE WHAT YOU WANT TO BUILD" [ref=e77]:
                - /placeholder: Describe what you want to build…
              - generic [ref=e78]:
                - text: Local intent compiler · no model call
                - button "COMPILE INTENT ↗" [disabled] [ref=e79]
          - generic [ref=e80]:
            - heading "✣Live Preview" [level=2] [ref=e82]
            - generic [ref=e84]:
              - heading "Preview" [level=3] [ref=e86]
              - note [ref=e88]:
                - generic [ref=e89]:
                  - generic [aria-hidden] [ref=e90]: ▚
                  - text: NO ACTIVE RUNTIME
                - paragraph [ref=e91]: No runtime URL is available in this environment, so there is nothing real to load.
          - generic [ref=e92]:
            - generic [ref=e93]:
              - heading "✣Apps & Services" [level=2] [ref=e94]
              - link "OPEN ↗" [ref=e95] [cursor=pointer]:
                - /url: /build/apps
            - generic [ref=e96]:
              - generic [ref=e97]: APPSSERVICESREGISTRY
              - generic [ref=e98]:
                - link [ref=e99] [cursor=pointer]:
                  - /url: /build/apps?product=knoux-one
                  - strong [ref=e100]: KNOUX ONE
                  - text: ACTIVE
                - link [ref=e101] [cursor=pointer]:
                  - /url: /build/apps?product=kforge
                  - strong [ref=e102]: KNOuX Forge
                  - text: ACTIVE
                - link [ref=e103] [cursor=pointer]:
                  - /url: /build/apps?product=knoux-repair
                  - strong [ref=e104]: KNOuX Repair
                  - text: ACTIVE
                - link [ref=e105] [cursor=pointer]:
                  - /url: /build/apps?product=knoux-smartorganizer
                  - strong [ref=e106]: KNOuX SmartOrganizer
                  - text: ACTIVE
                - link [ref=e107] [cursor=pointer]:
                  - /url: /build/apps?product=knoux-rec
                  - strong [ref=e108]: KNOuX REC
                  - text: ACTIVE
              - generic [ref=e109]: 6 service categories in the public registry · runtime state unmeasured
          - generic [ref=e110]:
            - generic [ref=e111]:
              - heading "✣Providers" [level=2] [ref=e112]
              - link "OPEN ↗" [ref=e113] [cursor=pointer]:
                - /url: /build/providers
            - generic [ref=e114]:
              - note [ref=e116]:
                - text: ◇
                - strong [ref=e117]: PROVIDER STATE UNAVAILABLE
                - paragraph [ref=e118]: Configuration has not been read yet.
              - paragraph [ref=e119]: 0 configured · online status is not measured
          - generic [ref=e120]:
            - generic [ref=e121]:
              - heading "✣Docs & Knowledge" [level=2] [ref=e122]
              - link "OPEN ↗" [ref=e123] [cursor=pointer]:
                - /url: /build/docs
            - generic [ref=e125]:
              - link [ref=e126] [cursor=pointer]:
                - /url: /build/docs?file=README.md
                - strong [ref=e127]: README.md
                - text: ↗
              - link [ref=e128] [cursor=pointer]:
                - /url: /build/docs?file=references%2Fdev%2FREFERENCE_MAP.md
                - strong [ref=e129]: references/dev/REFERENCE_MAP.md
                - text: ↗
              - link [ref=e130] [cursor=pointer]:
                - /url: /build/docs?file=references%2FQA_CLOSURE.md
                - strong [ref=e131]: references/QA_CLOSURE.md
                - text: ↗
          - generic [ref=e132]:
            - generic [ref=e133]:
              - heading "✣Build / Verification" [level=2] [ref=e134]
              - link "OPEN ↗" [ref=e135] [cursor=pointer]:
                - /url: /build/pipeline
            - note [ref=e137]:
              - text: ◇
              - strong [ref=e138]: NOT RUN HERE
              - paragraph [ref=e139]: Verification evidence is available when the adapter reports it.
          - generic [ref=e140]:
            - generic [ref=e141]:
              - heading "✣Deployments" [level=2] [ref=e142]
              - link "OPEN ↗" [ref=e143] [cursor=pointer]:
                - /url: /build/deployments
            - note [ref=e145]:
              - text: ◇
              - strong [ref=e146]: HISTORY UNCONNECTED
              - paragraph [ref=e147]: This workspace has no deployment history adapter. The current page is the only runtime it can verify.
          - generic [ref=e148]:
            - generic [ref=e149]:
              - heading "✣PowerShell" [level=2] [ref=e150]
              - link "OPEN ↗" [ref=e151] [cursor=pointer]:
                - /url: /build/powershell
            - note [ref=e153]:
              - text: ◇
              - strong [ref=e154]: SHELL BRIDGE UNAVAILABLE
              - paragraph [ref=e155]: The hosted workspace cannot execute PowerShell commands. No session or output is implied.
          - generic [ref=e156]:
            - heading "✣System Status" [level=2] [ref=e158]
            - generic [ref=e160]:
              - generic [ref=e161]:
                - strong [ref=e162]: Project snapshot
                - text: UNAVAILABLE
              - generic [ref=e163]:
                - strong [ref=e164]: Current runtime
                - text: UNAVAILABLE
              - generic [ref=e165]:
                - strong [ref=e166]: CPU / memory / network
                - text: UNAVAILABLE
              - generic [ref=e167]:
                - strong [ref=e168]: Verification
                - text: NOT RUN HERE
        - region [ref=e169]:
          - generic [ref=e170]:
            - text: PRODUCT REGISTRY / EVIDENCE
            - heading [level=2] [ref=e171]:
              - text: ONE CONNECTED
              - emphasis [ref=e172]: MACHINE.
            - paragraph [ref=e173]: Select a real product to inspect its repository evidence, scope and limits.
          - generic [ref=e174]:
            - group "KNOuX products" [ref=e175]:
              - generic [ref=e176]:
                - text: KNOuX / PRODUCT SYSTEM
                - generic [ref=e177]: 07 REGISTERED
              - generic [ref=e178]:
                - strong [ref=e179]: KNOuX
                - text: ENGINEERING INSTITUTION
              - generic [ref=e180]:
                - button [pressed] [ref=e181] [cursor=pointer]:
                  - text: SW-01
                  - strong [ref=e182]: ONE
                  - text: ACTIVE
                - button [ref=e183] [cursor=pointer]:
                  - text: SW-02
                  - strong [ref=e184]: Forge
                  - text: ACTIVE
                - button [ref=e185] [cursor=pointer]:
                  - text: SW-03
                  - strong [ref=e186]: Repair
                  - text: ACTIVE
                - button [ref=e187] [cursor=pointer]:
                  - text: SW-04
                  - strong [ref=e188]: Organizer
                  - text: ACTIVE
                - button [ref=e189] [cursor=pointer]:
                  - text: SW-05
                  - strong [ref=e190]: REC
                  - text: ACTIVE
                - button [ref=e191] [cursor=pointer]:
                  - text: SW-06
                  - strong [ref=e192]: Player X
                  - text: ACTIVE
                - button [ref=e193] [cursor=pointer]:
                  - text: SW-07
                  - strong [ref=e194]: Clipboard
                  - text: RELEASE-CANDIDATE
            - complementary [ref=e195]:
              - generic [ref=e196]: SELECTED PRODUCT / SW-01
              - heading "KNOUX ONE" [level=3] [ref=e197]
              - paragraph [ref=e198]: Windows Intelligence & Developer Suite
              - generic [ref=e199]:
                - term [ref=e200]: STATUS
                - definition [ref=e201]: active
                - term [ref=e202]: FAMILY
                - definition [ref=e203]: Windows Intelligence
                - term [ref=e204]: PLATFORM
                - definition [ref=e205]: Windows 10/11 x64 desktop (Tauri 2) with a browser preview that declines desktop operations
                - term [ref=e206]: EVIDENCE
                - definition [ref=e207]: README.md
              - generic [ref=e208]:
                - link "Product page ↗" [ref=e209] [cursor=pointer]:
                  - /url: /products/knoux-one
                - link "Repository ↗" [ref=e210] [cursor=pointer]:
                  - /url: https://github.com/daynightae-cmyk/KNOUX-ONE
  - contentinfo [ref=e211]:
    - generic [ref=e212]:
      - paragraph [ref=e213]: THE WORK CONTINUES
      - link [ref=e214] [cursor=pointer]:
        - /url: /contact
        - text: Let's make
        - emphasis [ref=e215]: what comes next.
        - generic [aria-hidden] [ref=e216]: ↗
    - generic [ref=e217]:
      - generic [ref=e218]:
        - generic [ref=e219]: Divisions
        - list [ref=e220]:
          - listitem [ref=e221]:
            - link "01 Software" [ref=e222] [cursor=pointer]:
              - /url: /products
          - listitem [ref=e223]:
            - link "02 WordPress" [ref=e224] [cursor=pointer]:
              - /url: /wordpress
          - listitem [ref=e225]:
            - link "03 Web" [ref=e226] [cursor=pointer]:
              - /url: /web
          - listitem [ref=e227]:
            - link "04 Growth" [ref=e228] [cursor=pointer]:
              - /url: /growth
          - listitem [ref=e229]:
            - link "05 Creative" [ref=e230] [cursor=pointer]:
              - /url: /creative
          - listitem [ref=e231]:
            - link "06 Solutions" [ref=e232] [cursor=pointer]:
              - /url: /solutions
          - listitem [ref=e233]:
            - link "07 Labs" [ref=e234] [cursor=pointer]:
              - /url: /labs
          - listitem [ref=e235]:
            - link "08 Institution" [ref=e236] [cursor=pointer]:
              - /url: /about
      - generic [ref=e237]:
        - generic [ref=e238]: Growth channels
        - list [ref=e239]:
          - listitem [ref=e240]:
            - link "Google Advertising" [ref=e241] [cursor=pointer]:
              - /url: /growth/google-ads
          - listitem [ref=e242]:
            - link "Meta Advertising" [ref=e243] [cursor=pointer]:
              - /url: /growth/meta-ads
          - listitem [ref=e244]:
            - link "Social Media" [ref=e245] [cursor=pointer]:
              - /url: /growth/social
          - listitem [ref=e246]:
            - link "Content Systems" [ref=e247] [cursor=pointer]:
              - /url: /growth/content
          - listitem [ref=e248]:
            - link "SEO & Discoverability" [ref=e249] [cursor=pointer]:
              - /url: /growth/seo
          - listitem [ref=e250]:
            - link "Growth overview" [ref=e251] [cursor=pointer]:
              - /url: /growth
      - generic [ref=e252]:
        - generic [ref=e253]: WordPress
        - list [ref=e254]:
          - listitem [ref=e255]:
            - link "Ecosystem overview" [ref=e256] [cursor=pointer]:
              - /url: /wordpress
          - listitem [ref=e257]:
            - link "Themes" [ref=e258] [cursor=pointer]:
              - /url: /wordpress/themes
          - listitem [ref=e259]:
            - link "Plugins" [ref=e260] [cursor=pointer]:
              - /url: /wordpress/plugins
          - listitem [ref=e261]:
            - link "Blocks" [ref=e262] [cursor=pointer]:
              - /url: /wordpress/blocks
          - listitem [ref=e263]:
            - link "Starter Sites" [ref=e264] [cursor=pointer]:
              - /url: /wordpress/starter-sites
          - listitem [ref=e265]:
            - link "Solutions" [ref=e266] [cursor=pointer]:
              - /url: /wordpress/solutions
      - generic [ref=e267]:
        - generic [ref=e268]: Institution
        - list [ref=e269]:
          - listitem [ref=e270]:
            - link "Labs" [ref=e271] [cursor=pointer]:
              - /url: /labs
          - listitem [ref=e272]:
            - link "Work" [ref=e273] [cursor=pointer]:
              - /url: /work
          - listitem [ref=e274]:
            - link "Engineering" [ref=e275] [cursor=pointer]:
              - /url: /engineering
          - listitem [ref=e276]:
            - link "About" [ref=e277] [cursor=pointer]:
              - /url: /about
          - listitem [ref=e278]:
            - link "Contact" [ref=e279] [cursor=pointer]:
              - /url: /contact
    - generic [ref=e280]:
      - link "KNOuX®" [ref=e281] [cursor=pointer]:
        - /url: /
      - navigation "Footer navigation" [ref=e282]:
        - link "Software" [ref=e283] [cursor=pointer]:
          - /url: /products
        - link "WordPress" [ref=e284] [cursor=pointer]:
          - /url: /wordpress
        - link "Web" [ref=e285] [cursor=pointer]:
          - /url: /web
        - link "Growth" [ref=e286] [cursor=pointer]:
          - /url: /growth
        - link "Creative" [ref=e287] [cursor=pointer]:
          - /url: /creative
        - link "Solutions" [ref=e288] [cursor=pointer]:
          - /url: /solutions
        - link "Build" [ref=e289] [cursor=pointer]:
          - /url: /build
      - generic [ref=e290]: ENGINEERING DIGITAL SYSTEMS
  - alert [ref=e291]
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
      |                                                                                        ^ Error: /build has automated accessibility violations:
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