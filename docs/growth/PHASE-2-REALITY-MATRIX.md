# KNOuX Growth — Phase 2 Reality Matrix

Every area, with **configured** and **verified** kept strictly apart.

The distinction this file exists to enforce: a migration file existing is not a
migrated database. An OAuth route existing is not a connected platform. A tool
schema existing is not a live tool. A patch existing is not a repaired agent.

## Status vocabulary

| Status | Meaning |
|---|---|
| `VERIFIED` | Executed in this session, evidence retained |
| `PARTIALLY_VERIFIED` | Core executed; a named sub-part is not |
| `NOT_VERIFIED` | Implemented, never executed against a real dependency |
| `AUTH_REQUIRED` | Needs an OAuth grant that no operator has completed |
| `CONFIG_REQUIRED` | Needs an environment secret that is not set |
| `BLOCKED_DEPENDENCY` | A toolchain or service is missing |
| `BLOCKED_EXTERNAL` | Needs an action only the owner can take |
| `DEMO_ONLY` | Only labelled fixtures available |
| `FAILED` | Executed and did not succeed |
| `NOT_APPLICABLE` | Does not apply to this area |

---

## The matrix

| Area | Implemented | Configured | Authenticated | Persisted | Runtime tested | Live verified | Status | Blocker |
|---|---|---|---|---|---|---|---|---|
| `/command` auth gate | Yes | Yes (Supabase project) | n/a | n/a | Yes — 307 → `/login?next=%2Fcommand`; API 401 `ANONYMOUS` | n/a | **VERIFIED** | — |
| Growth API auth | Yes | Yes | n/a | n/a | Yes — 401 with typed body | n/a | **VERIFIED** | — |
| Tenant RBAC | Yes | Needs memberships rows | n/a | Schema only | Yes — 43 tests | n/a | **VERIFIED** (logic) | Migration not applied, so no real member rows exist |
| Repository selection | Yes | Default `supabase` | n/a | No | Yes — refuses without substituting | n/a | **VERIFIED** (refusal) | No DB to read |
| Supabase migrations v1/v2 | Yes | Not applied | n/a | **No** | Static only — 16 tests | n/a | **MIGRATION_READY_NOT_APPLIED** | No local Supabase; project ref is REMOTE |
| RLS policies | Yes | Not applied | n/a | No | Static only | n/a | **MIGRATION_READY_NOT_APPLIED** | Needs a real engine to run the verification queries |
| `supabase db lint` | — | — | — | — | **No** | — | **BLOCKED_DEPENDENCY** | No Docker, no psql, `db lint` needs a live DB |
| KNOuX Agent compile | Repaired | Yes | n/a | n/a | Yes — `py_compile` exit 0 | n/a | **VERIFIED** | Base interpreter later removed from machine |
| KNOuX Agent import | Repaired | Yes | n/a | n/a | Yes — `IMPORT: PASS`, `root_agent` present | n/a | **VERIFIED** | — |
| KNOuX Repair capability | Preserved | Yes | n/a | n/a | Yes — name, model class, MCP wiring intact | n/a | **VERIFIED** | — |
| Knowledge resolution | Repaired (D2) | Yes | Uses ADC | n/a | Yes — **9/9 load, 0 unavailable** | n/a | **VERIFIED** | — |
| Agent venv | Rebuilt | Was valid | n/a | n/a | Was verified | n/a | **FAILED** (later) | `C:\Program Files\Python312` removed from machine |
| Growth sub-agents | Patch written | No | n/a | n/a | No | n/a | **NOT_VERIFIED** | Requires gateway tools first. Not deployed. |
| MCP Growth tools | 21 implemented | Not deployed | No | No | 9/9 gateway tests | No | `IMPLEMENTED` only | Gateway not re-deployed |
| MCP REGISTERED | No | — | — | — | — | — | **NOT_VERIFIED** | Requires a gateway deploy |
| MCP DISCOVERABLE | No | — | — | — | — | — | **NOT_VERIFIED** | Requires `tools/list` over MCP |
| MCP AUTHENTICATED | No | — | — | — | — | — | **NOT_VERIFIED** | Requires credentials |
| MCP EXECUTED | No | — | — | — | — | — | **NOT_VERIFIED** | — |
| MCP VERIFIED | No | — | — | — | — | — | **NOT_VERIFIED** | — |
| Meta OAuth flow | Yes | **No** | No | n/a | Yes — state, URL, exchange, redaction tested | No | **CONFIG_REQUIRED** | `META_APP_ID`/`META_APP_SECRET` unset |
| Meta Ads reads | Prepared | No | No | No | No | No | **NOT_VERIFIED** | Needs Meta app + user grant |
| Google OAuth flow | Yes | **No** | No | n/a | Yes — offline grant + refresh asserted | No | **CONFIG_REQUIRED** | `GOOGLE_CLIENT_ID`/`SECRET` unset |
| Google Ads reads | Prepared | No | No | No | No | No | **NOT_VERIFIED** | Needs client pair **and** developer token |
| GA4 | Prepared | No | No | No | No | No | **NOT_VERIFIED** | — |
| Business Profile | Prepared | No | No | No | No | No | **NOT_VERIFIED** | Never fabricates Maps ranking |
| Search Console | Prepared | No | No | No | No | No | **NOT_VERIFIED** | — |
| WhatsApp send | **Intentionally absent** | — | — | — | Asserted absent | — | **NOT_APPLICABLE** | By design, not a gap |
| Community posting | **Intentionally absent** | — | — | — | Asserted absent | — | **NOT_APPLICABLE** | No general Groups API exists |
| Campaign persistence | Interface + schema | Not applied | n/a | No | State machine tested | No | **PARTIALLY_VERIFIED** | Migration not applied |
| Approval invalidation | Application + constraint | Not applied | n/a | No | Application tested | n/a | **PARTIALLY_VERIFIED** | Constraint untested by a real engine |
| Audit log | Interface + schema | Not applied | n/a | No | Redaction tested | n/a | **PARTIALLY_VERIFIED** | — |
| Automations | From Phase 1 | n/a | n/a | Schema | Tested | n/a | **VERIFIED** (logic) | Schema has its own action constraint |
| Growth tests | 9 files | n/a | n/a | n/a | **164/164 pass** | n/a | **VERIFIED** | — |

---

## MCP tool states, kept separate

These are five different things and are never collapsed:

| Stage | Count | Requires |
|---|---|---|
| `IMPLEMENTED` | **21** | A function with a truthful error envelope |
| `REGISTERED` | 0 | The module imported and `register_with()` called on a running gateway |
| `DISCOVERABLE` | 0 | A `tools/list` over MCP returning the ids |
| `AUTHENTICATED` | 0 | A completed OAuth grant behind the tool |
| `EXECUTED` | 0 | A real call that reached a provider |
| `VERIFIED` | 0 | A schema-valid response plus semantic verification |

`LIVE_VERIFIED` is reachable only at the last stage. Nothing here has passed it.

**Mutating tools: 0 registered, by design.** Eight ids are on an explicit
never-register list: `growth_campaign_create`, `growth_campaign_launch`,
`growth_campaign_pause`, `growth_budget_update`, `growth_content_publish`,
`growth_whatsapp_send`, `growth_community_post`, `growth_campaign_delete`.

---

## Honest external state

Measured, not assumed:

| Variable | Present |
|---|---|
| `META_APP_ID` | No |
| `META_APP_SECRET` | No |
| `GOOGLE_CLIENT_ID` | No |
| `GOOGLE_CLIENT_SECRET` | No |
| `GOOGLE_ADS_DEVELOPER_TOKEN` | No |
| `KNOUX_AGENT_ENDPOINT` | No |
| `KNOUX_AGENT_TOKEN` | No |

So: **Meta NOT_CONFIGURED · Google NOT_CONFIGURED · Cloud Agent AUTH_REQUIRED ·
MCP gateway NOT_CONFIGURED.** All four are honest states the code reports, and
none blocks the product architecture from being reviewable.

---

## What is genuinely real right now

1. `/command` refuses anonymous access, and the refusal was executed and observed.
2. Growth API routes refuse anonymous access with typed bodies.
3. The tenant boundary is enforced before the permission check, and that ordering
   is asserted by a test rather than by a comment.
4. The KNOuX Agent **compiles, imports, and resolves 9/9 knowledge artifacts** —
   including the two that had never loaded before.
5. KNOuX Repair is intact: name, model class, MCP wiring, and no Growth sub-agent
   deployed.
6. 164 growth tests pass (157 + 7 new regression tests).
7. A configured production store failing produces an explicit refusal and never
   substitutes fixtures.
