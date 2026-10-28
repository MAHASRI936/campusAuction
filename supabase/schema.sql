-- =============================================================================
-- CampusAuction - Module 3 database setup (Supabase / PostgreSQL)
--
-- HOW TO RUN: Supabase dashboard -> SQL Editor -> New query -> paste this whole
-- file -> Run. It is safe to run more than once (idempotent).
--
-- What it creates:
--   1. public.profiles   - one row per auth user (full name), filled by a trigger
--   2. public.auctions   - listings, each owned by a seller (auth.users.id)
--   3. Row-Level Security policies + column-level privileges
--
-- Security model in one paragraph:
--   RLS decides WHICH ROWS a user may touch (always via auth.uid(), never a
--   user id sent by the browser). Column privileges decide WHICH COLUMNS the
--   browser may write: clients can never set current_price, status, created_at,
--   updated_at or change seller_id. Module 4 will change current_price from a
--   SECURITY DEFINER function, not from the browser.
-- =============================================================================

create extension if not exists pgcrypto;  -- gen_random_uuid() (already on in Supabase)

-- -----------------------------------------------------------------------------
-- Helper: keep updated_at current
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- 1. PROFILES
-- -----------------------------------------------------------------------------
create table if not exists public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  full_name  text not null default '' check (char_length(full_name) <= 100),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Create the profile automatically when someone signs up. SECURITY DEFINER lets
-- the trigger write even though the new user has no session yet (for example
-- while email confirmation is pending). The browser never inserts profiles.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    left(coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), ''), 100)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Accounts created before this script ran get a profile too.
insert into public.profiles (id, full_name)
select u.id, left(coalesce(nullif(trim(u.raw_user_meta_data ->> 'full_name'), ''), ''), 100)
from auth.users u
on conflict (id) do nothing;

-- Policies (drop first so the script can be re-run)
drop policy if exists "profiles_select_authenticated" on public.profiles;
drop policy if exists "profiles_insert_own"           on public.profiles;
drop policy if exists "profiles_update_own"           on public.profiles;

-- Logged-in users can read profiles (needed to show a seller's name).
create policy "profiles_select_authenticated" on public.profiles
  for select to authenticated
  using (true);

create policy "profiles_insert_own" on public.profiles
  for insert to authenticated
  with check (id = (select auth.uid()));

create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- No delete policy: profiles are removed only when the auth user is deleted.

-- Column privileges: start from nothing, then grant only what the app needs.
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant insert (id, full_name) on public.profiles to authenticated;
grant update (full_name)     on public.profiles to authenticated;

-- -----------------------------------------------------------------------------
-- 2. AUCTIONS
--
-- Frontend (camelCase)  ->  column (snake_case)
--   id               ->  id
--   sellerId         ->  seller_id
--   title            ->  title
--   description      ->  description
--   category         ->  category          (books, electronics, calculators, cycles, hostel, other)
--   condition        ->  condition         (New, Like New, Good, Fair)
--   startingPrice    ->  starting_price    (whole rupees)
--   currentBid       ->  current_price     (NULL = no bids yet; see Module 4 notes)
--   minIncrement     ->  min_increment
--   endsAt           ->  ends_at
--   pickupLocation   ->  pickup_location
--   imageUrl         ->  image_url
--   status           ->  status            (active | closed)
--   createdAt        ->  created_at
--   updatedAt        ->  updated_at
-- -----------------------------------------------------------------------------
create table if not exists public.auctions (
  id              uuid primary key default gen_random_uuid(),
  seller_id       uuid not null references auth.users (id) on delete cascade,
  title           text not null,
  description     text not null default '',
  category        text not null,
  condition       text not null,
  starting_price  numeric(12, 2) not null,
  current_price   numeric(12, 2),                 -- NULL until the first bid (Module 4)
  min_increment   numeric(12, 2) not null default 10,
  pickup_location text not null default '',
  image_url       text,
  status          text not null default 'active',
  ends_at         timestamptz not null,           -- Module 2 requires a deadline on every listing
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  constraint auctions_title_length       check (char_length(btrim(title)) between 3 and 100),
  constraint auctions_description_length check (char_length(description) <= 2000),
  constraint auctions_category_valid     check (category in ('books', 'electronics', 'calculators', 'cycles', 'hostel', 'other')),
  constraint auctions_condition_valid    check (condition in ('New', 'Like New', 'Good', 'Fair')),
  constraint auctions_starting_price_ok  check (starting_price > 0 and starting_price <= 10000000),
  constraint auctions_current_price_ok   check (current_price is null or current_price >= starting_price),
  constraint auctions_min_increment_ok   check (min_increment > 0),
  constraint auctions_image_url_http     check (image_url is null or image_url ~* '^https?://'),
  constraint auctions_status_valid       check (status in ('active', 'closed'))
);

create index if not exists auctions_seller_id_idx  on public.auctions (seller_id);
create index if not exists auctions_status_idx     on public.auctions (status);
create index if not exists auctions_created_at_idx on public.auctions (created_at desc);
create index if not exists auctions_ends_at_idx    on public.auctions (ends_at);

drop trigger if exists auctions_set_updated_at on public.auctions;
create trigger auctions_set_updated_at
  before update on public.auctions
  for each row execute function public.set_updated_at();

-- Turn RLS on BEFORE the app touches the table.
alter table public.auctions enable row level security;

drop policy if exists "auctions_select_public"     on public.auctions;
drop policy if exists "auctions_insert_own"        on public.auctions;
drop policy if exists "auctions_update_own"        on public.auctions;
drop policy if exists "auctions_delete_own"        on public.auctions;

-- Visitors and users see active auctions; a seller also sees their own closed ones.
create policy "auctions_select_public" on public.auctions
  for select to anon, authenticated
  using (status = 'active' or seller_id = (select auth.uid()));

-- You can only create a listing for yourself. A different seller_id is rejected.
create policy "auctions_insert_own" on public.auctions
  for insert to authenticated
  with check (seller_id = (select auth.uid()));

-- You can only change your own rows, and you cannot hand a row to someone else.
create policy "auctions_update_own" on public.auctions
  for update to authenticated
  using (seller_id = (select auth.uid()))
  with check (seller_id = (select auth.uid()));

create policy "auctions_delete_own" on public.auctions
  for delete to authenticated
  using (seller_id = (select auth.uid()));

-- Column privileges. Anything not listed here cannot be written from the browser.
revoke all on public.auctions from anon, authenticated;
grant select on public.auctions to anon, authenticated;

grant insert (id, seller_id, title, description, category, condition,
              starting_price, min_increment, pickup_location, image_url, ends_at)
  on public.auctions to authenticated;

-- seller_id, current_price, status, created_at, updated_at are NOT updatable by clients.
grant update (title, description, category, condition,
              starting_price, min_increment, pickup_location, image_url, ends_at)
  on public.auctions to authenticated;

grant delete on public.auctions to authenticated;

-- -----------------------------------------------------------------------------
-- Quick self-check (run separately if you like):
--   select tablename, rowsecurity from pg_tables where schemaname = 'public';
--   -> both profiles and auctions must show rowsecurity = true
-- -----------------------------------------------------------------------------
