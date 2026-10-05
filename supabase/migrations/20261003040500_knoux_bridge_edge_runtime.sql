-- KNOuX Store Local Bridge Edge-runtime configuration.
-- No private key is embedded here. The Edge Function generates Ed25519
-- material on first use and stores the private key in Supabase Vault.

create table if not exists public.knoux_bridge_control_config (
  singleton boolean primary key default true check (singleton),
  issuer_public_key text,
  issuer_fingerprint text,
  allowed_bridge_id text,
  allowed_gateway_sa_email text,
  allowed_gateway_audience text,
  updated_at timestamptz not null default now(),
  constraint knoux_bridge_control_config_fingerprint check (
    issuer_fingerprint is null or issuer_fingerprint ~ '^[0-9a-f]{64}$'
  ),
  constraint knoux_bridge_control_config_bridge_id check (
    allowed_bridge_id is null or allowed_bridge_id ~ '^[0-9a-f]{16,64}$'
  )
);

alter table public.knoux_bridge_control_config enable row level security;

insert into public.knoux_bridge_control_config(singleton)
values (true)
on conflict (singleton) do nothing;

create or replace function public.knoux_bridge_store_signing_key(
  p_private_key text,
  p_public_key text,
  p_fingerprint text
)
returns boolean
language plpgsql
security definer
set search_path = public, vault
as $$
declare
  v_secret_id uuid;
begin
  if p_fingerprint !~ '^[0-9a-f]{64}$' then
    raise exception 'invalid fingerprint';
  end if;

  select id into v_secret_id
  from vault.secrets
  where name = 'knoux_bridge_signing_private_key'
  order by created_at desc
  limit 1;

  if v_secret_id is null then
    perform vault.create_secret(
      p_private_key,
      'knoux_bridge_signing_private_key',
      'KNOuX Store Local Bridge Ed25519 ticket signing private key',
      null
    );
  else
    perform vault.update_secret(
      v_secret_id,
      p_private_key,
      'knoux_bridge_signing_private_key',
      'KNOuX Store Local Bridge Ed25519 ticket signing private key',
      null
    );
  end if;

  update public.knoux_bridge_control_config
  set issuer_public_key = p_public_key,
      issuer_fingerprint = p_fingerprint,
      updated_at = now()
  where singleton = true;

  return true;
end;
$$;

revoke all on function public.knoux_bridge_store_signing_key(text,text,text)
  from public, anon, authenticated;
grant execute on function public.knoux_bridge_store_signing_key(text,text,text)
  to service_role;

create or replace function public.knoux_bridge_get_signing_private_key()
returns text
language sql
security definer
set search_path = public, vault
as $$
  select decrypted_secret
  from vault.decrypted_secrets
  where name = 'knoux_bridge_signing_private_key'
  order by created_at desc
  limit 1
$$;

revoke all on function public.knoux_bridge_get_signing_private_key()
  from public, anon, authenticated;
grant execute on function public.knoux_bridge_get_signing_private_key()
  to service_role;

create or replace function public.knoux_bridge_lock_allowed_bridge(
  p_bridge_id text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current text;
begin
  if p_bridge_id !~ '^[0-9a-f]{16,64}$' then
    return false;
  end if;

  select allowed_bridge_id into v_current
  from public.knoux_bridge_control_config
  where singleton = true
  for update;

  if v_current is null then
    update public.knoux_bridge_control_config
    set allowed_bridge_id = p_bridge_id,
        updated_at = now()
    where singleton = true;
    return true;
  end if;

  return v_current = p_bridge_id;
end;
$$;

revoke all on function public.knoux_bridge_lock_allowed_bridge(text)
  from public, anon, authenticated;
grant execute on function public.knoux_bridge_lock_allowed_bridge(text)
  to service_role;
