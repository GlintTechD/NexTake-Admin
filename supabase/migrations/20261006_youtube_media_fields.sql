-- Extend the existing public-feed articles table to the editorial CMS shape.
-- All additions are nullable or safely defaulted so existing rows remain valid.
alter table if exists public.articles
  add column if not exists slug text,
  add column if not exists summary text,
  add column if not exists published_at timestamptz,
  add column if not exists hero_priority integer,
  add column if not exists in_daily_edit boolean not null default false,
  add column if not exists is_breaking boolean not null default false,
  add column if not exists source_url text,
  add column if not exists source_name text,
  add column if not exists source_logo_url text,
  add column if not exists original_author text,
  add column if not exists original_published_at timestamptz,
  add column if not exists link_behavior text not null default 'reader',
  add column if not exists key_takeaways jsonb not null default '[]'::jsonb,
  add column if not exists tags jsonb not null default '[]'::jsonb,
  add column if not exists cover_image_url text,
  add column if not exists image_credit text,
  add column if not exists syndication_license text,
  add column if not exists syndicated_body text,
  add column if not exists related_company_ids jsonb not null default '[]'::jsonb,
  add column if not exists updated_by text,
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

create unique index if not exists articles_slug_unique_idx
  on public.articles (slug)
  where slug is not null and slug <> '';
