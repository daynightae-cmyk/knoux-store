-- Authenticated server review boundary. No advertising/provider execution is exposed.
-- Apply to an authorized development database before deploying these endpoints.
begin;
alter table public.knoux_growth_campaign_approvals add column if not exists plan_snapshot jsonb;

create or replace function public.knoux_growth_campaign_review_snapshot(p_client text, p_campaign uuid)
returns jsonb language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object(
    'campaign', to_jsonb(c) - 'status' - 'plan_hash' - 'updated_at' - 'updated_by',
    'channels', coalesce((select jsonb_agg(to_jsonb(ch) - 'updated_at' order by ch.platform)
      from public.knoux_growth_campaign_channels ch where ch.campaign_id=c.id and ch.client_id=p_client), '[]'::jsonb),
    'creatives', coalesce((select jsonb_agg(to_jsonb(cr) order by cr.id)
      from public.knoux_growth_creatives cr where cr.campaign_id=c.id and cr.client_id=p_client), '[]'::jsonb),
    'brand', jsonb_build_object('name', b.name, 'tone', b.brand_tone, 'colors', b.brand_colors,
      'fonts', b.brand_fonts, 'forbiddenClaims', b.forbidden_claims, 'arabicStyle', b.arabic_style, 'englishStyle', b.english_style))
  from public.knoux_growth_campaigns c join public.knoux_growth_clients b on b.id=c.client_id
  where c.id=p_campaign and c.client_id=p_client;
$$;

create or replace function public.knoux_growth_review_campaign(
  p_client text, p_actor uuid, p_campaign uuid, p_expected timestamptz,
  p_action text, p_approval uuid default null, p_note text default null)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  v_campaign public.knoux_growth_campaigns;
  v_approval public.knoux_growth_campaign_approvals;
  v_role text; v_snapshot jsonb; v_hash text; v_status text; v_event text;
begin
  -- Same lock order as the existing draft transactions. Creative and brand edits
  -- cannot race a review or change its frozen package halfway through.
  perform 1 from public.knoux_growth_clients where id=p_client for update;
  if not found then raise exception 'Workspace missing' using errcode='P0002'; end if;
  select role into v_role from public.knoux_growth_memberships
    where client_id=p_client and user_id=p_actor for share;
  if v_role is null then raise exception 'Membership required' using errcode='42501'; end if;
  if p_action not in ('SUBMIT','APPROVE','REQUEST_CHANGES','REJECT','WITHDRAW') or p_action is null then
    raise exception 'Unknown review action' using errcode='22023';
  end if;
  if (p_action in ('SUBMIT','WITHDRAW') and v_role not in ('OWNER','MANAGER','ADS_SPECIALIST')) or
     (p_action in ('APPROVE','REQUEST_CHANGES','REJECT') and v_role not in ('OWNER','MANAGER','CLIENT')) then
    raise exception 'Review permission refused' using errcode='42501';
  end if;
  if length(coalesce(p_note,''))>2000 then raise exception 'Note too long' using errcode='22023'; end if;
  select * into v_campaign from public.knoux_growth_campaigns
    where id=p_campaign and client_id=p_client for update;
  if not found then raise exception 'Campaign missing' using errcode='P0002'; end if;
  if p_expected is null or v_campaign.updated_at<>p_expected then raise exception 'Stale campaign revision' using errcode='40001'; end if;
  if exists(select 1 from public.knoux_growth_campaign_channels where campaign_id=p_campaign and client_id<>p_client) or
     exists(select 1 from public.knoux_growth_creatives where campaign_id=p_campaign and client_id<>p_client) then
    raise exception 'Related record ownership mismatch' using errcode='42501';
  end if;
  perform 1 from public.knoux_growth_creatives where campaign_id=p_campaign and client_id=p_client order by id for share;
  v_snapshot := public.knoux_growth_campaign_review_snapshot(p_client,p_campaign);
  v_hash := md5(v_snapshot::text); -- Content binding only; never an authorization token.

  if p_action='SUBMIT' then
    if v_campaign.status not in ('DRAFT','CHANGES_REQUESTED') then raise exception 'Campaign is not a reviewable draft' using errcode='22023'; end if;
    if v_campaign.budget_minor<=0 or cardinality(v_campaign.languages)=0 or cardinality(v_campaign.locations)=0 or
       not exists(select 1 from public.knoux_growth_campaign_channels where campaign_id=p_campaign and client_id=p_client) or
       not exists(select 1 from public.knoux_growth_creatives where campaign_id=p_campaign and client_id=p_client) or
       coalesce(v_campaign.landing_page_url,'') !~ '^https://[^/@[:space:]]+(\.[^/@[:space:]]+|:[0-9]+)?([/?#]|$)' then
      raise exception 'Complete budget, geography, languages, destination, channels and creative before review' using errcode='22023';
    end if;
    update public.knoux_growth_campaign_approvals set invalidated_at=clock_timestamp(), invalidation_reason='Superseded review'
      where campaign_id=p_campaign and client_id=p_client and invalidated_at is null;
    insert into public.knoux_growth_campaign_approvals(campaign_id,client_id,approved_plan_hash,campaign_version,
      budget_minor,currency,duration_days,target,requested_by,plan_snapshot)
      values(p_campaign,p_client,v_hash,v_campaign.version,v_campaign.budget_minor,v_campaign.currency,
        v_campaign.end_date-v_campaign.start_date+1,array_to_string(v_campaign.locations,', '),p_actor,v_snapshot)
      returning * into v_approval;
    v_status := 'READY_FOR_REVIEW'; v_event := 'CAMPAIGN_SUBMITTED';
  else
    select * into v_approval from public.knoux_growth_campaign_approvals
      where id=p_approval and campaign_id=p_campaign and client_id=p_client for update;
    if not found then raise exception 'Approval missing' using errcode='P0002'; end if;
    if v_approval.invalidated_at is not null or v_approval.campaign_version<>v_campaign.version or
       v_approval.approved_plan_hash<>v_hash or v_approval.plan_snapshot is distinct from v_snapshot then
      raise exception 'Review package changed; resubmit the draft' using errcode='40001';
    end if;
    if p_action='WITHDRAW' then
      if v_campaign.status not in ('READY_FOR_REVIEW','APPROVED') then raise exception 'Cannot withdraw this campaign' using errcode='22023'; end if;
      if v_approval.requested_by<>p_actor and v_role not in ('OWNER','MANAGER') then raise exception 'Only the submitter or manager may withdraw' using errcode='42501'; end if;
      -- Preserve any original decision and reviewer; withdrawal is an audited
      -- invalidation, not a second decision or a fake self-review.
      update public.knoux_growth_campaign_approvals set invalidated_at=clock_timestamp(), invalidation_reason='Withdrawn by operator'
        where id=v_approval.id returning * into v_approval;
      v_status := 'DRAFT'; v_event := 'CAMPAIGN_CHANGED';
    else
      if v_campaign.status<>'READY_FOR_REVIEW' or v_approval.decision is not null then raise exception 'Review already decided' using errcode='40001'; end if;
      if v_approval.requested_by=p_actor then raise exception 'Submitter cannot review their own campaign' using errcode='42501'; end if;
      update public.knoux_growth_campaign_approvals set decision=p_action,decided_by=p_actor,decided_at=clock_timestamp(),note=nullif(trim(p_note),'')
        where id=v_approval.id returning * into v_approval;
      v_status := case p_action when 'APPROVE' then 'APPROVED' when 'REQUEST_CHANGES' then 'CHANGES_REQUESTED' else 'FAILED' end;
      v_event := case p_action when 'APPROVE' then 'CAMPAIGN_APPROVED' else 'CAMPAIGN_CHANGED' end;
    end if;
  end if;
  update public.knoux_growth_campaigns set status=v_status,plan_hash=case when p_action='WITHDRAW' then null else v_hash end,
    updated_by=p_actor,updated_at=clock_timestamp() where id=p_campaign and client_id=p_client returning * into v_campaign;
  insert into public.knoux_growth_audit_log(client_id,actor_id,actor_label,action,subject_type,subject_id,detail)
    values(p_client,p_actor,'Operator',v_event,'campaign',p_campaign::text,
      'Review '||p_action||'; approval '||v_approval.id::text||'; version '||v_campaign.version::text||'; no provider execution or spend.');
  return jsonb_build_object('campaign',to_jsonb(v_campaign),'approval',to_jsonb(v_approval));
end $$;

revoke all on function public.knoux_growth_campaign_review_snapshot(text,uuid) from public,anon,authenticated;
revoke all on function public.knoux_growth_review_campaign(text,uuid,uuid,timestamptz,text,uuid,text) from public,anon,authenticated;
grant execute on function public.knoux_growth_campaign_review_snapshot(text,uuid) to service_role;
grant execute on function public.knoux_growth_review_campaign(text,uuid,uuid,timestamptz,text,uuid,text) to service_role;
commit;
