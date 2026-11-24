begin;

create table public.knoux_wordpress_site_drafts (
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  id uuid not null,
  title text not null check (char_length(btrim(title)) between 1 and 80),
  document jsonb not null check (
    jsonb_typeof(document) = 'object'
    and document @> '{"schema":1}'
    and octet_length(document::text) <= 65536
  ),
  revision integer not null default 1 check (revision > 0),
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  primary key (owner_id, id)
);

create index knoux_wordpress_site_drafts_owner_activity
  on public.knoux_wordpress_site_drafts (owner_id, updated_at desc, id);

alter table public.knoux_wordpress_site_drafts enable row level security;
revoke all on public.knoux_wordpress_site_drafts from public, anon, authenticated;
grant select on public.knoux_wordpress_site_drafts to authenticated;
grant insert (id, title, document), update (title, document)
  on public.knoux_wordpress_site_drafts to authenticated;

create policy knoux_wordpress_draft_owner_read on public.knoux_wordpress_site_drafts
  for select to authenticated using (owner_id = (select auth.uid()));
create policy knoux_wordpress_draft_owner_create on public.knoux_wordpress_site_drafts
  for insert to authenticated with check (owner_id = (select auth.uid()));
create policy knoux_wordpress_draft_owner_update on public.knoux_wordpress_site_drafts
  for update to authenticated using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create function public.knoux_wordpress_site_draft_revision()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.revision := old.revision + 1;
  new.updated_at := statement_timestamp();
  return new;
end;
$$;
revoke all on function public.knoux_wordpress_site_draft_revision() from public, anon, authenticated;

create trigger knoux_wordpress_site_draft_revision
  before update on public.knoux_wordpress_site_drafts
  for each row execute function public.knoux_wordpress_site_draft_revision();

commit;
