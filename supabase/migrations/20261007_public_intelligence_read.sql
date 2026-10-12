-- Public pages may read editor-created startup and event records. Sample
-- workspace records remain private, and all writes stay staff-only.
drop policy if exists articles_public_published_read on public.articles;
create policy articles_public_published_read
  on public.articles
  for select
  to anon
  using (status = 'published');

drop policy if exists startups_public_read on public.startups;
create policy startups_public_read
  on public.startups
  for select
  to anon
  using (origin = 'live');

drop policy if exists events_public_read on public.events;
create policy events_public_read
  on public.events
  for select
  to anon
  using (origin = 'live');