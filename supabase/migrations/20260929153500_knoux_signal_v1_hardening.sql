-- KNOuX Signal v1 hardening after Supabase advisors.
-- Public lookup and aggregate profile-view recording are intentionally callable;
-- mutation/owner-only RPCs are not callable by anonymous users.

alter function public.signal_normalize_label(text) set search_path = public;

revoke execute on function public.signal_normalize_label(text) from public, anon, authenticated;
grant execute on function public.signal_normalize_label(text) to service_role;

revoke execute on function public.signal_contribute_alias(text,text,text,text,text,text) from anon;
grant execute on function public.signal_contribute_alias(text,text,text,text,text,text) to authenticated;

revoke execute on function public.signal_my_activity(text) from anon;
grant execute on function public.signal_my_activity(text) to authenticated;

create index if not exists signal_alias_contributor_idx
  on public.signal_alias_submissions(contributor_id);
create index if not exists signal_profile_owner_idx
  on public.signal_profiles(owner_id);
create index if not exists signal_reputation_reporter_idx
  on public.signal_reputation_reports(reporter_id);
create index if not exists signal_search_viewer_idx
  on public.signal_search_events(viewer_id);

comment on function public.signal_lookup_safe(text,text,text,text) is
'Intentional public RPC. Returns only verified/opted-in profile aliases and aggregate reputation; never contributor identities.';
comment on function public.signal_record_profile_view(text) is
'Intentional public RPC used only for aggregate in-product profile-view counting; never returns viewer identities.';
