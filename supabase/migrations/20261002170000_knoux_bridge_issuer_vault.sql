-- KNOuX Store bridge issuer key material.
-- The Ed25519 private key is generated inside the Edge Function and stored only
-- in Supabase Vault. Public metadata is kept separately for trust bootstrap.

create table if not exists public.knoux_bridge_issuer (
  singleton boolean primary key default true,
  public_key text not null,
  fingerprint text not null unique,
  vault_secret_id uuid not null unique,
  created_at timestamptz not null default now(),
  rotated_at timestamptz,
  constraint knoux_bridge_issuer_singleton check (singleton = true),
  constraint knoux_bridge_issuer_fingerprint check (fingerprint ~ '^[0-9a-f]{64}$')
);

alter table public.knoux_bridge_issuer enable row level security;

create or replace function public.knoux_bridge_store_issuer(
  p_private_key text,
  p_public_key text,
  p_fingerprint text
)
returns table(public_key text, fingerprint text)
language plpgsql
security definer
set search_path = public, vault
as $$
declare
  v_secret_id uuid;
begin
  perform pg_advisory_xact_lock(hashtext('knoux_bridge_issuer_singleton'));

  if exists (select 1 from public.knoux_bridge_issuer where singleton = true) then
    return query
      select i.public_key, i.fingerprint
      from public.knoux_bridge_issuer i
      where i.singleton = true;
    return;
  end if;

  v_secret_id := vault.create_secret(
    p_private_key,
    'knoux_bridge_issuer_ed25519',
    'KNOuX Store outbound bridge ticket issuer private key'
  );

  insert into public.knoux_bridge_issuer (
    singleton,
    public_key,
    fingerprint,
    vault_secret_id
  ) values (
    true,
    p_public_key,
    p_fingerprint,
    v_secret_id
  );

  return query select p_public_key, p_fingerprint;
end;
$$;

revoke all on function public.knoux_bridge_store_issuer(text,text,text)
  from public, anon, authenticated;
grant execute on function public.knoux_bridge_store_issuer(text,text,text)
  to service_role;

create or replace function public.knoux_bridge_get_issuer()
returns table(
  public_key text,
  fingerprint text,
  private_key text
)
language sql
security definer
set search_path = public, vault
as $$
  select
    i.public_key,
    i.fingerprint,
    s.decrypted_secret as private_key
  from public.knoux_bridge_issuer i
  join vault.decrypted_secrets s
    on s.id = i.vault_secret_id
  where i.singleton = true
  limit 1;
$$;

revoke all on function public.knoux_bridge_get_issuer()
  from public, anon, authenticated;
grant execute on function public.knoux_bridge_get_issuer()
  to service_role;
