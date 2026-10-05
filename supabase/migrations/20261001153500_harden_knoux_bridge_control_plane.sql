-- Harden KNOuX Store bridge SECURITY DEFINER RPCs.
-- Supabase may grant exposed-schema functions to anon/authenticated by default;
-- the bridge control-plane RPCs are server-only and must remain service-role only.

revoke all on function public.knoux_bridge_enroll_machine(
  text,text,text,text,text,text,text,text,jsonb
) from public, anon, authenticated;
grant execute on function public.knoux_bridge_enroll_machine(
  text,text,text,text,text,text,text,text,jsonb
) to service_role;

revoke all on function public.knoux_bridge_claim_job(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.knoux_bridge_claim_job(uuid, uuid)
  to service_role;
