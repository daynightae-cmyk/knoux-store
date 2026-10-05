-- Bind Cloud Run gateway credentials to one bridge and keep the Ed25519 seed in Supabase Vault.

alter table public.knoux_bridge_gateway_tokens
  add column if not exists bridge_id text;

do $$
begin
  if not exists (
    select 1 from vault.secrets where name = 'knoux_bridge_signing_seed'
  ) then
    perform vault.create_secret(
      replace(encode(extensions.gen_random_bytes(32), 'base64'), E'\n', ''),
      'knoux_bridge_signing_seed',
      'KNOuX Store Ed25519 control-plane signing seed',
      null
    );
  end if;
end;
$$;

create or replace function public.knoux_bridge_runtime_secret(p_name text)
returns text
language plpgsql
security definer
set search_path = public, vault
as $$
declare
  v_secret text;
begin
  if p_name <> 'knoux_bridge_signing_seed' then
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
