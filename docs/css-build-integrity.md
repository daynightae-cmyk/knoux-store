# Stylesheet build integrity: independent recovery verification

Authority: actual origin/main `0f9641708a89c2b41b1577d7e9bb9b3bf3de3d17`, merged PR #38. PR #39 (`55f02dfe84bf557d615f96910000821049e5dd3b`) remains forensic evidence, not the implementation base. This change contains no visual redesign or framework/dependency change. Installed Next is **16.3.8 / Turbopack**, Node 24 on Windows.

## What was actually reproduced

The reported missing-stylesheet defect **did not reproduce** in a newly created clean checkout at `D:/Knoux Store-worktrees/css-build-integrity-p0`. Each scenario removed that checkout's `.next` only after its owned server had exited, ran a clean production build, inspected every emitted app HTML document and started a fresh production server. Unused custom properties survive minification; emitted CSS was checked for their values, so these were real byte-changing edits rather than stripped comments.

| Control | CSS changes | Build exit | Emitted HTML | Distinct served CSS | Missing / bad HTTP |
|---|---|---|---|---|---|
| A | pristine main | 0 | 62 | 13 | 0 / 0 |
| B | globals.css only | 0 | 62 | 13 | 0 / 0 |
| C | command.module.css only | 0 | 62 | 13 | 0 / 0 |
| D | both | 0 | 62 | 13 | 0 / 0 |
| E | revert control | 0 | 62 | 13 | 0 / 0 |

Full records, source/asset hashes, build IDs, manifest hashes and available manifest CSS entries, route statuses, server PIDs, checkout paths and timestamps are in `references/css-build-integrity/control-matrix.json`. `app-build-manifest.json` is not emitted by this installed build; its absence is recorded, not assumed to be chunk loss. Next's emergency `_global-error.html` intentionally uses inline styles; it is counted as emitted HTML but has no required external CSS. All representative successful application responses must reference CSS.

The physical mapping is `/_next/static/...` → `.next/static/...`, **not** `.next/_next/static/...`. A hardcoded chunk name or a server surviving a replacement of its `.next` directory cannot establish a compiler defect. The separate Traycer recovery commit `7790819` describes both mapping errors and a surviving server in the prior investigation; it was read as reference and its worktree was not modified. This independent matrix establishes that the alleged defect does not affect the controlled implementation path. It does **not** establish a universal Next.js guarantee or claim to have reproduced the prior orphaned-server event.

No evidence justifies changing Turbopack, CSS splitting, minification, import order, dependencies or framework versions. Those remain unchanged. The proven repository gap was the absence of a post-build check; the fix is to reject incoherent emitted/served assets and refuse stale/unknown server reuse.

## Permanent gate

`npm run audit:css-integrity` dynamically discovers CSS references in **all** emitted app HTML, checks nonempty files inside the build's static directory, then starts its own production server on an unused loopback port. It verifies 15 representative route families, including dynamic Build/Provider/Account responses without auth bypass. Real auth refusals are recorded as boundaries, not successful account sessions. Every discovered CSS URL must return **200**, have `text/css` content type and match the exact disk bytes. This detects stale CSS even when a server returns 200.

The process records its spawned PID, absolute Next entry, checkout, HEAD, start time, build ID and port; Windows also independently queries the listening owner and command line. An occupied port is a failure. The server exits in `finally` before a subsequent build may replace its files. There are no sleeps, successful-build retries, copied chunks, hash-name assumptions or relaxed failure assertions.

The gate is part of `npm run verify` and both GitHub verify/browser jobs. CI uploads its JSON evidence, including failure reports. Playwright also refuses existing servers in local runs, preventing unknown checkout reuse. Contact boundary tests derive their same-origin header from the configured base URL rather than a fixed port; all 51 boundary cases passed on an alternative port, without changing refusal assertions.

Negative controls prove both the inspector and real CLI gate refuse an intentionally withheld emitted CSS file: **exit 1**, served **404**, with restoration followed by a passing gate. No recovery evidence or source was deleted. Unit tests additionally refuse traversing paths, wrong MIME, redirects, empty/stale CSS and occupied ports.

## Reproduce

```
npm ci
npm run build
npm run audit:css-integrity
node scripts/css-integrity-matrix.mjs
```

The matrix temporarily changes exactly two CSS files and restores their original bytes in `finally`; run it only in an isolated checkout with no server or tests using its build. Its cleanup resolves and checks the exact `.next` path within that checkout. Run application tests after the matrix has finished, never concurrently with its build replacement.

## Production is a separate truth

Read-only public HTTP inspection at 2026-10-09 confirmed `/`, `/command`, `/products/knoux-one`, `/build/providers`, `/creative`, `/growth`, `/wordpress` and `/web`: all **200**, all their referenced CSS **200/text-css/nonempty**. The latest GitHub Production deployment record `6951593680` reports success for SHA `0f9641708a89c2b41b1577d7e9bb9b3bf3de3d17`. This is public route/CSS health plus deployment metadata, not a production rollout of this PR and not proof that every authenticated account workflow ran. No deployment or protection setting changed.

## Verification limits

Temporary experiment output and earlier invalid captures are not valid AFTER evidence. A first application test attempt was incorrectly run while the matrix replaced its build and mutated its experimental sources; it is excluded from final verification and rerun after pristine restoration. No test assertions were weakened. Remaining visual debt belongs to the separate Visual V4 change, after this gate and exact-head CI pass. Production dependency audit is clean; inherited development-only advisories remain reported separately.

