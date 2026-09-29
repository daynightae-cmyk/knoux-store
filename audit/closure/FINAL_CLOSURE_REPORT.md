# KNOuX global production closure — final report

Every number below was produced by a command that ran, against a production
build of this branch. Where something was not run, it says so.

| | |
| --- | --- |
| Baseline `main` | `ad38dd1c7747aef686a95d791281b8a665685979` |
| Feature branch | `feat/global-production-closure` |
| Review target | Pull request #12, `feat/global-production-closure` into `main` |

---

## 1. Verification gate

Every step run from a clean `npm ci`, in this order.

| Step | Command | Result |
| --- | --- | --- |
| Install | `npm ci` | **exit 0** — lockfile reproduces the tree from scratch, 0 vulnerabilities |
| Lint | `npm run lint` | **exit 0** — 0 errors, 0 warnings |
| Types | `npm run typecheck` | **exit 0** |
| Build | `npm run build` | **exit 0** — no project-adapter trace warning |
| Unit tests | `npm test` / `npm run test:coverage` | **198 / 198 pass**, 0 fail |
| Coverage | `npm run test:coverage` | **exit 0** — 86.64% statements, 77.20% branches, 75.86% functions |
| Browser suite | `npm run test:e2e` | **342 / 342 pass**, 0 fail, 0 skip (26.2m, 1 worker) |
| Automated a11y | (part of the above) | **96 axe assertions** across 32 routes × 3 device profiles, **0 critical or serious** |
| Dependency audit | `npm audit --audit-level=high` | **0 vulnerabilities** |
| Dead code | `npm run audit:dead` | **exit 0** — no unused files, dependencies, unlisted packages or unresolved imports |
| SAST | CodeQL `javascript-typescript`, queries `security-and-quality` | Final head must be checked for alerts after CI completes |
| Whitespace | `git diff --check` | clean |

The browser suite ran against `next start -p 3311 -H 127.0.0.1` with
`VERCEL_ENV=production`, so the workspace boundary answered as a deployment
answers rather than as a developer's machine would.

The closure review then found four more defects and the code now addresses them:
authenticated hosted sessions were rejected before lookup; global frame denial
blocked same-origin product previews; a failed workspace fetch abandoned the
remaining reads; and fresh rate-limit keys could exceed the 4096-entry cap.
Browser regressions for previews and failed fetches pass on all three device
profiles, and the full 342-test run is green.

Running that full run found two more defects, both in the tests rather than in
the product, and both of the kind that report a pass or a failure that the run
did not earn:

| # | Defect | What it did | Fix |
| --- | --- | --- | --- |
| 10 | `api-boundary.spec.ts` still asserted `frame-ancestors 'none'` after the policy was relaxed to `'self'` | Failed 3× (once per profile) against a policy the feature required. The assertion was correct for the old site and wrong for this one | Assert the restriction, not a copied value: the directive must be present, must be `'self'`, must not be the open forms, and `X-Frame-Options` must be `SAMEORIGIN` |
| 11 | The failed-fetch regression synchronised on a label that reads the same before and after the read pass | Passed 3× in isolation, failed 3× inside the full run. `ADAPTER STATE UNKNOWN` is the label on first paint, so the assertion could complete while only `/api/build/project` had been requested — the exact failure the test exists to catch | Wait for all three reads to be attempted and for the network to go idle, then assert. The race is gone, not retried |

Both were reproduced before being changed. Defect 11's failure output is the
evidence that the assertion, not the code, was at fault: `requested` contained
`["/api/build/project"]` at the moment the test claimed the read had settled.

---

## 2. What the gate found

The previous closure report on this branch claimed the work was done. It was
not, and the claim was the problem: nothing in it had been executed. Running
the gate produced these.

### Real product defects, fixed

| # | Defect | Evidence it was real |
| --- | --- | --- |
| 1 | **Every text surface failed contrast.** `--dim` was `#6d6e70`, 3.90:1 on `--bg`, against a 4.5:1 requirement | 29 axe failures before, 0 after |
| 2 | **The contrast fix did nothing.** `globals.css` declared `:root` twice; the readable block was declared second and won, so the readable block was also where every later edit went | Computed colour on the page read `rgb(109,110,112)` after the token was changed |
| 3 | **`/products/[slug]` opened on a black slab.** `.product-hero` had no CSS at all; the mark `<svg viewBox="0 0 312 532">` has no width or height, so it filled its block at **1440 × 2455** and pushed the product name two and a half viewports down the page | Measured `getBoundingClientRect`; screenshot |
| 4 | **Same defect, second instance.** `.product-arrival` was also unstyled and in normal flow, adding a **2649px** slab above the hero | Measured; `largestBlankBand` 2463px → 130px |
| 5 | **`/build/pipeline` rendered an error boundary in production.** It read `runner.status.evidence` from the 401 body, which has no `status`. The security boundary working correctly was what broke the route | Reproduced in a browser; 1 failing route test |
| 6 | **The contact form refused every legitimate submission.** The origin check compared `Origin` against `new URL(request.url).origin`, which behind a proxy is the *internal* origin | `POST /api/contact` returned 403 for a valid same-origin submission |
| 7 | **Six form fields were focusable and invisible.** `outline: 0` outranked the global `:focus-visible` rule | Measured: 6 stops on `/contact` and `/products` with no focus indicator → 0 |
| 8 | **The skip link did not move focus.** It scrolled; focus stayed on `body`, so the next Tab returned to the top of the document — the exact failure the link exists to prevent | Measured |
| 9 | **three.js shipped to visitors who never see a canvas.** Next prefetches a linked route's client bundle, and the product anatomy scene was a static import, so any page containing a product link fetched 905KB of three.js. `/work` shipped **1703KB** with **0** canvases | Measured per-route: `/work` now **796KB** |

### Test defects — assertions that measured the wrong thing

Three of them were producing false results, and one of those false results was
being read as a product failure.

| Assertion | What it actually measured | What it now measures |
| --- | --- | --- |
| "a page taller than 8 viewports" | Page height. `/creative` is 10 viewports of dense, correct content; a page filling 4000px with an empty `min-height` would pass | The largest vertical band with nothing in it, in px |
| `nav` must be visible | The desktop nav, which is correctly hidden below 760px — 33 mobile routes failed for a correct decision | Whether a `<nav>` landmark exists **and** a visible navigation control reaches it |
| LCP via `getEntriesByType` | LCP is a buffered-only entry type; `getEntriesByType` always returns empty, so every route reported "no LCP" | A `PerformanceObserver` installed before navigation |
| three.js detection by chunk filename | A content hash — `0j2l0w73kdknw.js` — never matches `/three/` | Whether a canvas is actually in the rendered document |
| `main` width | `getBoundingClientRect` on `display: contents` returns zero, so `/build` reported "main is 0% of the viewport" | The children's content width when the parent generates no box |

### Gates that were configured but had never run

| Gate | State found | State now |
| --- | --- | --- |
| `npm run audit:dead` | `knip.json` carried a `compilerOptions` key knip 5 rejects — the CI merge gate had been failing on invalid input and reporting nothing | Runs, exits 0, reports real findings |
| `server-only` | Imported by `src/lib/auth/capabilities.ts`, reachable from `/login` and `/register`, **not installed**. The Next.js guard that stops a server module reaching a client bundle was doing nothing | Installed and declared |
| Playwright run output | Commit `ea9eddd` added **59 files / 27MB** of `trace.zip` and screencast jpegs to history | Untracked and ignored |

### Repository hygiene

- `dev-workspace.css` was stored **UTF-16LE**, which is why it read as binary to
  every text tool. Re-encoded to UTF-8, content byte-identical.
- `globals.css` was 23KB of minified rules in the first 30 lines and readable
  rules from line 30 onwards — the two halves disagreed, which is what defect 2
  above is.

---

## 3. Security findings

All reverified against source this pass, with behavioural tests, not source grep.

| ID | Finding | Status | Evidence |
| --- | --- | --- | --- |
| F-01 | No CSP / HSTS / nosniff / frame protection | **CLOSED** | `src/lib/security/headers.ts`; same-origin frames permitted for live previews, foreign framing blocked |
| F-02 | OAuth open redirect via backslash forms | **CLOSED** | `tests/security-redirect.test.mjs` — 97.5% lines |
| F-03 | Anonymous access to `/api/build/*` | **CLOSED** | Anonymous hosted reads return 401; a verified hosted session can proceed |
| F-04 | WordPress proxy served same-origin SVG | **CLOSED** | SVG refused in this run: 415 `Upstream content type is not a permitted raster image (svg)` |
| F-05 | Test suite required the internet | **CLOSED** | Suite runs offline; a public host is refused by design |
| F-06 | Contact form had no rate limit | **CLOSED** | **Found incomplete this pass** — the origin comparison used the internal origin (defect 6). Now fixed and covered |
| F-07 | Turbopack whole-project trace warning | **CLOSED** | Build output clean |
| F-17 | CI proved nothing about the browser | **CLOSED** | 342 browser assertions green in the `browser` job |

`docs/BUILD_SECURITY_MODEL.md` documents the PUBLIC / AUTHENTICATED /
LOCAL BRIDGE / SERVER boundaries, each traced to the file that enforces it.

**Honest note on CSP:** `'unsafe-inline'` is present in `script-src`. The
alternative is a per-request nonce, which would make every page dynamic and
cost this site its static generation. That is a stated trade, recorded in the
file's own header comment. A green header check is a restriction policy, not
proof of XSS immunity.

---

## 4. Measured performance

From the final run, desktop, production build. `canvas` is whether the route
actually rendered a WebGL surface.

| Route | FCP | LCP | DCL | Script | Canvas |
| --- | --- | --- | --- | --- | --- |
| `/` | 592ms | 592ms | 771ms | 1623KB | yes |
| `/build` | 400ms | 400ms | 426ms | 1769KB | yes |
| `/products` | 320ms | 320ms | 203ms | 708KB | no |
| `/wordpress/plugins` | 184ms | 184ms | 141ms | 711KB | no |
| `/growth` | 140ms | 140ms | 64ms | 711KB | no |
| `/work` | 164ms | 164ms | 40ms | 796KB | no |

The two heavy routes are the two that render 3D. The budget is derived from
that fact at run time, and the paired assertion is that a route with no canvas
may not carry the weight — which is the assertion that caught `/work` at
1703KB.

No Lighthouse score is asserted. It is a weighted composite that moves with
machine load, and a gate on it teaches people to re-run until it passes.

---

## 5. Geometry and responsiveness

Measured by the browser suite, not read from CSS.

- **Horizontal overflow: 0px** on every route at all 11 widths in the matrix
  (1904×880 → 375×812), at all three device profiles.
- **Dead space:** the largest vertical band containing nothing is measured per
  route. Worst case is now **130px** on a 900px viewport. `/products/knoux-one`
  was 2463px before the hero was styled.
- **Evidence:** six reviewed, current-build captures are committed under
  `references/visual-audit/verified/`. The broad Playwright captures are CI
  artifacts, excluded from Git.

---

## 6. Artifacts

| Path | What it is |
| --- | --- |
| `docs/BUILD_SECURITY_MODEL.md` | The four access boundaries, each traced to enforcing code |
| `references/visual-audit/ACCESSIBILITY_CLOSURE.md` | What axe found, what manual keyboard testing measured, and what was **not** verified |
| `tests/design-tokens.test.mjs` | The colour-authority regression test |
| `references/visual-audit/verified/` | Six curated screenshots from the current production build |
| `e2e/.artifacts/` | Playwright run output — **gitignored**, not committed |

---

## 7. Known limitations

Not defects; things a reader should not assume were done.

1. **No screen reader was run.** Every accessibility claim is DOM-level. See
   section 3 of `ACCESSIBILITY_CLOSURE.md`.
2. **CodeQL is configured and runs in CI; its results are alerts, not a job
   status.** A green `sast` job does not mean a clean analysis.
3. **Ten source modules are unreferenced by any route** and are listed in
   `knip.json` rather than deleted. They are prior design work —
   `ProductDossier`, `UniverseConstellation`, `knouxField`, `universeGraph`,
   `universePalette`, two motion prototypes, `ProductSceneBase`, and two auth
   modules. Deleting someone's work is not a dead-code sweep's job. They are
   recorded here so the decision is visible rather than buried in config.
4. **Final CI and CodeQL results must be read at the exact pushed head.**
   Earlier green jobs do not validate later commits.
5. **The browser suite is a per-process, single-worker, serialised run.** It
   reports what one machine observed, not a guarantee about every machine. Two
   runs on this machine disagreed once — an evidence capture and an axe pass
   both failed on `browserContext.close: ENOENT … traces\….network` because a
   second Playwright run deleted `e2e/.artifacts/` out from under the first.
   The suite is not safe to run concurrently against one output directory, and
   that is a property of the harness rather than a finding about the site.
