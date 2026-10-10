# Production experience recovery V5 — scoped delivery

This is a verified P0 recovery, not completion of the entire production transformation mission. No merge, production deployment, database import, registrar purchase, or campaign launch occurred.

## A. Baseline

Original repository: `D:\Knoux Store`. Starting fetched `origin/main`: `b1fe8d4fa9233903fa3da88876bd935582a32ad1`.
Isolated worktree: `D:\Knoux Store-worktrees\production-experience-recovery-v5`.
Branch: `codex/production-experience-recovery-v5`, starting at that origin/main SHA.
Original main was `9f3497480933236483a860b338dc352d1aa2931d` (ahead 1 / behind 105). Its dirty CLAUDE files, scratch directory, test, stash, other worktrees, and running agent/server processes were preserved. No reset, clean, stash application, or historical checkout deletion.

Observed production: Vercel project `prj_myQWIm9ryXpY27vnpRDw1TJ92SXQ`, READY deployment `dpl_7k7aXz9ZXyHh2LVRLZgqMVf9QiRA`, `knoux.store`, SHA b1fe8d4. This branch has not been deployed to production.

Read installed Next documentation before coding. Installed locked dependencies independently; actual build uses Next 16.3.8.

## B. Execution

Directly changed routes: `/growth`, `/wordpress`, `/signal`, `/contact`. Shared header/footer affects all routes; `/engineering` and `/products` were additionally visually sampled.

- Growth: move the option grid inside an ordinary div within the fieldset. The browser's legend layout had confined choices to a 150px column despite a 1287px fieldset. At 1440px, the repaired grid measures 1094px with three 356px columns. Section heights decrease from 724/598/706px to 236/232/236px. Progression, disabled states and keyboard selection are retained.
- Shared footer: restore a four-column desktop / two-column mobile directory. Desktop height decreases from 660px to 434px. Signal is now a primary navigation entry; the mobile menu starts below 1100px.
- WordPress: official WordPress.org adapter supplies six cached, real themes in the preserved ecosystem hero. Selection, official source, proxied screenshot, screenshot width controls, Arabic/English studio and request composition work. Width controls resize a screenshot; they do not emulate a live responsive website. Installation, editing, checkout and deployment remain outside this studio.
- Contact: imported theme/source and domain choices are visible and removable before submission through the existing intake boundary. Domain requests explicitly say availability is unverified.
- Signal: readable normal-flow introduction, country coverage and evidence limitations, discoverable actions, Arabic/English introduction and core lookup states, RTL handling and corrected label contrast. The original globe component and single global starfield are preserved. Evidence inspector and some country/metadata labels remain English.
- Cloudflare: fix adapter to official `/registrar/domain-check`, `result.domains`, `registrable`, `tier` and actual registration/renewal costs. Contract tests distinguish unavailable, unsupported, unknown and premium without fabricated prices. No live registrar account was activated.
- Capture harness: records build/SHA/server ownership, byte-matched CSS, actual errors, geometry, screenshots and sampled accessibility. Unique evidence directories preserve each new capture; cleanup stops only its owned server.

Cloudflare API reference: https://developers.cloudflare.com/registrar/registrar-api/
Namecheap reference: https://www.namecheap.com/support/api/methods/domains/check/
WHMCS reference: https://developers.whmcs.com/api-reference/domainwhois/

Live domain status returns `unconfigured`: no registrar credentials configured. Required Cloudflare names are `KNOUX_DOMAIN_CLOUDFLARE_ACCOUNT_ID` and `KNOUX_DOMAIN_CLOUDFLARE_TOKEN`; Namecheap requires API_USER, API_KEY and allowlisted CLIENT_IP under the KNOUX_DOMAIN_NAMECHEAP prefix. WHMCS requires BASE_URL, API_IDENTIFIER and API_SECRET under KNOUX_DOMAIN_WHMCS, but its existing adapter contract must first be corrected: current custom GET/numeric response differs from official POST DomainWhois/string verdict. Do not activate it on the strength of fixture tests.

### Actual data evidence

No new data was imported or promoted. Read-only Supabase checks found 347,520 business records across seven countries:

| Country | Records | Distinct phones |
|---|---:|---:|
| AE | 92,755 | 76,908 |
| BH | 8,362 | 7,359 |
| EG | 154,770 | 142,979 |
| KW | 11,132 | 8,731 |
| OM | 8,724 | 7,448 |
| QA | 13,614 | 11,749 |
| SA | 58,163 | 39,347 |

One bounded live production lookup for a public Egyptian hotel returned HTTP 200, storage available, a real Overture business match, source URL and required attribution. This verifies public business evidence, not a personal owner's identity. Licensed identity and public search providers are unconfigured.

The existing Foursquare staging registry records 135,814 measured / 131,193 valid / 103,225 unique rows, Apache 2.0, SHA256 `835ad7e531574e141f8ff603e4a6d2621732739a180e85f535187d896326f899`. It was not promoted. Existing registry also includes Overture, OSM (ODbL), Wikidata (CC0), carrier and numbering sources; ITU license URL is absent and MCC quarantine/approval discrepancy needs review. These are registry observations, not a fresh license or privacy approval.

Growth clients, connections and campaigns each contain zero rows. No connector, spend, campaign or performance result was invented.

## C. Testing and evidence

Validated application/script source SHA: `072feae4e770330030edc1e223436bf9bdbfa096`. Build ID: `La4X8e3Vot6zEb5QaBKT7`. A later documentation-only delivery commit does not change the application tested here.

| Command / check | Exit | Result |
|---|---:|---|
| `npm ci --no-audit --no-fund` | 0 | 497 locked packages |
| `npm run build` | 0 | Production build, Next 16.3.8 |
| `npm run typecheck` | 0 | Passed |
| `npm run lint` | 0 | Passed |
| `npm run test:coverage` | 0 | 770 pass, 0 fail, 0 skipped; statements/lines 80.24%, branches 76.24%, functions 69.80% |
| `npx playwright test e2e/production-recovery.spec.ts e2e/starfield.spec.ts e2e/api-boundary.spec.ts` | 0 | 66 pass, 0 fail, 0 skipped across desktop/tablet/mobile |
| `npm run audit:css-integrity` | 0 | 62 emitted documents, 14 byte-matched HTTP 200 stylesheets, 15 route families |
| `node scripts/production-recovery-capture.mjs after` | 0 | 25 captures, 5 routes × 5 widths |
| `npm run audit:dead` | 0 | No dead-code failure; 7 configuration hints |
| `npm audit --omit=dev --json` | 0 | Zero production vulnerabilities |
| `npm audit --json` | 1 | Six high dev dependency findings |

Capture viewports: 1440×900, 1920×1080, 820×1180, 390×844, 360×800. All final records return route HTTP 200, no horizontal overflow, zero unexpected browser errors/failures, exactly one starfield. Axe WCAG sampled at 1440px on five routes: zero violations. Mobile was checked for geometry/behavior and manually sampled; it was not a full accessibility or bilingual audit.

Local evidence (intentionally untracked, not pushed):
- `qa/production-recovery/before/report.json` and PNGs: actual production baseline b1fe8d4. Two remote CSS request timeouts are recorded as incomplete verification, not passes.
- `qa/production-recovery/after-072feae4e770-1791596196722/report.json` and full/top/flow PNGs: final accepted capture.
- `qa-delivery-e2e.log`, `qa-coverage-final.log`, `qa-css-delivery.log`, `qa-typecheck-final.log`, `qa-lint-final.log`, `qa-build.log`, `qa-audit-production.json`, `qa-audit-all.json`, `qa-dead-code.log`.

Diagnostic intermediate captures and interrupted full-suite logs are not acceptance evidence. Full 630-test browser suite was not completed locally; exact-head CI must prove it. CodeQL was not run locally. No assertion or security gate was bypassed. Line-ending drift caught by CSS tests was corrected and tests rebuilt/rerun.

Dev audit findings involve @next/eslint-plugin-next, eslint-config-next, braces, fast-glob, micromatch and knip. Suggested major changes/downgrades were not blindly applied.

Read-only Supabase advisors also report 23 INFO RLS-enabled/no-policy findings, 6 WARN anonymous and 14 WARN authenticated SECURITY DEFINER callable functions, plus leaked-password protection disabled. These are existing advisor findings, not automatically proven exploits. Review bounded public RPC permissions (particularly temporary Foursquare staging RPC) before enrichment; preserve intentional safe public access and deny-by-default policies.
Remediation guidance:
- https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy
- https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable
- https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable
- https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection

## D. Git delivery

Application commits: d618716, e367eee, 1bce1b1, 112e60f, ba988dd, 072feae. Final documentation commit and exact delivery SHA are recorded by Git/PR. Review with `git log origin/main..HEAD` and `git diff origin/main...HEAD`.

This is a draft PR; no merge or production deployment. Local QA artifacts remain untracked. Source changes are committed and pushed at delivery; exact-head CI status and PR URL are reported in the handoff message. A pending CI run is not a passing check.

## E. Reality matrix

| Major task | Status | Evidence / limitation |
|---|---|---|
| Preserve accepted/parallel work | VERIFIED | Isolated worktree from fetched main; original checkout untouched |
| Growth grid and shared footer recovery | VERIFIED | Geometry, screenshots, browser behavior |
| Five-route responsive visual sample | VERIFIED | 25 captures; sampled accessibility |
| Complete all-route visual transformation | NOT IMPLEMENTED | Inventory below; five routes visually sampled |
| Official WordPress selection/request studio | VERIFIED | Real official themes, source, screenshot, request review/removal |
| Full live WordPress editor/install/deploy | NOT IMPLEMENTED | No such behavior advertised by new controls |
| Live domain availability | BLOCKED | Missing registrar credentials; WHMCS contract repair required |
| Cloudflare adapter contract | PARTIALLY VERIFIED | Official contract + fixture tests; live credentials absent |
| Signal safe business lookup | VERIFIED | Existing real Supabase + bounded live production result |
| Complete Signal bilingual experience | PARTIALLY VERIFIED | Introduction/core lookup translated; inspector/metadata incomplete |
| Signal enrichment/promotion | NOT IMPLEMENTED | Existing staging inspected; no import or promotion |
| License/privacy/RPC review for enrichment | PARTIALLY VERIFIED | Registry/advisors inspected; discrepancies still need resolution |
| Growth live campaign platform | BLOCKED | Zero clients/connections/campaigns; integrations not activated |
| Comprehensive browser/security QA | PARTIALLY VERIFIED | 770 tests + 66 browser checks; full browser/CodeQL await CI |
| Production deployment | NOT IMPLEMENTED | Existing main deployment only |

## F. Next session handoff

Continue in `D:\Knoux Store-worktrees\production-experience-recovery-v5` on `codex/production-experience-recovery-v5`. Begin with `git status --short`, `git rev-parse HEAD`, `gh pr checks`, and `git log origin/main..HEAD`; reuse the final evidence above. Do not overwrite original dirty work or treat older captures as final.

1. Finish exact-head GitHub browser/verification/CodeQL checks and fix any failure before review/merge. Run `npm run verify` and `npm run test:e2e` only if new code changes warrant rerunning; captures use `node scripts/production-recovery-capture.mjs after` and create unique folders.
2. Repair `src/lib/domain/providers/whmcs.ts` against official DomainWhois using bounded contract tests; inspect its environment-selected custom endpoint before deciding whether that path is intentionally separate. Activate a selected registrar only with real authorized configuration, then verify availability without purchases.
3. Review Foursquare staging provenance, duplicate/normalization metrics, source license/privacy and temporary RPC permissions; resolve registry/quarantine discrepancies. Design a bounded reversible promotion with explicit evidence before importing more data.
4. Configure a legitimate Growth connector using existing `src/lib/growth` foundations. Prove authorization/real read-only data before any campaign or spend action. Empty tables do not satisfy this task.
5. Finish route-by-route visual and bilingual audit (inventory below), especially authenticated dashboards and remaining Signal inspector labels. Preserve original globe.

## Exact changed files (relative to worktree)
- `e2e/production-recovery.spec.ts`
- `scripts/production-recovery-capture.mjs`
- `src/app/globals.css`
- `src/app/signal/signal.module.css`
- `src/app/wordpress/page.tsx`
- `src/components/GrowthFlow.tsx`
- `src/components/RequestForm.tsx`
- `src/components/SiteHeader.tsx`
- `src/components/signal/SignalExperience.tsx`
- `src/components/signal/SignalLookupClient.tsx`
- `src/components/wordpress/DomainFinder.tsx`
- `src/components/wordpress/EcosystemHero.tsx`
- `src/components/wordpress/WordPressStudio.module.css`
- `src/components/wordpress/WordPressStudio.tsx`
- `src/data/navigation.ts`
- `src/lib/domain/providers/cloudflare.ts`
- `tests/cloudflare-contract.test.mjs`
- `tests/wordpress-domain.test.mjs`
- `docs/production-experience-recovery-v5.md`

## Discovered page inventory — session verification scope

Build/type checks cover the code graph. UNTESTED below means no complete session visual/functional audit; it does not assert the route is broken.

| Route pattern | Session status |
|---|---|
| `/about` | UNTESTED |
| `/account` | UNTESTED |
| `/build/ai/arena` | UNTESTED |
| `/build/ai/control` | UNTESTED |
| `/build/ai/models` | UNTESTED |
| `/build/ai` | UNTESTED |
| `/build/ai/providers` | UNTESTED |
| `/build/ai/router` | UNTESTED |
| `/build/ai/senshial` | UNTESTED |
| `/build/ai/usage` | UNTESTED |
| `/build/apps` | UNTESTED |
| `/build/deployments` | UNTESTED |
| `/build/docs` | UNTESTED |
| `/build/engineering` | UNTESTED |
| `/build` | UNTESTED |
| `/build/pipeline` | UNTESTED |
| `/build/powershell` | UNTESTED |
| `/build/providers` | UNTESTED |
| `/build/services` | UNTESTED |
| `/build/settings` | UNTESTED |
| `/build/terminal` | UNTESTED |
| `/command/analytics` | UNTESTED |
| `/command/automations` | UNTESTED |
| `/command/campaigns` | UNTESTED |
| `/command/clients` | UNTESTED |
| `/command/communities` | UNTESTED |
| `/command/connections` | UNTESTED |
| `/command/creative` | UNTESTED |
| `/command/google` | UNTESTED |
| `/command/intelligence` | UNTESTED |
| `/command/leads` | UNTESTED |
| `/command` | UNTESTED |
| `/command/reports` | UNTESTED |
| `/command/settings` | UNTESTED |
| `/command/social` | UNTESTED |
| `/contact` | PARTIALLY VERIFIED — imported request review/removal |
| `/creative/[slug]` | UNTESTED |
| `/creative` | UNTESTED |
| `/engineering` | PARTIALLY VERIFIED — five-width visual sample; targeted behavior where changed |
| `/forgot-password` | UNTESTED |
| `/growth/[slug]` | UNTESTED |
| `/growth` | PARTIALLY VERIFIED — five-width visual sample; targeted behavior where changed |
| `/labs` | UNTESTED |
| `/login` | UNTESTED |
| `/` | UNTESTED |
| `/products/[slug]` | UNTESTED |
| `/products` | PARTIALLY VERIFIED — five-width visual sample; targeted behavior where changed |
| `/register` | UNTESTED |
| `/signal/business` | UNTESTED |
| `/signal/claim` | UNTESTED |
| `/signal/lookup` | UNTESTED |
| `/signal/my-number/activity` | UNTESTED |
| `/signal/my-number/labels` | UNTESTED |
| `/signal/my-number` | UNTESTED |
| `/signal/my-number/privacy` | UNTESTED |
| `/signal/my-number/reputation` | UNTESTED |
| `/signal` | PARTIALLY VERIFIED — five-width visual sample; targeted behavior where changed |
| `/signal/settings` | UNTESTED |
| `/signal/watchlist` | UNTESTED |
| `/solutions/[slug]` | UNTESTED |
| `/solutions` | UNTESTED |
| `/update-password` | UNTESTED |
| `/web/[slug]` | UNTESTED |
| `/web` | UNTESTED |
| `/wordpress/blocks` | UNTESTED |
| `/wordpress` | PARTIALLY VERIFIED — five-width visual sample; targeted behavior where changed |
| `/wordpress/patterns` | UNTESTED |
| `/wordpress/plugins` | UNTESTED |
| `/wordpress/solutions` | UNTESTED |
| `/wordpress/starter-sites` | UNTESTED |
| `/wordpress/themes` | UNTESTED |
| `/work` | UNTESTED |
