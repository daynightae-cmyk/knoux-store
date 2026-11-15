# Supabase data and authentication closure

Date: 2026-09-28
Branch: `feat/supabase-content-registry`
Base main: `484bba7382b1c6d04735daa34f90954c1a15e45f`
Supabase project: `KKNOUX STORE` (`cnkddxxhcfceokxzaaot`)

## Database foundation

The production Supabase project now contains five public-schema tables with RLS enabled:

- `content_registry` — canonical repository-derived content registry.
- `site_settings` — public evidence metadata where explicitly marked public.
- `profiles` — one row per authenticated Supabase user.
- `contact_requests` — durable request intake.
- `content_sync_runs` — private sync audit records.

The foundation is migration-backed. The initial migration creates indexes, update timestamps, the profile creation trigger, RLS policies and the `submit_contact_request` RPC. A follow-up hardening migration revokes direct execution of the profile trigger function and explicitly keeps sync-run rows private.

## Repository content sync

`supabase/build-content-seed.mjs` extracts literal repository registries without inventing records.

The current generated registry contains **260** rows with registry hash:

`e0d1a72fa4b14615a209596654ed8f51389b24c98fbd9c4b8f878114e3bf980c`

The production database was seeded with all 260 rows. Two public settings record the software audit date and owner. One completed sync run records the same 260-row count and registry hash.

## Authentication

KNOuX now uses Supabase Auth rather than the earlier unconfigured adapter.

Implemented paths:

- email/password sign-in through `signInWithPassword`;
- registration through `signUp`, with profile creation from the auth-user trigger;
- Google and GitHub OAuth through `signInWithOAuth`;
- PKCE callback exchange at `/auth/callback`;
- cookie-backed SSR session refresh through Next.js 16 `proxy.ts`;
- password recovery mail through `resetPasswordForEmail`;
- password update through `updateUser`;
- authenticated `/account` route;
- server-side sign out.

The OAuth callback accepts only local-path `next` values, preventing an external redirect target.

Google OAuth was configured in Supabase and Google Cloud. The Google application is currently External / Testing, with the owner's account registered as a test user. Production publication is intentionally deferred until the end-to-end browser sign-in pass.

## Contact intake

When Supabase is available, the contact API stores a validated request through the bounded `submit_contact_request` RPC even when no external webhook is configured.

The interface distinguishes:

- `stored: true, delivered: false` → request securely received by KNOuX;
- `delivered: true` → external webhook delivery also succeeded;
- neither → no success is shown.

Direct table writes remain revoked.

## Security and advisor state

RLS is enabled on all five tables.

The profile trigger function is no longer callable by anonymous or signed-in API users. `content_sync_runs` has an explicit deny policy for exposed roles.

The Supabase security advisor still reports `submit_contact_request` as an intentionally public `SECURITY DEFINER` function. This is expected because anonymous visitors must be able to submit the public contact form. Its scope is limited to validated insertion into `contact_requests`; direct table mutation is not granted. Abuse protection/rate limiting remains a separate production-hardening item.

Performance advisor reports new indexes as unused. That is expected immediately after database creation and is not evidence that the indexes are unnecessary; usage should be reviewed after real traffic exists.

## Verification

Local source gates after integration:

- TypeScript: pass.
- Production build: pass, Next.js 16.3.6, **65** generated routes/pages including dynamic auth/account routes.
- Test suite: **59/59 pass**.
- Tests run with `KNOUX_TEST_DISABLE_EXTERNALS=1` so automated tests cannot write to the live Supabase project.
- Live Supabase OAuth smoke: both Google and GitHub returned valid Supabase authorization URLs without provider errors.
- Database row count: `content_registry = 260`.
- Generated TypeScript database types are stored in `src/lib/supabase/database.types.ts`.

## Remaining production checks

- Complete one physical Google OAuth browser round-trip with the configured test user.
- Complete one physical GitHub OAuth round-trip if GitHub remains a published provider.
- Verify registration email confirmation and password recovery mail in the production browser.
- Publish the Google OAuth app after those checks if public Google sign-in is desired.
- Add durable abuse protection for anonymous contact intake before high-volume exposure.
