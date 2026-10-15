-- Review artifact only. Apply through the deployment owner's migration workflow.
-- No changes to existing content, settings, Bridge or provider tables.
create table public.companion_budget (
  bucket text primary key,
  day date not null,
  requests integer not null default 0,
  reserved_microusd bigint not null default 0
);
alter table public.companion_budget enable row level security;
revoke all on public.companion_budget from public,anon,authenticated;
grant select,insert,update,delete on public.companion_budget to service_role;

create function public.reserve_companion_budget(session_hash text,reserve_microusd integer)
returns boolean language plpgsql security invoker set search_path='' as $$
declare current_day date := (now() at time zone 'UTC')::date; accepted integer;
begin
  if session_hash !~ '^[a-f0-9]{64}$' or reserve_microusd <> 3000 then return false; end if;
  -- One transaction serializes the global reservation before the session row.
  insert into public.companion_budget(bucket,day) values('global',current_day)
  on conflict(bucket) do nothing;
  update public.companion_budget
    set requests=case when day=current_day then requests+1 else 1 end,
        reserved_microusd=case when day=current_day then reserved_microusd+reserve_microusd else reserve_microusd end,
        day=current_day
    where bucket='global' and (day<>current_day or (requests<200 and reserved_microusd+reserve_microusd<=600000));
  get diagnostics accepted = row_count;
  if accepted=0 then return false; end if;
  insert into public.companion_budget(bucket,day) values(session_hash,current_day) on conflict(bucket) do nothing;
  update public.companion_budget set requests=case when day=current_day then requests+1 else 1 end,day=current_day
    where bucket=session_hash and (day<>current_day or requests<40);
  get diagnostics accepted = row_count;
  -- Keep conservative global reservation even when session allocation is refused.
  delete from public.companion_budget where bucket<>'global' and day<current_day-1;
  return accepted=1;
end $$;
revoke all on function public.reserve_companion_budget(text,integer) from public,anon,authenticated;
grant execute on function public.reserve_companion_budget(text,integer) to service_role;
