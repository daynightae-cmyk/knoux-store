begin;
create table public.knoux_provider_usage (
  id uuid primary key,
  owner_id uuid not null,
  workspace_id uuid not null,
  profile_id uuid,
  provider_id text not null,
  model_id text not null,
  created_at timestamptz not null default now(),
  body jsonb,
  foreign key (workspace_id, owner_id) references public.knoux_provider_workspaces(id, owner_id)
);
create index provider_usage_scope on public.knoux_provider_usage(owner_id, workspace_id, created_at desc);
alter table public.knoux_provider_usage enable row level security;
revoke all on public.knoux_provider_usage from public, anon, authenticated;
grant all on public.knoux_provider_usage to service_role;
grant select on public.knoux_provider_usage to authenticated;
create policy provider_usage_owner_read on public.knoux_provider_usage for select to authenticated using ((select auth.uid()) = owner_id);

-- A reserved attempt counts even after a worker crash: uncertain billing is never refunded.
-- The workspace row serializes reservations across server instances and concurrent requests.
create function public.knoux_reserve_usage(p_owner uuid, p_workspace uuid, p_id uuid, p_profile uuid, p_provider text, p_model text, p_limit integer)
returns boolean language plpgsql security invoker set search_path = '' as $$
begin
  if current_user not in ('service_role','postgres') or p_limit < 1 or p_limit > 1000000 then
    raise exception using errcode='42501',message='Usage reservation refused';
  end if;
  perform 1 from public.knoux_provider_workspaces where id=p_workspace and owner_id=p_owner for update;
  if not found then raise exception using errcode='42501',message='Workspace ownership refused'; end if;
  if p_profile is not null and not exists(select 1 from public.knoux_provider_profiles where id=p_profile and owner_id=p_owner and workspace_id=p_workspace and provider_id=p_provider) then
    raise exception using errcode='42501',message='Profile ownership refused';
  end if;
  -- Reusing an attempt must never authorize a second paid call.
  if exists(select 1 from public.knoux_provider_usage where id=p_id) then return false; end if;
  if (select count(*) from public.knoux_provider_usage where owner_id=p_owner and workspace_id=p_workspace and created_at >= date_trunc('month',now())) >= p_limit then return false; end if;
  insert into public.knoux_provider_usage(id,owner_id,workspace_id,profile_id,provider_id,model_id)
    values(p_id,p_owner,p_workspace,p_profile,p_provider,p_model);
  return true;
end;
$$;
revoke all on function public.knoux_reserve_usage(uuid,uuid,uuid,uuid,text,text,integer) from public,anon,authenticated;
grant execute on function public.knoux_reserve_usage(uuid,uuid,uuid,uuid,text,text,integer) to service_role;
commit;
