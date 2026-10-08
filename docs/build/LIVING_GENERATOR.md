# KNOuX Build living generator

Implementation baseline: `f08b6204f48c7874bf3ee28155aaa78728b9243f`.
Branch: `codex/knoux-generative-build`. Delivery is one reviewable PR to main; operator review is required before merging.

## Canonical runtime and controls

The UI reads `NormalizedModel` records from the existing authenticated models/provider projections. It has no static client catalog fallback. Provider configuration, authentication, discovery and measured generation remain separate facts. Runtime health is refreshed after a request. Selecting a model in the intelligence navigator explicitly selects MANUAL; AUTO resolves through the existing RouterV2. MANUAL keeps the exact selection and never substitutes a fallback.

| Generation Profile | Requested output budget | Temperature | Existing router preference |
| --- | ---: | ---: | --- |
| FAST | 2048 | 0.2 | Known cost and measured latency |
| BALANCED | 4096 | 0.4 | Normal scoring |
| DEEP | 16384 | 0.3 | Known reasoning capability |
| MAX | 32768 | 0.1 | Known context, reasoning and tool capability |

These are exposed generation controls, not hidden reasoning settings. MODEL MANAGED is shown for Gemini/Anthropic with known reasoning capability; other models show FIXED BY PROVIDER. No reasoning-effort transport field is invented. Unsupported controls are omitted. Known output/context limits cap output; unknown output limits use a disclosed conservative 4096 ceiling. The server recalculates controls for the actual attempt, including each canonical fallback.

Requested mode/profile/model, the routed endpoint and the provider-reported actual model are separate. Missing actual-model metadata stays UNKNOWN, including refused requests. Tokens, TTFT and cost remain UNKNOWN when absent; cost estimates retain their ESTIMATED label. AUTO fallback reports the original route and the later adapter attempt. Provider exceptions are redacted before browser serialization. Groq's documented speech models remain discoverable but cannot become text-planning candidates in AUTO or MANUAL.

## Generator and architecture

Transitions follow actual boundaries: LISTENING → RESOLVING → ROUTING → GENERATING → PLANNED → REVIEWING. Complete JSON arrays may form a labelled draft while streaming. Only the strict existing fourteen-section parser plus a successful terminal event yields PLANNED. Authentication, configuration and provider failures remain explicit. Planning cannot enter EXECUTING, VERIFYING or COMPLETE. Existing Review and EXECUTOR_NOT_CONNECTED behavior remains.

The additive plan map sits above the existing fourteen section details, architecture anchor and execution-plan navigation. Section and product views use deterministic layout. Every product node has its exact source section, one-based line and verbatim text. Relationships require explicit source references; product classification only groups existing content. No delivery, ecommerce, academy or CRM feature template is inserted into a plan. Negative/unknown requirements do not become configured auth, billing or integrations.

The map has one keyboard stop among nodes, arrow/Home/End navigation, Enter for source evidence and Escape to close it. Narrow screens use a readable connected sequence. A bounded sequence replaces dense graphs above 80 nodes. These are read-only proposals.

## Sky and memory

The original root canvas, seeded 240-star pool, ambient equations, 30-fps paint ceiling, DPR cap and pause/reduced-motion behavior remain. Phase changes use refs within the existing loop; the canvas is not replaced or reseeded. Up to 32 real source nodes and explicit relationships influence stars already in the pool. Native navigation outside Build returns the same canvas to ambient. Static mode repaints only for real state/viewport events. Pixel-readback tests prime Chrome's backing store before comparing frames and also assert no extra static paints.

The plan is memory-only in the existing Build provider. It survives native navigation within Build. A new request or reload clears it. No local/session artifact storage, server endpoint or cross-user persistence is introduced. Preferences retain their existing separate contract.

Styles are scoped to the generator module plus removal of obsolete font-token references in touched Build styles. The six Build layout stylesheet imports keep their original order. Functional inputs and the model popover retain appropriate surfaces; the architecture is an open composition.

## Verification and external boundaries

Baseline install, types, build, lint, dead-code analysis and production audit passed. Baseline unit/integration: 731 passed. The initial browser run on port 3371 produced 490 passed, 6 failed and 8 skipped; six Contact-origin assertions correctly refused the alternate port. The six unchanged tests then passed on canonical port 3311. Combined baseline: 496 passed, 8 skipped, no unresolved failure. The initial unbuilt unit attempt's missing BUILD_ID prerequisite is retained separately in local evidence.

The focused implementation pass produced 746 unit/integration passes and 42 browser passes, with 24 intentionally omitted duplicate viewport executions. Subsequent source fixes and new tests are covered by the final exact-head gates reported on the PR and in the final evidence report. No baseline assertion or threshold is weakened.

`build-generator-visual.spec.ts` exercises 1904×880, 1600×1000, 1440×900, 1366×768, 1280×800, 1024×1366, 820×1180, 768×1024, 430×932, 390×844, 375×812 and 360×800. Explicit contract data covers idle, search, AUTO/MANUAL, four profiles, resolving/routing, real incremental HTTP streaming, draft/complete maps, auth/config/provider refusal, Review and executor refusal. It checks overflow, product-node overlap, keyboard focus and 44px targets. Automated axe checks cover the navigator and plan. The four products have distinct source routes/data/reference lines. These fixtures do not prove a live provider call.

Generated screenshots and per-viewport JSON are in `references/build-generator/qa/`, uploaded with the GitHub browser artifact. The control audit now includes generator and touched AI surfaces: 184 static declarations, explicitly labelled as source inventory rather than runtime evidence.

Real canonical loopback calls use the already-authorized environment only in process memory. No environment file is copied or secret value logged. Authentication/discovery succeeded for several providers, but tested generation was externally refused: OpenAI/Mistral RATE_LIMIT, discovered Gemini models MODEL_NOT_FOUND or transient NETWORK, and DeepSeek direct NETWORK/unknown stream refusal. Canonical fallback was attempted and refused; no successful live fourteen-section plan or measured live token/cost claim is made. Safe numeric/status evidence remains separate from explicit browser contracts. The final exact-head runtime report supersedes earlier attempts.

The full development-tooling audit has six pre-existing high findings through braces/micromatch; GHSA-vfj7-8cjw-p6xm has no patched version. The production dependency audit is clean. Existing CI treats the full tooling audit as informational; its policy is unchanged. This remains BLOCKED by upstream availability, not a green audit.

Trusted project mutation, an executable agent, build/deploy/verification execution and hosted authenticated provider execution are UNTESTED here. Planning does not claim them. No production promotion or merge is performed by this mission.
