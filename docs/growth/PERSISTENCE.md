# KNOuX Growth — Persistence

Status: **SERVER_WIRING_VERIFIED; REMOTE_GROWTH_SCHEMA_NOT_APPLIED** (2026-10-07).

All operational command screens now receive an authenticated server repository
snapshot when `KNOUX_GROWTH_DATA_SOURCE=supabase` is selected. This selection
enforces authentication regardless of the optional auth switch. Tenancy is
checked in the repository and Postgres RLS. Missing schema, transport failures,
invalid stored metrics and empty stores never substitute demonstration records.
Fixture selection and imported fixture provenance remain visibly DEMO/FIXTURE.

The four Growth migrations execute successfully in isolated Postgres through
`tests/growth-postgres-security.test.mjs`. Browser roles cannot mutate business
tables or call privileged OAuth/Vault RPCs; creative-only roles cannot read
campaign budgets or spend/revenue metrics. The 20261007 security migration
supersedes the historical browser-write examples below. Apply the complete
reviewed set atomically when provisioning, so intermediate grants are never
exposed. A read-only check of project `cnkddxxhcfceokxzaaot` found Vault present
and Growth tables absent. No real provider token was used in SQL tests.

Source: `supabase/migrations/20261005090000_knoux_growth_v1.sql`,
`20261005091000_knoux_growth_v2.sql`,
`src/lib/growth/persistence/{repository,selection,fixture-dataset}.ts`

---

## 1. Why the migrations were not applied

Applying them was not possible in this environment, and applying them blind to a
remote project was not acceptable. Measured:

| Prerequisite | Status |
|---|---|
| Local Supabase stack (port 54322) | Not listening |
| `supabase` CLI | Present, 2.118.0 |
| `supabase db lint` | Requires a **local database** — cannot run |
| Docker | **Not installed** |
| `psql` | Not installed |
| `SUPABASE_DB_URL` | Unset |
| `.env` / `.env.local` | Do not exist |
| Configured project ref | `cnkddxxhcfceokxzaaot` — **REMOTE** |

The configured project is a real remote project, not a local dev stack. Applying
schema to it without an explicit instruction would be a production mutation, which
the brief classes as a stop condition.

**Nothing was applied. No remote call was made.**

---

## 2. What was verified instead

`tests/growth-migrations.test.mjs` — **23 tests, passing.** They check what a
review cannot see by eye and what would otherwise surface only on a production
apply:

- **No destructive statement.** No `DROP TABLE/SCHEMA/COLUMN/CONSTRAINT`,
  `TRUNCATE`, `DELETE FROM`, or `UPDATE ... SET`. Comments are stripped first, so
  prose cannot produce a false pass.
- **No `ALTER COLUMN`.** A conversion risk. `ADD COLUMN IF NOT EXISTS` is the only
  additive form used.
- **Idempotent.** Every `CREATE TABLE`, `CREATE INDEX` and `ADD COLUMN` is guarded.
- **Referential consistency.** Every table named in a policy, an RLS enable, a
  `GRANT` or a `REVOKE` is actually created by a migration. A policy on a missing
  table fails at apply time.
- **No `CHECK` names a column that a later `ALTER TABLE` adds.** This is the class
  of bug that made v1 and v2 unappliable; see §3a.1. The test derives the
  `ADD COLUMN` set per table and asserts each is already declared in the
  `CREATE TABLE` body.
- **The two provider-evidence constraints and their columns agree**, so removing
  either the `CHECK` or the column is a failure rather than a silent loss of the
  guarantee.
- **Membership writes are not self-scoped.** No `FOR ALL` policy on
  `knoux_growth_memberships`, and every `INSERT`/`UPDATE` policy gates on
  `knoux_growth_is_client_owner`. This is the class of bug that let any user make
  themselves `OWNER`; see §3a.2.
- **Self-read is `SELECT`-only and `anon` cannot execute the ownership helper.**
- **The bootstrap path for the first owner is documented**, rather than left as a
  gap someone closes with a self-grant policy.
- **RLS on every business table**, and an explicit `REVOKE … FROM anon` on every
  one. Explicit rather than relying on `PUBLIC` being dropped, because Supabase
  retains explicit anon grants in some projects — the same failure the Signal RPC
  grants migration documents.
- **The audit log is select-only** for the authenticated role: no update/delete
  policy and no write grant.
- **No credential-shaped column** anywhere. `secret_ref` exists; `access_token`,
  `client_secret` and `password` do not.
- **The nine safety constraints** that mirror application rules are present.

The seven tests covering the two §3a defects were written *after* those defects
were found, and each was confirmed to fail against the original SQL before being
accepted — a regression test that passes on the bug it is meant to catch is
worse than no test.

What this still cannot prove: that Postgres accepts the SQL, and that the policies
behave as intended. Only a real engine can do that. That gate is `supabase db
lint` plus verification query **6** after apply, and neither has run.

---

## 3. Schema shape

20 tables across two migrations — 7 in v1, 13 in v2, counted by parsing the
`create table` statements rather than estimated. The tenancy spine is three
tables:

```
knoux_growth_clients          a workspace
knoux_growth_memberships      (user_id, client_id, role)   <- the authority
knoux_growth_*                business data, all carrying client_id
```

There is **no role column on any business table.** A user's role is a property of
their membership, so revoking access is deleting one row rather than updating many,
and "which role does this person hold" always has one answer because of the
`(user_id, client_id)` unique index.

A role is grantable **only by someone who already holds `OWNER`** on that same
client. See §3a — this is not incidental, and it is the property that makes the
membership table safe to expose for writes.

| v1 | v2 |
|---|---|
| `knoux_growth_clients` | `knoux_growth_creatives` |
| `knoux_growth_memberships` | `knoux_growth_content` |
| `knoux_growth_connections` | `knoux_growth_communities` |
| `knoux_growth_oauth_states` | `knoux_growth_community_collections` |
| `knoux_growth_campaigns` | `knoux_growth_collection_members` |
| `knoux_growth_campaign_channels` | `knoux_growth_distribution_runs` |
| `knoux_growth_campaign_approvals` | `knoux_growth_distribution_items` |
| | `knoux_growth_leads` |
| | `knoux_growth_metrics` |
| | `knoux_growth_reports` |
| | `knoux_growth_automation_rules` |
| | `knoux_growth_audit_log` |
| | `knoux_growth_ai_threads` |

---

## 3a. Two defects found in review, and fixed

Both were found while reading back the static tests' own coverage. Neither was
visible on the first pass, and **both passed the 16-test migration suite** — which
is the reason the new tests exist. Recorded here because a future reader who sees
only the fixed SQL cannot tell that a plausible-looking version of it was wrong.

### 1. The migration would have failed at apply

```sql
-- BEFORE — broken
create table if not exists public.knoux_growth_campaigns (
  ...
  constraint knoux_growth_campaigns_live_requires_provider check (
    status <> 'LIVE' or provider_campaign_id is not null   -- does not exist yet
  )
);
alter table public.knoux_growth_campaigns
  add column if not exists provider_campaign_id text;        -- too late
```

Postgres evaluates a `CHECK` in `CREATE TABLE` against the columns declared so far.
Naming one that arrives via `ALTER TABLE` afterwards aborts the whole migration
with `column "provider_campaign_id" does not exist`.

So this was never "safe to apply" — it did not apply. `knoux_growth_content` had the
same shape with `provider_post_id`.

**Fixed** by declaring both columns in the `CREATE TABLE` body. The `ALTER TABLE
... add column if not exists` is kept as an idempotent no-op so re-running against
a database that somehow lacks the column still converges.

> The general rule the new test enforces: **no `CHECK` may name a column that a
> later `ALTER TABLE` adds.**

### 2. Any logged-in user could make themselves OWNER of any workspace

```sql
-- BEFORE — an escalation
create policy knoux_growth_memberships_self on public.knoux_growth_memberships
  for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
```

Combined with `grant select, insert, update, delete … to authenticated`, this
allows exactly:

```sql
insert into public.knoux_growth_memberships (user_id, client_id, role)
values (auth.uid(), '<any client id>', 'OWNER');
```

The `with check` is satisfied because the row's `user_id` is the caller's own. It
says nothing about `role` or `client_id`, so both are the caller's to choose. And
`OWNER` satisfies `knoux_growth_clients_owner_write`, so the workspace is now the
caller's to write. `update` on one's own row is the same escalation in one step:
promote self, no insert needed.

The policy was trying to express two different things — "you may read your own
role" and "you may manage your own membership" — and the second is not a property
anyone has. Scoping by `user_id` cannot constrain which role you write.

**Fixed** by splitting per command:

| Command | Policy | Gate |
|---|---|---|
| `select` | `knoux_growth_memberships_read_self` | `user_id = auth.uid()` |
| `insert` | `knoux_growth_memberships_insert_owner` | `knoux_growth_is_client_owner(client_id)` |
| `update` | `knoux_growth_memberships_update_owner` | same, on both `using` and `with check` |
| `delete` | `knoux_growth_memberships_delete` | own row, or owner of that client |

Self-delete is kept deliberately — leaving a workspace is not escalation, and it
cannot raise a role.

#### Why the gate is a function, and why it is SECURITY DEFINER

The membership write policy must ask "is the caller an owner?" about
`knoux_growth_memberships` — the table whose own policy is being evaluated. Written
inline that is a self-referencing policy, and Postgres rejects it with
`infinite recursion detected in policy`. It does not quietly return false.

```sql
create function public.knoux_growth_is_client_owner(p_client_id text)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (
  select 1 from public.knoux_growth_memberships m
   where m.client_id = p_client_id and m.user_id = auth.uid() and m.role = 'OWNER'
); $$;
```

`SECURITY DEFINER` resolves it by reading memberships as the table owner, which RLS
does not apply to. `search_path` is pinned so a caller-settable path cannot
redirect the body, the function takes only a client id so it reveals nothing beyond
an ownership answer, and `execute` is revoked from `anon`.

Verified after apply by query **5** in the migration, which lists every membership
policy with its `polcmd` and expressions. A `for all` policy on that table is the
defect, not the fix.

### The cost: nobody can bootstrap through the API

Closing membership writes means the first `OWNER` cannot be created by a user,
because there is no owner to authorise it. That is correct — and it must be seeded
with a role that bypasses RLS:

```sql
insert into public.knoux_growth_memberships (user_id, client_id, role, created_by)
values ('<auth.users.id>', '<client id>', 'OWNER', '<auth.users.id>');
```

Supabase SQL editor, or `service_role` from a trusted backend. **Do not** add a
self-grant policy to work around this; that is precisely the escalation above, and
there is now a test that fails if one appears.

---

## 4. Safety rules the schema enforces

The application already refused these. Putting them in constraints means a bug, a
direct SQL session, or a future service cannot bypass them.

| Constraint | Refuses |
|---|---|
| `…_approvals_not_self_approved` | an approval where `decided_by = requested_by` |
| `…_campaigns_live_requires_provider` | a `LIVE` campaign with no `provider_campaign_id` |
| `…_connections_verified` | a `CONNECTED` connection with no `last_verified_at` |
| `…_content_published_requires_provider` | `PUBLISHED` content with no `provider_post_id` |
| `…_distribution_items_posted_has_actor` | a `POSTED` item with no `posted_at`/`posted_by` |
| `…_metrics_live_has_evidence` | a `LIVE` metric with no `evidence` string |
| `…_communities_verified_has_time` | a `VERIFIED` community with no `verified_at` |
| `…_automation_rules_risk` | any rule with `risk > 1` |
| `…_automation_rules_action` | any action outside the five advisory kinds |
| `…_communities_not_private_destination` | a private group stored as a destination |
| `…_ai_threads_provisional` | an AI thread row not marked provisional |

The last one is deliberate: `provisional` defaults to `true`, so an unmarked row
is a deliberate claim rather than an omission.

### `growth_communities` has no member-data column

There is no `member_list`, `member_count`, `scraped_contact` or `hidden_email`
column. No code path can write a harvested record, and no future query can select
one. This is the schema-level expression of the Community Hub rule, enforced by
absence rather than by a constraint — which is stronger, because a constraint can
be disabled and a column cannot be forgotten.

---

## 5. Approval binding

```sql
knoux_growth_campaigns.plan_hash          -- digest of what an approver sees
knoux_growth_campaigns.version            -- bumped on every mutation
knoux_growth_campaign_approvals.approved_plan_hash
knoux_growth_campaign_approvals.campaign_version
```

An approval references the exact plan and version it approved. Editing the budget,
window, targeting, platforms or creative set produces a different `plan_hash` and
a higher `version`, so the approval no longer matches and launch is refused until
someone re-approves. The application half is in
`src/lib/growth/campaigns.ts`; the schema half is these columns plus the
self-approval constraint.

Invalidation is a column (`invalidated_at`, `invalidation_reason`), not a delete,
so the history of what was approved remains auditable.

---

## 6. Repository selection

`src/lib/growth/persistence/selection.ts`

| `KNOUX_GROWTH_DATA_SOURCE` | Result |
|---|---|
| unset | `supabase` — the real store |
| `supabase` | `supabase` |
| `fixture` / `demo` | fixture repository, every value `origin: 'FIXTURE'` |
| principal with no bound clients | `unavailable` / `PERMISSION_MISSING` |

**There is no fallback path.** A configured production store that fails returns
`ok: false` with a typed `RepositoryFailure`. It is never swapped for fixtures,
because a database blip silently becoming demo data is precisely how fixture
numbers become client numbers.

Every message says so explicitly:

> Growth data source state: SCHEMA_ABSENT. Fixtures were not substituted. Apply
> the Growth migrations to this project, then retry.

`FIXTURE_FALLBACK_REFUSED` exists as a first-class state so the refusal is
*visible* rather than silent.

---

## 7. Apply runbook

Only when an owner has decided a target environment.

```bash
# 1. Local, where nothing is at risk
supabase start
supabase db reset          # applies every migration in order
supabase db lint           # the real syntax/type gate

# 2. A remote project, only with explicit instruction and a verified backup
supabase link --project-ref <ref>
supabase db push --dry-run          # READ THIS FIRST
supabase db push
```

`--dry-run` prints the statements without executing them. Because every statement
is additive and guarded, a re-run is safe.

### Verification queries after applying

Commented at the foot of the v1 migration. Each answers a question whose wrong
answer means the tenancy boundary is not doing what the file claims.

**1. Every business table has RLS on, with no table missing a policy**

```sql
select c.relname, c.relrowsecurity,
       coalesce(array_agg(p.polname) filter (where p.polname is not null), '{}') as policies
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  left join pg_policy p on p.polrelid = c.oid
 where n.nspname = 'public' and c.relname like 'knoux_growth_%'
 group by c.relname, c.relrowsecurity
 order by c.relname;
```
Expect every `relrowsecurity = true` and ≥1 policy each.

**2. `anon` holds no grant on any Growth table**

```sql
select table_name, grantee, privilege_type
  from information_schema.role_table_grants
 where table_name like 'knoux_growth_%' and grantee = 'anon';
```
Expect **zero rows**. Anything returned is a disclosure and must be revoked.

**3. The safety constraints exist**

```sql
select conname, pg_get_constraintdef(oid)
  from pg_constraint
 where conname in (
   'knoux_growth_campaign_approvals_not_self_approved',
   'knoux_growth_campaigns_live_requires_provider',
   'knoux_growth_connections_verified',
   'knoux_growth_automation_rules_risk');
```

**4. Cross-tenant reads are actually refused** — the behavioural proof

```sql
-- as a user bound only to client 'cl_a'
select count(*) from public.knoux_growth_campaigns where client_id = 'cl_b';
```
Expect **0**, not an error and not 1. RLS filtering, not a policy that throws.

**5. Self-approval is refused by the engine**

```sql
insert into public.knoux_growth_campaign_approvals
  (campaign_id, client_id, approved_plan_hash, campaign_version,
   budget_minor, currency, duration_days, requested_by, decision, decided_by)
select id, client_id, plan_hash, version, 75000, 'AED', 8,
       '<a-uuid>', 'APPROVE', '<a-uuid>'
  from public.knoux_growth_campaigns limit 1;
```
Expect a `check_violation`.

**6. The self-grant escalation is refused** — the behavioural proof of §3a

```sql
-- as a user who is a member of 'cl_a' but NOT an owner of 'cl_b'
insert into public.knoux_growth_memberships (user_id, client_id, role)
values (auth.uid(), 'cl_b', 'OWNER');
```
Expect a `new row violates row-level security policy` error.

```sql
-- and the same escalation in one step, no insert required
update public.knoux_growth_memberships
   set role = 'OWNER'
 where user_id = auth.uid() and client_id = 'cl_a';
```
Expect the same error. Before the fix both statements succeeded, and the second
one is the whole attack.

Confirm the policy shape directly:

```sql
select polname, polcmd,
       pg_get_expr(polqual, polrelid)     as using_expr,
       pg_get_expr(polwithcheck, polrelid) as with_check_expr
  from pg_policy
 where polrelid = 'public.knoux_growth_memberships'::regclass
 order by polname;
```
Expect one `SELECT` policy gated on `auth.uid()`, `INSERT`/`UPDATE` gated on
`knoux_growth_is_client_owner`, `DELETE` allowing either. **Any `for all` policy
(`polcmd = '*'`) here is the defect.**

**7. The ownership helper is SECURITY DEFINER with a pinned path**

```sql
select prosecdef, proconfig, proname from pg_proc
 where proname = 'knoux_growth_is_client_owner';
```
Expect `prosecdef = true` and `proconfig` containing `search_path=public`. Without
`SECURITY DEFINER` these policies cannot be created at all — Postgres rejects the
self-reference — so a missing function here means the migration did not apply.

**8. Bootstrap the first owner**, with a role that bypasses RLS:

```sql
insert into public.knoux_growth_memberships (user_id, client_id, role, created_by)
values ('<explicit-approved-user-uuid>', '<explicit-client-id>', 'OWNER', '<explicit-approved-user-uuid>');
```
Run from the SQL editor or with `service_role`. Until this row exists, every
authenticated user resolves to `NOT_PROVISIONED` — which is the correct and
intended closed state, not a bug.

---

## 8. What still has to happen

1. Apply to a real environment and run `supabase db lint`.
2. Run the eight verification queries above, including **6**, which is the
   behavioural check that the self-grant escalation is actually refused.
3. Seed the first `OWNER` membership with a role that bypasses RLS (§3a). **Until
   that exists, every authenticated user resolves to `NOT_PROVISIONED`**, which is
   the intended closed state — do not open it with a self-grant policy.
4. Command Center repository wiring is complete through `loadLiveWorkspace()` /
   `assembleLiveWorkspace()`. Provision the explicitly identified first owner;
   never infer ownership from whichever auth user happens to be first.
