-- KNOuX Signal v1.2: authenticated-only RPC grants.
-- Supabase may retain explicit anon EXECUTE grants even after PUBLIC is revoked,
-- so remove anon explicitly from every owner/report/preferences RPC.

revoke execute on function public.signal_claim_number(text,text,text,text) from anon;
revoke execute on function public.signal_set_profile_preferences(text,boolean,text,text,text,text) from anon;
revoke execute on function public.signal_set_viewer_preference(boolean,text) from anon;
revoke execute on function public.signal_report_reputation(text,text,text,text,text) from anon;
revoke execute on function public.signal_my_activity(text) from anon;

grant execute on function public.signal_claim_number(text,text,text,text) to authenticated;
grant execute on function public.signal_set_profile_preferences(text,boolean,text,text,text,text) to authenticated;
grant execute on function public.signal_set_viewer_preference(boolean,text) to authenticated;
grant execute on function public.signal_report_reputation(text,text,text,text,text) to authenticated;
grant execute on function public.signal_my_activity(text) to authenticated;
