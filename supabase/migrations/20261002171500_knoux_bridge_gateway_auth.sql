-- Private authentication bridge between the KNOuX Store MCP Gateway and
-- the Supabase Edge control plane. The plaintext key lives only in Vault.

create table if not exists public.knoux_bridge_gateway_auth (
  singleton boolean primary key default true,
  key_hash text not null unique,
  vault_secret_id uuid not null unique,
  created_at timestamptz not null default now(),
  rotated_at timestamptz,
  constraint knoux_bridge_gateway_auth_singleton check (singleton = true),
  constraint knoux_bridge_gateway_auth_hash check (key_hash ~ '^[0-9a-f]{64}$')
);

alter table public.knoux_bridge_gateway_auth enable row level security;

create or replace function public.knoux_bridge_store_gateway_key(
  p_secret text,
  p_hash text
)
returns boolean
language plpgsql
security definer
set search_path = public, vault
as $$
declare
  v_secret_id uuid;
begin
  perform pg_advisory_xact_lock(hashtext('knoux_bridge_gateway_auth_singleton'));

  if exists (
    select 1
    from public.knoux_bridge_gateway_auth
    where singleton = true
  ) then
    return false;
  end if;

  v_secret_id := vault.create_secret(
    p_secret,
    'knoux_bridge_gateway_key',
    'KNOuX Store MCP Gateway to Edge control-plane shared secret'
  );

  insert into public.knoux_bridge_gateway_auth (
    singleton,
    key_hash,
    vault_secret_id
  ) values (
    true,
    p_hash,
    v_secret_id
  );

  return true;
end;
$$;

revoke all on function public.knoux_bridge_store_gateway_key(text,text)
  from public, anon, authenticated;
grant execute on function public.knoux_bridge_store_gateway_key(text,text)
  to service_role;

create or replace function public.knoux_bridge_get_gateway_key()
returns table(secret text, key_hash text)
language sql
security definer
set search_path = public, vault
as $$
  select s.decrypted_secret, g.key_hash
  from public.knoux_bridge_gateway_auth g
  join vault.decrypted_secrets s
    on s.id = g.vault_secret_id
  where g.singleton = true
  limit 1;
$$;

revoke all on function public.knoux_bridge_get_gateway_key()
  from public, anon, authenticated;
grant execute on function public.knoux_bridge_get_gateway_key()
  to service_role;
