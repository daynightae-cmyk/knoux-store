-- KNOuX Signal v1
-- Privacy posture: arbitrary numbers may receive telecom/reputation facts, but
-- community aliases are disclosed only after the target number has been
-- verified and explicitly enabled for aliases. Search activity is aggregate;
-- viewer identities are never exposed by these functions.

create table if not exists public.signal_numbers (
  id uuid primary key default gen_random_uuid(),
  phone_e164 text not null unique check (phone_e164 ~ '^\\+[1-9][0-9]{6,14}$'),
  country_code text not null,
  national_number text not null,
  line_type text not null default 'unknown' check (line_type in ('mobile','fixed','voip','unknown')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.signal_profiles (
  number_id uuid primary key references public.signal_numbers(id) on delete cascade,
  owner_id uuid references auth.users(id) on delete set null,
  profile_kind text check (profile_kind in ('person','business')),
  display_name text,
  business_name text,
  verified_at timestamptz,
  allow_community_aliases boolean not null default false,
  visibility text not null default 'standard' check (visibility in ('standard','limited','hidden')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.signal_alias_submissions (
  id uuid primary key default gen_random_uuid(),
  number_id uuid not null references public.signal_numbers(id) on delete cascade,
  contributor_id uuid not null references auth.users(id) on delete cascade,
  raw_label text not null check (char_length(raw_label) between 2 and 120),
  normalized_label text not null,
  language text not null default 'und',
  category text not null default 'other'
    check (category in ('personal','business','professional','service','other')),
  created_at timestamptz not null default now(),
  unique(number_id, contributor_id, normalized_label)
);

create table if not exists public.signal_reputation_reports (
  id uuid primary key default gen_random_uuid(),
  number_id uuid not null references public.signal_numbers(id) on delete cascade,
  reporter_id uuid not null references auth.users(id) on delete cascade,
  category text not null check (category in ('spam','scam','sales','harassment','safe_business','other')),
  status text not null default 'pending' check (status in ('pending','accepted','rejected')),
  created_at timestamptz not null default now(),
  unique(number_id, reporter_id, category)
);

create table if not exists public.signal_search_events (
  id bigint generated always as identity primary key,
  number_id uuid not null references public.signal_numbers(id) on delete cascade,
  viewer_id uuid references auth.users(id) on delete set null,
  event_type text not null check (event_type in ('lookup','profile_view')),
  created_at timestamptz not null default now()
);

create index if not exists signal_alias_number_idx on public.signal_alias_submissions(number_id);
create index if not exists signal_reputation_number_idx on public.signal_reputation_reports(number_id, created_at desc);
create index if not exists signal_search_number_idx on public.signal_search_events(number_id, created_at desc);

alter table public.signal_numbers enable row level security;
alter table public.signal_profiles enable row level security;
alter table public.signal_alias_submissions enable row level security;
alter table public.signal_reputation_reports enable row level security;
alter table public.signal_search_events enable row level security;

revoke all on public.signal_numbers from anon, authenticated;
revoke all on public.signal_profiles from anon, authenticated;
revoke all on public.signal_alias_submissions from anon, authenticated;
revoke all on public.signal_reputation_reports from anon, authenticated;
revoke all on public.signal_search_events from anon, authenticated;

create or replace function public.signal_normalize_label(p_label text)
returns text language sql immutable
as $$ select lower(trim(regexp_replace(coalesce(p_label,''), '\\s+', ' ', 'g'))) $$;

create or replace function public.signal_lookup_safe(
  p_phone text,
  p_country_code text,
  p_national_number text,
  p_line_type text default 'unknown'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  n public.signal_numbers;
  p public.signal_profiles;
  aliases jsonb := '[]'::jsonb;
  reputation jsonb := '{}'::jsonb;
begin
  if p_phone !~ '^\\+[1-9][0-9]{6,14}$' then raise exception 'invalid_phone'; end if;

  insert into public.signal_numbers(phone_e164,country_code,national_number,line_type)
  values (p_phone,upper(p_country_code),p_national_number,p_line_type)
  on conflict(phone_e164) do update set
    country_code=excluded.country_code,
    national_number=excluded.national_number,
    line_type=case when excluded.line_type <> 'unknown' then excluded.line_type else public.signal_numbers.line_type end,
    updated_at=now()
  returning * into n;

  insert into public.signal_search_events(number_id,viewer_id,event_type)
  values(n.id,auth.uid(),'lookup');

  select * into p from public.signal_profiles where number_id=n.id;

  if p.number_id is not null and p.verified_at is not null and p.allow_community_aliases and p.visibility <> 'hidden' then
    select coalesce(jsonb_agg(jsonb_build_object(
      'label',q.raw_label,
      'normalizedLabel',q.normalized_label,
      'category',q.category,
      'count',q.contribution_count
    ) order by q.contribution_count desc,q.raw_label),'[]'::jsonb)
    into aliases
    from (
      select min(a.raw_label) raw_label,a.normalized_label,min(a.category) category,count(distinct a.contributor_id)::int contribution_count
      from public.signal_alias_submissions a
      where a.number_id=n.id
      group by a.normalized_label
    ) q;
  end if;

  select coalesce(jsonb_object_agg(category,cnt),'{}'::jsonb)
  into reputation
  from (
    select category,count(*)::int cnt
    from public.signal_reputation_reports
    where number_id=n.id and status in ('pending','accepted')
    group by category
  ) r;

  return jsonb_build_object(
    'number',jsonb_build_object('e164',n.phone_e164,'countryCode',n.country_code,'nationalNumber',n.national_number,'lineType',n.line_type),
    'profile',case
      when p.number_id is null or p.visibility='hidden' then null
      else jsonb_build_object(
        'claimed',p.owner_id is not null,
        'verified',p.verified_at is not null,
        'displayName',case when p.visibility='standard' then p.display_name else null end,
        'businessName',case when p.visibility='standard' then p.business_name else null end,
        'profileKind',p.profile_kind,
        'communityAliasesEnabled',p.allow_community_aliases
      )
    end,
    'aliases',aliases,
    'reputation',reputation
  );
end $$;

create or replace function public.signal_contribute_alias(
  p_phone text,
  p_country_code text,
  p_national_number text,
  p_label text,
  p_language text default 'und',
  p_category text default 'other'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  n public.signal_numbers;
  p public.signal_profiles;
  normalized text;
begin
  if uid is null then raise exception 'authentication_required'; end if;
  if p_phone !~ '^\\+[1-9][0-9]{6,14}$' then raise exception 'invalid_phone'; end if;
  if p_category not in ('personal','business','professional','service','other') then raise exception 'invalid_category'; end if;

  normalized := public.signal_normalize_label(p_label);
  if char_length(normalized) < 2 or char_length(normalized) > 120 then raise exception 'invalid_label'; end if;

  insert into public.signal_numbers(phone_e164,country_code,national_number)
  values(p_phone,upper(p_country_code),p_national_number)
  on conflict(phone_e164) do update set updated_at=now()
  returning * into n;

  select * into p from public.signal_profiles where number_id=n.id;
  if p.number_id is null or p.verified_at is null or not p.allow_community_aliases then
    raise exception 'target_not_opted_in';
  end if;

  insert into public.signal_alias_submissions(number_id,contributor_id,raw_label,normalized_label,language,category)
  values(n.id,uid,trim(p_label),normalized,coalesce(nullif(p_language,''),'und'),p_category)
  on conflict(number_id,contributor_id,normalized_label) do update set
    raw_label=excluded.raw_label,
    language=excluded.language,
    category=excluded.category;

  return jsonb_build_object('recorded',true,'label',trim(p_label),'normalizedLabel',normalized);
end $$;

create or replace function public.signal_record_profile_view(p_phone text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  n_id uuid;
begin
  select id into n_id from public.signal_numbers where phone_e164=p_phone;
  if n_id is null then return jsonb_build_object('recorded',false); end if;
  insert into public.signal_search_events(number_id,viewer_id,event_type) values(n_id,auth.uid(),'profile_view');
  return jsonb_build_object('recorded',true);
end $$;

create or replace function public.signal_my_activity(p_phone text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  n_id uuid;
  searches bigint;
  views bigint;
begin
  select n.id into n_id
  from public.signal_numbers n
  join public.signal_profiles p on p.number_id=n.id
  where n.phone_e164=p_phone and p.owner_id=auth.uid() and p.verified_at is not null;

  if n_id is null then raise exception 'verified_owner_required'; end if;

  select count(*) into searches from public.signal_search_events where number_id=n_id and event_type='lookup';
  select count(*) into views from public.signal_search_events where number_id=n_id and event_type='profile_view';

  return jsonb_build_object('searches',searches,'profileViews',views);
end $$;

revoke all on function public.signal_lookup_safe(text,text,text,text) from public;
revoke all on function public.signal_contribute_alias(text,text,text,text,text,text) from public;
revoke all on function public.signal_record_profile_view(text) from public;
revoke all on function public.signal_my_activity(text) from public;

grant execute on function public.signal_lookup_safe(text,text,text,text) to anon,authenticated;
grant execute on function public.signal_record_profile_view(text) to anon,authenticated;
grant execute on function public.signal_contribute_alias(text,text,text,text,text,text) to authenticated;
grant execute on function public.signal_my_activity(text) to authenticated;

comment on table public.signal_search_events is
'Only in-product KNOuX Signal lookup/profile-view events. No third-party search visibility is implied.';
comment on table public.signal_alias_submissions is
'Consent-gated community aliases. Lookup exposes aliases only for verified target profiles that enable them.';
