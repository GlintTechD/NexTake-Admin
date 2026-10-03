# NexTake Admin — Editorial, Intelligence & Operations console

This document describes the management capability that was **added to the existing
NexTake website**. It is a feature extension: the public site, its header, footer,
navigation, layout, branding, typography and behaviour are untouched.

---

## 1. What already existed vs. what this adds

| Area | Before | Now |
| --- | --- | --- |
| Shell | Header + sidebar with a flat page list | Same visual shell, driven by the grouped IA in `src/lib/navigation.ts`, plus global search, notifications, create menu, breadcrumbs and a workspace pill |
| Dashboard | Article/telemetry dashboard | Same live `/api/public/*` telemetry **plus** quick actions, editorial status, review queue, scheduled-today, real activity log and measured performance |
| Articles | `BlogManager` CRUD modal | `ArticlesWorkspace` (filters, permission-aware row actions) + full `ArticleEditorPage` (rich text, SEO, relationships, workflow). `BlogManager` remains available on its own route |
| Website | `WebsiteManager` (hero, nav links, live feed, daily tips) | Unchanged and still authoritative, now reachable from **Publishing → Website structure** |
| Everything else | — | Sources & claims, media library, startups + dossiers, people, companies, industries, events, relationships, homepage placement, newsletter, analytics, activity log, users, roles, settings |

Nothing was rebuilt: every new screen reuses the existing design tokens (navy
`#071A2B`, mint `#7FFFD4`, `rounded-xl/2xl` cards, uppercase tracked labels) and the
shared primitives in `src/components/ui/`.

---

## 2. Information architecture

```
Overview        Dashboard
Editorial       Articles · Interviews · Shorts · Sources · Claims · Media library
Intelligence    Startups · People · Companies · Industries · Events
Relationships   Related stories · Startup coverage · Entity suggestions
Publishing      Homepage · Website structure · Newsletter
Insights        Analytics · Activity log
System          Users · Roles & permissions · Settings
```

The admin nav is separate from the public navigation. The public header links still
come from `site_settings.navLinks` / `WebsiteConfig.navLinks` and are edited in
Publishing → Website structure.

### Routing

Hash routes keep every screen linkable and refresh-safe:

| Route | Screen |
| --- | --- |
| `#/` or `#/overview` | Dashboard |
| `#/editorial/articles` | Article workspace |
| `#/editorial/articles/<id>/edit` | Article editor |
| `#/editorial/sources`, `#/editorial/claims` | Sources & claims (tabbed) |
| `#/editorial/media` | Media library (images/documents only) |
| `#/intelligence/startups`, `#/intelligence/startups/<id>` | Startup list, dossier |
| `#/intelligence/people`, `companies`, `industries`, `events` | Intelligence records |
| `#/relationships/related-stories`, `startup-coverage`, `entity-suggestions` | Relationships |
| `#/publishing/homepage`, `website`, `newsletter` | Publishing |
| `#/insights/analytics`, `activity` | Insights |
| `#/system/users`, `roles`, `settings` | System |

`toHash()` / `fromHash()` in `src/lib/navigation.ts` are the only place route strings
are built or parsed.

---

## 3. Roles and permissions

Roles (brief §22): `admin`, `editor_in_chief`, `managing_editor`, `editor`, `writer`,
`researcher`, `fact_checker`, `analyst`. The legacy `admin` / `editor` pair still
works, so existing sessions and RLS policies keep functioning.

* The matrix lives in `src/lib/permissions.ts` (`ROLE_DEFINITIONS`, `ALL_PERMISSIONS`).
* Components never check roles directly — they check permissions through
  `can(profile, "articles.publish")`.
* `Roles & permissions` writes overrides into the `admin_roles` table/local store; a
  role without an override uses the shipped definition.
* Destructive actions (`delete`, `archive`, `restore sample workspace`) require an
  explicit confirm dialog.

### Authentication

* `AuthProvider` → Supabase Auth password check, then a 6-digit code (or email link).
  Admin routes render only for an authenticated profile (`AdminGate`).
* With no Supabase project configured the build uses a **clearly labelled demo
  backend**: any valid email + 8-character password, and the verification code is
  shown on screen. This path is unreachable in a production deployment because it is
  gated on `isSupabaseConfigured === false`.
* No credential, service key or secret is hard-coded anywhere in the client. Secrets
  belong in server-side environment variables (`VITE_SUPABASE_URL`,
  `VITE_SUPABASE_ANON_KEY` are the only public ones and carry no privilege beyond RLS).

---

## 4. Data model

```
Article ──┬─ Startup ──── Funding round ── Source
          ├─ Person  ──── Interview
          ├─ Source  ──── Claim ──── Entity (startup/person/company/article)
          ├─ Category / Tag / Industry   (controlled vocabulary)
          └─ Related article
Startup ──┬─ Funding round, Development, Financial metric
          ├─ Person (leadership), Company (competitor/partner), Industry
          └─ Article (coverage), Source, Event
Person  ──┴─ Startup, Article, Interview, Event
```

Records live in the workspace provider (`src/lib/workspace/`):

1. **Supabase** when configured, using the tables created by
   `supabase/migrations/20261003_nextake_intelligence.sql`.
2. **Local workspace** otherwise — the console says which mode each collection is in
   (`CollectionHealth`) instead of pretending a write succeeded.

Existing production tables (`articles`, `daily_tips`, `site_settings`, `companies`) are
read through the code that already used them; the migration is additive and contains no
`drop`, `truncate` or destructive `alter`.

### Composition rules

* Financial values always carry **value + disclosure status + source + date**.
  Nothing is presented as disclosed when it is estimated or undisclosed.
* Dossiers are structured (Overview, Financials, Funding, Products & market,
  Leadership, Developments, Coverage, Due diligence, Sources, SEO) — not free text.
* Sources are reusable and record publisher, URL, publication date, author, type and
  reliability; claims attach to sources and to the entities they describe
  (funding amount, leadership change, market expansion, metrics, product).
* People are reusable records referenced by startups, articles and interviews.
* Taxonomy is canonicalised (`resolveTaxonomy`): `FinTech`, `fintech` and `FINTECH`
  collapse to one controlled value with the others kept as aliases.
* Sample workspace records carry `origin: "sample"` and are labelled in the UI; anything
  a user creates is `origin: "live"`.

---

## 5. Editorial workflow

Statuses: `draft → in_review → approved → scheduled → published`, plus `unpublished`
and `archived`. Reviewer state (`reviewState`) is layered on top so an editor can see
"needs review" without losing the publishing status.

* Writers see their own drafts; review/publish actions appear only with the matching
  permission.
* Destructive actions (archive, delete) confirm first, and every state change writes an
  audit entry.
* The editor has four tabs: **Content** (rich text: bold, italic, headings, lists,
  links, images, quotes, embeds), **Relationships** (startups, related stories, people,
  tags, internal linking search over articles/startups/people + external URLs),
  **SEO & discovery** (slug, meta title, meta description, OG image, featured image),
  **Publishing workflow** (save draft, preview, submit for review, approve, schedule,
  publish).
* `ArticlePreviewModal` renders the story exactly as the public site would.

### Suggestions never publish themselves

`EntitySuggestionsPage` and `SuggestionPanel` implement detected-entity / suggested
startup / suggested story flows. Accepting a suggestion:

1. records the decision (`decidedBy`, `decidedAt`) on the suggestion,
2. writes the relationship to the host record,
3. writes an audit entry.

Rejecting keeps the decision on file so the candidate is not proposed again. **Nothing
is linked, published or made visible without an explicit human approval.**

---

## 6. Analytics — measured, never invented

The console reads `engagement_events` through
`src/lib/workspace/analytics.ts#aggregateAnalytics` (period 7/30/90 days, default 30).

* If no events exist for the window, `hasTrackedData` is `false` and every panel shows
  an explanatory state instead of fabricated numbers.
* Sample-workspace events are marked as sample data in the UI.
* Shares, reads, clicks, top stories, top startups and traffic sources
  (direct/search/social/referral/internal) are derived only from recorded events.
* Server aggregates can be fetched from `GET /api/public/analytics?period=30d`; when the
  endpoint is not deployed the call fails quietly and the screen says the console is
  falling back to locally captured events.

### Collecting events

The public site should `POST` to `/api/public/track` (proxied by Vite to the API
service) with the payload defined in `analytics.ts#TrackerPayload`:

```json
{
  "entityType": "article",
  "entityId": "art-1",
  "kind": "view",
  "trafficSource": "search",
  "path": "/story/example",
  "referrer": "https://news.example"
}
```

Until that endpoint is live, the console still captures admin-side previews (recorded
with `context: "admin"`, kept separate from public traffic) so the pipeline can be
verified end to end.

---

## 7. Media library boundary (no video)

Video production and distribution belong to NexTake's **separate video system**.

* The media library accepts images (JPEG/PNG/WebP, ≤ 8 MB) and non-video documents.
* Uploading a `video/*` file is rejected with an explanation.
* There is no video upload, no video asset management, no video publishing workflow and
  no video column or bucket in the migration.
* Article `type` covers `article`, `interview` and `short` — video is not a content type
  in this console.

---

## 8. Newsletter and homepage

* **Homepage** manages *content placement only* for the structures that already exist:
  HERO (main + two secondary), TRENDING, EDITOR'S PICKS and STARTUP SPOTLIGHT. Manual
  ordering supports drag-and-drop and keyboard reordering; sections can be switched to
  automatic "latest" ordering. The public homepage design is never modified from here.
* **Newsletter** manages campaigns (name, status, recipients, template, audience,
  schedule), subscribers and templates, with preview and analytics views. Engagement
  numbers only appear when the email provider reports them back — a campaign with no
  reported data says so. Delivery uses the deployed email provider endpoint; while it is
  unconfigured the console records the send request rather than claiming a delivery.

---

## 9. Applying the migration

```bash
# review first — the file is additive and idempotent
supabase db push
# or run it directly
psql "$DATABASE_URL" -f supabase/migrations/20261003_nextake_intelligence.sql
```

Safe properties:

* `create table if not exists` / `create index if not exists` throughout.
* No `drop`/`truncate` of existing objects; the only `drop` statements target this
  migration's own triggers and policies so it can be re-run.
* RLS is enabled on every new table, with full access limited to authenticated
  `admin_profiles` users and a single narrow `anon` INSERT policy for public
  engagement events.
* Taxonomy seeds use `on conflict do nothing` — an existing vocabulary is never
  overwritten.

After applying it, the console switches those collections from "local workspace" to
"database" automatically; no redeploy is required.

---

## 10. Running the console

```bash
npm install
npm run dev        # http://localhost:3000  (binds 0.0.0.0)
npm run build      # type-check + production bundle
npm run lint
```

Environment (optional — the console runs on the local workspace without them):

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

With neither variable set, sign in with any valid email and an 8+ character password;
the demo verification code is displayed on screen.

---

## 11. Where things live

| Concern | File |
| --- | --- |
| IA + hash routing | `src/lib/navigation.ts` |
| Permissions matrix | `src/lib/permissions.ts` |
| Domain model | `src/lib/workspace/types.ts` |
| Seeds (all marked `sample`) | `src/lib/workspace/seed.ts` |
| Supabase ↔ local persistence | `src/lib/workspace/persistence.ts` |
| Relationship engine, entity index, internal links | `src/lib/workspace/relations.ts` |
| Taxonomy canonicalisation | `src/lib/workspace/taxonomy.ts` |
| Analytics aggregation + tracker contract | `src/lib/workspace/analytics.ts` |
| Rich text / markdown | `src/lib/markdown.ts`, `src/components/admin/RichTextEditor.tsx` |
| Design primitives | `src/components/ui/*` |
| Console pages | `src/components/pages/**` |
| Database schema | `supabase/migrations/20261003_nextake_intelligence.sql` |
