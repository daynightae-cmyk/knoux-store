# PHASE 2 MORNING REVIEW — KNOuX Growth / Social Command Center

Phase 2 is closed. Branch tip is the Phase 2 commit; obtain the SHA with
`git rev-parse feature/knoux-growth-command-center`. **Not merged.**

Read §4 before applying the migrations — two defects were found in review and
fixed, and one of them was a privilege escalation.

---

## 1. Git

| | |
|---|---|
| **BASE / MAIN SHA** | `9f3497480933236483a860b338dc352d1aa2931d` — **unchanged** |
| **STARTING FEATURE SHA** | `ac27852f2460f323cecb89946d113c91d162924f` |
| **BRANCH** | `feature/knoux-growth-command-center` |
| **WORKTREE** | `C:\Users\k7\.traycer\worktrees\daynightae-cmyk__knoux-store\traycer-knoux-store-fierce-walrus-e7616e0acd9d` |
| **WORKTREE STATE** | **CLEAN** |
| **MERGED** | **NO** |
| **PR #34 / `converge/post33-growth-closure`** | untouched |

### Phase 2 commits

| SHA | Summary |
|---|---|
| `cba5710` | auth, tenancy, Supabase persistence architecture |
| `1fcbfa4` | Meta/Google OAuth foundation + Growth MCP read namespace |
| `54c9197a` | tenant/OAuth/persistence tests; three real defects fixed |
| *(tip)* | migration/RLS defect fixes, 7 regression tests, Phase 2 documentation |

`src/data/navigation.ts` was changed in Phase 1 only — verified against the Phase 2
commit range, not assumed.

### Files in the final Phase 2 commit

| Area | Files |
|---|---|
| Migrations | `supabase/migrations/20261005090000_knoux_growth_v1.sql` (**modified**), `20261005091000_knoux_growth_v2.sql` (**modified**) |
| Tests | `tests/growth-migrations.test.mjs` (new, 23 tests) |
| Docs | `OAUTH-SETUP.md`, `PERSISTENCE.md`, `PHASE-2-REALITY-MATRIX.md`, `PHASE-2-MORNING-REVIEW.md` (new), `KNOUX-AI-INTEGRATION.md` (corrected) |

Auth, OAuth, repository and RBAC source were committed in the three SHAs above.

### Agent files changed

`D:\KNOUX_Agent` is **not a git repository**, so hashes are the record.

| File | Old SHA256 | New SHA256 |
|---|---|---|
| `agent.py` | `CEBE435F042ABDE2F26E38ABE95D25BEF3A7DA5C83272E84582824E505CB1C37` | `50B38724F244274A4E3DD7E3CB075CB745753564A225852BB6DFE9DF306DCF82` |
| `requirements.txt` | `65AB953F717E2DD5FBE716470F2A7CBE6332CF9559055B4543820A59DD57566D` | `5B7FC09EF86A3DD803667D60BE9DA2B50533790264CAE2ED75144866A52EB31F` |
| `06-Tool-Execution-Contract.md` (created) | — | `3DD7BD57F64668D20B2FFCF4310A3371D36DDB76B4C3C09B424400EFDC989285` |
| `07-Live-Diagnostics-Contract.md` (created) | — | `F79D1EAC47E436ACC64D063FE38AC03FA60C82ABDD0800338E454870A4AEAF09` |

**Backup:** `D:\KNOUX_Agent\_repair_backup\20261005-031000\agent.py`, verified
byte-identical to the original. Both old venvs retained; `.venv-p312` created.
Gateway: `growth_tools.py` `153BFFF8…`, `test_growth_tools.py` `70DE1F42…`.
Rollback per mutation: `docs/growth/AGENT-REPAIR-EVIDENCE.md`.

---

## 2. KNOuX Agent

### Repaired

| ID | Defect | Evidence |
|---|---|---|
| **D1** | `CLOUDSDK_PYTHON` → a Python313 install that does not exist | Ordered discovery instead; dead path form gone |
| **D2** | Knowledge resolver short-circuited GCS, so **the tool-execution contract never loaded** | Fallback runs. **9/9 resolve, 0 unavailable** |
| **D11** | `requirements.txt` omitted `mcp`; a clean install **cannot import the agent** | `mcp>=1.0.0` added |

### Found in Phase 2, missed in Phase 1

| ID | Finding |
|---|---|
| **D10** | **Both existing venvs were dead.** `.venv` pointed at `C:\Users\day night\…` — a different user's profile. `.venv-k7` pointed at the Python313 path from D1. The documented proof command could never have run, so fixing `agent.py` alone changed nothing. |
| **D12** | The gateway publishes **3 tools**, not 1. Phase 1 read a *draft* toolspec in the knowledge pack; `server.py` publishes `gateway_status`, `local_readonly_tools`, `run_local_readonly_tool`. D4 (`tool_filter`) is still true. |
| **D13** | The real A2A wire format is `{"classMethod":"on_message_send","input":{...}}` against `us-west1-aiplatform.googleapis.com/…/reasoningEngines/374423291676327936:query`. Phase 1 guessed `class_method`/`request.message` — **wrong**. |

### Gates retained

| Gate | Result |
|---|---|
| `py_compile agent.py` | **PASS**, exit 0 |
| `import agent` | **PASS** |
| `root_agent.name` | `KNOUX_Repair_Forensic_Assistant` — preserved |
| model class | `GlobalGemini` — preserved |
| `sub_agents` | **0** — no Growth agent deployed |
| knowledge | **9 declared, 9 resolved, 0 unavailable** |

Not repaired: **D3** import-time ADC, **D6** mojibake, **D7** `shell=True` — all in
the prepared patch, none blocking. Growth sub-agents not applied: the gateway must
publish tools first. **No cloud mutation attempted.**

> These gates ran before Python 3.12 was later removed from this machine. `npm` and
> `git` have since been restored; **Python 3.12 has not** (§9), so the agent gates
> are historical evidence and have not been re-run in this final pass.

---

## 3. Supabase migrations

| | |
|---|---|
| Files | `20261005090000_knoux_growth_v1.sql`, `20261005091000_knoux_growth_v2.sql` |
| Tables | **20** (7 in v1, 13 in v2) — counted by parsing, not estimated |
| **Applied?** | **NO — `MIGRATION_READY_NOT_APPLIED`** |

No local Supabase (54322 closed), no Docker, no `psql`, no `SUPABASE_DB_URL`, and
the configured project `cnkddxxhcfceokxzaaot` is **REMOTE**. Applying schema there
would be an unrequested production mutation, so it was not done.

---

## 4. ⚠ Two defects found in review and fixed

Both passed the original 16-test migration suite. That is why seven more tests
exist.

### 4.1 The migration would have failed at apply

`knoux_growth_campaigns_live_requires_provider` referenced `provider_campaign_id`
inside `CREATE TABLE`, but that column arrived via `ALTER TABLE … ADD COLUMN`
afterwards. Postgres evaluates a `CHECK` against the columns declared so far, so
this aborted the migration with `column "provider_campaign_id" does not exist`.
`knoux_growth_content_published_requires_provider` had the same shape with
`provider_post_id`.

Not "safe to apply" — **unappliable**. Both columns are now declared in the
`CREATE TABLE` body; the `ALTER` is kept as an idempotent no-op.

### 4.2 Any logged-in user could make themselves OWNER of any workspace

```sql
create policy knoux_growth_memberships_self on public.knoux_growth_memberships
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
```

With `grant … insert, update … to authenticated`, this permitted:

```sql
insert into public.knoux_growth_memberships (user_id, client_id, role)
values (auth.uid(), '<any client id>', 'OWNER');
```

`with check` was satisfied by the caller's own uid and constrained neither `role`
nor `client_id`. `OWNER` then satisfies `knoux_growth_clients_owner_write`. One
`update` of one's own row is the same escalation without any insert.

Scoping by `user_id` cannot constrain which role you write. Split per command;
`SELECT` stays self-scoped, `INSERT`/`UPDATE` require
`knoux_growth_is_client_owner(client_id)`, `DELETE` allows leaving or owner-removal.

The gate is a `SECURITY DEFINER` function with a pinned `search_path`, because a
membership policy reading memberships inline is rejected by Postgres as
`infinite recursion detected in policy` — not quietly made false.

**Cost, accepted:** the first `OWNER` can no longer be created through the API,
because nobody can authorise it. Seed it with a role that bypasses RLS. The
alternative "fix" is the escalation above, and there is now a test that fails if a
self-grant policy reappears.

Full detail, with before/after SQL: `docs/growth/PERSISTENCE.md` §3a.

---

## 5. RLS verification

**Static: 23 tests, passing** (`tests/growth-migrations.test.mjs`).

The seven added tests were each confirmed to **fail against the original buggy
SQL** and pass against the fixed SQL. A regression test that passes on the bug it
exists to catch is worse than no test, so the discrimination was verified rather
than assumed.

**Runtime: NOT RUN.** `supabase db lint` needs a live engine, and behavioural
policy enforcement is unverified. Eight verification queries — including **query 6,
the behavioural proof that the self-grant is refused** — are in the migration and
in `PERSISTENCE.md` §7.

---

## 6. Auth verification

Executed against a running server, not asserted:

| Route | Result |
|---|---|
| `/command`, `/command/campaigns`, `/command/communities` | `307` → `location: /login?next=%2Fcommand` |
| `/api/growth/capabilities` | `401` `{"ok":false,"code":"ANONYMOUS",…}` |
| `/api/growth/intelligence/probe` | `401` |
| `/api/intelligence` | `401` |
| `/` and `/growth` | `200` — public routes unaffected |

`updateSession()` was dead code before Phase 2 — written for exactly this, never
called, because no middleware existed. It is now wired.

---

## 7. MCP and connectors

| Stage | Count |
|---|---|
| IMPLEMENTED | **21** |
| REGISTERED / DISCOVERABLE / AUTHENTICATED / EXECUTED / **VERIFIED** | **0** |

Gateway tests **9/9**. Mutating tools: **0 registered**; 8 ids on an explicit
never-register list. One test caught a defect in my own module: `connection_status`
returned lowercase short names while the env vars are uppercase, so it would have
told an operator to set a variable that does not exist.

| | State |
|---|---|
| Meta OAuth | code-complete, **`NOT_CONFIGURED`** — no app id or secret |
| Meta Ads reads | prepared, **`NOT_VERIFIED`** — needs app + grant |
| Google OAuth | code-complete, **`NOT_CONFIGURED`** |
| Google Ads | prepared, **`NOT_VERIFIED`** — needs client pair **and** developer token |
| GA4 / GBP / Search Console | prepared, **`NOT_VERIFIED`** |

Route handlers deliberately not written: an OAuth route without a working callback
looks finished and fails at the first handshake. `docs/growth/OAUTH-SETUP.md`.

---

## 8. Tests

| Suite | Result |
|---|---|
| **Growth (9 files)** | **164 / 164 pass, 0 fail, 0 cancelled** |
| Auth/tenancy + OAuth/persistence | **43 / 43 pass** |
| Migration/RLS static | **23 / 23 pass** |
| MCP gateway | **9 / 9 pass** |

164 = the historical 157 + 7 new regression tests. No test was removed to reach a
pass.

---

## 9. Final gates

| Gate | Result |
|---|---|
| `npm run lint` | **PASS — exit 0** |
| `npm run typecheck` | 270 errors in 14 files — **all pre-existing** |
| `PHASE2_INTRODUCED` | **0** |
| Growth tests | **164 / 164** |
| Authenticated route smoke | anonymous refusal verified; no real session available |
| Full repository suite | not run — 270 legacy type errors block the build |
| Route smoke | 14 / 14 HTTP 200 (Phase 1) |
| Agent compile / import | **PASS** (historical — see §2) |
| Knowledge proof | **9 / 9** |
| MCP gateway tests | **9 / 9** |
| Secret scan | 0 tracked `.env`, 0 `*.pem/key/p12`; 6 pattern hits all false positives (pre-existing PEM-formatting code, tests, and SHA256 hashes) |
| Ports 3000 / 3100 | **FREE** |
| **Migrations applied** | **NO** |

### Baseline vs introduced

`BASELINE_LEGACY = 270`, in 14 files. `git diff --name-only main..HEAD` was
intersected with the erroring-file list: **overlap 0**. Not one error is in a file
this branch touches.

### ⚠ Toolchain, for the record

Partway through this phase, installed software was removed from the machine
(`git.exe`, `npm.cmd`, `C:\Program Files\Python312`, GitHub CLI, dotnet). The
repository was unaffected — objects, `refs/heads/main`, and the reflog were all
intact, and `node.exe` survived so tests kept running. I did not reinstall
anything while software was actively disappearing.

**`git` and `npm` have since been restored**, so the gates in this table were
re-run in this final pass. **`C:\Program Files\Python312` has not been restored**,
so the Agent gates in §2 are historical and were not re-run. That is the one gate
in this document resting on an earlier run.

---

## 10. Known blockers

| Blocker | Needs | Effect |
|---|---|---|
| Migrations unapplied | Docker, or an approved target | `/command` cannot serve real data |
| Runtime RLS unverified | `supabase db lint` + verification query 6 | Policies are reviewed, not proven |
| No first `OWNER` membership | service-role insert | Every user is `NOT_PROVISIONED` — intended |
| No Meta/Google credentials | operator setup | Connectors `NOT_CONFIGURED` |
| No Agent Engine credential | `KNOUX_AGENT_TOKEN` | Cloud agent `AUTH_REQUIRED` |
| Screens still read fixtures | wiring `selectRepository()` | Phase 1 UI over Phase 2 schema |
| Growth sub-agents | gateway tools, then deploy | Repair only via the agent |
| Python 3.12 removed | Python reinstall | Agent gates not re-runnable |

---

## 11. Next safe action

1. Apply the migrations to a local Supabase and run `supabase db lint` plus all
   eight verification queries — **especially 6**, the self-grant refusal.
2. Seed the first `OWNER` via service role. Do not add a self-grant policy.
3. Swap the screens from fixtures to `selectRepository()`.
4. Build the OAuth route handlers against a real Meta app and Google client pair.
5. Register the 21 MCP tools in `server.py`, then deploy and re-measure — the
   `REGISTERED` and `VERIFIED` columns are the ones that matter.
6. Correct `knoux-agent.ts` to the real A2A shape (D13), then apply
   `knoux-agent-growth.patch`.

---

## 12. Confirmation

- **`main` untouched** — `9f34974…`, verified.
- **WORKTREE CLEAN.** All Phase 2 files committed.
- **NOT MERGED. NOT PUSHED.** PR #34 and `converge/post33-growth-closure`
  untouched. No new branch, no new worktree.
- The main working tree was not modified, reset, cleaned or stashed.
- `D:\Knoux_Agent` changed only via journalled, backed-up, hash-recorded
  mutations. A rollback path exists for each.
- No secrets committed. `.env.example` carries names and comments only, all unset.
- No advertising money spent, no ads published, no messages sent, nothing posted,
  no private member data read.
- Every external dependency carries an honest state. **None is described as
  connected.**
- Migrations were **not** applied to make this look complete. Their real status is
  `MIGRATION_READY_NOT_APPLIED`.

**MERGED = NO**