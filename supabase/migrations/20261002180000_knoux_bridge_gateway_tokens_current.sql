-- KNOuX Store MCP Gateway token registry.
-- Stores SHA-256 token hashes only. Raw bearer tokens are provisioned out-of-band
-- and must never be committed to source control or persisted in plaintext here.

create table if not exists public.knoux_bridge_gateway_tokens (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  bridge_id text not null,
  token_hash text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  last_used_at timestamptz
);

create unique index if not exists knoux_bridge_gateway_tokens_token_hash_key
  on public.knoux_bridge_gateway_tokens(token_hash);

create index if not exists knoux_bridge_gateway_tokens_bridge_idx
  on public.knoux_bridge_gateway_tokens(bridge_id, active, created_at desc);

alter table public.knoux_bridge_gateway_tokens enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.knoux_bridge_gateway_tokens'::regclass
      and conname = 'knoux_bridge_gateway_tokens_hash_check'
  ) then
    alter table public.knoux_bridge_gateway_tokens
      add constraint knoux_bridge_gateway_tokens_hash_check
      check (token_hash ~ '^[0-9a-f]{64}$');
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.knoux_bridge_gateway_tokens'::regclass
      and conname = 'knoux_bridge_gateway_tokens_bridge_check'
  ) then
    alter table public.knoux_bridge_gateway_tokens
      add constraint knoux_bridge_gateway_tokens_bridge_check
      check (bridge_id ~ '^[0-9a-f]{16,64}$');
  end if;
end
$$;

comment on table public.knoux_bridge_gateway_tokens is
  'Hashed bearer-token registry for the private KNOuX Store MCP Gateway. RLS has no client policies by design.';
