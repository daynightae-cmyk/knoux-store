# Integration setup and boundaries

All Build APIs retain guardBuildApi. Hosted reads require a verified KNOuX account. Private GitHub data and provider probes additionally require a verified account ID in KNOUX_BUILD_OPERATOR_IDS (comma-separated server environment variable).

## GitHub

Public metadata accepts owner/repository or an HTTPS github.com repository URL. Server token access uses KNOUX_BUILD_GITHUB_TOKEN; use a fine-grained token limited to required repositories with metadata read permission, and approve organization access where required. Results are limited to 100 updated repositories. This is deployment-scoped operator access, not a per-user OAuth connection. Per-user OAuth requires client ID, callback validation, an authenticated session, and an encrypted token vault; CONNECT GITHUB remains blocked until that path exists. Private clone is blocked because no secure credential transport is installed.

## Local bridge

Install/run the existing bridge on the trusted machine; set its root to the directory that bounds permitted projects. Set KNOUX_BRIDGE_SIGNING_KEY and KNOUX_BRIDGE_URL server-side, apply the existing owner RLS bridge migration, and pair with the one-time code through Settings. Hosted Vercel cannot use its own localhost to reach the owner's desktop; the existing pairing schema accepts loopback origins only. Hosted access remains blocked until an authenticated gateway and reviewed schema exist. The pairing URL must match the server-configured bridge origin. Compare the resulting bridge fingerprint on the machine. Existing projects are specified relative to the bridge root. Imported projects are inspection only and do not inherit permission to run package scripts.

Public import also requires allowProjectImport=true in the trusted bridge configuration. Choose a new immediate child folder. Clone reserves the directory exclusively; existing folders, including dirty projects and empty folders, are refused. No npm install, postinstall, package scripts, submodules or automatic execution occurs. Failed clones retain their reserved directory for manual inspection. Git configuration and environment are isolated to prevent credential helpers and checkout hooks from executing inherited configuration. Automatic SDK/process/Traycer detection is not claimed.

## AI providers and secrets

The original provider registry remains authoritative. Environment variable names are shown without values. OpenAI connection testing calls only its authenticated models endpoint after explicit operator action. It does not generate tokens or establish model execution. Other provider adapters currently declare metadata and configuration requirements; their connection tests and generation remain blocked.

EnvironmentSecretStore implements SecretStoreAdapter as environment-only and read-only. SAVE controls remain blocked with SECRET STORAGE NOT CONFIGURED. A writable implementation must supply encrypted storage, owner authorization, audit, key rotation, and a server-only read path. No provider API key form is enabled, and no secrets are stored in React persistence, localStorage, sessionStorage, IndexedDB, database columns or telemetry. Custom metadata validation accepts display name, HTTPS base URL, model IDs, non-secret header names and declared capabilities only. Saving or executing custom endpoints is unavailable.

## Vercel and Supabase

VERCEL_ENV, VERCEL_URL, VERCEL_GIT_COMMIT_SHA, VERCEL_GIT_COMMIT_REF and VERCEL_DEPLOYMENT_ID provide current deployment metadata only. History and deployment triggers have no installed adapter. History setup requires VERCEL_TOKEN, VERCEL_TEAM_ID and VERCEL_PROJECT_ID plus an authenticated history adapter.

Supabase public client configuration uses NEXT_PUBLIC_SUPABASE_URL plus NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (or the existing legacy anon configuration). Presence is not a connection test. Database read, Auth, Storage and Realtime are independently unmeasured here. Admin write stays blocked. A server secret/service-role key never grants browser privileges and is never projected by these APIs.

## Preview

The deployment itself is the default real same-origin preview. Imported projects have no runtime until separately started through a trusted process profile; this release never relabels the server origin as an imported project preview. Console and failed-resource events are captured only after the same-origin frame has loaded. Earlier bootstrap messages and HTTP response codes are unmeasured. Accessible names are DOM approximations, and the runtime lens does not claim an axe pass/fail. Reference images stay in the current component session. Comparison requires a real same-origin URL; baseline production status remains unverified. Evidence export downloads measured JSON metadata. Project screenshot writing remains blocked until an authenticated capture adapter and dedicated evidence directory exist.

Documentation sources consulted: [GitHub repositories API](https://docs.github.com/en/rest/repos/repos), [OpenAI models list](https://developers.openai.com/api/reference/resources/models/methods/list), [Supabase API keys](https://supabase.com/docs/guides/getting-started/api-keys). Installed Next.js 16.3.6 route, client boundary and lazy-loading guides were read before framework changes.
