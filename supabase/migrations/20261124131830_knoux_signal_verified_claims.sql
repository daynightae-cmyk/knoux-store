-- Repair the existing claim boundary; never infer ownership from number format.
begin;
create or replace function public.signal_claim_number(
  p_phone text, p_country_code text, p_national_number text, p_line_type text default 'unknown')
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid(); verified_phone text; n public.signal_numbers; claimed public.signal_profiles;
begin
  if uid is null then raise exception 'authentication_required'; end if;
  if p_phone is null or p_phone !~ '^[+][1-9][0-9]{6,14}$' then raise exception 'invalid_phone'; end if;
  -- Supabase stores phone values with or without '+'. A stored but unconfirmed
  -- phone is insufficient: the confirmation timestamp must exist too.
  select '+'||regexp_replace(phone,'[^0-9]','','g') into verified_phone
    from auth.users where id=uid and phone_confirmed_at is not null;
  if verified_phone is null or verified_phone<>p_phone then raise exception 'verified_phone_required'; end if;
  insert into public.signal_numbers(phone_e164,country_code,national_number,line_type)
    values(p_phone,upper(p_country_code),p_national_number,p_line_type)
    on conflict(phone_e164) do update set updated_at=now() returning * into n;
  -- Ownership is checked within the upsert, including its conflict race. Never
  -- overwrite another owner after a separate unlocked existence check.
  insert into public.signal_profiles(number_id,owner_id,verified_at)
    values(n.id,uid,now())
    on conflict(number_id) do update set owner_id=uid,
      verified_at=coalesce(public.signal_profiles.verified_at,now()),updated_at=now()
      where public.signal_profiles.owner_id is null or public.signal_profiles.owner_id=uid
    returning * into claimed;
  if not found then raise exception 'already_claimed'; end if;
  return jsonb_build_object('claimed',true,'verified',true,'phone',n.phone_e164);
end $$;
revoke all on function public.signal_claim_number(text,text,text,text) from public,anon;
grant execute on function public.signal_claim_number(text,text,text,text) to authenticated;

-- Use a literal plus character class so SQL string escaping cannot turn the
-- existing reputation phone validator into a backslash matcher.
create or replace function public.signal_report_reputation(
  p_phone text,p_country_code text,p_national_number text,p_line_type text,p_category text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); n public.signal_numbers;
begin
  if uid is null then raise exception 'authentication_required'; end if;
  if p_category is null or p_category not in ('spam','scam','sales','harassment','safe_business','other') then raise exception 'invalid_category'; end if;
  if p_phone is null or p_phone !~ '^[+][1-9][0-9]{6,14}$' then raise exception 'invalid_phone'; end if;
  insert into public.signal_numbers(phone_e164,country_code,national_number,line_type)
    values(p_phone,upper(p_country_code),p_national_number,p_line_type)
    on conflict(phone_e164) do update set updated_at=now() returning * into n;
  insert into public.signal_reputation_reports(number_id,reporter_id,category,status)
    values(n.id,uid,p_category,'pending')
    on conflict(number_id,reporter_id,category) do update set status='pending',created_at=now();
  return jsonb_build_object('recorded',true,'category',p_category);
end $$;
revoke all on function public.signal_report_reputation(text,text,text,text,text) from public,anon;
grant execute on function public.signal_report_reputation(text,text,text,text,text) to authenticated;
commit;
