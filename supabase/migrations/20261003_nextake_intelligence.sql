-- ============================================================================
-- NexTake Admin — editorial, intelligence, relationship, publishing and
-- insights storage (Operations Department extension)
-- ============================================================================
--
-- WHAT THIS MIGRATION DOES
--   • Adds the tables behind the new console sections (startups + dossiers,
--     people, companies, industries, events, sources, claims, media assets,
--     relationship suggestions, newsletter campaigns/subscribers, engagement
--     events, audit trail, admin users/roles and the controlled taxonomy).
--   • Enables row-level security and grants access only to authenticated
--     console users listed in the existing `admin_profiles` table.
--   • Adds a narrowly-scoped INSERT policy so the public site can report
--     engagement events without a service key.
--
-- WHAT IT DELIBERATELY DOES NOT DO
--   • It never drops, truncates or rewrites an existing table or column, and it
--     never touches `articles`, `daily_tips`, `site_settings`, `companies`
--     (pre-existing shape) or any other production data.
--   • It creates no video storage: video is handled by NexTake's separate video
--     system. `media_assets` intentionally stores still images and documents
--     only, and there is no video bucket or workflow here.
--   • Everything is `if not exists`, so it is safe to run more than once.
--
-- Column names mirror the TypeScript records 1:1 (camelCase → snake_case);
-- see src/lib/workspace/persistence.ts → `toRow` / `fromRow`.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Shared helpers
-- ---------------------------------------------------------------------------

-- Timestamps are updated by trigger so the console and any direct SQL writes
-- agree on `updated_at`.
create or replace function public.nextake_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- True when the caller is a known console user. Roles, not this helper, decide
-- what that user may do — see `nextake_has_any_role`.
create or replace function public.nextake_is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admin_profiles p where p.id = auth.uid()
  );
$$;

-- True when the caller holds one of the supplied roles. The legacy pair
-- ('admin', 'editor') keeps working, and the extended role names from
-- src/lib/permissions.ts are recognised as soon as profiles carry them.
create or replace function public.nextake_has_any_role(roles text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_profiles p
    where p.id = auth.uid()
      and p.role = any (roles)
  );
$$;

-- ---------------------------------------------------------------------------
-- INTELLIGENCE
-- ---------------------------------------------------------------------------

create table if not exists public.startups (
  id                text primary key,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  created_by        text not null default '',
  updated_by        text not null default '',
  -- 'sample' marks the shipped example workspace, 'live' marks user records.
  origin            text not null default 'live',
  name              text not null,
  slug              text not null default '',
  logo_url          text not null default '',
  description       text not null default '',
  industry          text not null default '',
  founded_year      text not null default '',
  headquarters      text not null default '',
  country           text not null default '',
  website           text not null default '',
  markets           jsonb not null default '[]'::jsonb,
  business_model    text not null default '',
  company_status    text not null default 'active',
  stage             text not null default '',
  -- Dossier sections. Values keep amount + disclosure status + source + date.
  financials        jsonb not null default '[]'::jsonb,
  funding_rounds    jsonb not null default '[]'::jsonb,
  products          jsonb not null default '[]'::jsonb,
  market            text not null default '',
  traction          jsonb not null default '[]'::jsonb,
  leadership_ids    jsonb not null default '[]'::jsonb,
  competitors       jsonb not null default '[]'::jsonb,
  technology        jsonb not null default '[]'::jsonb,
  risks             jsonb not null default '[]'::jsonb,
  developments      jsonb not null default '[]'::jsonb,
  source_ids        jsonb not null default '[]'::jsonb,
  article_ids       jsonb not null default '[]'::jsonb,
  tags              jsonb not null default '[]'::jsonb,
  seo               jsonb not null default '{}'::jsonb
);

create index if not exists startups_industry_idx on public.startups (industry);
create index if not exists startups_country_idx on public.startups (country);
create index if not exists startups_stage_idx on public.startups (stage);
create index if not exists startups_name_search_idx on public.startups using gin (to_tsvector('simple', name));

create table if not exists public.people (
  id             text primary key,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  created_by     text not null default '',
  updated_by     text not null default '',
  origin         text not null default 'live',
  name           text not null,
  role           text not null default '',
  organization   text not null default '',
  startup_ids    jsonb not null default '[]'::jsonb,
  location       text not null default '',
  biography      text not null default '',
  current_role   text not null default '',
  photo_url      text not null default '',
  links          jsonb not null default '{}'::jsonb,
  article_ids    jsonb not null default '[]'::jsonb,
  interview_ids  jsonb not null default '[]'::jsonb
);

create index if not exists people_name_idx on public.people (name);

create table if not exists public.companies (
  id                  text primary key,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  created_by          text not null default '',
  updated_by          text not null default '',
  origin              text not null default 'live',
  name                text not null,
  sector              text not null default '',
  description         text not null default '',
  website_url         text not null default '',
  country             text not null default '',
  related_startup_ids jsonb not null default '[]'::jsonb
);

create table if not exists public.industries (
  id           text primary key,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  created_by   text not null default '',
  updated_by   text not null default '',
  origin       text not null default 'live',
  name         text not null,
  slug         text not null default '',
  description  text not null default '',
  parent_id    text,
  aliases      jsonb not null default '[]'::jsonb
);

create index if not exists industries_slug_idx on public.industries (slug);

create table if not exists public.events (
  id           text primary key,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  created_by   text not null default '',
  updated_by   text not null default '',
  origin       text not null default 'live',
  name         text not null,
  kind         text not null default 'other',
  start_date   timestamptz,
  end_date     timestamptz,
  location     text not null default '',
  url          text not null default '',
  description  text not null default '',
  organizer    text not null default '',
  startup_ids  jsonb not null default '[]'::jsonb,
  person_ids   jsonb not null default '[]'::jsonb,
  article_ids  jsonb not null default '[]'::jsonb
);

-- ---------------------------------------------------------------------------
-- EDITORIAL: sources, claims, media
-- ---------------------------------------------------------------------------

create table if not exists public.sources (
  id            text primary key,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  created_by    text not null default '',
  updated_by    text not null default '',
  origin        text not null default 'live',
  publisher     text not null default '',
  title         text not null default '',
  url           text not null default '',
  published_at  timestamptz,
  author        text not null default '',
  type          text not null default 'other',
  reliability   text not null default 'secondary',
  accessed_at   timestamptz,
  notes         text not null default '',
  claim_ids     jsonb not null default '[]'::jsonb
);

create index if not exists sources_publisher_idx on public.sources (publisher);

create table if not exists public.claims (
  id           text primary key,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  created_by   text not null default '',
  updated_by   text not null default '',
  origin       text not null default 'live',
  statement    text not null,
  claim_type   text not null default 'other',
  value        text not null default '',
  confidence   text not null default 'unverified',
  source_ids   jsonb not null default '[]'::jsonb,
  entity_refs  jsonb not null default '[]'::jsonb,
  verified_by  text not null default '',
  verified_at  timestamptz,
  notes        text not null default ''
);

create index if not exists claims_claim_type_idx on public.claims (claim_type);
create index if not exists claims_confidence_idx on public.claims (confidence);

-- Still assets only. Video is intentionally excluded (separate system).
create table if not exists public.media_assets (
  id           text primary key,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  created_by   text not null default '',
  updated_by   text not null default '',
  origin       text not null default 'live',
  filename     text not null,
  url          text not null default '',
  alt          text not null default '',
  caption      text not null default '',
  credit       text not null default '',
  kind         text not null default 'image',
  mime_type    text not null default '',
  width        integer not null default 0,
  height       integer not null default 0,
  size_bytes   bigint not null default 0,
  uploaded_by  text not null default '',
  folder       text not null default '',
  constraint media_assets_non_video check (kind in ('image', 'document', 'graphic', 'other'))
);

-- ---------------------------------------------------------------------------
-- RELATIONSHIPS (suggestions require explicit human approval in the console)
-- ---------------------------------------------------------------------------

create table if not exists public.relationship_suggestions (
  id                 text primary key,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  created_by         text not null default '',
  updated_by         text not null default '',
  origin             text not null default 'live',
  host_type          text not null,
  host_id            text not null,
  host_label         text not null default '',
  target_type        text not null,
  target_id          text not null,
  target_label       text not null default '',
  confidence         numeric not null default 0,
  reason             text not null default '',
  detected_entities  jsonb not null default '[]'::jsonb,
  status             text not null default 'pending',
  decided_at         timestamptz,
  decided_by         text not null default '',
  constraint relationship_suggestions_status check (status in ('pending', 'accepted', 'rejected'))
);

create index if not exists relationship_suggestions_host_idx
  on public.relationship_suggestions (host_id, status);
create unique index if not exists relationship_suggestions_unique_pair
  on public.relationship_suggestions (host_id, target_type, target_id);

-- ---------------------------------------------------------------------------
-- PUBLISHING: newsletter
-- ---------------------------------------------------------------------------

create table if not exists public.newsletter_campaigns (
  id             text primary key,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  created_by     text not null default '',
  updated_by     text not null default '',
  origin         text not null default 'live',
  name           text not null,
  subject        text not null default '',
  preview_text   text not null default '',
  template       text not null default '',
  status         text not null default 'draft',
  audience       text not null default 'all',
  article_ids    jsonb not null default '[]'::jsonb,
  content        text not null default '',
  scheduled_for  timestamptz,
  sent_at        timestamptz,
  recipients     integer not null default 0,
  -- Engagement reported back by the email provider; NULL until then, so the
  -- console can distinguish "no data" from "zero opens".
  stats          jsonb,
  constraint newsletter_campaigns_status
    check (status in ('draft', 'in_review', 'scheduled', 'sent', 'paused'))
);

create index if not exists newsletter_campaigns_status_idx
  on public.newsletter_campaigns (status, scheduled_for);

create table if not exists public.newsletter_subscribers (
  id             text primary key,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  created_by     text not null default '',
  updated_by     text not null default '',
  origin         text not null default 'live',
  email          text not null,
  frequency      text not null default 'daily',
  status         text not null default 'subscribed',
  source         text not null default '',
  subscribed_at  timestamptz not null default now(),
  constraint newsletter_subscribers_status
    check (status in ('subscribed', 'unsubscribed', 'bounced')),
  constraint newsletter_subscribers_frequency
    check (frequency in ('daily', 'weekend', 'all'))
);

create unique index if not exists newsletter_subscribers_email_key
  on public.newsletter_subscribers (lower(email));

-- ---------------------------------------------------------------------------
-- INSIGHTS: engagement + audit
-- ---------------------------------------------------------------------------

create table if not exists public.engagement_events (
  id              text primary key,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  created_by      text not null default '',
  updated_by      text not null default '',
  origin          text not null default 'live',
  at              timestamptz not null default now(),
  entity_type     text not null default 'page',
  entity_id       text not null default '',
  kind            text not null default 'view',
  traffic_source  text not null default 'direct',
  path            text not null default '',
  -- 'public' = captured on the website, 'admin' = recorded in the console.
  context         text not null default 'public',
  meta            jsonb not null default '{}'::jsonb,
  constraint engagement_events_context check (context in ('public', 'admin'))
);

create index if not exists engagement_events_at_idx on public.engagement_events (at desc);
create index if not exists engagement_events_entity_idx
  on public.engagement_events (entity_type, entity_id, at desc);
create index if not exists engagement_events_kind_idx on public.engagement_events (kind, traffic_source);

create table if not exists public.audit_events (
  id            text primary key,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  created_by    text not null default '',
  updated_by    text not null default '',
  origin        text not null default 'live',
  at            timestamptz not null default now(),
  actor_id      text not null default '',
  actor_email   text not null default '',
  actor_role    text not null default '',
  action        text not null,
  entity_type   text not null default '',
  entity_id     text not null default '',
  entity_label  text not null default '',
  detail        text not null default '',
  changes       jsonb not null default '[]'::jsonb
);

create index if not exists audit_events_at_idx on public.audit_events (at desc);
create index if not exists audit_events_actor_idx on public.audit_events (actor_email, at desc);
create index if not exists audit_events_action_idx on public.audit_events (action, at desc);

-- ---------------------------------------------------------------------------
-- SYSTEM: users, roles, taxonomy
-- ---------------------------------------------------------------------------

create table if not exists public.admin_users (
  id              text primary key,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  created_by      text not null default '',
  updated_by      text not null default '',
  origin          text not null default 'live',
  email           text not null,
  full_name       text not null default '',
  role            text not null default 'writer',
  status          text not null default 'invited',
  invited_at      timestamptz,
  last_active_at  timestamptz,
  avatar_url      text not null default '',
  notes           text not null default '',
  constraint admin_users_status check (status in ('active', 'invited', 'suspended')),
  constraint admin_users_role check (
    role in (
      'admin', 'editor', 'editor_in_chief', 'managing_editor',
      'writer', 'researcher', 'fact_checker', 'analyst'
    )
  )
);

create unique index if not exists admin_users_email_key on public.admin_users (lower(email));

create table if not exists public.admin_roles (
  id           text primary key,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  created_by   text not null default '',
  updated_by   text not null default '',
  origin       text not null default 'live',
  role         text not null,
  name         text not null default '',
  description  text not null default '',
  permissions  jsonb not null default '[]'::jsonb,
  is_system    boolean not null default false
);

create table if not exists public.taxonomy_terms (
  id           text primary key,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  created_by   text not null default '',
  updated_by   text not null default '',
  origin       text not null default 'live',
  kind         text not null default 'tag',
  name         text not null,
  slug         text not null default '',
  aliases      jsonb not null default '[]'::jsonb,
  description  text not null default '',
  constraint taxonomy_terms_kind check (kind in ('category', 'tag', 'industry'))
);

-- Spelling variants (FinTech / fintech / FINTECH) resolve to one row.
create unique index if not exists taxonomy_terms_kind_slug_key
  on public.taxonomy_terms (kind, lower(slug));

-- ---------------------------------------------------------------------------
-- updated_at triggers (one per table, no data touched)
-- ---------------------------------------------------------------------------

do $$
declare
  target text;
  tables text[] := array[
    'startups', 'people', 'companies', 'industries', 'events',
    'sources', 'claims', 'media_assets', 'relationship_suggestions',
    'newsletter_campaigns', 'newsletter_subscribers',
    'engagement_events', 'audit_events', 'admin_users', 'admin_roles',
    'taxonomy_terms'
  ];
begin
  foreach target in array tables loop
    execute format('drop trigger if exists %I on public.%I', target || '_touch_updated_at', target);
    execute format(
      'create trigger %I before update on public.%I
         for each row execute function public.nextake_touch_updated_at()',
      target || '_touch_updated_at', target
    );
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------

do $$
declare
  target text;
  tables text[] := array[
    'startups', 'people', 'companies', 'industries', 'events',
    'sources', 'claims', 'media_assets', 'relationship_suggestions',
    'newsletter_campaigns', 'newsletter_subscribers',
    'engagement_events', 'audit_events', 'admin_users', 'admin_roles',
    'taxonomy_terms'
  ];
begin
  foreach target in array tables loop
    execute format('alter table public.%I enable row level security', target);
    execute format('drop policy if exists %I on public.%I', target || '_staff_full_access', target);
    execute format(
      'create policy %I on public.%I
         for all
         to authenticated
         using (public.nextake_is_staff())
         with check (public.nextake_is_staff())',
      target || '_staff_full_access', target
    );
  end loop;
end;
$$;

-- The public website reports engagement without holding a service key. Only
-- inserts of public-context events are accepted; reads and edits stay staff-only
-- (audit_events is never writable by anonymous visitors).
drop policy if exists engagement_events_public_insert on public.engagement_events;
create policy engagement_events_public_insert
  on public.engagement_events
  for insert
  to anon
  with check (context = 'public');

-- ---------------------------------------------------------------------------
-- Optional seed for the controlled vocabularies from the brief.
-- Uses `on conflict do nothing` so an existing taxonomy is never overwritten.
-- ---------------------------------------------------------------------------

insert into public.taxonomy_terms (id, kind, name, slug, aliases, description, origin)
values
  ('tax-cat-startups',    'category', 'Startups',     'startups',     '[]'::jsonb, 'Startup ecosystem coverage', 'sample'),
  ('tax-cat-funding',     'category', 'Funding',      'funding',      '[]'::jsonb, 'Rounds, investors and capital', 'sample'),
  ('tax-cat-ai',          'category', 'AI',           'ai',           '["artificial intelligence"]'::jsonb, 'Applied AI', 'sample'),
  ('tax-cat-cyber',       'category', 'Cybersecurity','cybersecurity','["cyber security","cyber"]'::jsonb, 'Security and resilience', 'sample'),
  ('tax-cat-policy',      'category', 'Policy',       'policy',       '["regulation"]'::jsonb, 'Regulation and public policy', 'sample'),
  ('tax-cat-markets',     'category', 'Markets',      'markets',      '["economy"]'::jsonb, 'Markets and macro', 'sample'),
  ('tax-cat-innovation',  'category', 'Innovation',   'innovation',   '[]'::jsonb, 'Research and product innovation', 'sample'),
  ('tax-tag-fintech',     'tag',      'fintech',      'fintech',      '["FinTech","FINTECH","fin tech"]'::jsonb, '', 'sample'),
  ('tax-tag-vc',          'tag',      'venture capital','venture-capital','["VC","vcs"]'::jsonb, '', 'sample'),
  ('tax-tag-nigeria',     'tag',      'Nigeria',      'nigeria',      '["NG"]'::jsonb, '', 'sample'),
  ('tax-tag-kenya',       'tag',      'Kenya',        'kenya',        '["KE"]'::jsonb, '', 'sample'),
  ('tax-tag-ai',          'tag',      'AI',           'ai-tag',       '["ai"]'::jsonb, '', 'sample'),
  ('tax-tag-robotics',    'tag',      'robotics',     'robotics',     '[]'::jsonb, '', 'sample'),
  ('tax-ind-fintech',     'industry', 'Fintech',      'fintech-industry','["FinTech","FINTECH"]'::jsonb, 'Payments, lending, banking', 'sample'),
  ('tax-ind-healthtech',  'industry', 'Healthtech',   'healthtech',   '["HealthTech","health tech"]'::jsonb, 'Care delivery and health data', 'sample'),
  ('tax-ind-edtech',      'industry', 'Edtech',       'edtech',       '["EdTech"]'::jsonb, 'Learning and skills', 'sample'),
  ('tax-ind-climate',     'industry', 'Climate',      'climate',      '["cleantech","ClimateTech"]'::jsonb, 'Climate and energy', 'sample'),
  ('tax-ind-ai',          'industry', 'AI',           'ai-industry',  '["artificial intelligence"]'::jsonb, 'AI platforms and tooling', 'sample'),
  ('tax-ind-cyber',       'industry', 'Cybersecurity','cybersecurity-industry','["security"]'::jsonb, 'Security products and services', 'sample')
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- Verification hint (read-only):
--   select table_name from information_schema.tables
--   where table_schema = 'public'
--     and table_name in (
--       'startups','people','companies','industries','events','sources',
--       'claims','media_assets','relationship_suggestions',
--       'newsletter_campaigns','newsletter_subscribers','engagement_events',
--       'audit_events','admin_users','admin_roles','taxonomy_terms'
--     )
--   order by table_name;
-- ---------------------------------------------------------------------------
