-- Server-only draft transactions. Apply only to an authorized non-production DB first.
-- Functions are invoker-rights and executable only by the service role.
-- Profile mutations must use the audited transaction, including for workspace owners.
begin;
revoke insert, update, delete, truncate, references, trigger on public.knoux_growth_clients from authenticated;
alter table public.knoux_growth_creatives add column if not exists destination_url text;
create table if not exists public.knoux_growth_draft_receipts (
  actor_id uuid not null references auth.users(id), request_key uuid not null,
  client_id text not null references public.knoux_growth_clients(id), kind text not null,
  input_hash text not null, result jsonb not null, created_at timestamptz not null default now(),
  primary key(actor_id,request_key)
);
alter table public.knoux_growth_draft_receipts enable row level security;
revoke all on public.knoux_growth_draft_receipts from public,anon,authenticated;
grant select,insert on public.knoux_growth_draft_receipts to service_role;

create or replace function public.knoux_growth_draft_receipt(p_client text,p_actor uuid,p_kind text,p_input jsonb,p_result jsonb default null)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare v_key uuid := (p_input->>'request_key')::uuid; v_receipt public.knoux_growth_draft_receipts;
begin
  if v_key is null then raise exception 'Request key required' using errcode='22023'; end if;
  if p_result is not null then
    insert into public.knoux_growth_draft_receipts(actor_id,request_key,client_id,kind,input_hash,result)
      values(p_actor,v_key,p_client,p_kind,md5(p_input::text),p_result);
    return p_result;
  end if;
  select * into v_receipt from public.knoux_growth_draft_receipts where actor_id=p_actor and request_key=v_key;
  if found then
    if v_receipt.client_id<>p_client or v_receipt.kind<>p_kind or v_receipt.input_hash<>md5(p_input::text) then
      raise exception 'Request key reused for different content' using errcode='40001';
    end if;
    return v_receipt.result;
  end if;
  return null;
end $$;
revoke all on function public.knoux_growth_draft_receipt(text,uuid,text,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.knoux_growth_draft_receipt(text,uuid,text,jsonb,jsonb) to service_role;

create or replace function public.knoux_growth_lock_draft_client(p_client text, p_actor uuid, p_kind text)
returns void language plpgsql security invoker set search_path = '' as $$
declare v_role text;
begin
  perform 1 from public.knoux_growth_clients where id=p_client for update;
  if not found then raise exception 'Workspace missing' using errcode='P0002'; end if;
  select role into v_role from public.knoux_growth_memberships
    where client_id=p_client and user_id=p_actor for share;
  if p_kind not in ('client','profile','campaign','creative') then raise exception 'Unknown draft kind' using errcode='22023'; end if;
  if v_role is null or (p_kind='profile' and v_role not in ('OWNER','MANAGER')) or (p_kind='client' and v_role<>'OWNER') or
    (p_kind='campaign' and v_role not in ('OWNER','MANAGER','ADS_SPECIALIST','CONTENT_CREATOR')) or
    (p_kind='creative' and v_role not in ('OWNER','DESIGNER','CONTENT_CREATOR')) then
    raise exception 'Permission refused' using errcode='42501';
  end if;
end $$;

create or replace function public.knoux_growth_invalidate_draft_approval(p_campaign uuid, p_client text, p_actor uuid)
returns void language plpgsql security invoker set search_path = '' as $$
begin
  if p_campaign is null then return; end if;
  perform 1 from public.knoux_growth_campaigns where id=p_campaign and client_id=p_client
    and status in ('DRAFT','CHANGES_REQUESTED','READY_FOR_REVIEW') for update;
  if not found then raise exception 'Campaign cannot be edited' using errcode='42501'; end if;
  update public.knoux_growth_campaign_approvals set invalidated_at=clock_timestamp(),
    invalidation_reason='Draft content changed'
    where campaign_id=p_campaign and client_id=p_client and invalidated_at is null;
  update public.knoux_growth_campaigns set status='DRAFT', plan_hash=null, version=version+1,
    updated_by=p_actor, updated_at=clock_timestamp() where id=p_campaign and client_id=p_client;
end $$;

create or replace function public.knoux_growth_save_creative_draft(
  p_client text, p_actor uuid, p_id uuid, p_expected timestamptz, p_input jsonb)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare v_old public.knoux_growth_creatives; v_new public.knoux_growth_creatives; v_receipt jsonb;
  v_campaign uuid := nullif(p_input->>'campaign_id','')::uuid;
  v_media uuid := nullif(p_input->>'media_asset_id','')::uuid;
begin
  perform public.knoux_growth_lock_draft_client(p_client,p_actor,'creative');
  if p_id is null then
    v_receipt := public.knoux_growth_draft_receipt(p_client,p_actor,'creative',p_input);
    if v_receipt is not null then return v_receipt; end if;
  end if;
  if p_id is not null then
    select * into v_old from public.knoux_growth_creatives where id=p_id and client_id=p_client for update;
    if not found then raise exception 'Creative missing' using errcode='P0002'; end if;
    if p_expected is null or v_old.updated_at <> p_expected then raise exception 'Stale revision' using errcode='40001'; end if;
    if v_old.status not in ('DRAFT','REJECTED') then raise exception 'Review transition required' using errcode='42501'; end if;
  end if;
  if v_media is not null then
    perform 1 from public.knoux_growth_media_assets where id=v_media and client_id=p_client for share;
    if not found then raise exception 'Foreign media' using errcode='42501'; end if;
  end if;
  -- Both the old and the new association must be mutable and belong to this client.
  perform public.knoux_growth_invalidate_draft_approval(v_old.campaign_id,p_client,p_actor);
  if v_campaign is distinct from v_old.campaign_id then
    perform public.knoux_growth_invalidate_draft_approval(v_campaign,p_client,p_actor);
  end if;
  v_new := jsonb_populate_record(null::public.knoux_growth_creatives,p_input);
  if p_id is null then
    insert into public.knoux_growth_creatives(client_id,campaign_id,media_asset_id,concept,headline,primary_text,description,cta,languages,destination_url)
      values(p_client,v_campaign,v_media,v_new.concept,v_new.headline,v_new.primary_text,v_new.description,v_new.cta,v_new.languages,v_new.destination_url)
      returning * into v_new;
  else
    update public.knoux_growth_creatives set campaign_id=v_campaign,media_asset_id=v_media,
      concept=v_new.concept,headline=v_new.headline,primary_text=v_new.primary_text,description=v_new.description,
      cta=v_new.cta,languages=v_new.languages,destination_url=v_new.destination_url,status='DRAFT',reviewed_by=null,
      updated_at=clock_timestamp() where id=p_id and client_id=p_client returning * into v_new;
  end if;
  insert into public.knoux_growth_audit_log(client_id,actor_id,actor_label,action,subject_type,subject_id,detail)
    values(p_client,p_actor,'Operator','CAMPAIGN_CHANGED','creative',v_new.id::text,'Creative draft saved; linked campaign approvals superseded in this transaction.');
  if p_id is null then return public.knoux_growth_draft_receipt(p_client,p_actor,'creative',p_input,to_jsonb(v_new)); end if;
  return to_jsonb(v_new);
end $$;

create or replace function public.knoux_growth_save_campaign_draft(
  p_client text, p_actor uuid, p_id uuid, p_expected timestamptz, p_input jsonb)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare v_old public.knoux_growth_campaigns; v_new public.knoux_growth_campaigns; v_receipt jsonb;
  v_platform text;
begin
  perform public.knoux_growth_lock_draft_client(p_client,p_actor,'campaign');
  if p_id is null then
    v_receipt := public.knoux_growth_draft_receipt(p_client,p_actor,'campaign',p_input);
    if v_receipt is not null then return v_receipt; end if;
  end if;
  if p_id is not null then
    select * into v_old from public.knoux_growth_campaigns where id=p_id and client_id=p_client for update;
    if not found then raise exception 'Campaign missing' using errcode='P0002'; end if;
    if p_expected is null or v_old.updated_at <> p_expected then raise exception 'Stale revision' using errcode='40001'; end if;
    if exists(select 1 from public.knoux_growth_campaign_channels where campaign_id=p_id and client_id<>p_client) then
      raise exception 'Channel ownership mismatch' using errcode='42501';
    end if;
    perform public.knoux_growth_invalidate_draft_approval(p_id,p_client,p_actor);
  end if;
  if jsonb_typeof(p_input->'platforms') is distinct from 'array' then raise exception 'Platforms required' using errcode='22023'; end if;
  v_new := jsonb_populate_record(null::public.knoux_growth_campaigns,p_input);
  if p_id is null then
    insert into public.knoux_growth_campaigns(client_id,name,objective,budget_minor,currency,start_date,end_date,locations,languages,audience_notes,landing_page_url,conversion_target,created_by,updated_by)
      values(p_client,v_new.name,v_new.objective,v_new.budget_minor,v_new.currency,v_new.start_date,v_new.end_date,v_new.locations,v_new.languages,v_new.audience_notes,v_new.landing_page_url,v_new.conversion_target,p_actor,p_actor)
      returning * into v_new;
  else
    update public.knoux_growth_campaigns set name=v_new.name,objective=v_new.objective,budget_minor=v_new.budget_minor,
      currency=v_new.currency,start_date=v_new.start_date,end_date=v_new.end_date,locations=v_new.locations,languages=v_new.languages,
      audience_notes=v_new.audience_notes,landing_page_url=v_new.landing_page_url,conversion_target=v_new.conversion_target
      where id=p_id and client_id=p_client returning * into v_new;
  end if;
  delete from public.knoux_growth_campaign_channels where campaign_id=v_new.id and client_id=p_client;
  for v_platform in select jsonb_array_elements_text(p_input->'platforms') loop
    insert into public.knoux_growth_campaign_channels(campaign_id,client_id,platform) values(v_new.id,p_client,v_platform);
  end loop;
  insert into public.knoux_growth_audit_log(client_id,actor_id,actor_label,action,subject_type,subject_id,detail)
    values(p_client,p_actor,'Operator','CAMPAIGN_CHANGED','campaign',v_new.id::text,'Campaign draft and channels saved; prior approvals superseded in this transaction.');
  if p_id is null then return public.knoux_growth_draft_receipt(p_client,p_actor,'campaign',p_input,to_jsonb(v_new)); end if;
  return to_jsonb(v_new);
end $$;

revoke all on function public.knoux_growth_lock_draft_client(text,uuid,text) from public,anon,authenticated;
revoke all on function public.knoux_growth_invalidate_draft_approval(uuid,text,uuid) from public,anon,authenticated;
revoke all on function public.knoux_growth_save_creative_draft(text,uuid,uuid,timestamptz,jsonb) from public,anon,authenticated;
revoke all on function public.knoux_growth_save_campaign_draft(text,uuid,uuid,timestamptz,jsonb) from public,anon,authenticated;
grant execute on function public.knoux_growth_lock_draft_client(text,uuid,text) to service_role;
grant execute on function public.knoux_growth_invalidate_draft_approval(uuid,text,uuid) to service_role;
grant execute on function public.knoux_growth_save_creative_draft(text,uuid,uuid,timestamptz,jsonb) to service_role;
grant execute on function public.knoux_growth_save_campaign_draft(text,uuid,uuid,timestamptz,jsonb) to service_role;
create or replace function public.knoux_growth_create_client(p_client text,p_actor uuid,p_input jsonb)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare v_client public.knoux_growth_clients; v_receipt jsonb; v_id text := gen_random_uuid()::text;
begin
  perform public.knoux_growth_lock_draft_client(p_client,p_actor,'client');
  v_receipt := public.knoux_growth_draft_receipt(p_client,p_actor,'client',p_input);
  if v_receipt is not null then return v_receipt; end if;
  v_client := jsonb_populate_record(null::public.knoux_growth_clients,p_input);
  if length(trim(v_client.name)) not between 1 and 200 then raise exception 'Client name required' using errcode='22023'; end if;
  insert into public.knoux_growth_clients(id,name,business_category,country,city,website,languages,brand_tone,brand_colors,autonomy_mode)
    values(v_id,v_client.name,coalesce(v_client.business_category,''),coalesce(v_client.country,'AE'),coalesce(v_client.city,''),v_client.website,
      coalesce(v_client.languages,array['en']),coalesce(v_client.brand_tone,''),coalesce(v_client.brand_colors,array[]::text[]),'ADVISOR')
    returning * into v_client;
  insert into public.knoux_growth_memberships(user_id,client_id,role,created_by) values(p_actor,v_id,'OWNER',p_actor);
  insert into public.knoux_growth_audit_log(client_id,actor_id,actor_label,action,subject_type,subject_id,detail)
    values(v_id,p_actor,'Operator','RULE_CHANGED','client',v_id,'Client workspace and owner membership created.');
  return public.knoux_growth_draft_receipt(p_client,p_actor,'client',p_input,to_jsonb(v_client));
end $$;
revoke all on function public.knoux_growth_create_client(text,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.knoux_growth_create_client(text,uuid,jsonb) to service_role;
create or replace function public.knoux_growth_save_brand_profile(p_client text,p_actor uuid,p_expected timestamptz,p_input jsonb)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare v_old public.knoux_growth_clients; v_new public.knoux_growth_clients; v_campaign uuid;
begin
  perform public.knoux_growth_lock_draft_client(p_client,p_actor,'profile');
  select * into v_old from public.knoux_growth_clients where id=p_client for update;
  if p_expected is null or v_old.updated_at<>p_expected then raise exception 'Stale client profile' using errcode='40001'; end if;
  perform 1 from public.knoux_growth_campaigns where client_id=p_client for update;
  perform 1 from public.knoux_growth_creatives where client_id=p_client for update;
  if exists(select 1 from public.knoux_growth_campaigns where client_id=p_client and status not in ('DRAFT','CHANGES_REQUESTED','READY_FOR_REVIEW')) or
    exists(select 1 from public.knoux_growth_creatives where client_id=p_client and status not in ('DRAFT','REJECTED')) then
    raise exception 'Brand changes require review of protected work first' using errcode='42501';
  end if;
  for v_campaign in select id from public.knoux_growth_campaigns where client_id=p_client order by id loop
    perform public.knoux_growth_invalidate_draft_approval(v_campaign,p_client,p_actor);
  end loop;
  v_new := jsonb_populate_record(null::public.knoux_growth_clients,p_input);
  update public.knoux_growth_clients set name=v_new.name,business_category=v_new.business_category,city=v_new.city,
    website=v_new.website,brand_tone=v_new.brand_tone,brand_colors=v_new.brand_colors,brand_fonts=v_new.brand_fonts,
    forbidden_claims=v_new.forbidden_claims,arabic_style=v_new.arabic_style,english_style=v_new.english_style,
    updated_at=clock_timestamp() where id=p_client returning * into v_new;
  insert into public.knoux_growth_audit_log(client_id,actor_id,actor_label,action,subject_type,subject_id,detail)
    values(p_client,p_actor,'Operator','RULE_CHANGED','brand_profile',p_client,'Brand profile saved; campaign draft approvals superseded in this transaction.');
  return to_jsonb(v_new);
end $$;
revoke all on function public.knoux_growth_save_brand_profile(text,uuid,timestamptz,jsonb) from public,anon,authenticated;
grant execute on function public.knoux_growth_save_brand_profile(text,uuid,timestamptz,jsonb) to service_role;
commit;
