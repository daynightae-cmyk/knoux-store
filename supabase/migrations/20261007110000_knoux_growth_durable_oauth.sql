-- Server-only durable OAuth state and scoped access to the existing Supabase Vault.
-- No public table holds plaintext credentials. Browser roles cannot call these RPCs.
begin;
alter table public.knoux_growth_audit_log drop constraint if exists knoux_growth_audit_log_action;
alter table public.knoux_growth_audit_log add constraint knoux_growth_audit_log_action check (action in (
  'LOGIN_TO_GROWTH', 'CONNECTION_STARTED', 'CONNECTION_COMPLETED', 'CONNECTION_FAILED', 'CONNECTION_REMOVED',
  'CAMPAIGN_CREATED', 'CAMPAIGN_CHANGED', 'CAMPAIGN_SUBMITTED', 'CAMPAIGN_APPROVED', 'APPROVAL_INVALIDATED',
  'LAUNCH_REQUESTED', 'CONTENT_APPROVED', 'COMMUNITY_IMPORTED', 'COMMUNITY_MARKED_POSTED',
  'AI_RECOMMENDATION_ACCEPTED', 'LEAD_STATUS_CHANGED', 'RULE_CHANGED'
));
alter table public.knoux_growth_oauth_states add column if not exists binding_hash text;
alter table public.knoux_growth_connections add column if not exists refresh_secret_ref text;
create schema if not exists knoux_growth_private;
revoke all on schema knoux_growth_private from public, anon, authenticated;
create table if not exists knoux_growth_private.secret_owners (
  id uuid primary key,
  client_id text not null references public.knoux_growth_clients(id),
  user_id uuid not null references auth.users(id),
  kind text not null,
  created_at timestamptz not null default now()
);
alter table knoux_growth_private.secret_owners enable row level security;
revoke all on table knoux_growth_private.secret_owners from public, anon, authenticated;

create or replace function public.knoux_growth_require_owner(p_client text, p_user uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.knoux_growth_memberships where client_id = p_client and user_id = p_user and role = 'OWNER') then
    raise exception 'Growth owner authorization required' using errcode = '42501';
  end if;
end $$;

create or replace function public.knoux_growth_oauth_begin(p_hash text, p_binding text, p_client text, p_user uuid, p_provider text, p_scopes text[])
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform public.knoux_growth_require_owner(p_client, p_user);
  if p_hash is null or p_binding is null or p_provider is null or p_hash !~ '^[0-9a-f]{64}$' or p_binding !~ '^[0-9a-f]{64}$' or p_provider not in ('meta', 'google') then
    raise exception 'Invalid OAuth state';
  end if;
  insert into public.knoux_growth_oauth_states(state_hash, binding_hash, client_id, user_id, platform, requested_scopes, return_path, expires_at)
    values (p_hash, p_binding, p_client, p_user, p_provider, p_scopes, '/command/connections', now() + interval '10 minutes');
  insert into public.knoux_growth_audit_log(client_id, actor_id, actor_label, action, subject_type, subject_id, detail)
    values (p_client, p_user, 'Authenticated workspace owner', 'CONNECTION_STARTED', 'oauth-state', p_hash, 'Owner started a scoped OAuth handshake.');
end $$;

create or replace function public.knoux_growth_oauth_consume(p_hash text, p_binding text, p_user uuid, p_provider text)
returns table(client_id text, requested_scopes text[], return_path text)
language sql security definer set search_path = '' as $$
  update public.knoux_growth_oauth_states s set consumed_at = now()
  where s.state_hash = p_hash and s.binding_hash = p_binding and s.user_id = p_user
    and s.platform = p_provider and s.consumed_at is null and s.expires_at > now()
    and exists (select 1 from public.knoux_growth_memberships m where m.client_id = s.client_id and m.user_id = p_user and m.role = 'OWNER')
  returning s.client_id, s.requested_scopes, s.return_path;
$$;

create or replace function public.knoux_growth_secret_put(p_value text, p_kind text, p_client text, p_user uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare secret_id uuid;
begin
  perform public.knoux_growth_require_owner(p_client, p_user);
  if p_value is null or length(p_value) = 0 or p_kind not in ('meta-access-token', 'google-access-token', 'google-refresh-token') then raise exception 'Invalid secret input'; end if;
  secret_id := vault.create_secret(p_value);
  insert into knoux_growth_private.secret_owners(id, client_id, user_id, kind) values (secret_id, p_client, p_user, p_kind);
  return secret_id;
end $$;

create or replace function public.knoux_growth_secret_get(p_id uuid, p_client text, p_user uuid)
returns text language plpgsql security definer set search_path = '' as $$
declare result text;
begin
  perform public.knoux_growth_require_owner(p_client, p_user);
  select v.decrypted_secret into result from vault.decrypted_secrets v join knoux_growth_private.secret_owners o on o.id = v.id
    where o.id = p_id and o.client_id = p_client and o.user_id = p_user;
  return result;
end $$;

create or replace function public.knoux_growth_secret_delete(p_id uuid, p_client text, p_user uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  perform public.knoux_growth_require_owner(p_client, p_user);
  if not exists (select 1 from knoux_growth_private.secret_owners where id = p_id and client_id = p_client and user_id = p_user) then return false; end if;
  delete from vault.secrets where id = p_id;
  delete from knoux_growth_private.secret_owners where id = p_id;
  return true;
end $$;

create or replace function public.knoux_growth_oauth_finish(p_hash text, p_user uuid, p_platform text, p_ref text, p_refresh_ref text, p_scopes text[], p_expires timestamptz, p_verified boolean, p_missing text[])
returns void language plpgsql security definer set search_path = '' as $$
declare state_row public.knoux_growth_oauth_states%rowtype; connection_id uuid;
  previous public.knoux_growth_connections%rowtype; obsolete_id uuid;
begin
  select * into state_row from public.knoux_growth_oauth_states where state_hash = p_hash and user_id = p_user and consumed_at is not null and expires_at > now() for update;
  if not found then raise exception 'Consumed OAuth state required'; end if;
  perform public.knoux_growth_require_owner(state_row.client_id, p_user);
  -- Different valid handshakes for one platform must not race to replace
  -- credentials and strand the losing handshake's Vault references.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(state_row.client_id || ':' || p_platform, 0));
  if (state_row.platform = 'meta' and p_platform not in ('facebook', 'instagram', 'meta_ads', 'whatsapp')) or
     (state_row.platform = 'google' and p_platform not in ('google_ads', 'google_business', 'ga4', 'search_console', 'youtube')) then raise exception 'Provider platform mismatch'; end if;
  if not exists (select 1 from knoux_growth_private.secret_owners where id::text = replace(p_ref, 'vault://growth/', '') and client_id = state_row.client_id and user_id = p_user and kind = state_row.platform || '-access-token') then raise exception 'Scoped vault reference required'; end if;
  if p_refresh_ref is not null and not exists (select 1 from knoux_growth_private.secret_owners where id::text = replace(p_refresh_ref, 'vault://growth/', '') and client_id = state_row.client_id and user_id = p_user and kind = 'google-refresh-token') then raise exception 'Scoped refresh reference required'; end if;
  select * into previous from public.knoux_growth_connections where client_id = state_row.client_id and platform = p_platform for update;
  -- Google may omit a refresh token on reauthorization. Preserve only a
  -- previously stored reference belonging to this same tenant and user.
  if p_refresh_ref is null and exists (select 1 from knoux_growth_private.secret_owners where id::text = replace(previous.refresh_secret_ref, 'vault://growth/', '') and client_id = state_row.client_id and user_id = p_user and kind = 'google-refresh-token') then
    p_refresh_ref := previous.refresh_secret_ref;
  end if;
  insert into public.knoux_growth_connections(client_id, platform, secret_ref, refresh_secret_ref, state, capability_state, granted_scopes, missing_scopes, token_expires_at, last_verified_at, last_checked_at, origin)
    values (state_row.client_id, p_platform, p_ref, p_refresh_ref, case when p_verified then 'CONNECTED' when cardinality(p_missing) > 0 then 'PERMISSION_REQUIRED' else 'CONNECTING' end,
      case when p_verified then 'LIVE_VERIFIED' else 'ADAPTER_READY' end, p_scopes, p_missing, p_expires, case when p_verified then now() end, now(), 'LIVE')
    on conflict (client_id, platform) do update set secret_ref = excluded.secret_ref, refresh_secret_ref = excluded.refresh_secret_ref, state = excluded.state, capability_state = excluded.capability_state,
      granted_scopes = excluded.granted_scopes, missing_scopes = excluded.missing_scopes, token_expires_at = excluded.token_expires_at, last_verified_at = excluded.last_verified_at, last_checked_at = excluded.last_checked_at, origin = 'LIVE', updated_at = now()
    returning id into connection_id;
  for obsolete_id in select id from knoux_growth_private.secret_owners where client_id = state_row.client_id
    and ('vault://growth/' || id::text) in (previous.secret_ref, previous.refresh_secret_ref)
    and ('vault://growth/' || id::text) <> p_ref
    and ('vault://growth/' || id::text) is distinct from p_refresh_ref
  loop
    delete from vault.secrets where id = obsolete_id;
    delete from knoux_growth_private.secret_owners where id = obsolete_id;
  end loop;
  insert into public.knoux_growth_audit_log(client_id, actor_id, actor_label, action, subject_type, subject_id, detail)
    values (state_row.client_id, p_user, 'Authenticated workspace owner', 'CONNECTION_COMPLETED', 'connection', connection_id::text, 'OAuth credential stored; verification state recorded.');
  -- Completion is separately single-use: a retried finalize cannot replace a connection.
  update public.knoux_growth_oauth_states set expires_at = now() where state_hash = p_hash;
end $$;

create or replace function public.knoux_growth_connection_remove(p_client text, p_user uuid, p_platform text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare connection_row public.knoux_growth_connections%rowtype; secret_id uuid;
begin
  perform public.knoux_growth_require_owner(p_client, p_user);
  select * into connection_row from public.knoux_growth_connections where client_id = p_client and platform = p_platform for update;
  if not found then return false; end if;
  for secret_id in select id from knoux_growth_private.secret_owners where client_id = p_client
    and ('vault://growth/' || id::text) in (connection_row.secret_ref, connection_row.refresh_secret_ref)
  loop
    delete from vault.secrets where id = secret_id;
    delete from knoux_growth_private.secret_owners where id = secret_id;
  end loop;
  delete from public.knoux_growth_connections where id = connection_row.id;
  insert into public.knoux_growth_audit_log(client_id, actor_id, actor_label, action, subject_type, subject_id, detail)
    values (p_client, p_user, 'Authenticated workspace owner', 'CONNECTION_REMOVED', 'connection', connection_row.id::text, 'Stored credential references and connection removed.');
  return true;
end $$;

revoke all on function public.knoux_growth_require_owner(text, uuid) from public, anon, authenticated;
revoke all on function public.knoux_growth_oauth_begin(text, text, text, uuid, text, text[]) from public, anon, authenticated;
revoke all on function public.knoux_growth_oauth_consume(text, text, uuid, text) from public, anon, authenticated;
revoke all on function public.knoux_growth_secret_put(text, text, text, uuid) from public, anon, authenticated;
revoke all on function public.knoux_growth_secret_get(uuid, text, uuid) from public, anon, authenticated;
revoke all on function public.knoux_growth_secret_delete(uuid, text, uuid) from public, anon, authenticated;
revoke all on function public.knoux_growth_oauth_finish(text, uuid, text, text, text, text[], timestamptz, boolean, text[]) from public, anon, authenticated;
revoke all on function public.knoux_growth_connection_remove(text, uuid, text) from public, anon, authenticated;
grant execute on function public.knoux_growth_oauth_begin(text, text, text, uuid, text, text[]), public.knoux_growth_oauth_consume(text, text, uuid, text),
  public.knoux_growth_secret_put(text, text, text, uuid), public.knoux_growth_secret_get(uuid, text, uuid), public.knoux_growth_secret_delete(uuid, text, uuid),
  public.knoux_growth_oauth_finish(text, uuid, text, text, text, text[], timestamptz, boolean, text[]),
  public.knoux_growth_connection_remove(text, uuid, text) to service_role;
commit;
