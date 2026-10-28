#!/usr/bin/env bash
# CampusAuction - Module 4 concurrency test (LOCAL PostgreSQL only; needs psql + pgbench).
#
# Fires many simultaneous place_bid() calls from several different users at ONE auction and
# then checks the invariants that must always hold:
#   1. every stored bid beats the previous one by at least min_increment (no stale-read bids)
#   2. auctions.current_price = highest stored bid
#   3. no duplicate amounts, and no bid was stored for a rejected call
#
# Usage:  PGHOST=... PGPORT=... PGUSER=... PGDATABASE=camp ./supabase/tests/concurrency_test.sh
# Requires schema.sql + migrations/004_bidding.sql applied and the 'authenticated' role to exist.
# Do NOT run against a real Supabase project: it creates and removes fake auth users.
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
tmp="$(mktemp -d)"; trap 'rm -rf "$tmp"' EXIT

AUCTION=20000000-0000-4000-8000-000000000001
psql -q -v ON_ERROR_STOP=1 <<SQL
delete from auth.users where email like 'conc%@test.local';
insert into auth.users (id, email)
  select ('30000000-0000-4000-8000-0000000000' || lpad(g::text, 2, '0'))::uuid, 'conc' || g || '@test.local' from generate_series(1, 12) g;
insert into auth.users (id, email) values ('30000000-0000-4000-8000-0000000000aa', 'conc-seller@test.local');
insert into public.auctions (id, seller_id, title, description, category, condition, starting_price, min_increment, ends_at)
values ('$AUCTION', '30000000-0000-4000-8000-0000000000aa', 'Concurrency auction', '', 'books', 'Good', 100, 10, now() + interval '1 day');
SQL

# Each pgbench client acts as a random user and bids a random amount that is often stale or equal to others'.
cat > "$tmp/bid.sql" <<SQL
\set uid random(1, 12)
\set amount random(100, 3000)
begin;
select set_config('request.jwt.claims', json_build_object('sub', ('30000000-0000-4000-8000-0000000000' || lpad(:uid::text, 2, '0')), 'role', 'authenticated')::text, true);
set local role authenticated;
select public.place_bid('$AUCTION', :amount);
commit;
SQL

pgbench -n -c 12 -j 4 -t 150 -f "$tmp/bid.sql" >/dev/null

psql -q -v ON_ERROR_STOP=1 <<SQL
do \$\$
declare n int; dup int; bad int; price numeric; mx numeric;
begin
  select count(*) into n from public.bids where auction_id = '$AUCTION';
  select count(*) - count(distinct amount) into dup from public.bids where auction_id = '$AUCTION';
  select count(*) into bad from (
    select amount - lag(amount) over (order by created_at, amount) as step
    from public.bids where auction_id = '$AUCTION') s
  where step is not null and step < 10;
  select current_price into price from public.auctions where id = '$AUCTION';
  select max(amount) into mx from public.bids where auction_id = '$AUCTION';
  raise notice 'accepted bids: %  duplicate amounts: %  steps smaller than min_increment: %  current_price: %  max bid: %', n, dup, bad, price, mx;
  if n < 2 then raise exception 'FAIL: expected several accepted bids, got %', n; end if;
  if dup <> 0 then raise exception 'FAIL: duplicate amounts stored'; end if;
  if bad <> 0 then raise exception 'FAIL: a bid was accepted without beating the previous one by the increment'; end if;
  if price is distinct from mx then raise exception 'FAIL: current_price differs from the highest bid'; end if;
  raise notice 'CONCURRENCY TEST PASSED';
end \$\$;
delete from public.auctions where id = '$AUCTION';
SQL

# ---- Deterministic race: two users submit the SAME amount at the same moment on a fresh auction.
RACE=20000000-0000-4000-8000-000000000002
psql -q -v ON_ERROR_STOP=1 -c "insert into public.auctions (id, seller_id, title, description, category, condition, starting_price, min_increment, ends_at) values ('$RACE', '30000000-0000-4000-8000-0000000000aa', 'Race auction', '', 'books', 'Good', 100, 10, now() + interval '1 day')"
as_user() { # as_user <n> <amount> <sleep-seconds-before-commit>
  psql -qAt -v ON_ERROR_STOP=1 <<SQL
begin;
select set_config('request.jwt.claims', json_build_object('sub', '30000000-0000-4000-8000-0000000000' || lpad('$1', 2, '0'), 'role', 'authenticated')::text, true);
set local role authenticated;
select '$1 -> ' || (public.place_bid('$RACE', $2) ->> 'ok');
select pg_sleep($3);
commit;
SQL
}
out1="$tmp/r1"; out2="$tmp/r2"
as_user 1 500 2 > "$out1" &            # takes the row lock first and holds it for 2 s
sleep 0.5
as_user 2 500 0 > "$out2" &            # must wait for user 1, then re-read the new highest bid
wait
echo "race result: $(grep -h -- '->' "$out1" "$out2" | tr '\n' ' ')"
psql -q -v ON_ERROR_STOP=1 <<SQL
do \$\$
declare n int;
begin
  select count(*) into n from public.bids where auction_id = '$RACE';
  if n <> 1 then raise exception 'FAIL: race stored % bids for the same amount, expected exactly 1', n; end if;
  raise notice 'RACE TEST PASSED (exactly one of two identical simultaneous bids was accepted)';
end \$\$;
delete from public.auctions where id = '$RACE';
SQL

psql -q -c "delete from auth.users where email like 'conc%@test.local'"
