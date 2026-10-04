-- KNOuX Store Local Bridge Control Plane.
-- Outbound-only machine registration, heartbeat, durable job queue and audit.
-- First enrollment binds a signed Ed25519 bridge identity to a one-time owner token.
-- Session bearer tokens are stored only as SHA-256 hashes.

create table if not exists public.knoux_bridge_enrollments (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  token_hash text not null unique,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  used_at timestamptz,
  constraint knoux_bridge_enrollments_token_hash check (token_hash ~ '^[0-9a-f]{64}$'),
  constraint knoux_bridge_enrollments_expiry check (expires_at > created_at)
);
create index if not exists knoux_bridge_enrollments_owner_idx
  on public.knoux_bridge_enrollments(owner_id, created_at desc);
alter table public.knoux_bridge_enrollments enable row level security;
drop policy if exists knoux_bridge_enrollments_owner_select on public.knoux_bridge_enrollments;
create policy knoux_bridge_enrollments_owner_select on public.knoux_bridge_enrollments
  for select to authenticated using (owner_id = auth.uid());

create table if not exists public.knoux_bridge_machines (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  bridge_id text not null unique,
  fingerprint text not null unique,
  public_key text not null,
  hostname text not null,
  platform text not null,
  arch text not null,
  bridge_version text not null,
  capabilities jsonb not null default '{}'::jsonb,
  status text not null default 'online',
  registered_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint knoux_bridge_machines_status check (status in ('online','offline','revoked')),
  constraint knoux_bridge_machines_bridge_id check (bridge_id ~ '^[0-9a-f]{16,64}$'),
  constraint knoux_bridge_machines_fingerprint check (fingerprint ~ '^[0-9a-f]{64}$')
);

create index if not exists knoux_bridge_machines_owner_idx
  on public.knoux_bridge_machines(owner_id, last_seen_at desc);

alter table public.knoux_bridge_machines enable row level security;
drop policy if exists knoux_bridge_machines_owner_all on public.knoux_bridge_machines;
drop policy if exists knoux_bridge_machines_owner_select on public.knoux_bridge_machines;
create policy knoux_bridge_machines_owner_select on public.knoux_bridge_machines
  for select to authenticated using (owner_id = auth.uid());

create or replace function public.knoux_bridge_enroll_machine(
  p_token_hash text,
  p_bridge_id text,
  p_fingerprint text,
  p_public_key text,
  p_hostname text,
  p_platform text,
  p_arch text,
  p_bridge_version text,
  p_capabilities jsonb
)
returns table(id uuid, owner_id uuid, bridge_id text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_enrollment_id uuid;
  v_owner_id uuid;
  v_machine_id uuid;
begin
  select e.id, e.owner_id
    into v_enrollment_id, v_owner_id
    from public.knoux_bridge_enrollments e
   where e.token_hash = p_token_hash
     and e.used_at is null
     and e.expires_at > now()
   for update
   limit 1;

  if v_enrollment_id is null then
    return;
  end if;

  insert into public.knoux_bridge_machines (
    owner_id,
    bridge_id,
    fingerprint,
    public_key,
    hostname,
    platform,
    arch,
    bridge_version,
    capabilities,
    status,
    registered_at,
    last_seen_at,
    updated_at
  ) values (
    v_owner_id,
    p_bridge_id,
    p_fingerprint,
    p_public_key,
    p_hostname,
    p_platform,
    p_arch,
    p_bridge_version,
    coalesce(p_capabilities, '{}'::jsonb),
    'online',
    now(),
    now(),
    now()
  )
  returning knoux_bridge_machines.id into v_machine_id;

  update public.knoux_bridge_enrollments
     set used_at = now()
   where knoux_bridge_enrollments.id = v_enrollment_id;

  return query
    select v_machine_id, v_owner_id, p_bridge_id;
end;
$$;

revoke all on function public.knoux_bridge_enroll_machine(
  text,text,text,text,text,text,text,text,jsonb
) from public, anon, authenticated;
grant execute on function public.knoux_bridge_enroll_machine(
  text,text,text,text,text,text,text,text,jsonb
) to service_role;

create table if not exists public.knoux_bridge_registration_nonces (
  nonce text primary key,
  machine_id uuid not null references public.knoux_bridge_machines(id) on delete cascade,
  used_at timestamptz not null default now(),
  expires_at timestamptz not null
);
create index if not exists knoux_bridge_registration_nonces_expiry_idx
  on public.knoux_bridge_registration_nonces(expires_at);
alter table public.knoux_bridge_registration_nonces enable row level security;

create table if not exists public.knoux_bridge_sessions (
  id uuid primary key default gen_random_uuid(),
  machine_id uuid not null references public.knoux_bridge_machines(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  token_hash text not null unique,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  last_seen_at timestamptz not null default now(),
  revoked_at timestamptz,
  constraint knoux_bridge_sessions_token_hash check (token_hash ~ '^[0-9a-f]{64}$'),
  constraint knoux_bridge_sessions_expiry check (expires_at > created_at)
);
create index if not exists knoux_bridge_sessions_machine_idx
  on public.knoux_bridge_sessions(machine_id, created_at desc);
alter table public.knoux_bridge_sessions enable row level security;
drop policy if exists knoux_bridge_sessions_owner_select on public.knoux_bridge_sessions;
create policy knoux_bridge_sessions_owner_select on public.knoux_bridge_sessions
  for select to authenticated using (owner_id = auth.uid());

create table if not exists public.knoux_bridge_jobs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  machine_id uuid not null references public.knoux_bridge_machines(id) on delete cascade,
  tool text not null,
  args jsonb not null default '{}'::jsonb,
  required_scopes text[] not null default '{}',
  mutating boolean not null default false,
  approval_id uuid,
  idempotency_key text,
  status text not null default 'queued',
  claimed_session_id uuid references public.knoux_bridge_sessions(id) on delete set null,
  created_at timestamptz not null default now(),
  claimed_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  expires_at timestamptz not null default (now() + interval '5 minutes'),
  result jsonb,
  error text,
  duration_ms integer,
  constraint knoux_bridge_jobs_status check (
    status in ('queued','claimed','running','succeeded','failed','cancelled','expired')
  ),
  constraint knoux_bridge_jobs_duration check (duration_ms is null or duration_ms >= 0),
  constraint knoux_bridge_jobs_expiry check (expires_at > created_at)
);
create index if not exists knoux_bridge_jobs_machine_queue_idx
  on public.knoux_bridge_jobs(machine_id, created_at) where status = 'queued';
create index if not exists knoux_bridge_jobs_owner_recent_idx
  on public.knoux_bridge_jobs(owner_id, created_at desc);
create unique index if not exists knoux_bridge_jobs_idempotency_key
  on public.knoux_bridge_jobs(owner_id, idempotency_key)
  where idempotency_key is not null;
alter table public.knoux_bridge_jobs enable row level security;
drop policy if exists knoux_bridge_jobs_owner_all on public.knoux_bridge_jobs;
drop policy if exists knoux_bridge_jobs_owner_select on public.knoux_bridge_jobs;
create policy knoux_bridge_jobs_owner_select on public.knoux_bridge_jobs
  for select to authenticated using (owner_id = auth.uid());

create table if not exists public.knoux_bridge_events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  machine_id uuid references public.knoux_bridge_machines(id) on delete cascade,
  session_id uuid references public.knoux_bridge_sessions(id) on delete set null,
  job_id uuid references public.knoux_bridge_jobs(id) on delete set null,
  event text not null,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists knoux_bridge_events_owner_recent_idx
  on public.knoux_bridge_events(owner_id, created_at desc);
alter table public.knoux_bridge_events enable row level security;
drop policy if exists knoux_bridge_events_owner_select on public.knoux_bridge_events;
create policy knoux_bridge_events_owner_select on public.knoux_bridge_events
  for select to authenticated using (owner_id = auth.uid());

create or replace function public.knoux_bridge_claim_job(
  p_machine_id uuid,
  p_session_id uuid
)
returns setof public.knoux_bridge_jobs
language plpgsql
security definer
set search_path = public
as $$
declare
  v_job_id uuid;
begin
  if not exists (
    select 1
    from public.knoux_bridge_sessions s
    where s.id = p_session_id
      and s.machine_id = p_machine_id
      and s.revoked_at is null
      and s.expires_at > now()
  ) then
    return;
  end if;

  update public.knoux_bridge_jobs
     set status = 'expired', completed_at = now()
   where machine_id = p_machine_id
     and status = 'queued'
     and expires_at <= now();

  select j.id into v_job_id
    from public.knoux_bridge_jobs j
   where j.machine_id = p_machine_id
     and j.status = 'queued'
     and j.expires_at > now()
   order by j.created_at
   for update skip locked
   limit 1;

  if v_job_id is null then return; end if;

  return query
    update public.knoux_bridge_jobs
       set status = 'claimed',
           claimed_session_id = p_session_id,
           claimed_at = now()
     where id = v_job_id
     returning *;
end;
$$;

revoke all on function public.knoux_bridge_claim_job(uuid, uuid) from public, anon, authenticated;
grant execute on function public.knoux_bridge_claim_job(uuid, uuid) to service_role;

comment on table public.knoux_bridge_machines is
  'KNOuX Store bridge identities enrolled outbound and measured by heartbeat.';
comment on table public.knoux_bridge_sessions is
  'Short-lived machine sessions. Only SHA-256 token hashes are persisted.';
comment on table public.knoux_bridge_jobs is
  'Durable KNOuX Store cloud-to-local jobs claimed outbound by local bridges.';
