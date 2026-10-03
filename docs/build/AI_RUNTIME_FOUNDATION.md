# KNOuX AI Runtime Foundation

As of 2026-10-03: **NOT IMPLEMENTED by this convergence task. Phase A is BLOCKED.**

The executable application is unchanged from origin/main `ae7c0d394ea07047f3c0ef534411872a59c2711f`. Read [the reality audit](../audit/KNOuX_REALITY_CONVERGENCE_2026-10-03.md) and its source-parity archive before enabling further phases.

## Current provider contract and evidence

Current code has provider configuration detection (`src/lib/build/providers.ts`), deterministic AUTO/MANUAL routing (`model-router.ts`), task classes, and a read-only EnvironmentSecretStore. This is credential presence, not inference verification. Only `provider-probe.ts` has an OpenAI authenticated /v1/models probe, with a ten-second timeout; it cancels the response body and explicitly does not test generation. This task did not call it.

| Provider | Local credential present | AUTH TESTED | MODEL DISCOVERY | GENERATION | STREAM | TOOLS | Blocker |
|---|---|---|---|---|---|---|---|
| OpenAI | Yes | Not tested this task | Not tested | Not tested | Not tested | Not tested | Phase A gate; execute adapter absent |
| Anthropic | Yes | Not tested | Not tested | Not tested | Not tested | Not tested | Phase A gate; runtime absent |
| Gemini | Yes, both supported names | Not tested | Not tested | Not tested | Not tested | Not tested | Phase A gate; runtime absent |
| OpenRouter | Yes | Not tested | Not tested | Not tested | Not tested | Not tested | Phase A gate; runtime absent |
| Groq | Yes | Not tested | Not tested | Not tested | Not tested | Not tested | Phase A gate; runtime absent |
| Mistral | Yes | Not tested | Not tested | Not tested | Not tested | Not tested | Phase A gate; runtime absent |
| DeepSeek | Yes | Not tested | Not tested | Not tested | Not tested | Not tested | Phase A gate; runtime absent |

Credential names were inspected in the ignored primary-root .env.local without printing values. Presence there does not prove credentials exist in this isolated worktree or any deployment.

The proposed ProviderAdapter methods (probe, discoverModels, generate, stream, capabilities, usage, normalizeError) are **future requirements**, not an implemented API. No provider is described as online, generation-tested or live based on configuration. Static models remain current fallback metadata; live discovery was not added.

Future evidence states must remain distinct: UNCONFIGURED, CONFIGURED, AUTH_TESTED, MODELS_DISCOVERED, GENERATION_TESTED, STREAM_TESTED, TOOLS_TESTED, FAILED, QUOTA_BLOCKED, PERMISSION_BLOCKED, UNSUPPORTED. They are not installed as runtime states by this recovery PR.

## Routing and Senshial

AUTO/MANUAL selection remains deterministic. Runtime health, measured latency, discovered availability, budgets and privacy/local preferences have not been added to the router. A selected model is not evidence of reachability.

Existing Senshial surface `src/components/build/surfaces/AiSurfaces.tsx` has ASK, PLAN and EXECUTE mode state, task/provider/model selection and execution ledger UI. Runs explicitly resolve to blocked because no execute adapter exists.

| Mode | Surface/mode policy | Real inference | Agent tool workflow | Live evidence |
|---|---|---|---|---|
| ASK | Existing | Absent | No newly integrated read pipeline | BLOCKED |
| PLAN | Existing | Absent | No real planning execution | BLOCKED |
| EXECUTE | Existing permission concepts | Absent | No guarded write engine | BLOCKED |

433 passing baseline application tests verify existing contracts; they do not establish these future capabilities. No duplicate chat, generic dashboard or visual redesign was created.

## Bridge and Agent tools

Live Supabase evidence shows an outbound local Windows worker, durable queue and successful read tools: git.status, fs.list, fs.read, logs.read, metrics.read, proc.list. All six live functions and 35 local donor files are archived for recovery. Their executable integration with main remains pending.

The donor gateway allowlists read tools. No model-driven arbitrary shell entrypoint was installed. Agent intentions → predefined operations, ownership claims, starting/ending SHA, explicit mutation plans, actual diff, focused checks and operator approval remain Phase C requirements. fs.write, fs.patch and git.commit were not exposed through a new hosted AI layer.

## Security model and approval gates

Environment credentials stay server-only and read-only. No credential-write vault UI was activated. No secrets were sent to browser state or copied into tracked artifacts. Archives were scanned for actual local credential values and common credential patterns before commit.

ASK and PLAN must be read-only. EXECUTE mutation must check worktree/branch/HEAD/status/file ownership and require operator approval. Production migrations/deployments, secret rotation, deletion and auth/security changes require separate explicit guarded approval. There is no verified implementation of that Agent workflow in this PR.

Current Bridge custom authentication, RPC role grants, Vault access and deployed function usage still require reconciliation and review. Historical successful read jobs are not approval evidence for write tools. No database, policy, secret or Edge Function deployment was changed.

## Platform integrations: verified versus unverified

| Integration | Exact observed capability | Unverified capability |
|---|---|---|
| Supabase | Authenticated read-only metadata/aggregate queries, function source retrieval, advisors | Full migration/schema parity, canonical deployable bridge, safe Agent writes |
| Vercel | Token authenticated successfully; team/project auto-discovered; exact main production deployment READY with Git SHA and aliases | Application history adapter, production promotion/rollback approval |
| Sentry | Environment names present | SDK absent, error capture/release/source maps not tested |
| Tavily | Environment name present | No Senshial search adapter or provenance execution |
| Firecrawl | Environment name present | No controlled acquisition adapter or crawl execution |
| Hugging Face | Environment name present | No artifact/inference adapter tested |

Vercel discovery found team `team_0WLXGubG98so1G3Hm7dhu6mL` and project `prj_myQWIm9ryXpY27vnpRDw1TJ92SXQ`. The connected app's project inventory was incomplete for this account; authenticated REST proved the repository-linked project. No IDs were requested from the user.

## Required next gate

First resolve withheld migration structure and source parity, live caller mapping/custom authorization, bridge/current-main reconciliation, remaining recovery semantics and original dependency audit. Re-audit exact origin/main if another task merges.

Only after Phase A passes may provider adapters, tiny bounded verification, model discovery and Senshial inference be implemented. Phase B then requires at least one actual auth + discovery + generation result before claiming Senshial live. Phase C remains gated until Phase B passes.
