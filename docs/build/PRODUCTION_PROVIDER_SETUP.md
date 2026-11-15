# KNOuX Build production provider setup

This runbook defines the real production path for `/build`. It does not create provider keys, claim connectivity from configuration, or enable an unauthenticated coding-agent executor.

## What the user can do

After signing in, a user can open **Build → Providers**, see the canonical provider registry, create a provider profile, enter their own provider API key in the write-only credential form, bind the credential to the profile, test authentication and model discovery, choose an active profile, and then use the discovered models in **Build → AI → Control**. The key is never returned to the browser after submission.

The current server flow is:

1. `ProviderCenter` sends the secret over an authenticated same-origin request.
2. `ScopedProviderSecretStore` validates and encrypts it with AES-256-GCM.
3. `ProviderRepository` writes only the encrypted envelope through the service-role boundary.
4. `scopedRuntime` decrypts the credential in server memory for the current request and injects it into the selected adapter environment.
5. Generation and streaming use the selected provider/model and record measured usage and runtime evidence.

A configured name, environment variable, or catalog entry is not treated as a successful connection. The user must run **Test connection** before routing or generation becomes eligible.

## Required deployment configuration

Configure these values in the server deployment secret store, never in browser-exposed variables:

- `SUPABASE_SERVICE_ROLE_KEY`
- `KNOUX_PROVIDER_VAULT_KEY` — base64 encoding of a fresh 32-byte random key
- `KNOUX_PROVIDER_VAULT_KEY_ID` — stable key identifier used for rotation
- `KNOUX_BUILD_OPERATOR_IDS` — verified Supabase user IDs allowed to run operator-only tests and agent permission changes
- `KNOUX_AGENT_PERMISSION_CEILING` — an explicit JSON ceiling if coding-agent permissions will be used

Apply the additive migration:

```text
supabase/migrations/20261008234936_provider_operating_system.sql
```

Verify the migration in the target Supabase project before accepting credential writes. Do not expose the service-role key or vault key to the browser, `NEXT_PUBLIC_*`, logs, screenshots, telemetry, or repository files.

A Windows PowerShell example for generating the vault key locally is:

```powershell
$bytes = [byte[]]::new(32)
[Security.Cryptography.RandomNumberGenerator]::Fill($bytes)
[Convert]::ToBase64String($bytes)
```

Use the deployment platform's secret generator where available. The resulting value must be stored in the deployment secret manager and rotated through the documented key-rotation process.

## Provider onboarding acceptance test

For each supported provider required by the deployment:

1. Sign in with a real verified account.
2. Create a profile with the provider's exact API-key mode.
3. Add the user's key under **Credentials**. The form must clear after a successful save and has no reveal control.
4. Bind the credential in the profile and make the profile active.
5. Run **Test connection**. This checks authentication and discovery only; it does not bill or generate.
6. Confirm discovered models and capabilities in **Models** and **Capabilities**.
7. Select a model in **AI → Control**, submit a small prompt, and verify the real response, model ID, latency, usage source, and cost basis.
8. Repeat with **Stream** and verify the SSE completion and measured runtime evidence.
9. Revoke or rotate the key and verify dependent profiles lose prior authentication/discovery/runtime evidence.

No provider is marked ready when any of these facts are unknown.

## Coding-agent boundary

The provider registry can display coding-agent definitions and measured local inventory. That is not the same as executing an agent. Agent execution remains blocked until a trusted local bridge is installed, paired, mutually authenticated, bounded to an owned workspace, and given an explicit per-action approval policy. Do not replace this gate with a browser-side key, arbitrary shell endpoint, or fake progress state.

The following are therefore separate production gates:

- **Provider generation:** requires the migration, service-role key, vault key, user authentication, the user's provider key, and a successful connection test.
- **Local coding agent:** additionally requires the paired bridge, inventory identity, workspace binding, permission ceiling, approval records, and runtime/evidence tests.
- **Hosted deployment:** requires the deployment secret values and hosted Supabase migration to be verified on the exact deployed SHA.

## Verification commands

```text
npm run audit:deps
npm run audit:dead
npm run typecheck
npm run lint
npm test
npm run build
npm run test:e2e
```

The repository must report unavailable or blocked states when the required deployment configuration is absent. It must never report a successful provider call, payment, agent execution, or deployment merely because a key name or profile exists.
