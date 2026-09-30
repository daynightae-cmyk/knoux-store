-- Correct escaping from the first Signal migration.

create or replace function public.signal_normalize_label(p_label text)
returns text
language sql
immutable
set search_path = public
as $$ select lower(trim(regexp_replace(coalesce(p_label,''), '\s+', ' ', 'g'))) $$;

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
  if p_phone !~ '^\+[1-9][0-9]{6,14}$' then raise exception 'invalid_phone'; end if;

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
  if p_phone !~ '^\+[1-9][0-9]{6,14}$' then raise exception 'invalid_phone'; end if;
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

revoke execute on function public.signal_normalize_label(text) from public, anon, authenticated;
grant execute on function public.signal_normalize_label(text) to service_role;
revoke execute on function public.signal_contribute_alias(text,text,text,text,text,text) from anon;
grant execute on function public.signal_contribute_alias(text,text,text,text,text,text) to authenticated;
