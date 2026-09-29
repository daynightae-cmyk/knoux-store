# KNOuX DEV design QA

**Result: passed** for the reference implementation and the connected local environment.

## Reference comparison

The supplied 1672 × 941 captures were reviewed against the corresponding implementation captures in `references/dev/qa/`. The DEV landing view now opens with the KNOuX particle wordmark across the full content width, followed by the violet selected navigation, dense workspace cards, live preview and connected product machine. The Build view keeps the six stage sequence and two column detail area. The remaining route captures preserve the references' dark graphite surfaces, thin borders, compact labels and inspector layout. Example people, projects, usage, releases and terminal output from the references were replaced with real repository data or explicit unavailable states.

The initial QA pass found a narrow preview caused by width clamping, a content width hero, and a later conflicting stylesheet/component update. Those issues were corrected and the entry, home, machine and Build captures were taken again. The final entry heading and description no longer overlap. There are no open P0, P1 or P2 visual mismatches.

## Functional checks

- Entry accepts an intent and dismisses after Enter; the deterministic compiler populates the home composer.
- Sidebar destinations load Build, Apps, Services, Deployments, Docs, Terminal, PowerShell, Providers and Settings. Browser back and forward navigation was exercised.
- Apps search and product selection resolve entries from the canonical software registry. The preview opens the selected product page.
- Docs loads allowlisted project Markdown through the read-only adapter. A request for `.env.local` returned 404.
- Live preview changed its real route and scaled a 1440 px iframe into the desktop panel; the 390 px viewport used a 390 px logical iframe without a 100 px strip.
- At 390 px, the workspace did not overflow horizontally and the menu exposed the same destinations. The required 1600, 1440, 1366, 1024, 430, 390 and 375 px breakpoints were inspected during the browser pass.
- Settings compact preference persisted in browser storage. Unconnected actions remained blocked with their reason shown.

## Evidence and limits

The 21 PNG files in `references/dev/qa/` include the 14 required named captures, breakpoint captures and home/Build comparison captures. Provider configuration is a configuration signal only; online health is unmeasured. The local checkout has no deployment history, remote shell bridge or authenticated release trigger, and the UI reports those absences. The browser preview verifies the current serving origin; it does not prove a separate release.
