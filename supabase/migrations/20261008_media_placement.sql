alter table public.articles
  add column if not exists media_placement text;

update public.articles
set media_placement = case
  when lower(category) like '%interview%' or tags ? 'interview' then 'interview'
  when lower(category) like '%short%' or tags ? 'short' then 'short'
  else 'video'
end
where content_type = 'media'
  and video_url is not null
  and media_placement is null;

alter table public.articles
  drop constraint if exists articles_media_placement_check;

alter table public.articles
  add constraint articles_media_placement_check
  check (media_placement is null or media_placement in ('short', 'interview', 'video'));

create index if not exists articles_published_media_placement_idx
  on public.articles (media_placement, published_at desc)
  where content_type = 'media' and status = 'published';