# Security

Threats that this product could plausibly cause, and what stops each one.

The organising principle is inherited from KNOuX Repair: *the local orchestrator is
the final gate; the model must never self-authorise a destructive action.*

---

## 1. Money

| Threat | Control | Where |
|---|---|---|
| A campaign spends without approval | No transition to `LAUNCH_PENDING` without an `APPROVE` decision **and** a `budgetSnapshot` | `campaigns.ts` |
| Budget is raised after approval | The approver approves a **frozen snapshot**; the campaign's live values are not what they see | `requestApproval` |
| An approval is self-issued | `canApproveOwnSubmission` refuses author == approver | `rbac.ts` |
| An approval is overwritten | `decideApproval` refuses when a decision exists | `campaigns.ts` |
| A mutating connector call is configured into existence | `invokeCapability` refuses `MUTATING` **before** reading credentials | `boundary.ts` |
| An automation adjusts spend | `AutomationActionKind` has no member that can | `automation.ts` |
| A provider is marked live without a call | `LIVE_VERIFIED` is unreachable from a static resolve | `registry.ts` |

**Verified:** `npm test` — 98 growth tests including `a campaign cannot reach
LAUNCH_PENDING without a recorded approval`, `an approval with no budget snapshot
does not unlock launch`, `an approved campaign still cannot become LIVE without a
connector confirmation`, `no transition reaches LIVE from a state that has not been
approved`, and `no autonomy mode permits a risk level 2 action without approval`.

---

## 2. Credentials

`src/lib/growth/connectors/boundary.ts` begins with `import 'server-only'`. An
accidental client import is a **build error**, not a leak.

`describeCapabilities()` is the only projection sent to a browser. Its return type
has no field capable of holding a secret:

```ts
export type SafeCapabilityView = {
  id: string; label: string; family: string; platform?: string;
  returns: string; providerApi: string; risk: string;
  readiness: ...; readinessMeaning: string;
  presentCount: number; requiredCount: number;
  missing: string[];        // names, never values
  scopes: string[]; remediation: string; blockedReason?: string;
};
```

**Verified:** a test serialises the projection with credentials present and asserts
the secret strings do not appear in the output.

Additional properties:

- Tokens are **never** written to `localStorage` — there is no code path that
  writes one.
- `credentialPresence()` returns counts and missing **names**. It has no return
  path for a value.
- `envFor()` scopes the environment to a capability's declared vars, so a Meta
  adapter cannot see a Google developer token even by accident.
- Changing a connection credential path requires `OWNER`. Reading connection
  *state* does not.
- No `.env` is committed. `.env.example` carries names and comments only.

---

## 3. Cross-client access

The rule: **a client-role principal must not reach another client's data.**

`can()` checks client scope **before** permission. A missing scope is a refusal, not
a permissive default, and a client-scoped action with no client supplied is refused
rather than defaulted to "all".

```ts
export function canAccessClient(principal, clientId): Decision {
  if (ROLE_SCOPE[principal.role] === 'ALL_CLIENTS') return ALLOW;
  if (!principal.clientIds.includes(clientId)) return deny(...);
  return ALLOW;
}
```

**Verified:** `the client boundary is checked before the permission` — a `CLIENT`
holds `campaign.approve` and still cannot reach `cl_b`, which proves the ordering
rather than just the outcome.

Seven roles: OWNER, MANAGER, ADS_SPECIALIST, DESIGNER, CONTENT_CREATOR, CLIENT,
VIEWER. Scope is `ALL_CLIENTS` for internal roles, `OWN_CLIENTS_ONLY` for CLIENT,
`ASSIGNED_ONLY` for assigned staff.

---

## 4. Personal data

The highest-risk area of this product, because community marketing invites
collection.

- **No member lists, ever.** No field exists for one.
- **No scraping of private groups**, hidden emails, or non-published phone numbers.
- **No enrichment.** A lead has a phone or email because a form collected it. There
  is no step that adds contact detail from anywhere else.
- **`publicAdminContact`** is operator-supplied and only for an address the operator
  already published for partnership enquiries.
- **No unauthorised content access.** `community.verify` and `community.refresh`
  read only public URLs the operator supplied.

**Verified:** `no community record carries member data of any kind` asserts
`members`, `memberCount` and `memberIds` are all absent and no record is `PRIVATE`.

---

## 5. Platform restrictions

- No bypassing of Meta or Google platform policy.
- No violation of Meta's automated-access provisions — because there is no
  automated community access at all.
- No sending on any platform: `whatsapp.send` is `BLOCKED` with
  `requiredEnv: []`, so adding a secret cannot enable it.
- No automated posting into groups, for the reason given in `COMMUNITY-HUB.md`.

---

## 6. Prompt injection

Community content, provider responses, log text and filenames are **untrusted
data**.

- `06-KNOUX-Tool-Execution-Contract.txt` states it; the growth sub-agent prompt in
  `patches/knoux-agent-growth.patch` restates it per agent.
- `buildAgentPrompt()` in `knoux-agent.ts` carries the constraint on the KNOuX side
  too, because the deployed agent's instruction does not yet cover Growth.
- Community text never enters a prompt as instruction. It is rendered data.
- Client `forbiddenClaims` are attached **server-side** in
  `/api/intelligence/route.ts` from the client record, so a caller cannot omit
  them to unlock a claim.

---

## 7. Failure presented as success

The KNOuX tool contract says *never translate failure into a success*. Every failure
mode has a distinct name, and the discriminated result makes reading data on
failure impossible:

`NOT_CONFIGURED` · `AUTH_REQUIRED` · `PERMISSION_MISSING` · `RATE_LIMITED` ·
`API_ERROR` · `UNAVAILABLE` · `PARTIAL_DATA` · `INVALID_INPUT`

There is deliberately **no generic `ERROR` failure**, and a test asserts its
absence — a generic bucket is how a specific cause gets reported as unknown.

A provider's verbatim message is preserved on `providerDetail`, never rewritten.

---

## 8. Demo data as production data

| Layer | Control |
|---|---|
| Value | `Sourced<T>` carries `origin`; a fixture value cannot exist without it |
| Read | `readIfLive()` returns `null` for fixtures |
| Arithmetic | `ratio()` and `sumSourced()` return `null` on mixed origin — a live-over-fixture ratio is not a metric |
| Render | `MetricCell` renders DEMO beside the number; `DemoNotice` at screen level; `OriginLabel` in table rows |
| Connect state | No fixture is `CONNECTED`, so the screen's green state is unreachable without a credential |
| Community URLs | `.invalid` TLD, so an accidental fetch cannot reach a real group |

---

## 9. Transport and input

- `/api/intelligence`: method check, rate limit (20/min/address via the existing
  `@/lib/http/rate-limit`), declared + streamed body ceiling (24 KB), intent
  allowlist, client allowlist. Refusals name their reason.
- `clientAddress()` is used for bucketing only, never as an identity input — the
  existing limiter's documented caveat.
- `.../growth/capabilities` is read-only and returns presence counts and env names.
- `.../growth/intelligence/probe` is read-only and deliberately omits the endpoint
  URL: an operator needs to know the agent is unreachable, not where it lives.
- Reuses the repository's existing `rateLimit` rather than introducing a second
  limiter with a ceiling that can drift.

---

## 10. Public exposure

The Command Center is **not public**.

- `robots: { index: false, follow: false }`.
- It runs outside the marketing chrome; `:has()` on `<body>` removes the masthead,
  footer and command palette for this route only.

**Gap, stated plainly:** there is **no authentication on `/command`**. The
workspace's client switcher and role model are real, but nothing currently stops an
unauthenticated visitor loading the route and reading demo fixtures.

Nothing sensitive is exposed — every value is a fixture and no credential is
reachable — but this must be gated before any real client data is connected. The
mechanism already exists: `src/lib/supabase/server.ts` plus `ROLE_SCOPE` /
`can()`. What is missing is a `middleware.ts` guard on the route group.

This is the single highest-priority item before production.

---

## 11. Secrets hygiene in this change

- No secret committed. `.env.example` carries names and comments only.
- No `.env` file created in the worktree.
- `git status` clean of untracked secret material.
- Agent endpoints referenced by **name** only in docs. No token, no credential
  value, and no `.env` read from `D:\KNOUX_Agent` was copied anywhere.

---

## 12. Residual risks

| Risk | Severity | Mitigation |
|---|---|---|
| `/command` unauthenticated | **High before real data** | Add route-group middleware using the existing Supabase session + `can()` |
| OAuth not implemented | Medium | Adapters and scope declarations ready; see `CONNECTORS.md` §7 |
| No workspace persistence | Medium | Data is fixtures; `currentSnapshot()` is the single seam |
| Community operator imports unverified | Medium | `verificationStatus: NEEDS_REVIEW` + `lastCheckedAt` pairing enforced by test |
| Third-party supply chain | Low | `npm audit` is an existing repo gate; two corrupted packages were found and repaired in this worktree (see `MORNING-REVIEW.md`) |