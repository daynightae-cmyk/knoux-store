# Recovery mission evidence — 2026-10-07

Status: IN PROGRESS. This is a verified checkpoint, not a completion or merge declaration.

Remote main remains 63102b0d3865f11e608bdf13a8f8617e1c9acd32. Starting PR #34 head: db620b4430ac6b10af42628c1cd715724fda3692. Merge SHA: NOT_VERIFIED (PR remains open). Latest Production deployment recorded by GitHub: 6858166175, SHA 63102b0d3865f11e608bdf13a8f8617e1c9acd32; current production smoke testing: UNTESTED. No production database changes, branch deletion, worktree deletion, force push, or destructive cleanup occurred.

## Changes verified locally

- Server-derived Growth principals retain each client's role. Owner membership on one client cannot elevate VIEWER access on another or reach an unrelated client. Workspace-wide calls with only client grants fail closed. Selecting Supabase persistence automatically enables auth even if the optional auth switch says false.
- Growth audit entries now use the canonical credential scanner before truncation, removing the recovered giant backtracking expression. Root and Bridge scanners retain secret handling while simplifying control flow; ordinary prose survives.
- Preserved dirty OAuth changes use a domain-separated memory-hard scrypt digest of random, high-entropy state, never raw nonce persistence. Meta/Google scope ordering is deterministic. Current live OAuth verification remains UNTESTED.
- /build/providers renders the recovered 13-adapter provider runtime. Development platform, local agent, custom metadata and disabled secret-save controls remain. /build/ai/providers redirects to the canonical page.
- Declared SUPPORTED capabilities do not count as runtime acceptance PASS. Discovery/probe server refusals now surface as errors; the provider table scrolls within its container.
- Preserved lockfile patch upgrades source-map-js 1.2.1 to 1.2.2. Production dependency audit: VERIFIED, zero vulnerabilities.

## Current gates

| Gate | Result | Evidence |
|---|---|---|
| Root application tests | VERIFIED: 694 pass, zero failures/skips | mission-security-final-tests.log |
| Growth + provider targeted tests | VERIFIED: 249 pass (172 Growth + 77 provider/runtime) | mission-router-targeted.log |
| Bridge | VERIFIED: 144 core + 11 control-plane + 21 terminal = 176 pass | mission-bridge.log |
| Security/auth/audit targeted tests | VERIFIED: 88 pass before additional runtime regression test | mission-targeted.log |
| Typecheck | VERIFIED | mission-security-final-types.log |
| Lint | VERIFIED | mission-security-final-lint.log |
| Production build | VERIFIED | mission-security-final-build.log |
| Dead-code audit | VERIFIED; seven configuration hints | mission-runtime-dead.log |
| Production dependencies | VERIFIED: zero vulnerabilities | mission-audit.log |
| Targeted browser tests | VERIFIED: 47 pass, four existing redundant-profile skips | mission-e2e-chrome.log |
| Full E2E | UNTESTED for this checkpoint; exact-head CI required | PR #34 |
| CodeQL / Sonar / Vercel | NOT_VERIFIED for this checkpoint; awaiting new checks | PR #34 |

Logs are preserved privately under D:/Knoux Store/.knoux-recovery. Browser tests used installed Google Chrome with the production build; initial Playwright run failed because this migrated Windows profile lacked Chromium, and that failure remains preserved. No failed gate is counted as passed.

## Recovery and runtime truth

120 refs and 36 registered worktrees inventoried with exact SHA, merge base, unique commits and dirty/untracked paths. Existing 77-ref semantic ledger dispositions were cross-referenced. Unique ancestry remains protected; orphan snapshots and missing worktree refs were retained. The refreshed inventory is not proof that every historical implementation has been semantically accepted.

The VS Code/Base44 provider runtime at base44/setup-3259c13c / 2d5214b was already integrated through b783d52. DeepSeek is a direct OpenAI-compatible adapter under the shared contract. Scoped source-history searches found no Nebius or DeepSeek-V4 implementation. Current DeepSeek auth/discovery/generation/streaming: BLOCKED because Windows denies the current account read access to preserved .env.local. The integration worktree has no .env.local; credentials were neither printed nor copied. Ollama and LM Studio default endpoints: UNAVAILABLE. Historical success is not current proof.

Provider/model details: FINAL-PROVIDER-TRUTH.json and .md. Context/pricing remain unknown where no discovery exists. Tools were not executed. Configuration alone is not READY.

## Remaining work and blockers

- BLOCKED: restore private server environment read access for the migrated Windows account, then retest configured providers, including tiny DeepSeek generation/streaming probes.
- NOT_VERIFIED: every historical unique source requires a final decision, with newly encountered orphan checkpoint differences recorded in FINAL-RECOVERY-INVENTORY.json.
- NOT_VERIFIED: Growth screens still read labelled fixtures; recovered repository persistence is not yet wired to every operational screen. Durable OAuth callbacks and atomic state consumption require deployment/integration work.
- NOT_VERIFIED: Workspace environment and provider responses now project discovered models from the recovered registry; both workspace shells request Router V2 decisions server-side. The historical catalog is retained for reference tests. End-to-end authenticated routing remains UNTESTED.
- UNTESTED: live Growth RLS/migrations, Meta/Google authorization, KNOuX Agent execution, mutating MCP approval flow. Existing registration/patches are STATIC evidence only.
- NOT_VERIFIED: full exact-head CI, preview verification, merge eligibility and post-merge production verification.

Generated QA JSON, historical .artifacts/.kilo, installer, spreadsheet, YAML and reference experiment folders remain unstaged. Root dirty documentation, scratch and empty historical test were preserved. Cleanup-candidate report is audit-only and does not authorize deletion.

Matrices: FINAL-INTEGRATION-MATRIX.json/.md, FINAL-PROVIDER-TRUTH.json/.md, FINAL-RECOVERY-INVENTORY.json, FINAL-CLEANUP-CANDIDATES.md.

## Follow-up convergence evidence

The preserved constant HMAC key triggered Sonar S6437 on 54728aa. It was replaced with a public-domain salt and memory-hard scrypt digest; 28 OAuth/persistence tests pass. No security finding was dismissed. The first push's verification and CodeQL jobs passed; Vercel preview was successful. Full browser CI remains in progress, and the follow-up requires its own exact-head checks.

Workspace environment and provider endpoints use src/lib/build/providers.ts as a compatibility facade over src/lib/ai/registry.ts. Both workspace shells request the shared server Router V2; missing discovery stays unavailable. The historical declared catalog was preserved in tests/fixtures/historical-provider-catalog.ts for legacy deterministic contract tests. Growth capability/probe requests now include the selected client and check its server-resolved grant; HTTP refusals no longer masquerade as successful payloads.

KNOuX Agent source at D:/KNOUX_Agent exists. No separate agent was created or deployed. Agent runtime/MCP execution remains UNTESTED.

## Growth write-boundary follow-up

Recovered v1/v2 SQL still granted authenticated members direct writes through membership-only FOR ALL policies. The additive 20261007100000_knoux_growth_write_boundaries.sql revokes business/OAuth-state browser mutations while preserving rows, read predicates and owner-only membership management. PUBLIC and anon privileges are explicitly revoked on all recovered Growth tables. Audit remains read-only. Operational writes require audited server transactions before these grants can safely be restored; this restriction is not evidence of a complete live persistence feature.

Migration status: STATIC_VERIFIED / NOT_APPLIED. Three regression checks enumerate the actual recovered schema/grants to detect omitted tables; no development Postgres was available, so live catalog/advisor/RLS execution is still required. No production schema was changed. Supabase permission reference: https://supabase.com/docs/guides/database/postgres/roles and https://supabase.com/docs/guides/database/postgres/row-level-security.

Meta/Google code exchange now refuses missing secret storage or authenticated tenant/user context before contacting the provider. Token references come only from the store; provider app ids no longer stand in for client/user ids. Secret-store exceptions are not reflected into API failures. Four additional behavioral tests verify these boundaries. Durable callback/atomic state consumption is still NOT_VERIFIED.

At 2d3bc296c4dce2a3accfa8179286eeb73c31712b: verification unit/build/audit and CodeQL checks SUCCESS; Sonar SUCCESS; Vercel SUCCESS. Full browser CI was still running when this follow-up was prepared. New commits require new exact-head checks.

Sonar on efcef781d619fb681e05378abcf281f94b643529 failed the duplication threshold (3.0% displayed). Its duplication API identified identical Meta/Google exchange preflight blocks. Those checks now share prepareCodeExchange; 32 OAuth tests and typecheck pass after extraction. No issue was dismissed or excluded. Vercel connector inspection returned 403 for the project's team scope, and no local Vercel CLI is installed; GitHub deployment status remains available, but direct authenticated preview inspection is BLOCKED.
