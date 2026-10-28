-- =============================================================================
-- CampusAuction - Module 4 migration: secure bidding system
--
-- HOW TO RUN (manual step): Supabase dashboard -> SQL Editor -> New query ->
-- paste this whole file -> Run. Run supabase/schema.sql (Module 3) FIRST.
-- Safe to run more than once (idempotent).
--
-- What it creates
--   1. public.bids                    one row per ACCEPTED bid (append-only)
--   2. public.place_bid(uuid, numeric)   the ONLY way to create a bid (RPC)
--   3. public.get_bid_history(uuid)      public, privacy-safe bid history (RPC)
--   4. public.get_my_bids()              the logged-in user's own bidding activity (RPC)
--   5. public.auction_has_bids(uuid)     helper used by policies/triggers
--   6. Triggers / policy changes that stop the price rules being bypassed
--   7. Realtime publication for public.auctions (current price updates)
--
-- BIDDING RULES (single source of truth: this file)
--   * Minimum bid     : no bids yet -> starting_price
--                       otherwise   -> highest bid + auctions.min_increment
--     min_increment is stored per auction (default 10 rupees, suggested by the
--     listing form from the starting price), so the rule is configurable per listing.
--   * Whole rupees only, at most 100,000,000 (see v_max_bid below).
--   * The seller cannot bid. You cannot outbid yourself (you already lead).
--   * The auction must be status = 'active' AND now() < ends_at.
--
-- CURRENT HIGHEST BID
--   The bids table is the source of truth. auctions.current_price is a cache that
--   is written ONLY by place_bid(), in the same transaction as the bid insert.
--   place_bid() re-derives the highest bid from public.bids while it holds the
--   auction row lock, so a drifting cache could never let a stale value through.
--
-- CONCURRENCY
--   place_bid() locks the auction row (SELECT ... FOR UPDATE). Two simultaneous
--   bids are therefore processed one after the other; the second one re-reads
--   the new highest bid and is rejected (or accepted) against it. A unique index
--   on (auction_id, amount) is a second line of defence.
-- =============================================================================

create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- 1. BIDS TABLE
-- -----------------------------------------------------------------------------
create table if not exists public.bids (
  id          uuid primary key default gen_random_uuid(),
  auction_id  uuid not null references public.auctions (id) on delete cascade,
  bidder_id   uuid not null references auth.users (id) on delete cascade,
  amount      numeric(12, 2) not null,
  created_at  timestamptz not null default clock_timestamp(),

  constraint bids_amount_positive check (amount > 0),
  constraint bids_amount_max      check (amount <= 100000000)
);

create index if not exists bids_auction_amount_idx on public.bids (auction_id, amount desc);
create index if not exists bids_bidder_id_idx      on public.bids (bidder_id);
create index if not exists bids_created_at_idx     on public.bids (created_at desc);

-- Accepted bids on one auction always strictly increase, so an amount can never repeat.
-- (Also stops two racing transactions from both storing the same amount.)
create unique index if not exists bids_auction_amount_unique on public.bids (auction_id, amount);

-- -----------------------------------------------------------------------------
-- 2. ROW-LEVEL SECURITY + PRIVILEGES ON BIDS
--
-- Clients may only READ their own bid rows. There is no insert / update / delete
-- policy and no insert / update / delete privilege, so the browser can never write
-- to this table directly. Public history goes through get_bid_history() instead,
-- which hides bidder identities.
-- -----------------------------------------------------------------------------
alter table public.bids enable row level security;

drop policy if exists "bids_select_own" on public.bids;
create policy "bids_select_own" on public.bids
  for select to authenticated
  using (bidder_id = (select auth.uid()));

revoke all on public.bids from public, anon, authenticated;
grant select on public.bids to authenticated;

-- -----------------------------------------------------------------------------
-- 3. HELPER: does an auction have bids?  (SECURITY DEFINER so it sees ALL bids,
--    not just the caller's own, which RLS would otherwise limit it to.)
-- -----------------------------------------------------------------------------
create or replace function public.auction_has_bids(p_auction_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.bids b where b.auction_id = p_auction_id);
$$;

revoke all on function public.auction_has_bids(uuid) from public, anon, authenticated;
grant execute on function public.auction_has_bids(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- 4. place_bid(): validate and store a bid atomically
--
-- Returns jsonb. Business-rule failures are RETURNED (nothing is written):
--   { "ok": false, "code": "<code>", "message": "<safe text>", "min_bid": <number|null> }
-- Success:
--   { "ok": true, "bid_id": "...", "amount": 1500, "min_next_bid": 1550 }
-- Codes: not_authenticated, invalid_amount, amount_too_large, auction_not_found,
--        own_auction, auction_closed, auction_ended, already_highest, bid_too_low
-- Unexpected problems (lock timeout, permission) raise a normal SQL error.
-- The bidder is ALWAYS auth.uid(); no bidder id is accepted from the client.
-- -----------------------------------------------------------------------------
create or replace function public.place_bid(p_auction_id uuid, p_amount numeric)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid       uuid := auth.uid();
  v_max_bid   constant numeric := 100000000;
  v_auction   public.auctions%rowtype;
  v_high      numeric;
  v_high_by   uuid;
  v_min_bid   numeric;
  v_bid_id    uuid;
begin
  -- Do not wait forever behind another bidder; the client shows a "busy, retry" message.
  perform set_config('lock_timeout', '5s', true);

  -- 1. Authenticated?
  if v_uid is null then
    return jsonb_build_object('ok', false, 'code', 'not_authenticated',
      'message', 'Please log in to place a bid.');
  end if;

  -- 2. Sane amount (cheap checks first; nothing is locked yet)
  if p_auction_id is null or p_amount is null or p_amount <= 0 or p_amount <> trunc(p_amount) then
    return jsonb_build_object('ok', false, 'code', 'invalid_amount',
      'message', 'Enter a bid as a whole number of rupees greater than zero.');
  end if;
  if p_amount > v_max_bid then
    return jsonb_build_object('ok', false, 'code', 'amount_too_large',
      'message', 'That bid is above the maximum supported amount of 100,000,000 rupees.');
  end if;

  -- 3. Lock the auction row. From here until commit nobody else can bid on, close,
  --    or re-price this auction, and everything below is read fresh.
  select * into v_auction from public.auctions a where a.id = p_auction_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'auction_not_found',
      'message', 'This auction does not exist or is no longer available.');
  end if;

  -- 4. Seller cannot bid on their own auction
  if v_auction.seller_id = v_uid then
    return jsonb_build_object('ok', false, 'code', 'own_auction',
      'message', 'You cannot bid on your own listing.');
  end if;

  -- 5. Open for bidding? (clock_timestamp() = the real time now, after any lock wait)
  if v_auction.status <> 'active' then
    return jsonb_build_object('ok', false, 'code', 'auction_closed',
      'message', 'This auction is closed.');
  end if;
  if clock_timestamp() >= v_auction.ends_at then
    return jsonb_build_object('ok', false, 'code', 'auction_ended',
      'message', 'This auction has ended.');
  end if;

  -- 6. Current highest bid, re-read from the bids table under the lock
  select b.amount, b.bidder_id into v_high, v_high_by
  from public.bids b
  where b.auction_id = p_auction_id
  order by b.amount desc, b.created_at desc
  limit 1;

  if v_high_by = v_uid then
    return jsonb_build_object('ok', false, 'code', 'already_highest',
      'message', 'You are already the highest bidder.');
  end if;

  v_min_bid := case when v_high is null then v_auction.starting_price
                    else v_high + v_auction.min_increment end;

  if p_amount < v_min_bid then
    return jsonb_build_object('ok', false, 'code', 'bid_too_low',
      'message', case when v_high is null
                   then 'Your bid must be at least the starting price.'
                   else 'Your bid must be at least the current highest bid plus the minimum increment.' end,
      'min_bid', v_min_bid);
  end if;

  -- 7. Store the bid and update the cached price in the same transaction
  insert into public.bids (auction_id, bidder_id, amount)
  values (p_auction_id, v_uid, p_amount)
  returning id into v_bid_id;

  update public.auctions set current_price = p_amount where id = p_auction_id;

  return jsonb_build_object('ok', true, 'bid_id', v_bid_id, 'amount', p_amount,
                            'min_next_bid', p_amount + v_auction.min_increment);
end;
$$;

revoke all on function public.place_bid(uuid, numeric) from public, anon, authenticated;
grant execute on function public.place_bid(uuid, numeric) to authenticated;

-- -----------------------------------------------------------------------------
-- 5. get_bid_history(): public, privacy-safe history of one auction
--
-- Visible when the auction is 'active' (like the auctions SELECT policy), or the
-- caller is its seller, or the caller has bid on it. Bidders appear only as
-- "Bidder 1", "Bidder 2", ... numbered by their first bid on THIS auction; no
-- ids, emails or names are returned. `is_mine` marks the caller's own bids.
-- Sorted by amount desc, then time desc. total_count = all bids (rows are capped).
-- -----------------------------------------------------------------------------
create or replace function public.get_bid_history(p_auction_id uuid, p_limit integer default 100)
returns table (
  bid_id       uuid,
  amount       numeric,
  created_at   timestamptz,
  bidder_label text,
  is_mine      boolean,
  is_highest   boolean,
  total_count  bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  with visible as (
    select a.id
    from public.auctions a
    where a.id = p_auction_id
      and (
        a.status = 'active'
        or a.seller_id = (select auth.uid())
        or exists (select 1 from public.bids mine
                   where mine.auction_id = a.id and mine.bidder_id = (select auth.uid()))
      )
  ),
  numbered as (
    select b.bidder_id,
           row_number() over (order by min(b.created_at), b.bidder_id) as n
    from public.bids b
    join visible v on v.id = b.auction_id
    group by b.bidder_id
  ),
  ranked as (
    select b.id, b.amount, b.created_at, b.bidder_id,
           row_number() over (order by b.amount desc, b.created_at desc, b.id) as pos,
           count(*) over () as total
    from public.bids b
    join visible v on v.id = b.auction_id
  )
  select r.id,
         r.amount,
         r.created_at,
         'Bidder ' || n.n::text,
         coalesce(r.bidder_id = (select auth.uid()), false),
         r.pos = 1,
         r.total
  from ranked r
  join numbered n on n.bidder_id = r.bidder_id
  order by r.pos
  limit greatest(1, least(coalesce(p_limit, 100), 200));
$$;

revoke all on function public.get_bid_history(uuid, integer) from public, anon, authenticated;
grant execute on function public.get_bid_history(uuid, integer) to anon, authenticated;

-- -----------------------------------------------------------------------------
-- 6. get_my_bids(): the logged-in user's own bidding activity (one row per auction)
-- -----------------------------------------------------------------------------
create or replace function public.get_my_bids()
returns table (
  auction_id     uuid,
  title          text,
  image_url      text,
  status         text,
  ends_at        timestamptz,
  my_highest_bid numeric,
  my_bid_count   bigint,
  current_price  numeric,
  is_leading     boolean,
  last_bid_at    timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select a.id,
         a.title,
         a.image_url,
         a.status,
         a.ends_at,
         max(b.amount),
         count(*),
         (select max(x.amount) from public.bids x where x.auction_id = a.id),
         max(b.amount) = (select max(x.amount) from public.bids x where x.auction_id = a.id),
         max(b.created_at)
  from public.bids b
  join public.auctions a on a.id = b.auction_id
  where b.bidder_id = (select auth.uid())
  group by a.id, a.title, a.image_url, a.status, a.ends_at
  order by max(b.created_at) desc
  limit 200;
$$;

revoke all on function public.get_my_bids() from public, anon, authenticated;
grant execute on function public.get_my_bids() to authenticated;

-- -----------------------------------------------------------------------------
-- 7. Protect the rules that bids depend on
--
-- Module 3 let a seller edit starting_price, min_increment and ends_at at any time
-- and delete the listing. Once bids exist that would let a seller rewrite the rules
-- under the bidders (shorten the deadline, raise the step, wipe the bids by deleting).
-- So after the first bid:
--   * those three columns are frozen (trigger),
--   * the seller can no longer delete the listing (delete policy).
-- Everything else (title, description, image ...) stays editable.
-- Deleting an auth user still cascades normally; the policy only limits the browser.
-- -----------------------------------------------------------------------------
create or replace function public.auctions_protect_bid_rules()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (new.starting_price is distinct from old.starting_price
      or new.min_increment is distinct from old.min_increment
      or new.ends_at is distinct from old.ends_at)
     and public.auction_has_bids(old.id) then
    raise exception 'The starting price, minimum increment and closing time cannot be changed after bids have been placed.'
      using errcode = 'CA001';
  end if;
  return new;
end;
$$;

revoke all on function public.auctions_protect_bid_rules() from public, anon, authenticated;

drop trigger if exists auctions_protect_bid_rules on public.auctions;
create trigger auctions_protect_bid_rules
  before update on public.auctions
  for each row execute function public.auctions_protect_bid_rules();

drop policy if exists "auctions_delete_own" on public.auctions;
create policy "auctions_delete_own" on public.auctions
  for delete to authenticated
  using (seller_id = (select auth.uid()) and not public.auction_has_bids(id));

-- -----------------------------------------------------------------------------
-- 8. Realtime: let the browser hear about price changes on auctions
--    (events respect the auctions SELECT policy; the app only uses them as a
--    signal to RE-FETCH, never as data or authorisation).
-- -----------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (select 1 from pg_publication_tables
                     where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'auctions') then
    alter publication supabase_realtime add table public.auctions;
  end if;
end;
$$;

-- -----------------------------------------------------------------------------
-- Self-check (run separately):
--   select tablename, rowsecurity from pg_tables where schemaname = 'public';   -- all true
--   select grantee, privilege_type from information_schema.role_table_grants
--     where table_schema = 'public' and table_name = 'bids';                   -- authenticated SELECT only
-- -----------------------------------------------------------------------------
