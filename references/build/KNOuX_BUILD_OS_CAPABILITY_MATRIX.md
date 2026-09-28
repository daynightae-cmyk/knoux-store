# KNOuX Build OS — Capability Matrix

Every row states what exists, what is configured, what is verified, and the
exact blocker where one applies. Nothing here is marked implemented on the
basis of a file existing or a component rendering.

## Capabilities

| Feature | Implemented | Configured | Verified | Blocker |
| --- | --- | --- | --- | --- |
| Workspace shell, mode switcher, split canvas | YES | n/a | browser QA, 17 routes x 8 viewports, 0 errors, 0 overflow | — |
| Command Deck (Composer preserved) | YES | n/a | Composer presets and assembly unchanged; 59 pre-existing tests pass | — |
| Deterministic specification reader | YES | n/a | 6 unit tests incl. determinism and unresolved-term honesty | — |
| Project Cortex topology | YES | n/a | 169 nodes, 76 import edges read from disk; every node cites its file | — |
| Impact Radar | YES | n/a | 3 unit tests; counts from parsed import statements | — |
| Code surface (read) | YES | n/a | 196 files listed, real content served, path traversal refused | — |
| Code surface (write) | NO | NO | unit test asserts no write method exists | No write path on the adapter by construction. A deployed website cannot modify its own source. Needs a build service. |
| Syntax highlighting | YES | n/a | 2 unit tests; lossless, no HTML string | — |
| Live preview | YES | n/a | iframe against the deployment origin, 8 viewport presets | — |
| Visual inspector | PARTIAL | n/a | control renders | Component-to-source mapping is UNAVAILABLE: no React source map exists. Reports DOM facts only. |
| Git read | YES | n/a | branch, HEAD, origin/main, ahead/behind, 8 commits, changed files read live | — |
| Git write | NO | NO | unit test asserts no mutation is spawned | Needs credentials a web server must not hold. |
| Terminal | NO | NO | surface renders the blocked state | A web deployment has no shell. Needs an authenticated KNOuX build bridge. |
| Runtime management | NO | NO | — | Cannot start, stop or supervise processes. |
| Process safety | PARTIAL | n/a | adapter serialises verification runs to one at a time | The only runtime is the deployment itself. |
| Verification runner | YES | NO | route refuses with 403 unless enabled | Disabled on this deployment. Set `KNOUX_BUILD_ALLOW_VERIFY=1` on a trusted host. Only `lint`, `typecheck`, `test`, `build` can ever run. |
| Diagnostics | YES | NO | 3 parser unit tests; root cause never asserted from a parse | No tool output to parse while the runner is disabled. |
| Test Chamber | PARTIAL | NO | surface renders blocked state with the allowlist shown | Runner disabled. Reports `not-run`, never a fake pass. |
| Database studio | NO | NO | capability contract declared and rendered | No connection string and no adapter implemented. No schema is drawn rather than drawing a fictional one. |
| Provider contracts | YES | NO | 5 unit tests; 8 providers declared, 0 configured | No credential on the server. |
| Provider execution | NO | NO | Senshial reports `blocked` | No adapter implements `execute`. Needs a credential first. |
| Model router | YES | NO | 5 unit tests; refuses to substitute an unconfigured provider | With 0 configured providers every task resolves to `unavailable`, which is correct. |
| Senshial ASK/PLAN/EXECUTE | YES | n/a | 4 permission unit tests; mode ceiling enforced | The surface is real; a run is `blocked` because no provider is configured. |
| Execution history | YES | n/a | reducer test: newest first, bounded at 50 | Session-only. No cross-device memory is claimed. |
| Failure memory | YES | n/a | — | Session-only, for the same reason. |
| Checkpoints | NO | NO | — | No mutation happens, so there is nothing to checkpoint. Git-native revert belongs to a build service. |
| Reality Ledger | YES | n/a | 3 unit tests; row is only as green as its weakest axis | — |
| Project Health | YES | n/a | score withheld unless all four gates are measured | No gates measured in a browser session, so no score is shown. |
| Release Cockpit | YES | n/a | 5 stages render real evidence, including `not-run` | Commit/push/PR/merge/deploy are blocked by design. |
| Recipe builder | NO | n/a | — | Out of scope this sprint. The existing Composer presets remain the entry points. |

## Verification axes

A capability is tracked on six independent axes. None implies another.

| Axis | Meaning | This sprint |
| --- | --- | --- |
| Implemented | the code exists and is wired | see table above |
| Configured | the external service or credential is present | 0 of 8 providers; 0 database; runner off |
| Tested | a test asserts the behaviour | 41 new Build OS tests; 100 total |
| Runtime verified | observed working in a running server | verified locally on a production build |
| CI verified | green on the commit | pending at the time of writing |
| Production verified | verified on knoux.store | pending at the time of writing |

## Honest limits of this sprint

1. **The Browser could not reach the authenticated Vercel preview.** Deployment
   protection returned a login wall and no Vercel credential is available in
   this environment. Local verification used a real production build
   (`next build` + `next start`) driven by a real headless browser.
2. **Touch, reduced-motion and forced-WebGL-failure device modes were not
   simulated.** The browser exposes no such controls. Source paths exist and are
   implemented; a physical pass is not claimed.
3. **Git state on production will report unavailable.** A production build
   ships source without a `.git` directory, so the Git surface will state that
   rather than showing a fabricated branch.
4. **The Project Cortex on production will show the source that was deployed**,
   which is the real project at the deployed commit, not the working tree of
   whoever is reading the page.
