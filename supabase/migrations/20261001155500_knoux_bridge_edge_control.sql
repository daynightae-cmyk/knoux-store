-- KNOuX Store Edge control-plane support.

create table if not exists public.knoux_bridge_gateway_principals (
  email text primary key,
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.knoux_bridge_gateway_principals enable row level security;

create or replace function public.knoux_bridge_provision_issuer(
  p_private_key text,
  p_public_key text,
  p_fingerprint text
)
returns table(public_key text, fingerprint text, created boolean)
language plpgsql
security definer
set search_path = public, vault
as $$
declare
  v_secret_id uuid;
  v_public_key text;
  v_fingerprint text;
begin
  if p_fingerprint !~ '^[0-9a-f]{64}$' then
    raise exception 'invalid issuer fingerprint';
  end if;

  perform pg_advisory_xact_lock(hashtext('knoux_bridge_issuer_default'));

  select m.public_key, m.fingerprint
    into v_public_key, v_fingerprint
    from public.knoux_bridge_issuer_meta m
   where m.name = 'default'
   limit 1;

  if v_public_key is not null then
    return query select v_public_key, v_fingerprint, false;
    return;
  end if;

  select s.id into v_secret_id
    from vault.secrets s
   where s.name = 'knoux_bridge_issuer_private_key'
   limit 1;

  if v_secret_id is null then
    perform vault.create_secret(
      p_private_key,
      'knoux_bridge_issuer_private_key',
      'KNOuX Store bridge Ed25519 ticket issuer private key'
    );
  else
    perform vault.update_secret(
      v_secret_id,
      p_private_key,
      'knoux_bridge_issuer_private_key',
      'KNOuX Store bridge Ed25519 ticket issuer private key'
    );
  end if;

  insert into public.knoux_bridge_issuer_meta(name, public_key, fingerprint)
  values ('default', p_public_key, p_fingerprint);

  return query select p_public_key, p_fingerprint, true;
end;
$$;

revoke all on function public.knoux_bridge_provision_issuer(text,text,text)
  from public, anon, authenticated;
grant execute on function public.knoux_bridge_provision_issuer(text,text,text)
  to service_role;

comment on table public.knoux_bridge_gateway_principals is
  'Google service-account identities allowed to broker MCP read-only jobs through the KNOuX bridge control plane.';
