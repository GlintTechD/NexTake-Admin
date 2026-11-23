# NexTake Intelligence Engine (NIE) in this admin

The **Editorial → AI newsroom** page is where editors review drafts written by NIE (a separate Python service).

```
Editor's browser ──(Supabase session token)──> /api/nie/*  (api/nie/[...path].ts, Vercel function)
                                                 │ verifies token + admin_profiles role, allow-lists routes
                                                 ▼ (server-side NIE key + X-NIE-Actor: editor email)
                                              NIE API (VPS, HTTPS) ──(Supabase service key)──> `articles`, Storage `nextake-media`
```

The browser never holds an NIE key or the Supabase service key.

## What was added
| File | Purpose |
|---|---|
| `api/nie/[...path].ts` | Server-side proxy. Role levels: `editor`/`managing_editor` = review actions; `admin`/`editor_in_chief` = also pause/resume, auto-publish, retract, audit log. Other roles are refused. |
| `src/lib/nie/{types,client}.ts` | Typed client; sends the Supabase access token. |
| `src/components/pages/nie/*` | Review queue, article review page (claims + evidence, risk findings, gate results, image upload), newsroom panel (health, pause, auto-publish, audit trail), sign-in gate. |
| `src/types.ts`, `src/lib/navigation.ts`, `src/App.tsx` | Two routes (`nie-review`, `nie-article`), nav item under Editorial (permission `articles.review`). |

## Sign-in
The console has no sign-in page (it opens as a local administrator). These pages publish to the live site, so they
show their own sign-in (password, then emailed code by default) and the proxy re-checks the session and role on every
call. To allow one specific account to sign in with password only, set the build-time Vercel variable
`VITE_NIE_PASSWORD_ONLY_EMAIL` to its exact email address and redeploy; other accounts still require the emailed code.
The password-only account must already exist in Supabase Auth and have an editor-capable `admin_profiles` role.
Password-only removes the second email verification step for that account; use a strong unique password.

## Setup
1. **Vercel project env**: `VITE_NIE_PASSWORD_ONLY_EMAIL` (optional account email; public build-time setting),
   plus the server-side (not `VITE_`) `NIE_API_URL` (HTTPS URL of NIE), `NIE_EDITOR_KEY`, `NIE_ADMIN_KEY`
   (two different keys from NIE's `NIE_API_KEYS=<k1>:editor,<k2>:admin`). `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` already exist and are reused.
2. **NIE `.env`** (VPS): `CMS_ADAPTER=supabase`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `PUBLIC_BASE_URL` (so thumbnails load), optional `CMS_PUBLIC_ARTICLE_URL`. Put Caddy in front (`deploy/Caddyfile.example` in the NIE repo).
3. Redeploy. Open **Editorial → AI newsroom**, sign in.

## Publishing mapping (NIE → `articles`)
Same columns as `articleInputToRow`: `slug, title, summary, category, status='published', published_at, link_behavior='reader',
tags, cover_image_url, image_credit, read_time, syndicated_body/content (markdown), source_url/source_name (lead source),
author/original_author='NexTake Intelligence', updated_by='NIE:<id>'`. NIE categories map to admin categories
(Startups/Venture Capital→Business, Technology/Cybersecurity→Software Engineering, Telecoms→Hardware, Innovation→Product); the NIE category is kept as a tag. Override with `CMS_CATEGORY_MAP`.

## Things found in this repo that you should know about
1. **Apply the articles RLS migration before exposing the console.** Run
   `supabase/migrations/20261009_articles_staff_rls.sql` against the CMS database.
   It enables RLS, removes prior `articles` policies, permits anonymous reads of
   published articles only, and permits article changes only to authenticated
   users present in `admin_profiles`. NIE's server-side service-role key bypasses
   RLS; it must never be placed in the browser.
2. `src/lib/publishing/youtube.test.ts` imports `vitest`, which is not in `devDependencies`.
