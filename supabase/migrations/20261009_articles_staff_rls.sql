-- Limit article access to public published reads and authenticated staff writes.
-- Rebuild the table's policies so an older permissive anon policy cannot keep
-- granting writes after this migration is applied.
alter table public.articles enable row level security;

do $$
declare
  existing_policy record;
begin
  for existing_policy in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'articles'
  loop
    execute format('drop policy %I on public.articles', existing_policy.policyname);
  end loop;
end;
$$;

revoke insert, update, delete, truncate, references, trigger
  on table public.articles from anon, public;
grant select on table public.articles to anon, authenticated;
grant insert, update, delete on table public.articles to authenticated;

create policy articles_public_published_read
  on public.articles
  for select
  to anon
  using (status = 'published');

create policy articles_staff_full_access
  on public.articles
  for all
  to authenticated
  using (public.nextake_is_staff())
  with check (public.nextake_is_staff());
