# Recovery mission evidence — 2026-10-07

Status: IN PROGRESS. This is a verified checkpoint, not a completion or merge declaration.

Remote main remains 63102b0d3865f11e608bdf13a8f8617e1c9acd32. Starting PR #34 head: db620b4430ac6b10af42628c1cd715724fda3692. Merge SHA: NOT_VERIFIED (PR remains open). Latest Production deployment recorded by GitHub: 6858166175, SHA 63102b0d3865f11e608bdf13a8f8617e1c9acd32; current production smoke testing: UNTESTED. No production database changes, branch deletion, worktree deletion, force push, or destructive cleanup occurred.

## Changes verified locally

- Server-derived Growth principals retain each client's role. Owner membership on one client cannot elevate VIEWER access on another or reach an unrelated client. Workspace-wide calls with only client grants fail closed. Selecting Supabase persistence automatically enables auth even if the optional auth switch says false.
- Growth audit entries now use the canonical credential scanner before truncation, removing the recovered giant backtracking expression. Root and Bridge scanners retain secret handling while simplifying control flow; ordinary prose survives.
- Preserved dirty OAuth changes use a domain-separated digest of random, high-entropy state, never raw nonce persistence. Meta/Google scope ordering is deterministic. Current live OAuth verification remains UNTESTED.
- /build/providers renders the recovered 13-adapter provider runtime. Development platform, local agent, custom metadata and disabled secret-save controls remain. /build/ai/providers redirects to the canonical page.
- Declared SUPPORTED capabilities do not count as runtime acceptance PASS. Discovery/probe server refusals now surface as errors; the provider table scrolls within its container.
- Preserved lockfile patch upgrades source-map-js 1.2.1 to 1.2.2. Production dependency audit: VERIFIED, zero vulnerabilities.

## Current gates

| Gate | Result | Evidence |
|---|---|---|
| Root application tests | VERIFIED: 686 pass, zero failures/skips | mission-root-verified.log |
| Growth + provider targeted tests | VERIFIED: 248 pass | mission-growth-provider.log |
| Bridge | VERIFIED: 144 core + 11 control-plane + 21 terminal = 176 pass | mission-bridge.log |
| Security/auth/audit targeted tests | VERIFIED: 88 pass before additional runtime regression test | mission-targeted.log |
| Typecheck | VERIFIED | mission-types-verified.log |
| Lint | VERIFIED | mission-lint-verified.log |
| Production build | VERIFIED | mission-build-final.log |
| Dead-code audit | VERIFIED; seven configuration hints | mission-dead-verified.log |
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
- NOT_VERIFIED: Build Composer uses the legacy declared stack catalog while runtime routing uses Router V2. The provider page is canonical, but all consumers have not yet converged.
- UNTESTED: live Growth RLS/migrations, Meta/Google authorization, KNOuX Agent execution, mutating MCP approval flow. Existing registration/patches are STATIC evidence only.
- NOT_VERIFIED: full exact-head CI, preview verification, merge eligibility and post-merge production verification.

Generated QA JSON, historical .artifacts/.kilo, installer, spreadsheet, YAML and reference experiment folders remain unstaged. Root dirty documentation, scratch and empty historical test were preserved. Cleanup-candidate report is audit-only and does not authorize deletion.

Matrices: FINAL-INTEGRATION-MATRIX.json/.md, FINAL-PROVIDER-TRUTH.json/.md, FINAL-RECOVERY-INVENTORY.json, FINAL-CLEANUP-CANDIDATES.md.
