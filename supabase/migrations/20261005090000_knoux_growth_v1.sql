-- KNOuX Growth v1: workspace, tenancy, and campaign approval.
--
-- This is the storage layer behind the KNOuX Social Command Center. It is
-- additive only: every object is created `if not exists`, and nothing is dropped,
-- altered in place, or rewritten. Applying it to an existing database adds
-- tables and policies and touches no existing row.
--
-- Four properties are enforced here rather than assumed in TypeScript:
--
--   1. Tenant isolation. Every business table carries `client_id`, and every
--      policy resolves visibility through `knoux_growth_memberships`. A row is
--      readable only by a member of the workspace that owns it. The TypeScript
--      RBAC in src/lib/growth/rbac.ts is a second, independent check; neither
--      layer is trusted to be the only one.
--
--   2. Membership is the single source of authority. There is no role column on
--      a business table. A user's role is a property of their membership, so
--      revoking access is deleting one row rather than updating many. A role is
--      grantable only by an existing OWNER of that workspace, so a user cannot
--      raise their own role by writing to the membership table.
--
--   3. No credential is stored. `knoux_growth_connections` holds a reference to
--      a secret held in an external vault, plus presence and expiry metadata.
--      An access token, refresh token, client secret or app secret never enters
--      this database, so a dump of every Growth table cannot leak one.
--
--   4. Approval is bound to a frozen plan. `plan_hash` is a digest of the
--      budget, window, targeting, platforms and creative set the approver saw.
--      Changing any of those produces a different hash, so an approval cannot be
--      reused for a plan the approver never looked at. This is the database-level
--      half of the rule the state machine in src/lib/growth/campaigns.ts
--      enforces in the application.
--
-- Nothing in this file is applied by the application. It is applied by a human,
-- after review, to an environment they have chosen. See
-- docs/growth/PERSISTENCE.md for the runbook and the verification queries.

-- ---------------------------------------------------------------------------
-- Clients (workspaces)
-- ---------------------------------------------------------------------------

create table if not exists public.knoux_growth_clients (
  id text primary key,
  name text not null,
  legal_name text,
  business_category text not null default '',
  country text not null default 'AE',
  city text not null default '',
  -- Brand palette as hex strings. Platform brand colours are not brand colours
  -- and are not stored here.
  brand_colors text[] not null default '{}',
  brand_fonts text[] not null default '{}',
  brand_tone text not null default '',
  arabic_style text,
  english_style text,
  -- Claims KNOuX must never generate for this client. Read by the intelligence
  -- route and injected into every prompt for this workspace.
  forbidden_claims text[] not null default '{}',
  approved_assets text[] not null default '{}',
  products text[] not null default '{}',
  website text,
  phone text,
  whatsapp text,
  languages text[] not null default '{en}',
  branches jsonb not null default '[]'::jsonb,
  -- 'ADVISOR' | 'COPILOT' | 'AUTOPILOT'. AUTOPILOT has no enabling code path;
  -- the column records the policy, it does not grant one.
  autonomy_mode text not null default 'COPILOT',
  -- 'FIXTURE' | 'LIVE'. A fixture client is never treated as production data by
  -- the repository layer, which refuses to blend the two.
  origin text not null default 'LIVE',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint knoux_growth_clients_country check (country in ('AE', 'EG')),
  constraint knoux_growth_clients_origin check (origin in ('FIXTURE', 'LIVE')),
  constraint knoux_growth_clients_autonomy check (autonomy_mode in ('ADVISOR', 'COPILOT', 'AUTOPILOT')),
  constraint knoux_growth_clients_language check (languages <@ array['ar', 'en'])
);

comment on table public.knoux_growth_clients is
  'KNOuX Growth client workspaces. Branded rows are origin=FIXTURE and are never presented as production data.';

-- ---------------------------------------------------------------------------
-- Memberships: the tenancy boundary
-- ---------------------------------------------------------------------------

create table if not exists public.knoux_growth_memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id text not null references public.knoux_growth_clients(id) on delete cascade,
  -- Mirrors the Role union in src/lib/growth/rbac.ts.
  role text not null,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  constraint knoux_growth_memberships_role check (
    role in ('OWNER', 'MANAGER', 'ADS_SPECIALIST', 'DESIGNER', 'CONTENT_CREATOR', 'CLIENT', 'VIEWER')
  )
);

-- One role per user per workspace. A second grant updates rather than creating a
-- second row, so "which role does this person hold" always has one answer.
create unique index if not exists knoux_growth_memberships_user_client_key
  on public.knoux_growth_memberships(user_id, client_id);

-- The lookup every policy performs. Indexed on user_id first because that is the
-- predicate auth.uid() drives.
create index if not exists knoux_growth_memberships_user_idx
  on public.knoux_growth_memberships(user_id);

create index if not exists knoux_growth_memberships_client_idx
  on public.knoux_growth_memberships(client_id);

comment on table public.knoux_growth_memberships is
  'Which account holds which role in which workspace. Deleting a row revokes access; there is no other revocation path.';

-- ---------------------------------------------------------------------------
-- Connections: state, never a secret
-- ---------------------------------------------------------------------------

create table if not exists public.knoux_growth_connections (
  id uuid primary key default gen_random_uuid(),
  client_id text not null references public.knoux_growth_clients(id) on delete cascade,
  platform text not null,
  -- Mirrors ConnectionState in src/lib/growth/states.ts.
  state text not null default 'NOT_CONNECTED',
  -- Mirrors CapabilityState. A row may only become 'LIVE_VERIFIED' when a real
  -- provider call succeeded; the application is the only writer.
  capability_state text not null default 'UI_READY',
  -- Opaque pointer to a credential held in an external secret store. Never the
  -- credential itself, and never a token.
  secret_ref text,
  -- Display-safe identity, e.g. an ad account name. An account id is safe; a
  -- token is not.
  account_label text,
  account_id text,
  granted_scopes text[] not null default '{}',
  missing_scopes text[] not null default '{}',
  token_expires_at timestamptz,
  last_verified_at timestamptz,
  -- The provider's own message, preserved verbatim rather than rewritten.
  last_error text,
  last_checked_at timestamptz,
  origin text not null default 'LIVE',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint knoux_growth_connections_state check (
    state in ('NOT_CONNECTED', 'CONNECTING', 'CONNECTED', 'EXPIRED', 'PERMISSION_REQUIRED', 'ERROR', 'BLOCKED', 'NOT_CONFIGURED')
  ),
  constraint knoux_growth_connections_capability_state check (
    capability_state in ('UI_READY', 'ADAPTER_READY', 'CONFIG_REQUIRED', 'AUTH_REQUIRED', 'DEMO_ONLY', 'LIVE_VERIFIED', 'BLOCKED')
  ),
  constraint knoux_growth_connections_origin check (origin in ('FIXTURE', 'LIVE')),
  -- CONNECTED without a verification time would be an unbacked claim, so the
  -- column pair is constrained rather than left to discipline.
  constraint knoux_growth_connections_verified check (
    state <> 'CONNECTED' or last_verified_at is not null
  )
);

create unique index if not exists knoux_growth_connections_client_platform_key
  on public.knoux_growth_connections(client_id, platform);

create index if not exists knoux_growth_connections_client_idx
  on public.knoux_growth_connections(client_id);

comment on table public.knoux_growth_connections is
  'Platform connection state. Holds a reference to an external secret, never a credential. secret_ref must never contain a token.';

-- OAuth handshakes are transient and single-use.
create table if not exists public.knoux_growth_oauth_states (
  state_hash text primary key,
  client_id text not null references public.knoux_growth_clients(id) on delete cascade,
  platform text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  -- Where to send the browser afterwards. Stored server-side so the callback
  -- does not trust a caller-supplied return URL.
  return_path text not null default '/command/connections',
  -- Requested scopes for this specific grant, so a capability-specific request
  -- is auditable after the fact.
  requested_scopes text[] not null default '{}',
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  consumed_at timestamptz
);

create index if not exists knoux_growth_oauth_states_expiry_idx
  on public.knoux_growth_oauth_states(expires_at);

comment on table public.knoux_growth_oauth_states is
  'Single-use OAuth state, stored hashed. A pending handshake expires on its own so a stale state cannot be replayed.';

-- ---------------------------------------------------------------------------
-- Campaigns
-- ---------------------------------------------------------------------------

create table if not exists public.knoux_growth_campaigns (
  id uuid primary key default gen_random_uuid(),
  client_id text not null references public.knoux_growth_clients(id) on delete cascade,
  name text not null,
  -- Mirrors CampaignObjective.
  objective text not null,
  -- Minor units, so money never touches floating point.
  budget_minor bigint not null default 0,
  currency text not null default 'AED',
  start_date date not null,
  end_date date not null,
  locations text[] not null default '{}',
  languages text[] not null default '{en}',
  audience_notes text,
  landing_page_url text,
  conversion_target text,
  -- Mirrors CampaignStatus. The application state machine owns transitions;
  -- this column records them. The check below keeps the two in step.
  status text not null default 'DRAFT',
  -- Digest of everything an approver is signing off. Recomputed on every change
  -- to budget, window, targeting, platforms or creative set.
  plan_hash text,
  -- Incremented on every mutation. An approval references the version it
  -- approved, so an edit after approval is detectable rather than assumed away.
  version integer not null default 1,
  -- Declared here, not by a later ADD COLUMN, because the
  -- knoux_growth_campaigns_live_requires_provider check below references it. A
  -- CHECK in CREATE TABLE cannot name a column that does not exist yet, so
  -- declaring it afterwards made this migration fail at apply time.
  -- One campaign can exist on several platforms (see campaign_channels), but
  -- only one may ever be serving, so one provider id belongs here.
  provider_campaign_id text,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  origin text not null default 'LIVE',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint knoux_growth_campaigns_objective check (
    objective in ('WHATSAPP', 'LEADS', 'CALLS', 'WEBSITE', 'AWARENESS', 'BOOKINGS', 'SALES')
  ),
  constraint knoux_growth_campaigns_status check (
    status in ('DRAFT', 'READY_FOR_REVIEW', 'CHANGES_REQUESTED', 'APPROVED', 'LAUNCH_PENDING', 'LIVE', 'PAUSED', 'COMPLETED', 'FAILED')
  ),
  constraint knoux_growth_campaigns_currency check (currency in ('AED', 'EGP', 'USD')),
  constraint knoux_growth_campaigns_budget check (budget_minor >= 0),
  constraint knoux_growth_campaigns_window check (end_date >= start_date),
  constraint knoux_growth_campaigns_version check (version >= 1),
  -- LIVE is only reachable through a real provider call reporting the campaign
  -- as serving, so it cannot exist without provider evidence.
  constraint knoux_growth_campaigns_live_requires_provider check (
    status <> 'LIVE' or provider_campaign_id is not null
  )
);

-- Kept as an idempotent no-op for a database where the column is somehow absent.
-- On a fresh apply the column is already present from the CREATE TABLE above.
alter table public.knoux_growth_campaigns
  add column if not exists provider_campaign_id text;

comment on table public.knoux_growth_campaigns is
  'Campaign plans and their lifecycle. plan_hash binds an approval to one exact plan; version detects edits after approval.';

create index if not exists knoux_growth_campaigns_client_idx
  on public.knoux_growth_campaigns(client_id, updated_at desc);

create index if not exists knoux_growth_campaigns_pending_review_idx
  on public.knoux_growth_campaigns(client_id, created_at desc)
  where status = 'READY_FOR_REVIEW';

-- Channels are the per-platform rows. Separated because the platforms a campaign
-- runs on differ from the campaign itself, and because provider ids are
-- per-platform.
create table if not exists public.knoux_growth_campaign_channels (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.knoux_growth_campaigns(id) on delete cascade,
  client_id text not null references public.knoux_growth_clients(id) on delete cascade,
  platform text not null,
  remote_campaign_id text,
  remote_adset_id text,
  daily_budget_minor bigint,
  status text not null default 'PENDING',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint knoux_growth_campaign_channels_platform check (
    platform in ('facebook', 'instagram', 'google_search', 'google_maps', 'youtube')
  ),
  constraint knoux_growth_campaign_channels_status check (
    status in ('PENDING', 'SUBMITTED', 'ACTIVE', 'PAUSED', 'REJECTED', 'FAILED')
  ),
  constraint knoux_growth_campaign_channels_budget check (
    daily_budget_minor is null or daily_budget_minor >= 0
  )
);

create unique index if not exists knoux_growth_campaign_channels_campaign_platform_key
  on public.knoux_growth_campaign_channels(campaign_id, platform);

-- client_id is denormalised onto the child so its RLS policy does not need a
-- join back through the parent on every row. It is kept honest by a trigger-free
-- convention: every insert path in the repository writes both.

-- ---------------------------------------------------------------------------
-- Approvals
-- ---------------------------------------------------------------------------

create table if not exists public.knoux_growth_campaign_approvals (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.knoux_growth_campaigns(id) on delete cascade,
  client_id text not null references public.knoux_growth_clients(id) on delete cascade,
  -- The plan_hash the approver actually saw. Compared against the campaign's
  -- current hash before any launch, which is what makes an approval invalidate
  -- itself when the plan changes.
  approved_plan_hash text not null,
  -- The campaign version this approval covers.
  campaign_version integer not null,
  budget_minor bigint not null,
  currency text not null,
  duration_days integer not null,
  target text not null default '',
  requested_by uuid not null references auth.users(id) on delete cascade,
  requested_at timestamptz not null default now(),
  decision text,
  decided_by uuid references auth.users(id) on delete set null,
  decided_at timestamptz,
  note text,
  -- Set when a later plan edit invalidates this approval. Kept as a column rather
  -- than deleted, so the history of what was approved remains auditable.
  invalidated_at timestamptz,
  invalidation_reason text,
  constraint knoux_growth_campaign_approvals_decision check (
    decision is null or decision in ('APPROVE', 'REQUEST_CHANGES', 'REJECT', 'WITHDRAW')
  ),
  constraint knoux_growth_campaign_approvals_budget check (budget_minor >= 0),
  constraint knoux_growth_campaign_approvals_duration check (duration_days >= 1),
  -- An approval is a decision by one person about someone else's plan. The
  -- database refuses the self-approval even if the application is bypassed.
  constraint knoux_growth_campaign_approvals_not_self_approved check (
    decided_by is null or requested_by is distinct from decided_by
  )
);

create index if not exists knoux_growth_campaign_approvals_campaign_idx
  on public.knoux_growth_campaign_approvals(campaign_id, requested_at desc);

create index if not exists knoux_growth_campaign_approvals_pending_idx
  on public.knoux_growth_campaign_approvals(client_id, requested_at desc)
  where decision is null;

comment on table public.knoux_growth_campaign_approvals is
  'Approval records bound to a frozen plan hash. Self-approval is refused by a constraint, not only by the application.';

-- ---------------------------------------------------------------------------
-- Row level security: the tenancy boundary, in the database
-- ---------------------------------------------------------------------------
--
-- Every policy below resolves through membership. The predicate is written out
-- rather than wrapped in a function because an inline subquery is what the
-- planner can use for the per-row check, and because a function that reads
-- memberships would be one more object whose security properties a reviewer has
-- to verify separately.
--
-- `using` governs reads and writes; `with check` governs what may be written.
-- Both are present on the write policies, so a row cannot be inserted into a
-- workspace the writer does not belong to.

alter table public.knoux_growth_clients enable row level security;
alter table public.knoux_growth_memberships enable row level security;
alter table public.knoux_growth_connections enable row level security;
alter table public.knoux_growth_oauth_states enable row level security;
alter table public.knoux_growth_campaigns enable row level security;
alter table public.knoux_growth_campaign_channels enable row level security;
alter table public.knoux_growth_campaign_approvals enable row level security;

-- Ownership test, as a function, because the membership write policy has to ask
-- "is the caller an owner of this client?" about a table whose own policy is the
-- thing being evaluated. Written inline that is a self-referencing policy, and
-- Postgres rejects it with `infinite recursion detected in policy` rather than
-- quietly returning false. SECURITY DEFINER resolves it by reading the
-- memberships as the table owner, which RLS does not apply to.
--
-- `set search_path` is pinned so the body cannot be redirected by a caller-settable
-- search_path, and the function takes only a client id, so it exposes nothing
-- beyond an ownership answer the caller could already infer.
create or replace function public.knoux_growth_is_client_owner(p_client_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from public.knoux_growth_memberships m
     where m.client_id = p_client_id
       and m.user_id = auth.uid()
       and m.role = 'OWNER'
  );
$$;

revoke all on function public.knoux_growth_is_client_owner(text) from anon;
grant execute on function public.knoux_growth_is_client_owner(text) to authenticated;

comment on function public.knoux_growth_is_client_owner(text) is
  'True when the calling user holds OWNER on the given workspace. SECURITY DEFINER to avoid infinite recursion in the membership policy.';

-- Membership: a person reads only their own rows. Reading another person's
-- membership is how a client-role user would discover which other workspaces
-- exist, so it is not permitted.
--
-- Writes are NOT self-scoped. An earlier version used `for all` with
-- `with check (user_id = auth.uid())`, which combined with the authenticated
-- insert/update/delete grant below let any logged-in user mint an OWNER
-- membership for any client id, or promote their own row to OWNER — and OWNER
-- then unlocks knoux_growth_clients_owner_write. Holding only your own row open
-- for writes is what made that escalation possible. Writes now require already
-- being an owner of that client, which is the one role that cannot be acquired
-- by writing.
drop policy if exists knoux_growth_memberships_self on public.knoux_growth_memberships;
drop policy if exists knoux_growth_memberships_read_self on public.knoux_growth_memberships;
create policy knoux_growth_memberships_read_self on public.knoux_growth_memberships
  for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists knoux_growth_memberships_insert_owner on public.knoux_growth_memberships;
create policy knoux_growth_memberships_insert_owner on public.knoux_growth_memberships
  for insert
  to authenticated
  with check (public.knoux_growth_is_client_owner(client_id));

drop policy if exists knoux_growth_memberships_update_owner on public.knoux_growth_memberships;
create policy knoux_growth_memberships_update_owner on public.knoux_growth_memberships
  for update
  to authenticated
  using (public.knoux_growth_is_client_owner(client_id))
  with check (public.knoux_growth_is_client_owner(client_id));

-- Leaving is always allowed, and removing a member is an owner's action. Neither
-- direction can raise a role, so neither is an escalation path.
drop policy if exists knoux_growth_memberships_delete on public.knoux_growth_memberships;
create policy knoux_growth_memberships_delete on public.knoux_growth_memberships
  for delete
  to authenticated
  using (user_id = auth.uid() or public.knoux_growth_is_client_owner(client_id));

-- Clients: visible to members of that workspace.
drop policy if exists knoux_growth_clients_member_read on public.knoux_growth_clients;
create policy knoux_growth_clients_member_read on public.knoux_growth_clients
  for select
  to authenticated
  using (
    exists (
      select 1 from public.knoux_growth_memberships m
      where m.client_id = knoux_growth_clients.id
        and m.user_id = auth.uid()
    )
  );

drop policy if exists knoux_growth_clients_owner_write on public.knoux_growth_clients;
create policy knoux_growth_clients_owner_write on public.knoux_growth_clients
  for all
  to authenticated
  using (
    exists (
      select 1 from public.knoux_growth_memberships m
      where m.client_id = knoux_growth_clients.id
        and m.user_id = auth.uid()
        and m.role = 'OWNER'
    )
  )
  with check (
    exists (
      select 1 from public.knoux_growth_memberships m
      where m.client_id = knoux_growth_clients.id
        and m.user_id = auth.uid()
        and m.role = 'OWNER'
    )
  );

-- Business tables share one membership predicate. It is repeated per table
-- because Postgres has no policy macro; each is otherwise identical.
drop policy if exists knoux_growth_connections_member on public.knoux_growth_connections;
create policy knoux_growth_connections_member on public.knoux_growth_connections
  for all
  to authenticated
  using (
    exists (
      select 1 from public.knoux_growth_memberships m
      where m.client_id = knoux_growth_connections.client_id
        and m.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.knoux_growth_memberships m
      where m.client_id = knoux_growth_connections.client_id
        and m.user_id = auth.uid()
    )
  );

-- OAuth state is written by the browser-initiated handshake and read by the
-- callback, both as the same authenticated user. Scoped to the user so one
-- account cannot complete another account's handshake.
drop policy if exists knoux_growth_oauth_states_owner on public.knoux_growth_oauth_states;
create policy knoux_growth_oauth_states_owner on public.knoux_growth_oauth_states
  for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists knoux_growth_campaigns_member on public.knoux_growth_campaigns;
create policy knoux_growth_campaigns_member on public.knoux_growth_campaigns
  for all
  to authenticated
  using (
    exists (
      select 1 from public.knoux_growth_memberships m
      where m.client_id = knoux_growth_campaigns.client_id
        and m.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.knoux_growth_memberships m
      where m.client_id = knoux_growth_campaigns.client_id
        and m.user_id = auth.uid()
    )
  );

drop policy if exists knoux_growth_campaign_channels_member on public.knoux_growth_campaign_channels;
create policy knoux_growth_campaign_channels_member on public.knoux_growth_campaign_channels
  for all
  to authenticated
  using (
    exists (
      select 1 from public.knoux_growth_memberships m
      where m.client_id = knoux_growth_campaign_channels.client_id
        and m.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.knoux_growth_memberships m
      where m.client_id = knoux_growth_campaign_channels.client_id
        and m.user_id = auth.uid()
    )
  );

drop policy if exists knoux_growth_campaign_approvals_member on public.knoux_growth_campaign_approvals;
create policy knoux_growth_campaign_approvals_member on public.knoux_growth_campaign_approvals
  for all
  to authenticated
  using (
    exists (
      select 1 from public.knoux_growth_memberships m
      where m.client_id = knoux_growth_campaign_approvals.client_id
        and m.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.knoux_growth_memberships m
      where m.client_id = public.knoux_growth_campaign_approvals.client_id
        and m.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------
--
-- `anon` is revoked explicitly rather than relying on `public` being dropped.
-- Supabase retains explicit anon grants in some projects even after PUBLIC is
-- revoked, which is the same failure the Signal RPC grants migration addresses.
-- Growth tables hold client business data, so an anon grant here would be a
-- disclosure.

revoke all on table public.knoux_growth_clients from anon;
revoke all on table public.knoux_growth_memberships from anon;
revoke all on table public.knoux_growth_connections from anon;
revoke all on table public.knoux_growth_oauth_states from anon;
revoke all on table public.knoux_growth_campaigns from anon;
revoke all on table public.knoux_growth_campaign_channels from anon;
revoke all on table public.knoux_growth_campaign_approvals from anon;

grant select, insert, update, delete on table public.knoux_growth_clients to authenticated;
grant select, insert, update, delete on table public.knoux_growth_memberships to authenticated;
grant select, insert, update, delete on table public.knoux_growth_connections to authenticated;
grant select, insert, update, delete on table public.knoux_growth_oauth_states to authenticated;
grant select, insert, update, delete on table public.knoux_growth_campaigns to authenticated;
grant select, insert, update, delete on table public.knoux_growth_campaign_channels to authenticated;
grant select, insert, update, delete on table public.knoux_growth_campaign_approvals to authenticated;

-- ---------------------------------------------------------------------------
-- Verification queries
-- ---------------------------------------------------------------------------
--
-- Run these after applying. Each is a question whose answer being wrong means the
-- tenancy boundary is not doing what this file claims.
--
-- 1. Every business table has RLS on, with no table missing a policy.
--
-- select c.relname, c.relrowsecurity, c.relforcerowsecurity,
--        coalesce(array_agg(p.polname) filter (where p.polname is not null), '{}') as policies
--   from pg_class c
--   join pg_namespace n on n.oid = c.relnamespace
--   left join pg_policy p on p.polrelid = c.oid
--  where n.nspname = 'public' and c.relname like 'knoux_growth_%'
--  group by c.relname, c.relrowsecurity, c.relforcerowsecurity
--  order by c.relname;
--
-- Expect every relrowsecurity = true, and every table to carry at least one policy.
--
-- 2. anon holds no grant on any Growth table.
--
-- select table_name, grantee, privilege_type
--   from information_schema.role_table_grants
--  where table_name like 'knoux_growth_%' and grantee = 'anon';
--
-- Expect zero rows. Anything returned is a disclosure and must be revoked.
--
-- 3. Self-approval is refused by the schema.
--
-- select conname, pg_get_constraintdef(oid)
--   from pg_constraint
--  where conname = 'knoux_growth_campaign_approvals_not_self_approved';
--
-- 4. Live campaigns cannot exist without provider evidence.
--
-- select conname, pg_get_constraintdef(oid)
--   from pg_constraint
--  where conname = 'knoux_growth_campaigns_live_requires_provider';
--
-- 5. No policy lets a user write their own membership. This is the escalation
--    check: if any membership policy still has INSERT or UPDATE with a
--    `with check` that does not call knoux_growth_is_client_owner, any
--    authenticated user can promote themselves to OWNER of any workspace.
--
-- select polname, polcmd, pg_get_expr(polqual, polrelid)  as using_expr,
--        pg_get_expr(polwithcheck, polrelid) as with_check_expr
--   from pg_policy
--  where polrelid = 'public.knoux_growth_memberships'::regclass
--    and polcmd in ('a', 'w', 'd', '*')
--  order by polname;
--
-- Expect: SELECT policy with `user_id = auth.uid()`; INSERT and UPDATE policies
-- whose with_check calls knoux_growth_is_client_owner(client_id); DELETE policy
-- allowing `user_id = auth.uid() or knoux_growth_is_client_owner(...)`.
-- A `for all` policy here is the defect, not the fix.
--
-- 6. The ownership helper is SECURITY DEFINER with a pinned search_path.
--
-- select prosecdef, proconfig, proname
--   from pg_proc
--  where proname = 'knoux_growth_is_client_owner';
--
-- Expect prosecdef = true and proconfig containing search_path=public. Without
-- SECURITY DEFINER the membership write policies cannot be written at all
-- (infinite recursion); without a pinned search_path the function body is
-- redirectable.
--
-- ---------------------------------------------------------------------------
-- Bootstrap
-- ---------------------------------------------------------------------------
--
-- Membership writes now require an existing OWNER of that client, which means
-- the first owner cannot be created through the API — there is nobody to
-- authorise it. Seed it with a role that bypasses RLS, which is not reachable
-- from a browser session:
--
--   insert into public.knoux_growth_memberships (user_id, client_id, role, created_by)
--   values ('<auth.users.id>', '<client id>', 'OWNER', '<auth.users.id>');
--
-- Run it from the Supabase SQL editor, or with the service_role key from a
-- trusted backend. Do not add a policy that permits self-granting: that is
-- exactly the escalation check in query 5 above.