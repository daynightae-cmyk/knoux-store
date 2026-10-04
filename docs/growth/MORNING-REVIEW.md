# MORNING REVIEW — KNOuX Growth / Social Command Center

**Prepared for** the owner · **Date** 2026-10-04 · **Status** ready for review,
not merged.

---

## 1. Git

| | |
|---|---|
| **BASE_BRANCH** | `main` |
| **BASE_SHA** | `9f3497480933236483a860b338dc352d1aa2931d` |
| **NEW_BRANCH** | `feature/knoux-growth-command-center` |
| **HEAD** | `d671cbae4060511cf555d4c28841f26fa954c247` |
| **WORKTREE_PATH** | `C:\Users\k7\.traycer\worktrees\daynightae-cmyk__knoux-store\traycer-knoux-store-fierce-walrus-e7616e0acd9d` |

`main` verified still at `9f34974`. The worktree was created by Traycer and was
already at the base SHA, so it was used directly rather than adding a second one.

**NO MERGE. NO PUSH.** Three commits on the feature branch only.

```
d671cba  feat(growth): all fifteen Command Center areas, intelligence routes and tests
35c9502  feat(growth): Command Center shell, workspace context and Overview
c7d23dc  feat(growth): KNOuX Intelligence foundation, capability bridge and safety model
```

---

## 2. The KNOuX Agent — audited, not replaced

`D:\KNOUX_Agent` was **read only. Not one byte changed.** It is outside the
worktree and is not a git repository, and the brief instructed read-only
inspection with an adapter instead of mutation.

**What it is:** Google ADK `LlmAgent('KNOUX_Repair_Forensic_Assistant')`,
`GlobalGemini(model='gemini-3.5-flash')`, private Cloud Run MCP gateway, A2A to
Agent Engine, 9 knowledge resources. KNOuX identity + policy + knowledge +
orchestration + an **external** LLM provider. Not a trained proprietary model, and
nothing here describes it as one.

### Nine defects verified on disk

| # | Defect | Status |
|---|---|---|
| D1 | `CLOUDSDK_PYTHON` → `Python313\python.exe`, **which does not exist** (machine has Python312 3.12.10) | **CONFIRMED BROKEN** |
| D2 | Knowledge resolver never falls back to GCS when the local dir exists → `06-Tool-Execution-Contract.md` and `07-Live-Diagnostics-Contract.md` **silently never load** | **CONFIRMED BROKEN** |
| D3 | `google.auth.default()` + `storage.Client()` at **module import time** | FRAGILITY |
| D4 | `tool_filter=["gateway_status"]` | CONFIRMED LIMITATION |
| D5 | Published MCP toolspec has exactly **one** tool | CONFIRMED LIMITATION |
| D6 | Mojibake `KNOUX Repairâ€”` in the root instruction | CONFIRMED |
| D7 | `subprocess.run([...], shell=True)` — list args to `cmd.exe` | LATENT |
| D8 | No provider abstraction; `GlobalGemini` hardcoded 3× | CONFIRMED |
| D9 | Root instructions are Repair-only; no Growth family | CONFIRMED |

**D2 is the one to act on first.** The agent's own safety contract — the tool
execution contract — is listed in its knowledge resources but never reaches the
model, because the local lookup short-circuits before the GCS fetch it needs.

### Verified as NOT broken — do not "fix"

- `KNOUX_GCLOUD_PATH` → `.tools\gcloud-fast\` **exists**.
- Both `.venv` and `.venv-k7` exist.
- Knowledge `01`–`05` present at the root; `SECURITY.md` and `web-frontend_README.md`
  in `docs/`, which the resolver already checks.

### Repair status

Patches **written, not applied** — reviewable before anyone touches the agent:

- `docs/growth/patches/knoux-agent-repair.patch` — D1, D2, D3, D6, D7
- `docs/growth/patches/knoux-agent-growth.patch` — D8, D9

**D8 needs no agent change.** Provider replaceability is enforced on the KNOuX side
by `src/lib/growth/intelligence/router.ts`; the agent may keep its `GlobalGemini`
declaration indefinitely and nothing in the Social / Growth product has to move if
it changes.

---

## 3. What was built

**KNOuX Growth — AI Growth & Advertising Operating System** · section title **KNOuX
Social Command Center** · concept *One intelligence. Every channel. Every client.*

### Route decision — `/command`, not `/growth`

`/growth` is an **existing public marketing page** ("Five channels, one method").
Overwriting it would have destroyed existing work. The Command Center is a separate
route group; `/growth` is untouched apart from **one additive subnav entry**.

It also runs outside the marketing chrome — a fixed masthead, footer and command
palette frame every route, and a storefront header above a client switcher is the
wrong frame.

### Files

| | |
|---|---|
| Domain library | 13 files, `src/lib/growth/**` |
| Data layer | 6 files, `src/data/growth/**` |
| Components | 6 files, `src/components/command/**` |
| Routes | 14 pages + 3 API routes |
| Tests | 6 files, 98 tests |
| Docs | 8 files, `docs/growth/**` |

### The fourteen areas

All return **HTTP 200**: Overview, Analytics, Google Presence, Reports, Clients,
Campaigns (approval), Leads & Inbox, Creative Studio, Social (calendar),
Communities, KNOuX Intelligence, Automations, Connections, Settings.

### Routes added

```
/command                      /command/google         /command/connections
/command/analytics            /command/reports        /command/settings
/command/clients              /command/creative       /command/intelligence
/command/campaigns            /command/social         /command/automations
/command/leads                /command/communities

POST /api/intelligence                          the one reasoning route
GET  /api/growth/capabilities                   client-safe capability projection
GET  /api/growth/intelligence/probe             provider liveness
```

### Database / schema changes

**None.** No migration written, no second database introduced.

The existing Supabase client is reused where relevant. The gap is that there is no
workspace repository — no tables for clients, campaigns, leads or communities.
Inventing a migration against an unseen database is not reviewable, so the seam is
explicit: `currentSnapshot()` in `src/lib/growth/server/runtime.ts` is the single
place the intelligence layer reads its dataset. It returns fixtures today; when the
repository lands, that one function changes and the reasoner is already a pure
function of its snapshot.

### Architecture enforced

```
UI → /api/intelligence → Provider Router → knoux-agent (primary)
                                       → knoux-local  (fallback, provisional)
                          KNOuX Agent → MCP connectors → Meta/Google/Community/WhatsApp
```

- The router **asserts** `identity: 'KNOuX'`. A provider cannot return its own name.
- `isAcceptableIdentity()` rejects Gemini / Google AI / OpenAI Assistant / Claude —
  **tested**, and the Intelligence screen renders the accepted/rejected table live.
- Client `forbiddenClaims` are attached **server-side** from the client record, so a
  browser cannot omit them to unlock a claim.
- Repair is **not** extended, duplicated or reimplemented. `AGENT_FAMILIES_LIVE` is
  `['REPAIR']` and nothing else, because the deployed agent serves only that.

---

## 4. Safety model — inherited, not reinvented

The KNOuX Repair **RISK LEVEL 0–3** scale is reused verbatim. Spending money is
level 2, on the grounds that it is at least as consequential as a firewall rule —
so one approval model now covers the institution.

Each guarantee is enforced by a type or a transition table, and **proved by a test
that drives the refusal**:

| Guarantee | Test |
|---|---|
| No campaign reaches LIVE without a human-approved **frozen** budget | `a campaign cannot reach LAUNCH_PENDING without a recorded approval` |
| An approval without a budget snapshot unlocks nothing | `an approval with no budget snapshot does not unlock launch` |
| LIVE additionally requires a provider confirmation | `an approved campaign still cannot become LIVE without a connector confirmation` |
| The author cannot approve their own plan | `the author of a plan cannot be its approver` |
| No automation can spend | `no action kind can express a provider mutation` |
| A client cannot reach another client's data | `the client boundary is checked before the permission` |
| Configuration is not verification | `resolving a fully configured capability does not mark it LIVE_VERIFIED` |
| Credentials never reach a browser | `the client-safe projection carries no secret field` |
| No demo value reads as production | `a fixture value is not readable as a live value` |

---

## 5. Gates

| Gate | Result |
|---|---|
| `npm run lint` | **PASS** — exit 0, 0 problems |
| `npm run typecheck` | 270 errors — **all pre-existing, 0 introduced** |
| `npm run build` | **FAIL on the same 270 pre-existing errors** |
| `npm test` | 531 total · 517 pass · **14 fail** |
| Growth tests | **98 / 98 pass** |
| Route smoke | **14 / 14 HTTP 200** |

### Baseline vs introduced

The 270 type errors live in 14 files: `AboutOriginRoom.tsx` (124),
`ProductAnatomyScene.tsx` (43), `BuildComposerOrb.tsx` (39),
`LivingParticleMark.tsx` (13), `LabMaterialField.tsx` (11), `orb-icons.ts` (10),
`supabase/proxy.ts` (9), `SignalGlobeScene.tsx` (8), `supabase/server.ts` (5),
`TerminalPage.tsx` (2), `PowerShellPage.tsx` (2), `iconAtlas.ts` (2),
`auth/actions.ts` (1), `supabase/client.ts` (1).

Proven programmatically: `git diff --name-only 9f34974` intersects that list in
**zero** places. Per the brief, these legacy failures were **not** rewritten to make
the numbers green.

**Introduced failures: 0.**

### The 14 test failures

`tests/auth.test.mjs` (9) and `tests/site.test.mjs` (5). Both spawn a production
server via `tests/server.mjs`, which needs `next start`, which needs a passing
`next build`. 13 report `Production server exited with 1`. Gated on the pre-existing
build failure — not on this change.

### ⚠ Correction

An earlier baseline in this session read a **piped** command's exit code, which
captured the pipe rather than eslint. Lint was not passing then — two corrupted
packages were masking it. The numbers above are from clean, unpiped runs.

---

## 6. Environment repairs required to run the gates

Both pre-existing corruption in this worktree's `node_modules`. Unrelated to this
work, but they blocked everything:

1. **`zod@4.6.5` missing its `v4/` directory** while its `exports` map declared
   `./v4`. `eslint` exited 2 with **no output at all**. Repaired by reinstalling.
2. **Next's native swc binding truncated to 9 MB of 106 MB**
   (`next-swc.win32-x64-msvc.node`). Turbopack refused:
   *"Turbopack is not supported on this platform (win32/x64) because native bindings
   are not available."* Both `next dev` and `next build` failed before touching any
   project code. Repaired by reinstalling.

**Worth checking other worktrees and CI images.** A truncated native binary produces
a misleading platform error rather than an install error, and it reads as a project
problem.

---

## 7. Real vs demo

### Real, verified working

- 14 routes compile and serve
- 2 API routes with validated, rate-limited, size-capped input
- KNOuX Intelligence end-to-end through the real UI — verified in-browser:
  identity `KNOuX`, provisional labelled, **no provider name present**, and the
  comparison states *"based on demo fixtures, not live provider data"*
- Capability resolution reporting `liveVerified: 0`
- Domain logic: 98 tests

### Demo-only — every platform integration

```
capabilities: total 29 · liveVerified 0 · blocked 2 · configRequired 21 · ready 6
connections:  0 CONNECTED · 1 EXPIRED · 2 NOT_CONFIGURED · 2 BLOCKED · 3 NOT_CONNECTED
```

**No campaign was launched. No ad was published. No WhatsApp message was sent. No
group was posted to. No money was spent.** No connection renders green without a
credential — and `LIVE_VERIFIED` is *unreachable from a static resolve*, so the
green state is a type-checked impossibility.

---

## 8. Known blockers

| Blocker | Needs | Effect today |
|---|---|---|
| **No auth on `/command`** | Route-group middleware | **Highest priority.** Fixtures only, so nothing sensitive leaks — but it must be gated before real client data. `src/lib/supabase/server.ts` + `can()` already exist. |
| No deployed-agent endpoint | `KNOUX_AGENT_ENDPOINT` | Local reasoner serves, answers labelled provisional |
| No agent bearer token | `KNOUX_AGENT_TOKEN` | Same |
| Growth families not deployed | Apply + redeploy the growth patch | Repair only via the agent |
| MCP exposes 1 tool | New gateway tools | Only `gateway_status` callable |
| No OAuth flows | Meta/Google app credentials | Adapters and scopes ready |
| No workspace persistence | Growth schema + migration | Fixtures; `currentSnapshot()` is the seam |
| No fresh E2E agent proof | Endpoint + token | Runtime proof still outstanding |

### Runtime proof, when credentials exist

```powershell
$env:KNOUX_AGENT_ENDPOINT = "<agent engine a2a endpoint>"
$env:KNOUX_AGENT_TOKEN    = "<bearer>"
Invoke-RestMethod http://localhost:3100/api/growth/intelligence/probe
```

`reachable: true` **and** `verified: true` is the only evidence that counts.

---

## 9. Remaining work

**Before any real client data**
1. Route authentication on `/command` — the one real gap.
2. OAuth: Meta app, Google client pair + Ads developer token.
3. Apply `knoux-agent-repair.patch` — **D2 especially**.
4. Add the 17 read tools to the MCP gateway, then widen `tool_filter`.
5. Apply `knoux-agent-growth.patch`; set the two env vars; run the probe.

**Product**
6. Workspace persistence + migrations (Supabase).
7. Mutations behind the existing approval gate: create campaign, publish, mark posted.
8. Community discovery import from an approved source.
9. Reports: shareable client view, RTL/Arabic layout.
10. e2e specs for `/command` (manual verification used instead).
11. Node metrics charting library (deliberately not added — no dependency without need).

---

## 10. Screenshots

**Not generated.** `page.screenshot()` times out on these pages in this headless
Electron context — the marketing pages carry `three.js` particle layers and the
capture exceeds the 120 s cell budget at full page height. Attempted and abandoned
rather than reported as done.

Verification was done structurally instead, which is arguably stronger for review:

- All 14 routes → **HTTP 200**
- Browser-inspected: public header and footer compute to `display: none` on every
  route; **horizontal overflow = 0** on Overview, Communities, Campaigns, Intelligence
- Responsive breakpoints confirmed served in CSS: `max-width: 1080px`,
  `max-width: 720px`
- Command dock exercised via a real click: 12 actions present, KNOuX answered,
  provisional labelled, no provider name leaked

To see it: `npx next dev --webpack` then open `http://localhost:3000/command`.
(Turbopack cannot run here — see §6.)

---

## 11. Confirmation

- **`main` is untouched** — still `9f34974`.
- **Not merged.** Not pushed. No force-push.
- **`D:\KNOUX_Agent` not modified** — read-only inspection, patches written but
  unapplied.
- **No unrelated product rewritten.** The only existing product file touched is
  `src/data/navigation.ts`: 3 added lines in the growth subrail plus breadcrumb
  resolution. `/growth` itself is unmodified.
- **No secrets committed.** `.env.example` carries names and comments only, all
  unset and commented per the repo's existing convention.
- **No advertising money spent, no ads published, no messages sent, no group
  posted to, no private member data read.**
- Branch and worktree left intact for review.

---

## 12. Docs

| File | For |
|---|---|
| `docs/growth/ARCHITECTURE.md` | Layer map, route decision, safety table, metric contract |
| `docs/growth/CONNECTORS.md` | 29 capabilities, readiness semantics, boundary |
| `docs/growth/COMMUNITY-HUB.md` | Platform limitation, refusals, scoring rationale |
| `docs/growth/KNOUX-AI-INTEGRATION.md` | **Agent audit, repair strategy, blockers** |
| `docs/growth/SECURITY.md` | Money, credentials, cross-client, personal data |
| `docs/growth/IMPLEMENTATION-STATUS.md` | Per-feature state, baseline vs introduced |
| `docs/growth/patches/knoux-agent-repair.patch` | Four minimal fixes — **not applied** |
| `docs/growth/patches/knoux-agent-growth.patch` | Growth sub-agents — **not applied** |