# Project Status

## Current module: 4 (secure bidding system)

### Completed (code written)

- `supabase/migrations/004_bidding.sql`: `bids` table (+ indexes, unique `(auction_id, amount)`), RLS (own rows readable only, no client writes), `place_bid()` (authenticated, row-locked, atomic), `get_bid_history()` (public, anonymised), `get_my_bids()`, `auction_has_bids()`, trigger freezing price/increment/deadline once bids exist, delete policy blocking deletion of listings with bids, realtime publication for `auctions`
- Minimum bid: starting price with no bids, otherwise highest bid + the auction's `min_increment`; whole rupees; seller and current leader cannot bid; `active` and before `ends_at`
- `auctions.current_price` is a cache written only by `place_bid()`; the highest bid is re-derived from `bids` under the lock
- Bid service layer (`biddingService.js`, `bidResponse.js`), `BidPanel`, `BidHistory`, live updates with polling fallback (`useAuctionLive`), `/my-bids` page, nav link, updated auction detail page
- Tests: `tests/bidding.test.mjs`, `supabase/tests/004_bidding_test.sql`, `supabase/tests/concurrency_test.sh`
- Module 3 features untouched (listings, auth, search, filter, sort, navigation); changes to shared files are small and listed in the README

### Verification status (what was ACTUALLY run in the build environment)

| Check | Result |
| ----- | ------ |
| `schema.sql` then `004_bidding.sql` on PostgreSQL 16 (local, with a small imitation of Supabase roles / `auth.uid()`), on a fresh database | Applied without errors; migration also re-run (idempotent); `schema.sql` then migration re-run again |
| `supabase/tests/004_bidding_test.sql` (impersonating anon / authenticated users via `set role` + JWT claims) | **52 / 52 checks passed**, twice (fresh database and after re-running the scripts) |
| `supabase/tests/concurrency_test.sh`: 12 parallel clients x 150 bids, and a same-amount race with a held lock | **Passed** (no duplicate amounts, no bid below previous + increment, `current_price` = highest bid, exactly one of two identical simultaneous bids accepted) |
| Function privileges / table grants audit | `anon` can execute only `get_bid_history`; `authenticated` has only `SELECT` on `bids` |
| `npm test` (`node --test`) | **43 / 43 passed** (31 Module 3 + 12 new bidding tests) |
| esbuild bundle of `src/main.jsx` (all JSX/JS parsed, every relative import and named export resolved; npm packages treated as external) | Passed, 0 errors |
| `npm install` | **NOT RUN.** The npm registry returned 403 (blocked) in the build environment. `package-lock.json` is not included |
| `npm run build` (Vite) | **NOT RUN** (needs `npm install`) |
| App running in a browser (UI, styling, responsive layout, live updates) | **NOT RUN** |
| Real Supabase project (PostgREST RPC calls, Realtime, Auth with real JWTs) | **NOT RUN.** The RPC names, parameters and returned column names were checked against the SQL by hand; the local tests call the functions directly in SQL |

If `npm install`, `npm run build`, the SQL, or any manual test in the README reports an error, send me the full message and I will fix it.

### Manual configuration required (cannot be done from code)

1. Everything from Module 3 (Supabase project, `.env`, `supabase/schema.sql`, Auth URLs)
2. Run `supabase/migrations/004_bidding.sql` in the SQL Editor (after `schema.sql`)
3. Optional: run `supabase/tests/004_bidding_test.sql` in the SQL Editor (rolls back)
4. If Realtime is off for your project, enable it for `auctions` (otherwise the page polls every 20 s)

### Next: Module 5 (finalising auctions). See "Requirements for Module 5" in the README.
