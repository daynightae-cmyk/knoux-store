# Capability Bridge — Connectors

KNOuX reaches external platforms through a capability registry shaped like MCP.
These names are **KNOuX's own vocabulary for what it can ask of a platform**, not a
claim that a remote tool of that name exists today.

Source: `src/lib/growth/connectors/registry.ts` · boundary:
`src/lib/growth/connectors/boundary.ts`

---

## 1. Readiness vocabulary

| State | Meaning |
|---|---|
| `UI_READY` | The screen exists and renders truthful empty states. No adapter. |
| `ADAPTER_READY` | A server-side adapter is implemented and callable but holds no credential. |
| `CONFIG_REQUIRED` | Adapter exists; needs an environment secret. |
| `AUTH_REQUIRED` | Configured; an operator must complete OAuth. |
| `DEMO_ONLY` | Only labelled non-production fixtures. |
| `LIVE_VERIFIED` | **A real provider call returned real data, and the evidence is recorded.** |
| `BLOCKED` | Cannot proceed without credentials, external approval, or a platform limitation. |

`LIVE_VERIFIED` is **not assignable from a static resolve.** `resolveCapability()`
has no return path to it, and the return type of `CapabilityStatus['resolved']`
excludes it. Only a runtime provider call can advance a capability. This is
type-checked and tested — `resolveAll()` with every credential present still yields
`liveVerified: 0`.

---

## 2. Live state, measured

`GET /api/growth/capabilities` on this deployment:

```
{"total":29,"liveVerified":0,"blocked":2,
 "needsConfiguration":21,"needsAuth":0,"ready":6}
```

Every capability is honest. 21 need configuration because no credential exists;
6 are ready against workspace data only; 2 are blocked by platform reality.

---

## 3. The registry

### Meta — `graph.facebook.com/v21.0`

| Capability | Risk | Scopes |
|---|---|---|
| `meta.account.list` | READ | `pages_show_list`, `pages_read_engagement` |
| `meta.pages.list` | READ | `pages_show_list`, `pages_read_engagement` |
| `meta.instagram.list` | READ | `pages_show_list`, `pages_read_engagement` |
| `meta.ads.accounts` | READ | `ads_read`, `ads_management`, `read_insights` |
| `meta.campaigns.list` | READ | `ads_read`, `ads_management`, `read_insights` |
| `meta.campaign.read` | READ | `ads_read`, `ads_management`, `read_insights` |
| `meta.insights.read` | READ | `ads_read`, `read_insights` |
| `meta.leads.read` | READ | `ads_management`, `pages_read_engagement` |
| `meta.campaign.create` | **MUTATING** | `ads_management` |

### Google

| Capability | Risk | Scope |
|---|---|---|
| `google.ads.accounts` | READ | `auth/adwords` |
| `google.ads.campaigns` | READ | `auth/adwords` |
| `google.ads.performance` | READ | `auth/adwords` |
| `google.business.locations` | READ | `auth/business.manage` |
| `google.business.performance` | READ | `auth/business.manage` |
| `google.analytics.report` | READ | `auth/analytics.readonly` |
| `google.searchconsole.performance` | READ | `auth/webmasters.readonly` |
| `google.youtube.list` | READ | `auth/youtube.readonly` |

Google has one connection flow with **separate scopes per surface**, so a grant can
be narrow: GA4 read-only does not imply Search Console, and neither implies Ads.

### Community

| Capability | Risk | State |
|---|---|---|
| `community.search_public` | READ | `UI_READY` |
| `community.verify` | READ | `ADAPTER_READY` — public HEAD/GET only |
| `community.import` | MUTATING | `UI_READY` — operator-supplied |
| `community.refresh` | MUTATING | `ADAPTER_READY` — stored public metadata |
| `community.post` | MUTATING | **`BLOCKED`** — see below |

### WhatsApp

| Capability | Risk | State |
|---|---|---|
| `whatsapp.account.status` | READ | `ADAPTER_READY` |
| `whatsapp.templates` | READ | `ADAPTER_READY` |
| `whatsapp.leads` | READ | `ADAPTER_READY` |
| `whatsapp.send` | MUTATING | **`BLOCKED`** — intentionally unimplemented |

### KNOuX-internal

`leads.normalise`, `content.draft`, `reports.generate` — `UI_READY`, no provider
credential required. `content.draft` is `AUTH_REQUIRED` because it needs the
KNOuX Agent.

---

## 4. The two BLOCKED capabilities

These are the most important rows in the registry, because they are refusals rather
than gaps.

### `community.post` — BLOCKED

> Facebook provides no general Groups API for publishing into arbitrary groups.
> KNOuX uses a manual-assisted posting queue instead, which is a product capability
> rather than a workaround. There is no automated path and none will be added.

Consequence in the product: the Community Hub's distribution queue offers **Copy
Post**, **Open Destination**, **Mark Posted**, **Skip**. KNOuX prepares; a person
posts. `Mark Posted` is disabled until an operator acts, and records
`postedBy` in the audit trail.

### `whatsapp.send` — BLOCKED

> No sending code path exists in this build.

Note `requiredEnv: []`. A blocked capability must not be unlockable by adding a
secret, or "blocked" would mean "not configured yet".

---

## 5. The server boundary

`invokeCapability()` is the only sanctioned provider entry point, and it refuses in
this order:

1. **Platform limitation** → `UNAVAILABLE`, no call made
2. **`risk === 'MUTATING'`** → `UNAVAILABLE`, no call made — *before* credentials
   are even considered, so configuring a secret cannot become a way to spend money
3. **Credentials absent** → `NOT_CONFIGURED` / `AUTH_REQUIRED`

Only then may a real read-only call be attempted.

The result is a discriminated union. `ok: false` always carries a typed `failure`,
a human-readable `meaning`, and optionally the provider's verbatim message. There
is no path where `data` is readable on failure, and no generic `ERROR` — the
taxonomy is `NOT_CONFIGURED`, `AUTH_REQUIRED`, `PERMISSION_MISSING`, `RATE_LIMITED`,
`API_ERROR`, `UNAVAILABLE`, `PARTIAL_DATA`, `INVALID_INPUT`.

---

## 6. Provider normalisation

`src/lib/growth/metrics.ts`. Six normalisers, and the provider vocabulary is
contained entirely in that file — nothing above it knows what `action_values` or
`cost_micros` is.

Notable behaviours:

- Meta `action_values` is matched **by `action_type`**, never by position. The array
  is only ordered for the fields you requested, so positional indexing is fragile.
- Meta `link_click` falls back into `clicks` when no explicit clicks field exists.
- Google Ads `cost_micros` is divided by `1e6`, **guarded** — an absent micro value
  falls through to `cost` rather than becoming `NaN` and disappearing. This was a
  real bug caught by a test.
- Meta produces no `revenue`, so Meta rows produce no ROAS.
- Google Ads produces no `reach` for Search.

---

## 7. What must happen to make a capability live

Per capability, in order:

1. Create the OAuth app / project credential.
2. Set the env vars named in `requiredEnvNames()` — server-side only.
3. Implement the OAuth callback and the token exchange. **Never client-side.**
4. Store the refresh token server-side, encrypted at rest.
5. Implement the adapter that calls `providerApi`.
6. Call it for real.
7. Only then set `LIVE_VERIFIED`, with the evidence string.

Steps 1–2 are blocked here on credentials. Step 6 has not happened for any
capability. Nothing in the UI claims otherwise.

---

## 8. Adding a capability

1. Add a `CapabilityDefinition` to `CAPABILITIES`.
2. Choose `risk` honestly. `MUTATING` means the call changes something outside
   KNOuX.
3. If a platform cannot support it, set `platformLimitation`. That yields `BLOCKED`
   and a non-actionable remediation, which is the truthful state.
4. Add a normaliser to `metrics.ts` if it returns metrics.
5. Add a test asserting the readiness you claimed.

`resolveCapability` and `summariseCapabilities` need no change; the registry is the
single source.

---

## 9. Required environment

Names only, from `requiredEnvNames()`:

```
GOOGLE_ADS_CLIENT_ID            META_APP_ID
GOOGLE_ADS_CLIENT_SECRET        META_APP_SECRET
GOOGLE_ADS_DEVELOPER_TOKEN      WHATSAPP_PHONE_NUMBER_ID
GOOGLE_CLIENT_ID                KNOUX_AGENT_ENDPOINT
GOOGLE_CLIENT_SECRET            KNOUX_AGENT_TOKEN
```

No value is committed. `.env.example` carries names and comments only.