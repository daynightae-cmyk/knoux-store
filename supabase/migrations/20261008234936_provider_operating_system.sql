-- Additive Provider OS persistence. Existing environment operators do not require this migration to boot.
-- Only the authenticated server (service_role) writes. Browser roles cannot mutate policy or read ciphertext.
begin;

create table public.knoux_provider_workspaces (
  id uuid primary key, owner_id uuid not null references auth.users(id),
  name text not null check (length(name) between 1 and 80), created_at timestamptz not null default now(),
  unique (id, owner_id)
);
create table public.knoux_provider_credentials (
  id uuid primary key, owner_id uuid not null, workspace_id uuid not null, provider_id text not null,
  name text not null check (length(name) between 1 and 80), encrypted_value jsonb,
  revision integer not null default 1 check (revision > 0), revoked_at timestamptz,
  configured boolean generated always as (encrypted_value is not null and revoked_at is null) stored,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), last_verified_at timestamptz,
  foreign key (workspace_id, owner_id) references public.knoux_provider_workspaces(id, owner_id),
  unique (id, owner_id, workspace_id, provider_id),
  check (encrypted_value is null or (encrypted_value->>'algorithm' = 'AES-256-GCM' and encrypted_value ?& array['iv','tag','ciphertext','keyId']))
);
create table public.knoux_provider_profiles (
  id uuid primary key, owner_id uuid not null, workspace_id uuid not null, provider_id text not null,
  credential_id uuid, active boolean not null default false, enabled boolean not null default true,
  version integer not null default 1 check (version > 0), body jsonb not null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  foreign key (workspace_id, owner_id) references public.knoux_provider_workspaces(id, owner_id),
  foreign key (credential_id, owner_id, workspace_id, provider_id) references public.knoux_provider_credentials(id, owner_id, workspace_id, provider_id) on delete restrict,
  check (jsonb_typeof(body) = 'object'),
  check ((body->>'id')::uuid = id and (body->>'ownerId')::uuid = owner_id and (body->>'workspaceId')::uuid = workspace_id and body->>'providerId' = provider_id),
  check ((body #>> '{auth,credentialId}') is not distinct from credential_id::text)
);
create unique index knoux_provider_one_active on public.knoux_provider_profiles(owner_id, workspace_id, provider_id) where active;
create index knoux_provider_profile_scope on public.knoux_provider_profiles(owner_id, workspace_id);
create index knoux_provider_credential_scope on public.knoux_provider_credentials(owner_id, workspace_id);
create table public.knoux_provider_audit (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null, workspace_id uuid not null,
  event text not null, profile_id uuid, credential_id uuid, created_at timestamptz not null default now(),
  foreign key (workspace_id, owner_id) references public.knoux_provider_workspaces(id, owner_id)
);
create index knoux_provider_audit_scope on public.knoux_provider_audit(owner_id, workspace_id, created_at desc);

alter table public.knoux_provider_workspaces enable row level security;
alter table public.knoux_provider_credentials enable row level security;
alter table public.knoux_provider_profiles enable row level security;
alter table public.knoux_provider_audit enable row level security;
revoke all on public.knoux_provider_workspaces, public.knoux_provider_credentials, public.knoux_provider_profiles, public.knoux_provider_audit from public, anon, authenticated;
grant all on public.knoux_provider_workspaces, public.knoux_provider_credentials, public.knoux_provider_profiles, public.knoux_provider_audit to service_role;
-- Safe metadata may be read by its owner. Credentials (including ciphertext) are never directly exposed.
grant select on public.knoux_provider_workspaces, public.knoux_provider_profiles, public.knoux_provider_audit to authenticated;
create policy provider_workspace_owner_read on public.knoux_provider_workspaces for select to authenticated using ((select auth.uid()) = owner_id);
create policy provider_profile_owner_read on public.knoux_provider_profiles for select to authenticated using ((select auth.uid()) = owner_id);
create policy provider_audit_owner_read on public.knoux_provider_audit for select to authenticated using ((select auth.uid()) = owner_id);

-- SECURITY INVOKER: service_role-only transaction boundary; no browser-callable privileged secret RPC.
create function public.knoux_provider_command(p_owner uuid, p_workspace uuid, p_action text, p_payload jsonb default '{}'::jsonb)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  v_profile public.knoux_provider_profiles;
  v_credential public.knoux_provider_credentials;
  v_id uuid;
  v_body jsonb;
  v_provider text;
  v_expected integer;
  v_profile_id uuid;
  v_credential_id uuid;
  v_event text;
begin
  if current_user not in ('service_role', 'postgres') or p_owner is null or p_workspace is null then
    raise exception using errcode = '42501', message = 'Provider command authorization refused';
  end if;
  if p_action = 'WORKSPACE_CREATE' then
    insert into public.knoux_provider_workspaces(id,owner_id,name) values(p_workspace,p_owner,p_payload->>'name');
    return jsonb_build_object('id',p_workspace);
  end if;
  if p_workspace = p_owner then
    insert into public.knoux_provider_workspaces(id,owner_id,name) values(p_owner,p_owner,'Personal workspace') on conflict do nothing;
  end if;
  if not exists(select 1 from public.knoux_provider_workspaces where id=p_workspace and owner_id=p_owner) then
    raise exception using errcode = '42501', message = 'Workspace ownership refused';
  end if;
  if p_action = 'ENSURE_WORKSPACE' then return jsonb_build_object('id',p_workspace); end if;
  v_id := (p_payload->>'id')::uuid;
  v_expected := (p_payload->>'version')::integer;

  if p_action = 'PROFILE_CREATE' then
    v_body := p_payload->'profile';
    v_provider := v_body->>'providerId';
    perform pg_advisory_xact_lock(hashtextextended(p_owner::text||p_workspace::text||v_provider,0));
    if (select count(*) from public.knoux_provider_profiles where owner_id=p_owner and workspace_id=p_workspace) >= 100 then
      raise exception using errcode='22023',message='Profile limit reached';
    end if;
    insert into public.knoux_provider_profiles(id,owner_id,workspace_id,provider_id,credential_id,body)
    values(v_id,p_owner,p_workspace,v_provider,nullif(v_body #>> '{auth,credentialId}','')::uuid,
      v_body || jsonb_build_object('id',v_id,'ownerId',p_owner,'workspaceId',p_workspace,'active',false,'version',1,'createdAt',now(),'updatedAt',now()));
    v_profile_id:=v_id; v_event:='PROFILE_CREATED';
  elsif p_action in ('PROFILE_UPDATE','PROFILE_SWITCH','PROFILE_DELETE','CONNECTION_UPDATED') then
    select * into v_profile from public.knoux_provider_profiles where id=v_id and owner_id=p_owner and workspace_id=p_workspace;
    if not found then raise exception using errcode='42501',message='Profile ownership refused'; end if;
    perform pg_advisory_xact_lock(hashtextextended(p_owner::text||p_workspace::text||v_profile.provider_id,0));
    select * into v_profile from public.knoux_provider_profiles where id=v_id and owner_id=p_owner and workspace_id=p_workspace for update;
    if not found then raise exception using errcode='42501',message='Profile ownership refused'; end if;
    if v_profile.version is distinct from v_expected then raise exception using errcode='40001',message='Profile changed; refresh before retry'; end if;
    v_profile_id:=v_id;
    if p_action='PROFILE_DELETE' then
      delete from public.knoux_provider_profiles where id=v_id;
      v_event:='PROFILE_DELETED'; -- Credential retained; dependency-aware deletion is a separate command.
    elsif p_action='PROFILE_SWITCH' then
      update public.knoux_provider_profiles set active=false,version=version+1,updated_at=now(),body=body||jsonb_build_object('active',false,'version',version+1,'updatedAt',now())
      where owner_id=p_owner and workspace_id=p_workspace and provider_id=v_profile.provider_id and active and id<>v_id;
      update public.knoux_provider_profiles set active=true,version=version+1,updated_at=now(),body=body||jsonb_build_object('active',true,'version',version+1,'updatedAt',now()) where id=v_id;
      v_event:='PROFILE_SWITCHED';
    else
      v_body:=p_payload->'profile';
      if v_body->>'providerId' is distinct from v_profile.provider_id then raise exception using errcode='22023',message='Provider identity is immutable'; end if;
      update public.knoux_provider_profiles set credential_id=nullif(v_body #>> '{auth,credentialId}','')::uuid,enabled=(v_body->>'enabled')::boolean,version=version+1,updated_at=now(),
        body=v_body||jsonb_build_object('id',v_id,'ownerId',p_owner,'workspaceId',p_workspace,'active',active,'version',version+1,'createdAt',created_at,'updatedAt',now()) where id=v_id;
      v_event:=case when p_action='CONNECTION_UPDATED' then 'CONNECTION_TESTED' else coalesce(p_payload->>'event','PROFILE_UPDATED') end;
      if p_action='CONNECTION_UPDATED' and v_body #>> '{connection,auth}'='AUTHENTICATED' then
        update public.knoux_provider_credentials set last_verified_at=now()
        where id=nullif(v_body #>> '{auth,credentialId}','')::uuid and owner_id=p_owner and workspace_id=p_workspace and revoked_at is null;
      end if;
    end if;
  elsif p_action='CREDENTIAL_CREATE' then
    if (select count(*) from public.knoux_provider_credentials where owner_id=p_owner and workspace_id=p_workspace)>=100 then raise exception using errcode='22023',message='Credential limit reached'; end if;
    insert into public.knoux_provider_credentials(id,owner_id,workspace_id,provider_id,name,encrypted_value)
      values(v_id,p_owner,p_workspace,p_payload->>'providerId',p_payload->>'name',p_payload->'encryptedValue');
    v_credential_id:=v_id;v_event:='CREDENTIAL_CREATED';
  elsif p_action in ('CREDENTIAL_REPLACE','CREDENTIAL_ROTATE','CREDENTIAL_REVOKE','CREDENTIAL_DELETE') then
    select * into v_credential from public.knoux_provider_credentials where id=v_id and owner_id=p_owner and workspace_id=p_workspace for update;
    if not found then raise exception using errcode='42501',message='Credential ownership refused'; end if;
    if v_credential.revision is distinct from v_expected then raise exception using errcode='40001',message='Credential changed; refresh before retry'; end if;
    v_credential_id:=v_id;v_event:=p_action||'D';
    if p_action='CREDENTIAL_DELETE' then
      if exists(select 1 from public.knoux_provider_profiles where credential_id=v_id) then raise exception using errcode='23503',message='Credential is referenced; remove profile bindings first'; end if;
      delete from public.knoux_provider_credentials where id=v_id;
      v_event:='CREDENTIAL_DELETED';
    else
      update public.knoux_provider_credentials set encrypted_value=case when p_action='CREDENTIAL_REVOKE' then null else p_payload->'encryptedValue' end,
        revoked_at=case when p_action='CREDENTIAL_REVOKE' then now() else null end,revision=revision+1,updated_at=now(),last_verified_at=null where id=v_id;
      -- Every dependent profile loses prior auth/discovery/runtime evidence atomically with replacement.
      update public.knoux_provider_profiles set version=version+1,updated_at=now(),
        body=(body-'providerUsage'-'providerLimits'-'lastLiveTest')||jsonb_build_object('version',version+1,'updatedAt',now(),'models','[]'::jsonb,'discoveredAt',null,'connection',p_payload->'resetConnection') where credential_id=v_id;
      v_event:=case p_action when 'CREDENTIAL_REVOKE' then 'CREDENTIAL_REVOKED' when 'CREDENTIAL_ROTATE' then 'CREDENTIAL_ROTATED' else 'CREDENTIAL_REPLACED' end;
    end if;
  elsif p_action='LIVE_TEST_REQUESTED' then
    if not exists(select 1 from public.knoux_provider_profiles where id=v_id and owner_id=p_owner and workspace_id=p_workspace) then raise exception using errcode='42501',message='Profile ownership refused'; end if;
    v_profile_id:=v_id;v_event:='LIVE_TEST_REQUESTED';
  else raise exception using errcode='22023',message='Unsupported provider command';
  end if;
  insert into public.knoux_provider_audit(owner_id,workspace_id,event,profile_id,credential_id) values(p_owner,p_workspace,v_event,v_profile_id,v_credential_id);
  if v_profile_id is not null then
    select body into v_body from public.knoux_provider_profiles where id=v_profile_id;
    return coalesce(v_body,jsonb_build_object('deleted',true));
  end if;
  return jsonb_build_object('id',v_credential_id);
end;
$$;
revoke all on function public.knoux_provider_command(uuid,uuid,text,jsonb) from public, anon, authenticated;
grant execute on function public.knoux_provider_command(uuid,uuid,text,jsonb) to service_role;
commit;
