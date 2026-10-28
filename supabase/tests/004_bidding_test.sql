-- =============================================================================
-- CampusAuction - Module 4 database tests (pure SQL)
--
-- Run in the Supabase SQL Editor (or: psql -v ON_ERROR_STOP=1 -f this-file) AFTER
-- schema.sql and migrations/004_bidding.sql. Everything happens inside ONE
-- transaction that is ROLLED BACK at the end, so no data is left behind (the three
-- fake users and their auctions disappear). It stops with an error on the first
-- failed check; otherwise it prints "PASS ..." lines and "ALL BIDDING TESTS PASSED".
--
-- It impersonates users exactly like PostgREST does: `set role authenticated` plus
-- the request.jwt.claims setting that auth.uid() reads.
-- =============================================================================
begin;

create schema ca_test;
grant usage on schema ca_test to public;

-- Switch the session to "logged in as <uid>" / "anonymous" / back to admin.
create function ca_test.login(p_uid uuid) returns void language plpgsql as $$
begin
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', p_uid, 'role', 'authenticated')::text, true);
  set local role authenticated;
end $$;
create function ca_test.anon() returns void language plpgsql as $$
begin
  reset role;
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  set local role anon;
end $$;
create function ca_test.admin() returns void language plpgsql as $$
begin
  reset role;
  perform set_config('request.jwt.claims', '', true);
end $$;
create function ca_test.check(p_ok boolean, p_name text) returns void language plpgsql as $$
begin
  if p_ok is not true then
    raise exception 'FAIL: %', p_name;
  end if;
  raise notice 'PASS: %', p_name;
end $$;
grant execute on all functions in schema ca_test to public;

do $$
declare
  a uuid := '00000000-0000-4000-8000-00000000000a';  -- seller
  b uuid := '00000000-0000-4000-8000-00000000000b';  -- bidder 1
  c uuid := '00000000-0000-4000-8000-00000000000c';  -- bidder 2
  live    uuid := '10000000-0000-4000-8000-000000000001';
  closed  uuid := '10000000-0000-4000-8000-000000000002';
  expired uuid := '10000000-0000-4000-8000-000000000003';
  nobids  uuid := '10000000-0000-4000-8000-000000000004';
  ghost   uuid := '10000000-0000-4000-8000-0000000000ff';
  r jsonb;
  n bigint;
  v numeric;
  failed boolean;
begin
  -- ---------------------------------------------------------------- fixtures (as admin)
  perform ca_test.admin();
  insert into auth.users (id, email) values (a, 'a@test.local'), (b, 'b@test.local'), (c, 'c@test.local');
  insert into public.profiles (id, full_name) values (a, 'Seller A'), (b, 'Bidder B'), (c, 'Bidder C') on conflict (id) do nothing;
  insert into public.auctions (id, seller_id, title, description, category, condition, starting_price, min_increment, ends_at, status) values
    (live,    a, 'Live auction',    '', 'books', 'Good', 100, 10, now() + interval '1 day',  'active'),
    (closed,  a, 'Closed auction',  '', 'books', 'Good', 100, 10, now() + interval '1 day',  'closed'),
    (expired, a, 'Expired auction', '', 'books', 'Good', 100, 10, now() - interval '1 hour', 'active'),
    (nobids,  a, 'No-bid auction',  '', 'books', 'Good', 100, 10, now() + interval '1 day',  'active');

  -- ---------------------------------------------------------------- 1/2: authentication
  perform ca_test.anon();
  failed := false;
  begin
    perform public.place_bid(live, 100);
  exception when insufficient_privilege then failed := true; end;
  perform ca_test.check(failed, '02 anonymous role cannot call place_bid (permission denied)');

  perform ca_test.admin();
  perform set_config('request.jwt.claims', '{"role":"authenticated"}', true);   -- role without a user id
  set local role authenticated;
  r := public.place_bid(live, 100);
  perform ca_test.check(r ->> 'code' = 'not_authenticated', '02b authenticated role with no user id is rejected inside the function');

  -- ---------------------------------------------------------------- 3: seller cannot bid
  perform ca_test.login(a);
  r := public.place_bid(live, 500);
  perform ca_test.check(r ->> 'code' = 'own_auction', '03 seller cannot bid on own auction');

  -- ---------------------------------------------------------------- 4: below minimum (first bid)
  perform ca_test.login(b);
  r := public.place_bid(live, 99);
  perform ca_test.check(r ->> 'code' = 'bid_too_low' and (r ->> 'min_bid')::numeric = 100, '04 first bid below starting price is rejected (min 100)');

  -- ---------------------------------------------------------------- 1: valid bid
  r := public.place_bid(live, 100);
  perform ca_test.check((r ->> 'ok')::boolean and (r ->> 'min_next_bid')::numeric = 110, '01 valid first bid (= starting price) accepted; next minimum is 110');
  perform ca_test.admin();
  select current_price into v from public.auctions where id = live;
  perform ca_test.check(v = 100, '11a current_price = 100 after first bid');

  -- ---------------------------------------------------------------- 5: not above highest + increment
  perform ca_test.login(c);
  r := public.place_bid(live, 100);
  perform ca_test.check(r ->> 'code' = 'bid_too_low', '05a bid equal to current highest is rejected');
  r := public.place_bid(live, 109);
  perform ca_test.check(r ->> 'code' = 'bid_too_low' and (r ->> 'min_bid')::numeric = 110, '05b bid above highest but below increment is rejected (min 110)');
  perform ca_test.login(b);
  r := public.place_bid(live, 500);
  perform ca_test.check(r ->> 'code' = 'already_highest', '05c highest bidder cannot outbid themselves');

  -- ---------------------------------------------------------------- 6/7/8: closed, expired, missing
  r := public.place_bid(closed, 500);
  perform ca_test.check(r ->> 'code' = 'auction_closed', '06 bid on closed auction rejected');
  r := public.place_bid(expired, 500);
  perform ca_test.check(r ->> 'code' = 'auction_ended', '07 bid on expired auction rejected');
  r := public.place_bid(ghost, 500);
  perform ca_test.check(r ->> 'code' = 'auction_not_found', '08 bid on nonexistent auction rejected');
  r := public.place_bid(null, 500);
  perform ca_test.check(r ->> 'code' = 'invalid_amount', '08b null auction id rejected');

  -- ---------------------------------------------------------------- invalid / huge amounts
  perform ca_test.login(c);
  perform ca_test.check((public.place_bid(live, 0) ->> 'code') = 'invalid_amount',  '09a zero rejected');
  perform ca_test.check((public.place_bid(live, -50) ->> 'code') = 'invalid_amount', '09b negative rejected');
  perform ca_test.check((public.place_bid(live, null) ->> 'code') = 'invalid_amount', '09c null rejected');
  perform ca_test.check((public.place_bid(live, 150.5) ->> 'code') = 'invalid_amount', '09d fractional rupees rejected');
  perform ca_test.check((public.place_bid(live, 100000001) ->> 'code') = 'amount_too_large', '09e above maximum rejected');
  perform ca_test.check((public.place_bid(live, 99999999999999) ->> 'code') = 'amount_too_large', '09f numeric overflow is a clean rejection, not a crash');

  -- ---------------------------------------------------------------- second valid bid
  r := public.place_bid(live, 110);
  perform ca_test.check((r ->> 'ok')::boolean, '01b second bidder places 110 (= highest + increment)');

  -- ---------------------------------------------------------------- 11: price matches bids
  perform ca_test.admin();
  select a.current_price = (select max(amount) from public.bids where auction_id = live) into failed from public.auctions a where a.id = live;
  perform ca_test.check(failed, '11b current_price equals the maximum accepted bid');
  select count(*) into n from public.bids where auction_id = live;
  perform ca_test.check(n = 2, '11c exactly the 2 accepted bids were stored (rejected ones left nothing)');

  -- ---------------------------------------------------------------- 10: history
  perform ca_test.anon();
  select count(*) into n from public.get_bid_history(live);
  perform ca_test.check(n = 2, '10a anonymous visitors can read the history of an active auction');
  select amount into v from public.get_bid_history(live) limit 1;
  perform ca_test.check(v = 110, '10b history is sorted by amount descending');
  select (select is_highest from public.get_bid_history(live) where amount = 110)
     and not (select is_highest from public.get_bid_history(live) where amount = 100)
     and (select bool_and(not is_mine) from public.get_bid_history(live))
     and (select bool_and(bidder_label ~ '^Bidder [0-9]+$') from public.get_bid_history(live)) into failed;
  perform ca_test.check(failed, '10c only the top bid is flagged highest; labels are anonymous; nothing is "mine" for a visitor');
  perform ca_test.check(not exists (select 1 from information_schema.columns
                                    where table_name = 'get_bid_history' and column_name in ('bidder_id', 'email')),
                        '10d history exposes no bidder id / email column');
  perform ca_test.login(c);
  select count(*) into n from public.get_bid_history(live) where is_mine;
  perform ca_test.check(n = 1, '10e logged-in bidder sees exactly their own bid marked is_mine');
  perform ca_test.anon();
  select count(*) into n from public.get_bid_history(closed);
  perform ca_test.check(n = 0, '10f history of a closed auction is not public');
  select count(*) into n from public.get_bid_history(nobids);
  perform ca_test.check(n = 0, '10g auction with no bids returns an empty history');

  -- ---------------------------------------------------------------- 13: clients cannot touch bids
  perform ca_test.login(b);
  failed := false;
  begin insert into public.bids (auction_id, bidder_id, amount) values (live, b, 9999); exception when insufficient_privilege then failed := true; end;
  perform ca_test.check(failed, '13a client cannot INSERT into bids directly');
  failed := false;
  begin insert into public.bids (auction_id, bidder_id, amount) values (live, c, 9999); exception when insufficient_privilege then failed := true; end;
  perform ca_test.check(failed, '15a client cannot insert a bid in another user''s name');
  failed := false;
  begin update public.bids set amount = 1 where bidder_id = b; exception when insufficient_privilege then failed := true; end;
  perform ca_test.check(failed, '13b client cannot UPDATE a bid');
  failed := false;
  begin delete from public.bids where bidder_id = b; exception when insufficient_privilege then failed := true; end;
  perform ca_test.check(failed, '13c client cannot DELETE a bid');
  select count(*) into n from public.bids;
  perform ca_test.check(n = 1, '13d a bidder can read only their own bid rows (1 of 2)');
  perform ca_test.login(a);
  select count(*) into n from public.bids;
  perform ca_test.check(n = 0, '13e the seller cannot read raw bid rows (only the anonymised history)');
  perform ca_test.anon();
  failed := false;
  begin perform count(*) from public.bids; exception when insufficient_privilege then failed := true; end;
  perform ca_test.check(failed, '13f anonymous visitors have no access to the bids table');

  -- ---------------------------------------------------------------- 14: clients cannot move the price
  perform ca_test.login(a);
  failed := false;
  begin update public.auctions set current_price = 100 where id = live; exception when insufficient_privilege then failed := true; end;
  perform ca_test.check(failed, '14a seller cannot update current_price');
  failed := false;
  begin update public.auctions set status = 'closed' where id = live; exception when insufficient_privilege then failed := true; end;
  perform ca_test.check(failed, '14b seller cannot update status');
  perform ca_test.login(b);
  failed := false;
  begin update public.auctions set current_price = 1 where id = live; exception when insufficient_privilege then failed := true; end;
  perform ca_test.check(failed, '14c another user cannot update current_price');
  failed := false;
  begin insert into public.auctions (seller_id, title, description, category, condition, starting_price, current_price, ends_at)
        values (b, 'sneaky', '', 'books', 'Good', 100, 100, now() + interval '1 day'); exception when insufficient_privilege then failed := true; end;
  perform ca_test.check(failed, '14d cannot create a listing that already has a current_price');

  -- ---------------------------------------------------------------- seller rule freeze after bids
  perform ca_test.login(a);
  failed := false;
  begin update public.auctions set ends_at = now() + interval '1 minute' where id = live; exception when sqlstate 'CA001' then failed := true; end;
  perform ca_test.check(failed, '16a seller cannot change the deadline after bids exist');
  failed := false;
  begin update public.auctions set starting_price = 5000 where id = live; exception when sqlstate 'CA001' then failed := true; end;
  perform ca_test.check(failed, '16b seller cannot change the starting price after bids exist');
  failed := false;
  begin update public.auctions set min_increment = 1 where id = live; exception when sqlstate 'CA001' then failed := true; end;
  perform ca_test.check(failed, '16c seller cannot change the minimum increment after bids exist');
  update public.auctions set title = 'Renamed live auction' where id = live;
  get diagnostics n = row_count;
  perform ca_test.check(n = 1, '16d seller can still edit title/description after bids exist');
  delete from public.auctions where id = live;
  get diagnostics n = row_count;
  perform ca_test.check(n = 0, '16e seller cannot delete an auction that has bids');
  delete from public.auctions where id = nobids;
  get diagnostics n = row_count;
  perform ca_test.check(n = 1, '16f seller can still delete an auction without bids');

  -- ---------------------------------------------------------------- bids table is the truth, not the cache
  perform ca_test.admin();
  update public.auctions set current_price = 100 where id = live;   -- simulate a drifted cache (admin only)
  perform ca_test.login(b);
  r := public.place_bid(live, 115);
  perform ca_test.check(r ->> 'code' = 'bid_too_low' and (r ->> 'min_bid')::numeric = 120,
                        '17 minimum is derived from the bids table (120), not from a drifted current_price');
  r := public.place_bid(live, 120);
  perform ca_test.check((r ->> 'ok')::boolean, '17b valid bid repairs the cached price');
  perform ca_test.admin();
  select current_price into v from public.auctions where id = live;
  perform ca_test.check(v = 120, '17c current_price is 120 again');

  -- ---------------------------------------------------------------- my bids
  perform ca_test.login(b);
  select count(*), bool_and(is_leading), max(my_highest_bid) into n, failed, v from public.get_my_bids();
  perform ca_test.check(n = 1 and failed and v = 120, '18a get_my_bids lists the user''s auction, leading, highest 120');
  perform ca_test.login(c);
  select bool_and(not is_leading) into failed from public.get_my_bids();
  perform ca_test.check(failed, '18b outbid user is shown as not leading');
  perform ca_test.anon();
  failed := false;
  begin perform * from public.get_my_bids(); exception when insufficient_privilege then failed := true; end;
  perform ca_test.check(failed, '18c anonymous cannot call get_my_bids');

  perform ca_test.admin();
  raise notice 'ALL BIDDING TESTS PASSED';
end $$;

rollback;
