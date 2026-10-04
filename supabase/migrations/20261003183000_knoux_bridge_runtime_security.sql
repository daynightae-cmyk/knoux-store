-- KNOuX Store bridge runtime secret and gateway-token hardening.
-- The Ed25519 private signer lives in Supabase Vault.
-- Cloud Run receives only a dedicated random gateway token; the database stores its SHA-256 hash.

create table if not exists public.knoux_bridge_gateway_tokens (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique,
  label text not null default 'knoux-store-mcp-gateway',
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at timestamptz,
  constraint knoux_bridge_gateway_tokens_hash check (token_hash ~ '^[0-9a-f]{64}$')
);

alter table public.knoux_bridge_gateway_tokens enable row level security;

create or replace function public.knoux_bridge_runtime_secret(p_name text)
returns text
language plpgsql
security definer
set search_path = public, vault
as $$
declare
  v_secret text;
begin
  if p_name <> 'knoux_bridge_signing_key' then
    raise exception 'runtime secret is not allowlisted';
  end if;

  select ds.decrypted_secret
    into v_secret
    from vault.decrypted_secrets ds
   where ds.name = p_name
   order by ds.created_at desc
   limit 1;

  if v_secret is null then
    raise exception 'runtime secret is not configured';
  end if;

  return v_secret;
end;
$$;

revoke all on function public.knoux_bridge_runtime_secret(text)
  from public, anon, authenticated;
grant execute on function public.knoux_bridge_runtime_secret(text)
  to service_role;

comment on table public.knoux_bridge_gateway_tokens is
  'SHA-256 hashes of dedicated Cloud Run gateway bearer tokens. No plaintext token is stored.';
comment on function public.knoux_bridge_runtime_secret(text) is
  'Service-role-only allowlisted accessor for the KNOuX bridge Ed25519 signer stored in Vault.';
