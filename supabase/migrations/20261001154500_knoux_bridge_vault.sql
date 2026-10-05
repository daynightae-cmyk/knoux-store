-- KNOuX Store bridge issuer metadata + Vault access boundary.

create table if not exists public.knoux_bridge_issuer_meta (
  name text primary key,
  public_key text not null,
  fingerprint text not null unique,
  created_at timestamptz not null default now(),
  constraint knoux_bridge_issuer_fingerprint check (fingerprint ~ '^[0-9a-f]{64}$')
);

alter table public.knoux_bridge_issuer_meta enable row level security;

create or replace function public.knoux_bridge_get_secret(p_name text)
returns text
language sql
security definer
set search_path = public, vault
as $$
  select ds.decrypted_secret
  from vault.decrypted_secrets ds
  where ds.name = p_name
  limit 1
$$;

revoke all on function public.knoux_bridge_get_secret(text)
  from public, anon, authenticated;
grant execute on function public.knoux_bridge_get_secret(text)
  to service_role;

comment on table public.knoux_bridge_issuer_meta is
  'Public half of the KNOuX Store bridge ticket issuer. Private material lives only in Supabase Vault.';
