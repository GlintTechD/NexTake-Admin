-- Reuse the existing articles/public-feed contract for video publishing.
-- Existing article rows remain valid because both fields are nullable/defaulted.
alter table if exists public.articles
  add column if not exists content_type text not null default 'article',
  add column if not exists video_url text;

alter table if exists public.articles
  drop constraint if exists articles_content_type_check;

alter table if exists public.articles
  add constraint articles_content_type_check
  check (content_type in ('article', 'media'));

create index if not exists articles_published_created_idx
  on public.articles (published_at desc, created_at desc)
  where status = 'published';
