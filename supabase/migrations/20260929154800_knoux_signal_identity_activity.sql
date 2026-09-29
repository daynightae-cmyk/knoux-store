-- KNOuX Signal v1.1: verified ownership, consensual viewer disclosure, activity and reputation.
-- This migration never exposes an authenticated viewer unless that viewer has
-- explicitly enabled disclosure and supplied a public label.

create table if not exists public.signal_viewer_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  disclose_visits boolean not null default false,
  public_label text check (public_label is null or char_length(public_label) between 2 and 80),
  updated_at timestamptz not null default now()
);

alter table public.signal_viewer_preferences enable row level security;
revoke all on public.signal_viewer_preferences from anon, authenticated;

create or replace function public.signal_claim_number(
  p_phone text,
  p_country_code text,
  p_national_number text,
  p_line_type text default 'unknown'
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  uid uuid := auth.uid();
  verified_phone text;
  n public.signal_numbers;
  existing_owner uuid;begin
  if uid is null then raise exception 'authentication_required'; end if;
  if p_phone !~ '^\\+[1-9][0-9]{6,14}$' then raise exception 'invalid_phone'; end if;

  select phone into verified_phone from auth.users where id=uid;
  if verified_phone is null or verified_phone <> p_phone then
    raise exception 'verified_phone_required';
  end if;

  insert into public.signal_numbers(phone_e164,country_code,national_number,line_type)
  values(p_phone,upper(p_country_code),p_national_number,p_line_type)
  on conflict(phone_e164) do update set
    country_code=excluded.country_code,
    national_number=excluded.national_number,
    line_type=case when excluded.line_type <> 'unknown' then excluded.line_type else public.signal_numbers.line_type end,
    updated_at=now()
  returning * into n;

  select owner_id into existing_owner from public.signal_profiles where number_id=n.id;
  if existing_owner is not null and existing_owner <> uid then
    raise exception 'already_claimed';
  end if;

  insert into public.signal_profiles(number_id,owner_id,verified_at)
  values(n.id,uid,now())
  on conflict(number_id) do update set
    owner_id=uid,
    verified_at=coalesce(public.signal_profiles.verified_at,now()),
    updated_at=now();

  return jsonb_build_object('claimed',true,'verified',true,'phone',n.phone_e164);
end $$;

create or replace function public.signal_set_profile_preferences(
  p_phone text,
  p_allow_community_aliases boolean,
  p_visibility text,
  p_display_name text default null,
  p_business_name text default null,
  p_profile_kind text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  n_id uuid;
begin
  if uid is null then raise exception 'authentication_required'; end if;
  if p_visibility not in ('standard','limited','hidden') then raise exception 'invalid_visibility'; end if;
  if p_profile_kind is not null and p_profile_kind not in ('person','business') then raise exception 'invalid_profile_kind'; end if;

  select n.id into n_id
  from public.signal_numbers n
  join public.signal_profiles p on p.number_id=n.id
  where n.phone_e164=p_phone and p.owner_id=uid and p.verified_at is not null;

  if n_id is null then raise exception 'verified_owner_required'; end if;

  update public.signal_profiles
  set allow_community_aliases=p_allow_community_aliases,
      visibility=p_visibility,
      display_name=nullif(trim(p_display_name),''),
      business_name=nullif(trim(p_business_name),''),
      profile_kind=p_profile_kind,
      updated_at=now()
  where number_id=n_id;

  return jsonb_build_object(
    'updated',true,
    'communityAliasesEnabled',p_allow_community_aliases,
    'visibility',p_visibility
  );
end $$;

create or replace function public.signal_set_viewer_preference(
  p_disclose_visits boolean,
  p_public_label text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  cleaned_label text := nullif(trim(p_public_label),'');
begin
  if uid is null then raise exception 'authentication_required'; end if;
  if p_disclose_visits and (cleaned_label is null or char_length(cleaned_label) < 2) then
    raise exception 'public_label_required';
  end if;

  insert into public.signal_viewer_preferences(user_id,disclose_visits,public_label,updated_at)
  values(uid,p_disclose_visits,cleaned_label,now())
  on conflict(user_id) do update set
    disclose_visits=excluded.disclose_visits,
    public_label=excluded.public_label,
    updated_at=now();

  return jsonb_build_object(
    'updated',true,
    'discloseVisits',p_disclose_visits,
    'publicLabel',cleaned_label
  );
end $$;

create or replace function public.signal_report_reputation(
  p_phone text,
  p_country_code text,
  p_national_number text,
  p_line_type text,
  p_category text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  n public.signal_numbers;
begin
  if uid is null then raise exception 'authentication_required'; end if;
  if p_category not in ('spam','scam','sales','harassment','safe_business','other') then raise exception 'invalid_category'; end if;
  if p_phone !~ '^\\+[1-9][0-9]{6,14}$' then raise exception 'invalid_phone'; end if;

  insert into public.signal_numbers(phone_e164,country_code,national_number,line_type)
  values(p_phone,upper(p_country_code),p_national_number,p_line_type)
  on conflict(phone_e164) do update set
    country_code=excluded.country_code,
    national_number=excluded.national_number,
    line_type=case when excluded.line_type <> 'unknown' then excluded.line_type else public.signal_numbers.line_type end,
    updated_at=now()
  returning * into n;

  insert into public.signal_reputation_reports(number_id,reporter_id,category,status)
  values(n.id,uid,p_category,'pending')
  on conflict(number_id,reporter_id,category) do update set
    status='pending',
    created_at=now();

  return jsonb_build_object('recorded',true,'category',p_category);
end $$;

create or replace function public.signal_my_activity(p_phone text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  n_id uuid;
  searches_total bigint;
  views_total bigint;
  searches_30d bigint;
  views_30d bigint;
  visible_viewers jsonb := '[]'::jsonb;
begin
  if uid is null then raise exception 'authentication_required'; end if;

  select n.id into n_id
  from public.signal_numbers n
  join public.signal_profiles p on p.number_id=n.id
  where n.phone_e164=p_phone and p.owner_id=uid and p.verified_at is not null;

  if n_id is null then raise exception 'verified_owner_required'; end if;

  select count(*) into searches_total
  from public.signal_search_events where number_id=n_id and event_type='lookup';

  select count(*) into views_total
  from public.signal_search_events where number_id=n_id and event_type='profile_view';

  select count(*) into searches_30d
  from public.signal_search_events
  where number_id=n_id and event_type='lookup' and created_at >= now() - interval '30 days';

  select count(*) into views_30d
  from public.signal_search_events
  where number_id=n_id and event_type='profile_view' and created_at >= now() - interval '30 days';

  select coalesce(jsonb_agg(jsonb_build_object(
    'label',q.public_label,
    'viewCount',q.view_count,
    'lastViewedAt',q.last_viewed_at
  ) order by q.last_viewed_at desc),'[]'::jsonb)
  into visible_viewers
  from (
    select vp.public_label,
           count(*)::int as view_count,
           max(e.created_at) as last_viewed_at
    from public.signal_search_events e
    join public.signal_viewer_preferences vp on vp.user_id=e.viewer_id
    where e.number_id=n_id
      and e.event_type='profile_view'
      and vp.disclose_visits
      and vp.public_label is not null
    group by e.viewer_id,vp.public_label
    order by max(e.created_at) desc
    limit 10
  ) q;

  return jsonb_build_object(
    'searchesTotal',searches_total,
    'profileViewsTotal',views_total,
    'searches30d',searches_30d,
    'profileViews30d',views_30d,
    'visibleViewers',visible_viewers
  );
end $$;

revoke all on function public.signal_claim_number(text,text,text,text) from public;
revoke all on function public.signal_set_profile_preferences(text,boolean,text,text,text,text) from public;
revoke all on function public.signal_set_viewer_preference(boolean,text) from public;
revoke all on function public.signal_report_reputation(text,text,text,text,text) from public;
revoke all on function public.signal_my_activity(text) from public;

grant execute on function public.signal_claim_number(text,text,text,text) to authenticated;
grant execute on function public.signal_set_profile_preferences(text,boolean,text,text,text,text) to authenticated;
grant execute on function public.signal_set_viewer_preference(boolean,text) to authenticated;
grant execute on function public.signal_report_reputation(text,text,text,text,text) to authenticated;
grant execute on function public.signal_my_activity(text) to authenticated;

comment on table public.signal_viewer_preferences is
'Viewer disclosure is explicit opt-in. KNOuX Signal never exposes a viewer identity by default.';
