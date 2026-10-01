-- KNOuX Build Bridge.
--
-- Storage for pairing, approvals, audit and verification runs. The bridge
-- itself is a local process; these rows are what the BFF needs to scope a
-- request to one owner and one bridge.
--
-- Two properties matter here and are enforced rather than assumed:
--
--   1. Every row is owner-scoped. RLS compares owner_id to auth.uid() and the
--      service role is the only path that bypasses it. A bridge pairing is a
--      statement about one person's machine, so no row is ever readable or
--      writable by another account.
--
--   2. No secret is stored. The issuer private key never reaches this database;
--      only its public key fingerprint and the bridge's own fingerprint. A dump
--      of these tables reveals that two machines were paired, and nothing more.

-- ---------------------------------------------------------------------------
-- Pairings
-- ---------------------------------------------------------------------------

create table if not exists public.knoux_build_bridges (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  -- Origin only, e.g. http://127.0.0.1:7331. The bridge speaks plain HTTP and
  -- is loopback-only, so a non-loopback host here is a misconfiguration the
  -- application rejects rather than something the schema can police.
  url text not null,
  -- The bridge's identity, truncated from its Ed25519 public key. Tickets are
  -- audience-bound to this value, so it must match what the bridge reports.
  bridge_id text not null,
  -- Full SHA-256 of the bridge's public key, for visual confirmation against
  -- `knoux-bridge pair-status`.
  fingerprint text not null,
  paired_by uuid references auth.users(id) on delete set null,
  paired_at timestamptz not null default now(),
  -- Written by the status route when /v1/health answers. Null means "never seen",
  -- which is different from "seen and unreachable" and must stay distinguishable.
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  constraint knoux_build_bridges_loopback_url check (
    url ~ '^https?://(127\.0\.0\.1|localhost|\[::1\]|::1)(:[0-9]{1,5})?$'
  ),
  constraint knoux_build_bridges_bridge_id_format check (bridge_id ~ '^[0-9a-f]{8,64}$'),
  constraint knoux_build_bridges_fingerprint_format check (fingerprint ~ '^[0-9a-f]{64}$')
);

-- One bridge per owner per url: re-pairing the same machine updates rather than
-- accumulating rows that all claim to be the live pairing.
create unique index if not exists knoux_build_bridges_owner_url_key
  on public.knoux_build_bridges(owner_id, url);

create index if not exists knoux_build_bridges_owner_idx
  on public.knoux_build_bridges(owner_id, created_at desc);

alter table public.knoux_build_bridges enable row level security;

drop policy if exists knoux_build_bridges_owner_all on public.knoux_build_bridges;
create policy knoux_build_bridges_owner_all on public.knoux_build_bridges
  for all
  to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Approvals
--
-- A record of something the workspace asked permission to do. `action_hash`
-- binds the approval to one exact action, so an approval granted for one write
-- cannot be replayed for a different one.
-- ---------------------------------------------------------------------------

create table if not exists public.knoux_build_approvals (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  action_hash text not null,
  -- 'read' | 'edit' | 'git-write' | 'run', matching policy.ts's levels.
  level text not null,
  title text not null,
  detail text not null default '',
  affects text[] not null default '{}',
  irreversible boolean not null default false,
  status text not null default 'pending',
  -- A pending approval expires on its own. A stale approval must never be
  -- reusable, so the expiry is a column rather than a cleanup job's problem.
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  constraint knoux_build_approvals_level check (level in ('read', 'edit', 'git-write', 'run')),
  constraint knoux_build_approvals_status check (status in ('pending', 'approved', 'rejected', 'expired')),
  constraint knoux_build_approvals_expiry_after_creation check (expires_at > created_at)
);

create index if not exists knoux_build_approvals_pending_idx
  on public.knoux_build_approvals(owner_id, created_at desc)
  where status = 'pending';

create index if not exists knoux_build_approvals_action_hash_idx
  on public.knoux_build_approvals(owner_id, action_hash);

alter table public.knoux_build_approvals enable row level security;

drop policy if exists knoux_build_approvals_owner_all on public.knoux_build_approvals;
create policy knoux_build_approvals_owner_all on public.knoux_build_approvals
  for all
  to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Audit
--
-- The BFF's record of what the workspace asked the bridge to do. This is a
-- mirror of the bridge's local audit log, not a replacement for it: the bridge
-- keeps the authoritative copy on the owner's machine.
-- ---------------------------------------------------------------------------

create table if not exists public.knoux_build_audit (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  action text not null,
  actor text not null,
  target text not null default '',
  outcome text not null,
  -- Must not carry output. The bridge redacts before sending and so does the
  -- BFF; this column is for a short description, not a transcript.
  detail text not null default '',
  approval_id uuid references public.knoux_build_approvals(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint knoux_build_audit_outcome check (outcome in ('success', 'failure', 'denied'))
);

create index if not exists knoux_build_audit_owner_recent_idx
  on public.knoux_build_audit(owner_id, created_at desc);

alter table public.knoux_build_audit enable row level security;

drop policy if exists knoux_build_audit_owner_all on public.knoux_build_audit;
create policy knoux_build_audit_owner_all on public.knoux_build_audit
  for all
  to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Verification runs
--
-- One row per allowlisted task execution. `exit_code` is the process's real exit
-- code; null means the run did not finish, which the UI must show as unknown
-- rather than as a pass.
-- ---------------------------------------------------------------------------

create table if not exists public.knoux_build_runs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  task text not null,
  -- The exact argv the bridge ran, from its own allowlist. Stored so a failure
  -- can be explained later without re-running anything.
  command text not null,
  exit_code integer,
  duration_ms integer,
  -- The commit the workspace was on when the run started, when it was a
  -- repository. Null outside a repository, which is not a failure.
  head_sha text,
  bridge_id text,
  ran_at timestamptz not null default now(),
  -- Bounded excerpt, not a full log. Null when the run produced nothing.
  output text,
  constraint knoux_build_runs_duration check (duration_ms is null or duration_ms >= 0)
);

create index if not exists knoux_build_runs_owner_recent_idx
  on public.knoux_build_runs(owner_id, ran_at desc);

alter table public.knoux_build_runs enable row level security;

drop policy if exists knoux_build_runs_owner_all on public.knoux_build_runs;
create policy knoux_build_runs_owner_all on public.knoux_build_runs
  for all
  to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

comment on table public.knoux_build_bridges is
  'Paired KNOuX Bridge instances. Contains no key material: fingerprints only.';
comment on table public.knoux_build_approvals is
  'Approvals for privileged actions, bound to one action hash and self-expiring.';
comment on table public.knoux_build_audit is
  'Mirror of bridge-side audit entries. The bridge keeps the authoritative local log.';
comment on table public.knoux_build_runs is
  'Allowlisted verification runs, with the real exit code and a bounded output excerpt.';