# KNOuX Reference Implementation Audit

Date: 2026-09-28
Project: `D:\Knoux Store`
Current branch: `feat/supabase-content-registry`
Starting `main` for this continuation: `484bba7382b1c6d04735daa34f90954c1a15e45f`

## Authority and production baseline

The accepted Home arrival and canonical `LivingParticleMark` remain the visual authority. At the start of this sprint the checkout was clean, local `main` matched `origin/main`, and GitHub's public main API reported the same SHA. The live apex returned HTTP 200 with title `Digital Headquarters — KNOuX` and canonical `https://knoux.store`; `www` returned HTTP 307 to the apex. These checks describe the **pre-sprint production baseline**. A new production deployment cannot be claimed until the closure branch merges and Vercel confirms its SHA.

## Current implementation map

| Reference family | Current implementation | Closure state |
| --- | --- | --- |
| Auth / Embacy | `auth/AuthScene`, `lib/auth/*`, `lib/supabase/*`, `/auth/callback`, `/account` | Visual reference closed and operational identity is now **IMPLEMENTED** with Supabase Auth: email/password, Google/GitHub OAuth, PKCE callback exchange, SSR cookie refresh, account session, sign-out and password recovery/update. Google remains External / Testing until the physical browser round-trip is accepted. See `SUPABASE_AUTH_CLOSURE.md`. |
| Build Composer Orb | `build/BuildComposerOrb`, `orb-layout`, `Composer` | **COMPLETE** for desktop/mobile viewport, pointer and keyboard preview QA. Registry-derived edited stack drives the Orb. Touch, reduced-motion and forced-WebGL-failure simulation are **PARTIAL** because the connected browser exposes no such controls; see `QA_CLOSURE.md`. |
| Web and Creative details | `web/[slug]`, `creative/[slug]`, `detail/ServiceDetail` | Implemented and registry-driven. |
| Product cinematic and anatomy | `products/*`, `product-anatomy-data` | Implemented from real software products. |
| Product Universe | `ProductUniverse` on `/products`; earlier Home `UniverseConstellation` retained in source | The `/products` discovery surface is **UNCHANGED**. Home uses an editorial `HomeSoftwareField` presentation of the **same** software registry. The authenticated preview revealed a weak initial composition, so the field now adds a canonical mark, larger system signature and serial, and typographic record hierarchy; the revised Vercel visual check is pending its deployment. |
| WordPress official marketplace | `lib/wordpress/*`, marketplace routes | Plugins, themes and patterns returned official JSON in this sprint. The official Block Directory still returned HTML; its unavailable state remains honest. KNOuX first-party releases remain zero. |
| About identity | `AboutLivingIdentity` and canonical `LivingParticleMark` | **COMPLETE** for authenticated preview desktop/mobile visual QA: a lazy mounted living mark stays within the identity frame and text distinguishes first-party releases, external discovery and real Work records. Device-mode simulation remains **PARTIAL**. |
| Work specialist | `CaseFileArchive` | **COMPLETE** for authenticated preview desktop/mobile visual QA: fixed context and scrolling verified product records retain evidence hierarchy. Original Marlow Vance artifact was not found in the repository or supplied attachments. See `work/WORK_REFERENCE_TRACEABILITY.md`. |
| Vaultex motion study | Site motion grammar and `motion/VAULTEX_CLOSURE.md` | Only interaction mechanics are adapted. Source branding, palette, fonts, cursor and CDN libraries are rejected. |
| KNOuX Living Companion | `identity/KnouxSentinel.tsx` | Original KNOuX Sentinel replaces the temporary mark-SVG follower. One global pointer listener. SVG + DOM + CSS. No additional WebGL context. Treated as a **TEMPORARY** implementation: it is not the final visual authority, which is being produced separately. Verified here only for pointer pass-through, layout containment and reduced-motion behaviour; it was not redesigned. |

## Delivery truth

- `isAuthConfigured()` now resolves from the real Supabase project configuration. The server actions use Supabase Auth for credential sign-in, registration, OAuth, recovery, password update and sign-out; `/auth/callback` exchanges OAuth/PKCE codes for cookie-backed sessions. The authenticated `/account` route reads the real user and profile. Google is still in Testing publication status until the physical browser round-trip is accepted.
- `/api/contact` now stores validated requests in Supabase through `submit_contact_request` when the database is available. A missing `CONTACT_WEBHOOK_URL` no longer discards the request: the API distinguishes durable storage from external delivery and the UI reports “received” rather than “delivered” when only storage succeeds.
- `analytics.ts` remains an in-memory event contract with an optional pre-existing `dataLayer` bridge. Vercel Web Analytics remains a separate open integration path and is not claimed here.
- Product logo `<img>` branches remain because no visual profile names a verified local logo asset. On the authenticated `/products/knoux-one` preview, neither conditional product logo image was mounted; the canonical SVG rendered and no image was broken. The two non-blocking lint warnings are recorded. Migrating unknown future asset proportions to `next/image` without an asset to inspect would not be a validated fix.
- A user-facing Work search summary still said its archive was empty. It now names the repository-backed product and engineering case files. A source sweep found no other stale empty-archive, fake-auth, fake-delivery, or unimplemented-Orb statement in current user-facing content.

## Local gate evidence

- `npm run lint`: exit 0, two existing product logo image warnings.
- `npm run typecheck`: exit 0.
- `npm run build`: exit 0; 62 static pages generated by Next.js 16.3.6.
- `npm test`: exit 0, 59/59 tests. The count rose from 52 when the Sentinel tests landed.
- `npm ci`: attempted, exit 1 (`EPERM` unlinking the loaded Windows Next SWC binary); `npm install --no-audit --no-fund` restored dependencies, exit 0. This is an environment limitation, not a source pass for `npm ci`.
- `git diff --check`: exit 0 after whitespace cleanup. Authenticated PR preview route, link, layout and Orb QA: see `QA_CLOSURE.md`. Revised Home preview, fresh CI, merge and production SHA remain release gates until the next push and checks.

## Branch reconciliation

The feature branch was reconciled with a normal merge at `9586f2cd75bdbe6db0c613eb3fe6ac578d6eecee`, whose parents are the local `4cc1e35ee19ad1171439e21ad90b94e2bfeb56d7` and the remote `61ddcb1f6319623bda5f7ca2ed662fe5e4778c3c`. No force push, reset, or dropped commit was used. The merge conflicted only in `src/app/globals.css` and this audit; both sides of each were kept, so the Home software field, the Composer search-copy fix, the QA records and the full Sentinel surface all survive at the merged HEAD.

## Historical prompt policy

Implementation prompts in `references/build`, `divisions`, `products`, `universe` and `wordpress` are retained as historical records with a top-level banner. They describe earlier worktree and implementation states and must not be executed as current instructions. The source repository and this audit govern current work.
