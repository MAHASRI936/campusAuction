# CampusBid / CampusAuction - Campus Second-Hand Auction Marketplace

**Module 4: secure bidding.** Logged-in users bid on other people's auctions; every bid is validated and stored by a
PostgreSQL function (not by the browser), the highest bid and bid history come from the database, and the bid
history updates live. Built on **Module 3** (Supabase authentication, listings in PostgreSQL, Row-Level Security).
Finalising auctions and choosing winners is **not** implemented yet (Module 5). See [Module 4: bidding](#module-4-bidding).

## Tech stack

- React 18 + Vite 5 (JavaScript), Tailwind CSS 3, React Router 6, Lucide React
- `@supabase/supabase-js` v2 (new in Module 3; the only new dependency)
- Supabase Auth + PostgreSQL (with Row-Level Security)
- Git and GitHub

## Prerequisites

- Node.js 18 or newer (20 LTS recommended): `node -v`
- npm: `npm -v`
- Git: `git --version`
- A free Supabase account: https://supabase.com
- A GitHub account (to push the code)

---

## Quick start (read this first)

> Steps marked **[Supabase dashboard]** must be done by you in the browser. Nothing in this project can do them for you.

1. Unzip `CampusAuction-Module4.zip`. You get a folder named `campusbid`.
2. `cd campusbid`
3. `npm install` (this also creates `package-lock.json`; commit it later).
4. **[Supabase dashboard]** Create a Supabase project (section "Supabase setup" below).
5. Copy `.env.example` to `.env` and paste your Project URL and anon/publishable key.
6. **[Supabase dashboard]** Run `supabase/schema.sql` in the SQL Editor, **then** `supabase/migrations/004_bidding.sql`.
7. `npm run dev` and open http://localhost:5173.

If you skip steps 4 to 6 the app shows a "Supabase is not set up yet" screen instead of crashing.

---

## Supabase setup (step by step)

Dashboard labels change from time to time; the names below are the usual ones.

### 1. Create the project  [Supabase dashboard]

1. Sign in at https://supabase.com and click **New project**.
2. Choose an organisation, a project name (for example `campusauction`), a strong database password (save it
   in a password manager; this app does not need it) and the region closest to your users.
3. Wait until the project finishes provisioning (about a minute).

### 2. Get the URL and the public key  [Supabase dashboard]

1. Open **Project Settings -> API** (or **API Keys**).
2. Copy the **Project URL** (looks like `https://abcdxyz.supabase.co`).
3. Copy the **anon / publishable** key. This is the PUBLIC key and is designed to be used in the browser.
4. **Do not copy the `service_role` / secret key anywhere in this project.** It bypasses all security. The app
   refuses to start if it detects one in `VITE_SUPABASE_ANON_KEY`.

### 3. Configure the environment variables

```bash
cp .env.example .env        # Windows PowerShell:  Copy-Item .env.example .env
```

Edit `.env`:

```
VITE_SUPABASE_URL=https://abcdxyz.supabase.co
VITE_SUPABASE_ANON_KEY=<your anon / publishable key>
```

`.env` is listed in `.gitignore`. Never commit it. Restart `npm run dev` after changing it.

### 4. Run the SQL  [Supabase dashboard]

1. Open **SQL Editor -> New query**.
2. Open `supabase/schema.sql` from this project, copy everything, paste it, click **Run**.
3. You should see "Success. No rows returned". The script can be run again safely.
4. Check: **Table Editor** shows `profiles` and `auctions`, and both show "RLS enabled".
5. **Module 4:** open a new query, paste `supabase/migrations/004_bidding.sql`, click **Run**. It also can be run again
   safely. Now `bids` is listed too. **Order matters:** `schema.sql` first, then `004_bidding.sql`. If you ever re-run
   `schema.sql` later, run `004_bidding.sql` again afterwards (it restores the "no delete once bids exist" policy).

### 5. Configure Auth  [Supabase dashboard]

1. **Authentication -> Providers -> Email** must be enabled (it is by default).
2. **Authentication -> URL Configuration**: set **Site URL** to `http://localhost:5173` and add
   `http://localhost:5173/**` to **Redirect URLs**. (When you deploy, also add your real site address.)
   This is what makes the link in the confirmation email come back to your app.
3. Email confirmation is your choice:
   - **ON** (default for most projects): new users must click the link in an email before they can log in. The
     app handles this: after registering it shows "Check your email" with a resend button.
   - **OFF** (handy while developing): users are logged in immediately after registering.
   The app works with both.
   Note: the built-in Supabase email service has a low hourly sending limit; for real use configure your own SMTP.

### 6. Optional demo listings

`supabase/demo_seed.sql` inserts the nine Module 2 sample listings for a user you choose. It is **never** run
automatically and is not part of `schema.sql`. Instructions are in the file's header. Demo rows end with `[demo]` in
the description and show no bids.

---

## What changed in Module 3

| Area | Result |
| ---- | ------ |
| Auth | Register, log in, log out, session restored after refresh, loading state while the session is checked, email-confirmation flow, friendly errors (wrong password, duplicate account, weak password, rate limit, offline) |
| Protected routes | `/sell`, `/auctions/:id/edit`, `/my-listings` redirect to `/login` and return you afterwards |
| Database | Listings live in `public.auctions`; profiles in `public.profiles` (created by a database trigger on sign-up) |
| Ownership | Each listing stores `seller_id`. Edit/delete controls only show for the owner, and the database refuses everyone else |
| New page | **My Listings** (`/my-listings`) with edit/delete (delete asks for confirmation) |
| Detail page | Shows the seller (name visible to logged-in users) and owner-only controls |
| Still working | Browse, search, category + condition filters, sorting (all in the URL), detail pages, create/edit/delete |
| Removed | Demo notice, "Reset demo data", and the localStorage-backed `listingsService` (replaced by Supabase) |

### Routes

| Route | Page | Needs login |
| ----- | ---- | ----------- |
| `/` | Home | no |
| `/auctions` | Browse (search, filters, sort) | no |
| `/auctions/:id` | Auction detail | no |
| `/auctions/:id/edit` | Edit listing (owner only) | yes |
| `/sell` | Create listing | yes |
| `/my-listings` | Your listings | yes |
| `/my-bids` | Your bidding activity (Module 4) | yes |
| `/login`, `/register` | Authentication | no (logged-in users are redirected away) |

## Project structure (new or changed files marked)

```
campusbid/
├── .env.example                       # NEW placeholders (real .env is git-ignored)
├── supabase/
│   ├── schema.sql                     # Module 3 tables, constraints, indexes, RLS, trigger, privileges
│   ├── migrations/004_bidding.sql     # MODULE 4 bids table, place_bid(), history RPCs, RLS, triggers (manual)
│   ├── tests/004_bidding_test.sql     # MODULE 4 database tests (SQL, rolled back)
│   ├── tests/concurrency_test.sh      # MODULE 4 simultaneous-bid test (local PostgreSQL + pgbench)
│   └── demo_seed.sql                  # optional demo data (manual)
├── tests/
│   ├── listings.test.mjs              # validation / filtering / sorting (kept)
│   ├── supabase.test.mjs              # config, mapping, auth validation, import, errors (kept)
│   └── bidding.test.mjs               # MODULE 4 bid rules, input validation, response + row mapping
└── src/
    ├── lib/supabaseConfig.js          # NEW env validation (refuses secret keys)
    ├── lib/supabaseClient.js          # NEW the single Supabase client
    ├── context/AuthContext.jsx        # NEW auth state (session, signIn, signUp, signOut)
    ├── hooks/useAuth.js, useAsyncData.js            # NEW
    ├── hooks/useListings.js           # CHANGED async: { listings, loading, error, reload }
    ├── services/listingsService.js    # CHANGED Supabase queries (fetch/create/update/delete/mine/import)
    ├── services/profilesService.js, serviceError.js # NEW
    ├── services/sessionImages.js      # NEW session-only image previews (moved from the old service)
    ├── services/legacyLocalListings.js# NEW read-only helper for the optional localStorage import
    ├── utils/listingMapper.js         # NEW camelCase <-> snake_case column mapping
    ├── utils/authValidation.js, authErrors.js       # NEW
    ├── components/AuthCard, RequireAuth, LoadingState, ErrorState, ConfigMissing   # NEW
    ├── components/Navbar.jsx          # CHANGED logged-in / logged-out links, log out
    └── pages/ Login, Register (real forms), Sell, EditListing, AuctionDetail, Browse, Home (CHANGED), MyListings (NEW)

    Module 4 additions / changes:
    ├── services/biddingService.js     # NEW placeBid, fetchBidHistory, fetchMyBids, subscribeToAuction (RPC calls)
    ├── services/bidResponse.js        # NEW turns place_bid()'s answer into success or a safe error
    ├── services/serviceError.js       # CHANGED maps CA001 (rules locked), 55P03 (busy), 42883 (migration missing)
    ├── services/listingsService.js    # CHANGED clear message when deleting a listing that has bids
    ├── hooks/useAsyncData.js          # CHANGED adds refresh() (background re-read, no loading screen)
    ├── hooks/useListings.js           # CHANGED useListing also returns refresh
    ├── hooks/useAuctionLive.js        # NEW live updates (Realtime) with polling fallback
    ├── utils/bidding.js               # NEW minimum-bid rule, input validation, messages, row mapping
    ├── components/BidPanel.jsx        # NEW bid form / login prompt / owner + ended messages
    ├── components/BidHistory.jsx      # NEW bid history list
    ├── components/Navbar.jsx          # CHANGED "My Bids" link
    └── pages/AuctionDetailPage.jsx (CHANGED), MyBidsPage.jsx (NEW), App.jsx (CHANGED route /my-bids)
```

## Database design

### Field mapping (frontend -> column)

`sellerId -> seller_id`, `startingPrice -> starting_price`, `currentBid -> current_price`,
`minIncrement -> min_increment`, `pickupLocation -> pickup_location`, `imageUrl -> image_url`,
`endsAt -> ends_at`, `createdAt -> created_at`, `updatedAt -> updated_at`. The mapping lives only in
`src/utils/listingMapper.js`. Module 2's fields `minIncrement` and `pickupLocation` were kept (not dropped).

### Decisions worth knowing

- `ends_at` is **NOT NULL** (the brief allows nullable): every Module 2 listing has a deadline and the form requires one.
- `current_price` is **NULL until the first bid** (this is how Module 2's `currentBid: null` works). A check enforces
  `current_price >= starting_price` when set.
- `starting_price` must be `> 0` and at most 1,00,00,000 (same limits as the form). Category and condition are limited to the
  values the app uses (a check constraint; add a migration if you add categories).
- `status` is `active` or `closed`. Clients cannot change it (see below).
- `image_url` accepts only `http(s)` links. Image *files* are still not stored (see limitations).

## Row-Level Security and privileges

RLS is enabled on both tables **before** the app uses them. Policies use `auth.uid()` (the identity inside the signed
login token), never an id sent by the browser.

**profiles**: logged-in users can read profiles; you can insert/update only your own row (`id = auth.uid()`); no deletes.

**auctions**:
- anyone (including visitors) can read `active` auctions; a seller can also read their own non-active ones
- insert only with `seller_id = auth.uid()` (another `seller_id` is rejected)
- update/delete only rows where `seller_id = auth.uid()`; the update check also stops handing a row to someone else

**Column privileges (second layer).** `schema.sql` revokes default table privileges and grants the browser role only:
insert and update of the editable columns (title, description, category, condition, starting_price, min_increment,
pickup_location, image_url, ends_at). So even the owner cannot set `current_price`, `status`, `created_at`,
`updated_at` or change `seller_id` from the browser. Module 4 changes `current_price` only from the server-side `place_bid()` function; `status` is for Module 5.

Hiding buttons in the UI is only a courtesy. The service layer also checks ownership for friendly error messages, but
the security boundary is the database.

## Authentication notes

- Passwords go straight to Supabase Auth over HTTPS. They are never put in localStorage, sessionStorage or our tables.
- Supabase keeps the login session itself (in the browser) and refreshes it automatically; the app asks for the stored
  session on start-up and shows a loading screen meanwhile.
- With email confirmation ON, sign-up does **not** create a session. The app detects this and shows "Check your email".
  Supabase also hides whether an email is already registered in that mode; the app handles that case.
- After login you are returned to the page you were trying to open (only paths inside the app are allowed).
- If `.env` is missing or wrong, a setup screen explains exactly what to fix.

## Development commands

```bash
npm run dev       # development server (http://localhost:5173)
npm run build     # production build in dist/
npm run preview   # serve the production build (run build first)
npm test          # logic tests (Node built-in runner, no extra packages)
```

## Manual testing instructions

Use two accounts (A and B), for example in a normal window and a private window. Replace "expected" with what you see.

| # | Test | Steps | Expected |
| - | ---- | ----- | -------- |
| 1 | Register | `/register`, fill the form | Logged in (confirmation OFF) or "Check your email" screen (ON) |
| 2 | Email confirmation | With confirmation ON: click the link in the email | Returns to the app; you can log in. Try logging in before confirming: message asks you to confirm, with a resend link |
| 3 | Login | `/login` with valid credentials | Redirected; navbar shows your name, My Listings, Log out |
| 4 | Invalid login | Wrong password | "Incorrect email or password." No redirect |
| 5 | Logout | Click Log out | Back on Home; navbar shows Login/Register |
| 6 | Refresh | Log in, press F5 on any page | Still logged in (brief "Checking your login") |
| 7 | Create | `/sell`, submit valid form | Redirect to the new auction with a success message |
| 8 | In the database | Supabase **Table Editor -> auctions** | New row, `seller_id` = your user id (Authentication -> Users -> UID), `current_price` empty, `status` active |
| 9 | Edit own | Detail page -> Edit listing -> change title | Saved; shows on detail and in Browse |
| 10 | Delete own | Delete -> confirm dialog -> confirm | Listing disappears; row removed in Table Editor. Cancel leaves it untouched |
| 11 | Not logged in | Log out, open `/sell` | Sent to `/login` with "Please log in..." message, then to `/sell` after login |
| 12 | Other user's listing | As B open `/auctions/<A's id>` and `/auctions/<A's id>/edit` | No edit/delete buttons; edit URL says "You can't edit this listing". Also run the SQL test below |
| 13 | Browse | `/auctions` | Active listings from all users |
| 14 | Search/filter/sort | Use search, category chips, condition, sort | Results change; URL parameters preserved on refresh |
| 15 | Detail by id | Open `/auctions/<id>`; also a random uuid and `/auctions/abc` | Detail page; "Auction not found" for unknown ids |
| 16 | Empty / network / config | (a) delete all listings; (b) stop your network and reload; (c) rename `.env` and restart | (a) "There are no auctions yet"; (b) error with Try again; (c) setup screen |
| 17 | No secrets | `git status` (`.env` must not appear); search the repo for your key | Nothing found |

**Database-level ownership test (SQL Editor).** This proves RLS works even if someone bypasses the UI. Replace the
two UIDs with real users A and B, and `<A-LISTING-ID>` with a listing owned by A:

```sql
begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"<USER-B-UID>","role":"authenticated"}', true);

update public.auctions set title = 'hacked' where id = '<A-LISTING-ID>';   -- expect: UPDATE 0
delete from public.auctions where id = '<A-LISTING-ID>';                   -- expect: DELETE 0
insert into public.auctions (seller_id, title, description, category, condition, starting_price, ends_at)
values ('<USER-A-UID>', 'fake', 'x', 'books', 'Good', 10, now() + interval '1 day'); -- expect: row-level security error
rollback;
```

## Optional: importing old localStorage listings

Module 2 saved listings in the browser's localStorage. They are not shown any more, and the app **never deletes or
changes** that data. If this browser still has listings you created in Module 2, a notice on **My Listings** offers
an explicit "Import to my account" button. It copies only listings you created (never samples), assigns them to the
logged-in user, keeps their original ids (so importing twice cannot create duplicates) and then remembers the
imported ids under a separate key. Records the database would reject are skipped and counted.

## Known limitations

- **Images:** only image URLs are stored. A chosen image *file* is shown only to you until you refresh (as in Module 2).
  Permanent uploads need Supabase Storage (later module).
- **Visitors cannot see seller names** (profiles are readable by logged-in users only, per the brief).
- **Search/filter/sort run in the browser** on up to 500 active listings. Add server-side filtering/pagination if the
  marketplace grows beyond that.
- **Expired auctions** stay `active` in the database; the UI shows them as ended by comparing `ends_at` with the clock.
  Closing/finalising auctions is Module 5.
- Changing a seller's email/password, password reset and profile editing screens are not part of this module.
- The built-in Supabase email sender is rate-limited; configure SMTP for real use.
- There is no rate limiting on listing creation (add one with a database function or Edge Function if abuse becomes a concern).

## Module 4: bidding

### What Module 4 adds

| Area | Result |
| ---- | ------ |
| Bidding | Logged-in users bid on other people's active auctions from the auction detail page |
| Authority | The database function `place_bid()` validates and stores every bid in one transaction; the browser only sends the auction id and the amount |
| Highest bid | Shown from the database: current bid, starting price, minimum next bid, number of bids, status, closing time |
| Bid history | On the detail page: amount, time, anonymous bidder label, highest bid highlighted, empty state, "You" marker |
| My Bids | `/my-bids` lists your own bidding activity (leading / outbid / ended) |
| Live updates | Supabase Realtime signals a change, the page re-reads the database; falls back to polling every 20 s |
| Protection | Bids cannot be inserted, edited or deleted from the browser; `current_price` cannot be changed from the browser; after the first bid the starting price, increment and deadline are frozen and the listing cannot be deleted |

### Bidding rules (the single definition lives in `supabase/migrations/004_bidding.sql`)

| Rule | Detail |
| ---- | ------ |
| **Minimum bid** | No bids yet: the **starting price**. Otherwise: **highest bid + the auction's `min_increment`** |
| **Minimum increment** | Stored per auction in `auctions.min_increment` (default 10 rupees; the listing form suggests a step from the price, e.g. 5%). It cannot change once bids exist |
| Amount | Whole rupees, greater than 0, at most 100,000,000 |
| Who | Must be logged in. The seller cannot bid. The current highest bidder cannot outbid themselves |
| When | `status = 'active'` **and** the current time is before `ends_at` (checked after the row lock, so a bid arriving at the deadline is judged by the real time) |
| Concurrency | The auction row is locked (`SELECT ... FOR UPDATE`); the highest bid is re-read from `bids` under the lock; a unique index on `(auction_id, amount)` is a second guard |

### How the current highest bid is calculated

The `bids` table is the source of truth. `auctions.current_price` is a **cache written only by `place_bid()`**, in the
same transaction as the bid insert (clients have no privilege to write it). `place_bid()` never trusts the cache: it
recomputes the highest bid from `bids` while holding the lock. `NULL` still means "no bids yet", and the UI then uses
the starting price as the minimum. Accepted bids on one auction strictly increase, so the highest bid is also the latest.

### Database objects created by `004_bidding.sql`

| Object | Purpose | Who may call / use it |
| ------ | ------- | --------------------- |
| `public.bids` | One row per accepted bid: `id`, `auction_id` (FK, cascade), `bidder_id` (FK `auth.users`, cascade), `amount numeric(12,2)` (>0, <=100,000,000), `created_at` (default `clock_timestamp()`); indexes on auction+amount, bidder, time; unique `(auction_id, amount)` | `SELECT` own rows only (RLS), nothing else |
| `place_bid(p_auction_id uuid, p_amount numeric) returns jsonb` | Validates and stores a bid atomically. Bidder = `auth.uid()` (no bidder parameter). Returns `{ok:true,...}` or `{ok:false, code, message, min_bid}`; SQL errors only for unexpected problems | `authenticated` only (`anon` gets "permission denied") |
| `get_bid_history(p_auction_id uuid, p_limit int default 100)` | Public history: amount, time, label `Bidder N` (numbered per auction by first bid), `is_mine`, `is_highest`, `total_count`. No ids/emails/names. Visible for active auctions, or to the seller / a bidder of that auction | `anon`, `authenticated` |
| `get_my_bids()` | The caller's own activity per auction | `authenticated` |
| `auction_has_bids(uuid)` | Helper for the delete policy and the freeze trigger | `authenticated` |
| Trigger `auctions_protect_bid_rules` | Raises `CA001` if `starting_price`, `min_increment` or `ends_at` change after bids exist | automatic |
| Policy `auctions_delete_own` (replaced) | Seller can delete their listing only while it has no bids | `authenticated` |
| Publication | `public.auctions` added to `supabase_realtime` (if that publication exists) | automatic |

All functions are `SECURITY DEFINER` with `set search_path = ''` and fully qualified names; `EXECUTE` is revoked from
`PUBLIC` and granted only to the roles above. Rejection codes: `not_authenticated`, `invalid_amount`,
`amount_too_large`, `auction_not_found`, `own_auction`, `auction_closed`, `auction_ended`, `already_highest`,
`bid_too_low`. Lock waits time out after 5 s (`55P03`, shown as "busy, try again").

### RLS and permissions summary

- `bids`: RLS on. One policy: `bids_select_own` (`bidder_id = auth.uid()`). `REVOKE ALL` from `public`, `anon`,
  `authenticated`, then `GRANT SELECT` to `authenticated`. No insert/update/delete policy or privilege exists, so a direct
  `insert`, `update` or `delete` from the browser (or the REST API) is refused.
- `auctions`: unchanged from Module 3 (clients cannot write `current_price`, `status`, `seller_id`), plus the freeze
  trigger and the stricter delete policy above.
- The seller cannot read raw `bids` rows either; they use `get_bid_history()`, the same anonymised view everyone gets.

### What is automatic and what you must do by hand

| Step | Automatic or manual |
| ---- | ------------------- |
| Create `bids`, functions, policies, grants, trigger, realtime publication | **Manual:** run `supabase/migrations/004_bidding.sql` once in the SQL Editor |
| Realtime for `auctions` | Added by the migration. If your project has Realtime switched off: **Database -> Replication** and enable `auctions`. Without it the page still works and polls every 20 s |
| Frontend bidding UI | Automatic once the migration exists (`npm run dev`) |
| Database tests | **Manual:** paste `supabase/tests/004_bidding_test.sql` in the SQL Editor (it rolls back; creates 3 temporary fake users) |
| Nothing else | No new environment variables, no new npm packages, no service-role key |

### Testing bidding

**Automated (what the project ships):**

```bash
npm test                                            # includes tests/bidding.test.mjs (no database needed)
psql -v ON_ERROR_STOP=1 -f supabase/tests/004_bidding_test.sql    # or paste into the SQL Editor
PGDATABASE=<local db> ./supabase/tests/concurrency_test.sh        # LOCAL PostgreSQL only (needs pgbench)
```

`004_bidding_test.sql` covers tests 1-11, 13-15 below and prints `PASS: ...` lines. `concurrency_test.sh` fires 12
parallel clients and a same-amount race, then checks that no stale bid was accepted. Do not run the concurrency script
on a real Supabase project (it creates fake users).

**Manual UI test** (two accounts: A sells, B and C bid; use a normal and a private window; make a listing with a start
price of 100 and a step of 10 that closes in about 1 hour; for 6/7 you need the SQL Editor):

| # | Test | Steps | Expected |
| - | ---- | ----- | -------- |
| 1 | Valid bid | B opens A's listing, enters 100, **Place bid** | "Bid placed"; Current bid becomes ₹100; history shows ₹100 as Highest bid with a "You" badge; minimum next bid ₹110 |
| 2 | Not logged in | Log out, open the listing | "Log in to place a bid" with Log in / Create account, no bid form; history still visible |
| 3 | Seller | A opens own listing | Bid form replaced by "You cannot bid on your own listing" |
| 4 | Below minimum | C enters 105 | Instant message "Your bid must be at least ₹110"; nothing saved |
| 5 | Equal / below highest | With B leading at 100, C enters 100, then 109, then 110 | 100 and 109 rejected ("Your bid is too low..."), 110 accepted |
| 6 | Closed | SQL Editor: `update public.auctions set status='closed' where id='<id>'`. Open the listing as A (the seller) | "Bidding has ended", no form. Other users no longer see a closed listing at all (Module 3 rule: "Auction not found"). The database also rejects the bid itself: SQL test `06` |
| 7 | Expired | On a listing **with no bids**: SQL Editor `update public.auctions set ends_at = now() - interval '1 minute' where id='<id>'`, then open it as B | "Auction ended", no form (SQL test `07` proves the database rejects the bid too) |
| 8 | Nonexistent | Open `/auctions/<random uuid>` | "Auction not found" |
| 9 | Persistence | Refresh after a bid | Same current bid and history |
| 10 | History | After B 100, C 110 | Newest/highest first: ₹110 (Highest bid), ₹100; labels "Bidder 1/2", never names/emails |
| 11 | Consistency | Table Editor: `auctions.current_price` vs highest `bids.amount` | Equal |
| 12 | Simultaneous bids | Open the listing as B and C, type the same amount in both, press Place bid at the same time | Exactly one is accepted; the other gets "Your bid is too low... minimum is now..." |
| 13 | Browser cannot write bids | See SQL test `13a-13f` | Insert/update/delete refused |
| 14 | Browser cannot move the price | See SQL test `14a-14d` | Refused |
| 15 | Identity | See SQL test `15a`; `place_bid` has no bidder argument | Bidder is always the logged-in user |
| 16 | Live update | B and C on the same listing; B bids | C's page updates without a refresh ("Live updates on") |
| 17 | My Bids | B opens **My Bids** | Card for the listing: "Highest bidder" or "Outbid", your highest bid, current highest bid |
| 18 | Locked listing | A (seller) opens Edit on a listing with bids and changes the price or closing time | Refused with "cannot be changed after bids have been placed"; title/description still editable; Delete refused |
| 19 | Regression | Create, edit, delete (no bids), search, filter, sort, login/logout, navigation | All work as in Module 3 (manual table above, tests 1-17) |

### Known limitations of Module 4

- **Not yet run in a browser or against a hosted Supabase project.** The SQL was run and tested on a real local
  PostgreSQL 16 (with a small imitation of Supabase's roles and `auth.uid()`), the JavaScript logic by `npm test`, and
  every source file was syntax-checked and its imports resolved with esbuild. `npm install` / `vite build` could not be
  run where this was built (npm registry blocked). Please run `npm install && npm run build` and the manual table.
- **Auctions are not closed automatically.** An expired auction keeps `status = 'active'`; the database simply refuses
  bids after `ends_at` and the UI shows "Ended". Declaring winners belongs to Module 5. "Highest bidder" on an ended
  auction is **not** a win.
- **No proxy / maximum bidding, no auto-extend ("anti-sniping").** Each bid is a fixed amount.
- **Bid history is anonymous** ("Bidder 1, 2 ...") even to the seller, to protect privacy. To show names, extend
  `get_bid_history()` to join `profiles` deliberately.
- History returns the 100 highest bids (`total_count` tells how many exist); there is no paging.
- Deleting a user account removes their bids (`on delete cascade`), so they disappear from the history. `place_bid()` always
  re-derives the highest bid from the remaining bids. Module 5 should decide whether to restrict or anonymise instead.
- A seller cannot change the price/deadline or delete a listing after the first bid (a deliberate rule to protect bidders).
- Realtime events only signal "something changed"; they depend on the `supabase_realtime` publication. Without it, polling
  every 20 s is used.
- The browse page and cards still show only the current bid; they do not show a bid count.

## Requirements for Module 5 (finalising auctions)

Do not weaken these Module 4 decisions:

1. Closing must be server-side (a function plus `pg_cron`, or an Edge Function): set `status = 'closed'` once
   `ends_at` has passed, in a transaction that first locks the auction row (`for update`), exactly as `place_bid()` does.
   Because `place_bid()` already refuses bids after `ends_at` and when `status <> 'active'`, closing cannot race with bidding.
2. The winner is the row with the highest `amount` in `public.bids` for the auction (the bids table, not the cached
   `current_price`). Add `winner_id`/`winning_bid_id` columns on `auctions` and write them only from that function.
   If there are no bids, close with no winner.
3. Clients must still have no `UPDATE` privilege on `status`, `current_price` or the new winner columns.
4. Seller-visible raw bids: `get_bid_history()` hides identities. Revealing the winner to the seller (and the seller to the
   winner) should happen only after closing, through a function, not by loosening `bids` RLS.
5. Decide what happens to bids and winners when a bidder deletes their account (the FK currently cascades).
6. The seller can no longer delete a listing with bids; offer a cancel/"withdraw" flow in Module 5 if needed.
7. Do not add payment or ownership transfer without their own rules; a bid is not a purchase.

## Push to GitHub

Use the commands below.

### First push of this project

```bash
cd campusbid
git init                                   # skip if the folder already has a .git directory
git check-ignore -v .env                   # must print a rule; if it prints nothing, STOP and fix .gitignore
git add .
git status                                 # confirm .env and node_modules are NOT listed
git commit -m "Module 3: Supabase authentication and database integration"
git branch -M main
git remote add origin https://github.com/<your-username>/<your-repo>.git
git push -u origin main
```

### If your Module 2 repo already exists

Replace the files in your existing clone with the new ones (keep the `.git` folder), then:

```bash
git checkout -b module-3-supabase
git add .
git status
git commit -m "Module 3: Supabase authentication and database integration"
git push -u origin module-3-supabase
```

Open a pull request on GitHub and merge it into `main` when you are happy.

GitHub does not accept your account password for `git push`. Sign in through the browser window Git opens
(Git Credential Manager), use GitHub CLI (`gh auth login`), or create a Personal Access Token under
GitHub -> Settings -> Developer settings and use it as the password.

When you deploy (Vercel, Netlify, ...), add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in the host's
environment-variable settings, and add the deployed address to Supabase **Authentication -> URL Configuration**.
