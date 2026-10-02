# Build security review

Reviewed against main 57a3fe0ba83fccf5c65c10a0c37f88c4cf763737. This is a review of the new boundaries, not a claim that the entire application is vulnerability-free.

| Boundary | Enforcement | Evidence / limit |
|---|---|---|
| Existing workspace access | All five new BFF routes call guardBuildApi before integration work; existing local read policy is preserved | New boundary tests and hosted browser refusal tests |
| Private GitHub / paid-provider credential | Verified user must be in server KNOUX_BUILD_OPERATOR_IDS; presence alone never permits access | Operator allowlist tests; live credential access not configured |
| Mutation origin | Pairing, import and provider probe require exact same-origin Origin | Route boundary tests; no per-user OAuth is installed |
| Credential storage | EnvironmentSecretStore is server-only, read-only, with no write implementation; save controls disabled | Canary tests, typed browser-safe projections; encrypted vault remains absent |
| Provider request | Fixed https://api.openai.com/v1/models, explicit action, timeout, redirects refused, body canceled; no generation | Executed adapter tests with injected HTTP fixtures; no live credential probe claimed |
| Repository coordinates | Fixed GitHub host and strict owner/repo parsing; no credentials/query/fragments, arbitrary host or shell string | Injection and SSRF-shaped input tests; real public REST metadata request |
| Public import | Dedicated signed project:import scope, owner pairing, explicit approval, bridge opt-in, exclusive new folder | Real bridge HTTP/scope and filesystem collision tests; paired-account live clone unverified |
| Clone execution | Fixed argv, shell=false, isolated Git config/environment, hooks disabled, credential helpers disabled, no submodules/install/scripts | Shipped clone boundary review; failure preserves reserved folder |
| Selected project | Lexical and canonical root jail, symlink escape refusal, bounded inspection; authenticated transport has no server-checkout fallback | Real temporary filesystem tests; transport tests; unavailable reads invalidate shared facts |
| Untrusted project scripts | Opening/importing inspects declarations; package scripts cannot reach verification through selected-project adapter | Reducer/capability tests, bridge inspection sentinel test |
| Bridge tickets | Existing Ed25519 audience binding, scopes, single use, 60-second TTL; owner RLS unchanged | Existing protocol/ticket tests plus new endpoint replay and wrong-scope refusal tests |
| Pairing persistence | Snake_case database mapping, owner filter and owner assignment on insert; cannot reassign owner on update | BridgeStore behavioral tests; no live authenticated Supabase pairing claimed |
| Browser policy | Only configured loopback bridge origin added to /build connect-src; other pages retain policy; frame-src self and production script policy preserved | Policy tests; configure KNOUX_BRIDGE_URL before production build so generated headers match runtime config |
| Tool detection | Explicit owner scope; fixed names, absolute PATH, real files/executable access, bounded non-shell version invocations | Bridge detector fixture tests and actual local detector report; command shim versions stay unmeasured |
| Preview inspection | Same-origin DOM only, no input values or raw network request objects serialized; bounded observations with secret-pattern redaction and query stripping | Browser DOM/console/resource tests and redaction canaries; arbitrary unrecognized secret strings cannot be universally identified |
| Preference persistence | Validated seven-field non-secret schema; no credentials or project file contents persisted | Browser persistence and unit schema tests |
| Evidence | Explicit JSON download; pixel writing to projects stays disabled without an authenticated capture adapter | Real browser download test; screenshot writer absent |

Retained limitations: hosted Vercel cannot reach a desktop via localhost, the existing pairing schema accepts loopback only, imported runtimes and task profiles are not automatically trusted, OAuth/vault/history/generation adapters are absent, DOM names are approximations, full HTTP network status and component-source mapping are unavailable. The existing CSP inline hydration allowance remains unchanged.

Windows bridge tests emit node-pty AttachConsole teardown diagnostics and audit-append diagnostics during disposable harness shutdown; their assertions pass. These diagnostics are recorded instead of claiming a silent native teardown.

An optional live clone-and-cleanup proof was rejected by automatic approval review with the stated reason “blocked by policy”; it did not execute. Public metadata is independently measured, and live paired import is explicitly unverified.
