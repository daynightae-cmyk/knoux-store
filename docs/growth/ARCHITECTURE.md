# KNOuX Social Command Center — Architecture

**Base branch** `main` · **Base SHA** `9f34974` ·
**Branch** `feature/knoux-growth-command-center`

One intelligence. Every channel. Every client.

---

## 1. The rule this product is built around

```
UI  →  KNOuX Intelligence API  →  Provider Router  →  reasoning provider
                                        ↓
                                  KNOuX Agent
                                        ↓
                                   MCP connectors
                                        ↓
              Meta · Google · Communities · WhatsApp · Analytics
```

The frontend never names a model provider. It posts an **intent** plus workspace
context to `/api/intelligence` and receives a **KNOuX** response with operational
provenance attached. That is the whole reason the UI survives a provider change.

Enforced, not merely intended:

- The router **asserts** `identity: 'KNOuX'` on every response. A provider cannot
  return its own name.
- `isAcceptableIdentity()` rejects any user-facing name that is not KNOuX, and is
  tested against `Gemini Assistant`, `Google AI`, `OpenAI Assistant`, `Claude`.
- The KNOuX Intelligence screen renders the accepted/rejected table live.

---

## 2. Layer map

```
src/lib/growth/
  states.ts          truthful vocabulary; KNOuX Repair RISK 0-3 reused
  types.ts           domain model
  rbac.ts            7 roles; client boundary; separation of duties
  metrics.ts         canonical metrics; 6 provider normalisers
  campaigns.ts       lifecycle as a transition table; approval
  automation.ts      rules engine that cannot express spending
  connectors/
    registry.ts      29 capabilities, truthful readiness
    boundary.ts      server-only; refuses MUTATING; cannot return a secret
  intelligence/
    types.ts         the one KnouxIntelligence interface
    router.ts        provider selection, identity assertion, degradation
    adapters/knoux-agent.ts   PRIMARY — targets D:\KNOUX_Agent
    adapters/local.ts         FALLBACK — deterministic, no model call
  server/runtime.ts  env → provider chain (the only place a secret is read)

src/data/growth/     areas, taxonomy, clients, communities, workspace, connections

src/components/command/
  workspace-context.tsx  selected client is product state
  CommandShell.tsx       context bar, rail, client switcher, dock
  CommandDock.tsx        contextual KNOuX assistant
  primitives.tsx         state badges, metric cells, demo notice
  command.module.css     the visual system

src/app/command/**    14 routes
src/app/api/
  intelligence/route.ts                 the one reasoning route
  growth/capabilities/route.ts          client-safe capability projection
  growth/intelligence/probe/route.ts    provider liveness
```

---

## 3. Why `/command` and not `/growth`

`/growth` is an **existing public marketing division page** (Five channels, one
method; Google Ads / Meta Ads / Social / Content / SEO). Overwriting it would have
destroyed existing work, and the mission forbids that.

So the Command Center is a **separate route group**. `/growth` is untouched except
for one additive subnav entry pointing at `/command`. Verified: `git diff` on
`src/data/navigation.ts` is 3 added lines in the growth subrail plus breadcrumb
resolution.

It also runs **outside the marketing chrome**. A fixed masthead, footer and command
palette sit around every route in the root layout, and a storefront header above a
client switcher is the wrong frame. A `:has()` rule on `<body>` removes them,
scoped to this route — the masthead and footer are siblings of this tree, so a
descendant selector cannot reach them.

---

## 4. Why `/growth` was not reused as the data layer either

The Supabase client exists (`src/lib/supabase/{client,server,proxy}.ts`) and auth
is real. What is missing is a **workspace repository** — there is no table for
clients, campaigns, leads or communities, and `supabase/migrations/` holds no
growth schema.

Introducing one would mean inventing a migration against a database I cannot see
or migrate safely. So the seam is explicit instead:
`src/lib/growth/server/runtime.ts` → `currentSnapshot()` is the single place that
returns the dataset the intelligence layer reads. It currently returns fixtures.
When the repository lands, that one function changes; the reasoner is already a
pure function of its snapshot, and every screen already filters by client id.

**No migration was written.** A schema nobody has reviewed is not reviewable, and
the mission said to keep migrations isolated and reviewable — a table nobody has
asked for is neither.

---

## 5. The safety model, and where each rule is enforced

The KNOuX Repair safety policy is **reused**, not reinvented. RISK LEVEL 0–3 with
level 2 = privileged change requiring approval. Spending money is level 2, on the
grounds that it is at least as consequential as a firewall rule.

| Guarantee | Enforced in | Test |
|---|---|---|
| No campaign reaches LIVE without a human-approved frozen budget | `campaigns.ts` transition table — the only edge to `LAUNCH_PENDING` requires an `APPROVE` decision **and** a `budgetSnapshot` | `growth-campaigns.test.mjs` |
| LIVE additionally requires a provider confirmation | the only edge to `LIVE` requires `connectorConfirmed` | same |
| The author cannot approve their own plan | `canApproveOwnSubmission`, called from both submit and decide | same |
| An approval cannot be overwritten | `decideApproval` refuses when a decision exists | same |
| No automation can spend | `AutomationActionKind` admits only flag/alert/task/route — no member can pause, rebalance or launch | `growth-automation-community.test.mjs` |
| A client cannot reach another client's data | `can()` checks client scope **before** permission; absent scope is a refusal | `growth-connectors-rbac.test.mjs` |
| Only the owner changes a credential path | `can({ touchesCredentials: true })` | same |
| No credential reaches a browser | `boundary.ts` imports `server-only`; `describeCapabilities` has no return path for a value | same |
| Mutating capabilities are uncallable | `invokeCapability` refuses `MUTATING` **before** credentials are considered | structural |
| No demo value reads as production | `Sourced<T>` carries origin; `readIfLive` returns `null` for fixtures; UI renders DEMO at point of use | `growth-states.test.mjs`, `growth-metrics.test.mjs` |
| A live number never blends with a fixture | `ratio()` and `sumSourced()` return `null` on mixed origin | `growth-metrics.test.mjs` |
| A missing metric is never zero | absent keys stay absent; `formatMetric(null)` → "Not reported" | same |

The last three are worth dwelling on. They are the difference between a demo that
is honest and a demo that is merely labelled.

---

## 6. Data origin, end to end

```
provider call ──► normaliseRow(provider, row, {origin:'LIVE', evidence}) ──► Sourced
fixture        ──► fixture(value) ──────────────────────────────────────► Sourced
                                                            │
                                          MetricCell / Cell / OriginLabel
                                                            │
                                            renders value + DEMO or LIVE
```

Provenance is a type, not a convention. A caller cannot forget it, because the
value does not exist without it.

---

## 7. Metrics: what "normalised" means here

Six providers normalise onto one canonical set. Providers genuinely disagree, and
the disagreement is preserved rather than smoothed:

| | Spend | Impr. | Reach | Leads | Calls | Revenue |
|---|---|---|---|---|---|---|
| Meta | ✓ | ✓ | ✓ | ✓ | ✓ | — |
| Google Ads | ✓ | ✓ | — | ✓ | ✓ | ✓ |
| Business Profile | — | — | — | ✓ | ✓ | — |
| GA4 | — | ✓ | — | ✓ | — | ✓ |
| Search Console | — | ✓ | — | — | — | — |

So ROAS is empty for every Meta row, because there is no revenue input. That is
the correct rendering, and the Analytics screen states per provider which metrics
it does not report so a blank cell reads as a gap rather than an oversight.

Derived ratios (`ctr`, `cpc`, `cpm`, `roas`, `costPerLead`,
`costPerQualifiedLead`, `costPerBooking`) require both inputs and a non-zero
divisor, else `null`.

---

## 8. The intelligence families

```
KNOuX Intelligence
├── Repair       EXISTING — served by the deployed agent. Not extended, not
│                duplicated, not reimplemented here.
├── Growth       orchestration, client context, budget ceilings
├── Social       content, creative, community tone
├── Advertising  campaign construction, approval-ready plans
├── Community    discovery ranking, distribution preparation
└── Analytics    normalisation, comparison, evidence
```

`AGENT_FAMILIES_LIVE = ['REPAIR']`. The other five are `ADAPTER_READY`, because
the deployed root agent's instruction is Repair-only. Advertising Growth as served
before `knoux-agent-growth.patch` is deployed would be exactly the overstatement
this product exists to prevent.

---

## 9. Performance

- Community Hub paginates at 9 with a 42-cell calendar grid; a full registry
  rendered at once is thousands of DOM nodes.
- Connector metadata is resolved server-side and projected once per request.
- Large screens are separate routes, so the initial JS payload is per-area.
- The Console has no `three.js` particle layer, unlike the marketing pages — an
  operating workspace should not spend a frame budget on ambience.

---

## 10. Responsive behaviour

Desktop-first. The rail collapses to a grid at 1080px and stacks at 720px, where
the calendar becomes horizontally scrollable and the timeline drops to a single
column. Verified at 1512, 1024 and 390 CSS pixels.
