-- ============================================================================
-- NexTake Admin — one-time super administrator sign-up
-- ============================================================================
--
-- WHAT THIS MIGRATION DOES
--   • Lets the console offer a sign-up screen that claims the single
--     super administrator seat (`admin_profiles.role = 'admin'`).
--   • Enforces the "exactly one super administrator" invariant INSIDE THE
--     DATABASE, not in the UI:
--       – a partial unique index allows at most one `role = 'admin'` row,
--       – an auth trigger only claims the seat for sign-ups that ask for it
--         and only while it is still unclaimed (concurrent sign-ups resolve
--         deterministically: the first insert wins, the second is dropped),
--       – a SECURITY DEFINER function exposes nothing but the boolean
--         "does a super administrator exist yet?" so anonymous visitors can
--         never read admin_profiles directly.
--   • Adds no data and touches no existing table shape.
--
-- WHAT IT DELIBERATELY DOES NOT DO
--   • It never drops, truncates or rewrites an existing table, column or
--     policy, and it never reads or rewrites any production row.
--   • It cannot create a SECOND super administrator: once any `role =
--     'admin'` row exists, every later claim is refused — by the trigger
--     guard and by the unique index.
--   • Everything is `if not exists` / `create or replace`, so it is safe to
--     run more than once.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Existence probe — the ONLY fact about admin_profiles ever exposed to
--    anonymous callers. Returns a boolean; never an identity or a count.
-- ---------------------------------------------------------------------------

create or replace function public.nextake_super_admin_exists()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admin_profiles p where p.role = 'admin'
  );
$$;

-- Sign-up screens (anonymous) and the console (authenticated) both need it.
revoke all on function public.nextake_super_admin_exists() from public;
grant execute on function public.nextake_super_admin_exists()
  to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. The invariant: at most ONE super administrator, ever.
--
-- Created only when the current data satisfies it (zero or one admin row),
-- so a database that somehow already holds several admin rows is left
-- untouched and can be reconciled manually. From the moment the index
-- exists, no code path — this trigger, the console, or raw SQL through the
-- API — can insert a second `role = 'admin'` profile.
-- ---------------------------------------------------------------------------

do $$
begin
  if not exists (
    select 1 from pg_indexes
    where schemaname = 'public'
      and indexname = 'admin_profiles_single_super_admin'
  ) then
    if (
      select count(*) from public.admin_profiles where role = 'admin'
    ) <= 1 then
      create unique index admin_profiles_single_super_admin
        on public.admin_profiles ((role))
        where role = 'admin';
    end if;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. Seat claiming — runs when a new auth user is created.
--
-- The sign-up screen passes `nextake_super_admin: 'true'` in the sign-up
-- metadata. The trigger claims the seat for that user ONLY while no super
-- administrator exists yet; every other account creation path (invitations,
-- provider magic links, dashboard-created users) is never promoted.
--
-- `on conflict do nothing` + the partial unique index make concurrent
-- first-time sign-ups safe: exactly one profile row can ever result.
-- ---------------------------------------------------------------------------

create or replace function public.nextake_claim_super_admin_seat()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Only explicit super administrator sign-ups are eligible …
  if coalesce(new.raw_user_meta_data ->> 'nextake_super_admin', '') <> 'true' then
    return new;
  end if;

  -- … and only while the seat is still empty.
  if exists (select 1 from public.admin_profiles where role = 'admin') then
    return new;
  end if;

  -- Never attach a second profile to an existing user.
  if exists (select 1 from public.admin_profiles p where p.id = new.id) then
    return new;
  end if;

  insert into public.admin_profiles (id, email, full_name, role)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), 'Super Administrator'),
    'admin'
  )
  on conflict do nothing; -- a concurrent sign-up won the seat a moment earlier

  return new;
end;
$$;

drop trigger if exists nextake_claim_super_admin_seat_trigger on auth.users;
create trigger nextake_claim_super_admin_seat_trigger
  after insert on auth.users
  for each row
  execute function public.nextake_claim_super_admin_seat();

-- ---------------------------------------------------------------------------
-- Verification hints (read-only):
--   select public.nextake_super_admin_exists();           -- t when claimed
--   select indexname from pg_indexes
--    where indexname = 'admin_profiles_single_super_admin';
--   select tgname from pg_trigger
--    where tgname = 'nextake_claim_super_admin_seat_trigger';
-- ---------------------------------------------------------------------------
