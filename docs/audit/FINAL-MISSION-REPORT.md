# Recovery mission evidence - 2026-10-07

Status: IMPLEMENTATION VALIDATED LOCALLY; FINAL EXACT-HEAD CI AND FIRST-OWNER AUTHORIZATION PENDING. PR #34 remains open. No merge or production deployment claim is made.

Continued from dd4c60d81bf2e74f58211ed839d11c4909a92374 on the same converge/post33-growth-closure branch and existing full-reality-20261004 worktree. origin/main remains 63102b0d3865f11e608bdf13a8f8617e1c9acd32. No branch/worktree was created; no recovery ref or artifact was removed.

## VERIFIED

- Windows UAC-approved ACL repair adds only current account SID Read access to the original .env.local. SYSTEM and the previous owner's permissions remain unchanged. No owner change, repository permission rewrite, broad grant or secret copy/output occurred.
- Canonical provider auth/discovery/generation/streaming: Gemini, Groq, Mistral and Grok (OpenRouter transport) passed. DeepSeek uses its direct adapter and discovers deepseek-flash/deepseek-v4-pro. Its generation returns HTTP 402. OpenAI authenticated/discovered but generation was rate-limited. Detailed attempted/blocked/unconfigured states remain in FINAL-PROVIDER-TRUTH.json; no generated text or credentials are recorded.
- Every operational /command screen uses the server-projected repository snapshot when live persistence is selected. Authenticated session and client allowlist plus RLS enforce tenancy. Live failures never use fixtures; explicit demos/imported fixture records remain labelled. Intelligence receives the same live stored snapshot and brand context. Expired stored connections cannot appear CONNECTED; credential references are excluded from browser projections. Missing campaign budget access is not rendered as a zero budget.
- Durable Meta/Google start and callback routes: random state, session/client/user/provider binding, short TTL, atomic one-time consumption, replay refusal, mandatory scoped Supabase Vault storage, safe verification metadata, failure cleanup and owner-only connection removal. Reauthorization preserves scoped omitted refresh tokens and removes obsolete access credentials atomically. No OAuth callback returns credentials or raw provider errors.
- Real isolated Postgres executes all four Growth migrations. It verifies RLS, membership escalation refusal, blocked direct business writes, budget confidentiality, service-only secret/OAuth calls, state binding/TTL/replay/revocation, persisted connection verification/audit and reauthorization cleanup. Vault encryption is represented by a test peripheral; actual Supabase Vault encryption is not claimed by this test.
- Local lint, type checking, production build and dead-code audit passed; the application suite passed all 714 tests. Request-time workspace selection additionally prevents a build made in fixture mode from caching demos for live users. Bridge passed 144 core + 11 control-plane + 21 terminal tests, zero failures. Production dependency audit reports zero vulnerabilities. Exact final head will run all gates again.
- Six unique-ancestry decisions closed: Growth donor PORTED; its two recovery ancestors SUPERSEDED; two Traycer reference heads and unpublished-root ancestry REFERENCE_ONLY. Donor community factory preserves all 22 community identities. All six refs remain protected and retained. FINAL-RECOVERY-INVENTORY.json records semantic differences and exact SHA rechecks.

## BLOCKED / PENDING

- dd4c60d browser CI run 37680320804 ended CANCELLED at the 90-minute job limit while installing Chromium. GitHub annotation explicitly reports timeout; none of the 480 tests started. Verify/CodeQL/Sonar/Vercel passed that prior head, but it is not a successful browser gate. CI now uses the Ubuntu runner's installed stable Chrome through Playwright's supported channel and keeps the same 480-test suite; final head success is required.
- Connected Supabase project cnkddxxhcfceokxzaaot now has the four reviewed Growth migrations, applied as one atomic transaction with migration history recorded. Post-apply catalog proof confirms RLS, no anonymous business-table grants, protected browser-write refusal and service-only OAuth/Vault RPCs. No users, client data, memberships, fixture data or tokens were inserted. See FINAL-GROWTH-LIVE-SCHEMA.json. The first OWNER and server OAuth configuration still require explicit identification/configuration.
- The first real Growth OWNER account and client identity must be explicitly identified. No arbitrary auth user was granted ownership. Preserved local configuration lacks Supabase service role, Meta/Google apps and callback URLs, and does not select live persistence. Configure secrets in the server's secret environment, never in chat, reports or Git.
- DeepSeek billing and OpenAI rate limits prevent successful tiny generation/streaming; no purchase or billing change was attempted. Other missing/offline providers retain honest blocked/configuration-required states.

## UNTESTED

Real Meta/Google account consent and actual Vault encryption, authenticated production Growth UI, agent/MCP mutating execution, final-head browser CI, merged origin/main SHA, Vercel production SHA and post-merge production smoke tests. PR #34 must not merge until its required exact-head gates and live-operation conditions are satisfied.

Evidence logs remain privately in D:/Knoux Store/.knoux-recovery. Generated QA JSON, historical artifacts, installers, spreadsheets, root dirty documents and recovery worktrees remain preserved and unstaged. The cleanup report authorizes no deletion.
