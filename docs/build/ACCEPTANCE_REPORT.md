# Connected Build acceptance report

This feature extends the existing reducer, project adapters, provider registry and /api/build boundary. Unconfigured integrations are deliberately blocked; configuration presence is never described as a connection.

Baseline: ff0ee5963688bf488d2635d66a4bc9382aa7ac2a (Verification #88 passed). Main moved through PR #27; it was inspected and reconciled without conflicts in the same feature branch. Current main: 57a3fe0ba83fccf5c65c10a0c37f88c4cf763737, [exact-main Verification passed](https://github.com/daynightae-cmyk/knoux-store/actions/runs/37053963504). One feature branch: feat/build-real-integrations-os. One existing managed worktree. No main push, force push, destructive cleanup or PR merge.

Final feature SHA is the immutable head reported with the PR in the final response. Embedded live facts record their actual earlier capture SHA and dirty state; they are not relabeled as final-head evidence.

| FEATURE | STATUS | REAL DATA SOURCE | AUTH REQUIRED | VERIFIED | BLOCKER |
|---|---|---|---|---|---|
| Persistent living canonical mark | Implemented | Existing canonical SVG sampler | No | Stable reduced-motion, persistent canvas, bounded particle pool, animated/hidden pause browser tests | None; device budgets limit density |
| Controls and single shared workspace | Implemented | Existing reducer and route tree | Per action | 146 source declarations; interaction matrix; route/keyboard tests | Unavailable commands explain their requirement |
| Project launcher | Implemented / connection-ready | Actual paired root, manifest, files, routes, Git | Verified paired owner | Real filesystem and transport tests; blocked-state browser checks | No paired authenticated account in this session |
| Public GitHub repository | Measured | Real GitHub REST repository and commit endpoints | Public upstream; hosted workspace read policy still applies | daynightae-cmyk/knoux-store public request succeeded | Rate limits remain possible |
| Private / organization GitHub | Adapter implemented, unconfigured | /user/repos, up to 100 real accessible repositories | Operator allowlist and scoped token | Adapter/auth/permission fixtures | KNOUX_BUILD_GITHUB_TOKEN and operator session; per-user OAuth absent |
| Public clone / import | Adapter implemented, blocked here | Trusted bridge Git and exclusive directory | Paired owner + explicit approval + opt-in | Scope/replay/path/dirty-folder/collision tests | Live paired import unverified; no bridge/session |
| Local bridge / PTY | Existing transport extended and repaired | Signed HTTP, real native PTY | Paired owner | 167 bridge tests, including real shell and PID | Hosted gateway absent; loopback schema only |
| AI configured / unconfigured states | Measured locally, all unconfigured | Original registry and sanitized environment presence | Hosted read policy | Real local BFF output; unit canaries | No provider credentials configured in this worktree |
| AI tested / untested | OpenAI probe implemented; live untested | Explicit authenticated models endpoint HTTP result | Same-origin allowlisted operator + key | Adapter success/refusal/timeout fixtures | No live key/operator; generation and other probes unavailable |
| Custom provider | Metadata validation implemented | Typed non-secret definition | No for validation | Invalid URL/header/model tests | Saving/execution requires secure configured adapter |
| Secure credential store | Read-only environment boundary | EnvironmentSecretStore | Operator reads; no client key input | Canary and disabled-save tests | SECRET STORAGE NOT CONFIGURED; encrypted vault absent |
| Local agents | Actual binaries detected on authorized local host | Shipped bridge PATH detector | Paired owner for UI endpoint | OpenCode, Codex, Claude, Gemini shims detected; versions unmeasured | UI pairing not configured; no agent execution claimed |
| Developer runtimes | Measured on authorized local host | Fixed binary/version probes | Paired owner for UI | Git, Node, Python, PowerShell versions measured; npm/pnpm/yarn/bun shims present | Docker/Java not detected; Android SDK and Traycer probes absent |
| Apps / Services | Implemented real registry and project separation | Existing softwareProducts/webSystems + shared selected project | Registry public; project protected | Existing registry tests and Build routes | Catalogue declarations are not running infrastructure |
| Deployments | Current facts supported; history blocked | Vercel runtime metadata and independently serving browser origin | Protected facts | Projection and sanitization tests | No Vercel history/trigger adapter or token/team/project setup |
| Docs | Reads discovered real Markdown | Project snapshot and allowlisted file adapter | Workspace or paired-project owner | Real local BFF and visual capture; path tests | Unavailable files show refusal; no generated docs fiction |
| Preview live / responsive | Implemented, real local documents | Production same-origin iframe; eight sizes + custom dimensions | Runtime read permitted | Live route, reload, resize, three-frame sweep across browser profiles | Imported runtime absent |
| Preview inspect | Implemented | Actual clicked element, box and computed styles | Loaded same-origin | Real DOM click assertions | Component source mapping unavailable |
| Preview console / network | Partial supported observations | Post-load console and failed-resource events | Same-origin | Real emitted console error/resource failure, redaction and cleanup | Earlier bootstrap messages/full HTTP codes unmeasured |
| Preview accessibility | Semantic lens implemented | Actual DOM headings, landmarks and focusable candidates | Same-origin | Semantic read + separate automated axe checks on shell | Name approximation; runtime audit pass/fail not claimed |
| Preview ghost / compare | Implemented | Actual approved image upload and supplied same-origin URL | No beyond runtime | Upload, opacity/difference, real baseline frame | Cross-origin framing blocked; production baseline status unverified |
| Preview capture | JSON export implemented; pixel writer blocked | Measured route, viewport, time, Git, DOM observations | Same-origin and export preference | Actual download | Authenticated screenshot writer/dedicated storage absent |
| Palette / activity / preferences | Implemented | Real routes/capabilities/session events/seven-field schema | Per command | Keyboard dialog, disabled actions, applied/persisted preferences | Storage refusal falls back to session |
| GitHub CI / Vercel | Pending feature-head results | Exact-head checks and deployment status | GitHub/Vercel project | Report actual status in PR/final response | No remote success inferred from local checks |

New BFF APIs: GET /api/build/github; GET /api/build/integrations; POST /api/build/project/import; POST /api/build/providers/probe; GET /api/build/bridge/tools. Existing project/file/git APIs now use the current owner-selected adapter.

New bridge endpoints: GET /v1/project/inspect; GET /v1/project/git; GET /v1/project/file; POST /v1/project/import; GET /v1/tools. New scopes: project:import and tools:read.

New adapters/boundaries: GitHubIntegrationAdapter; SecretStoreAdapter with read-only EnvironmentSecretStore; explicit OpenAI models probe; integration fact projection; request-bound selected BridgeProjectAdapter transport; bridge project inspection/public clone and fixed local tool detector. No second provider registry or workspace store was created.

Every working and disabled control family, its actual handler/adapter/auth and exact blocker is documented in BUILD_INTERACTION_MATRIX.md. BUILD_CONTROL_INVENTORY.json enumerates all 146 declarations, including dynamic registry source declarations. The repeated controls are real data mappings, not duplicated mock controls.

Local gates: diff check, lint, typecheck, test (401 pass), audit:dead, production build and Build Playwright are recorded in the final validation result. Dependency audit through installed npm-cli.js found zero vulnerabilities; the PowerShell npm wrapper initially rejected audit with EALLOWSCRIPTS. Bridge: 135 policy/config/server/project tests + 11 native contract tests + 21 real terminal tests passed. Native teardown diagnostics are noted in SECURITY_REVIEW.md.

Visual evidence: all ten routes at 1440/768/390; launcher, four integration views, preferences, real local provider/platform/agent/secret surfaces, Preview console/resources, responsive sweep, ghost/comparison, actual references and metadata downloads. PNGs stay reproducible local/CI artifacts under references/build-connected/qa; the CI uploads them. The evidence index records hashes and file names. Their source is the production server, with no project/provider API interception.

Remaining setup: verified owner session and existing Supabase pairing migration/RLS; KNOUX_BRIDGE_SIGNING_KEY and configured loopback KNOUX_BRIDGE_URL (set before build); bridge allowProjectImport opt-in; KNOUX_BUILD_OPERATOR_IDS and scoped KNOUX_BUILD_GITHUB_TOKEN for private metadata; OPENAI_API_KEY for explicit model-list probe. Credentials alone do not implement missing OAuth, encrypted vault, generation, hosted gateway, history, imported task/runtime, screenshot writer, Android SDK or Traycer adapters.

Security review: see SECURITY_REVIEW.md. No credentials were invented or added, no RLS policy was widened, no protected hosted read was made public, and no import installs dependencies or executes package scripts. Review and approval by the owner are required before merge.
