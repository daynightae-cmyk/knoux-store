-- Make server-only audit intent explicit and close accidental function grants.

revoke all on function public.handle_new_user() from public, anon, authenticated;

drop policy if exists "content sync runs are private" on public.content_sync_runs;
create policy "content sync runs are private"
on public.content_sync_runs
for all
to anon, authenticated
using (false)
with check (false);

comment on function public.submit_contact_request(
  text,text,text,text,text,text,text,jsonb
) is 'Intentional public intake RPC. Validates bounded fields and inserts only into contact_requests; direct table writes remain revoked.';
