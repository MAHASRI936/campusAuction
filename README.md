# CampusBid / CampusAuction - Campus Second-Hand Auction Marketplace

**Module 3: Supabase authentication and PostgreSQL database.** Users register and log in with Supabase Auth,
listings are stored in Supabase PostgreSQL, every listing belongs to its seller, and the database (Row-Level
Security) makes sure people can only change their own listings. Bidding is **not** implemented yet (Module 4).

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

1. Unzip `CampusAuction-Module3.zip`. You get a folder named `campusbid`.
2. `cd campusbid`
3. `npm install` (this also creates `package-lock.json`; commit it later).
4. **[Supabase dashboard]** Create a Supabase project (section "Supabase setup" below).
5. Copy `.env.example` to `.env` and paste your Project URL and anon/publishable key.
6. **[Supabase dashboard]** Run `supabase/schema.sql` in the SQL Editor.
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
| `/login`, `/register` | Authentication | no (logged-in users are redirected away) |

## Project structure (new or changed files marked)

```
campusbid/
├── .env.example                       # NEW placeholders (real .env is git-ignored)
├── supabase/
│   ├── schema.sql                     # NEW tables, constraints, indexes, RLS, trigger, privileges
│   └── demo_seed.sql                  # NEW optional demo data (manual)
├── tests/
│   ├── listings.test.mjs              # validation / filtering / sorting (kept)
│   └── supabase.test.mjs              # NEW config, mapping, auth validation, import, errors
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
`updated_at` or change `seller_id` from the browser. Module 4 changes those from server-side functions.

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
  Closing/finalising auctions is Module 4.
- Changing a seller's email/password, password reset and profile editing screens are not part of this module.
- The built-in Supabase email sender is rate-limited; configure SMTP for real use.
- There is no rate limiting on listing creation (add one with a database function or Edge Function if abuse becomes a concern).

## Module 4 (bidding) integration notes

Do not weaken these decisions; Module 4 builds on them.

1. **Create a `bids` table** (suggested): `id uuid pk`, `auction_id uuid references auctions(id) on delete cascade`,
   `bidder_id uuid references auth.users(id)`, `amount numeric(12,2) not null`, `created_at timestamptz default now()`;
   index on `(auction_id, amount desc)`. Enable RLS: anyone may select (open bidding), **no direct client inserts**.
2. **Place bids with a `SECURITY DEFINER` function** (called with `supabase.rpc`) that, in one transaction, locks the
   auction row (`select ... for update`), checks `status = 'active'`, `now() < ends_at`, bidder is not the seller, and
   `amount >= coalesce(current_price + min_increment, starting_price)`, then inserts the bid and updates
   `auctions.current_price`. Clients cannot update `current_price` or `status` today; only such a function can.
3. `current_price IS NULL` means "no bids". The UI already shows "No bids yet" and the minimum next bid from
   `currentBid`, `minIncrement` and `startingPrice`.
4. **Finalising** (`status = 'closed'`, winner) must also be server-side (a function plus `pg_cron`, or an Edge Function).
   A `winner_id` column can be added then. `ends_at` is already required and indexed.
5. `seller_id`, `starting_price`, `current_price`, `min_increment`, `status`, `ends_at` are all present and mapped
   (`sellerId`, `startingPrice`, `currentBid`, `minIncrement`, `status`, `endsAt`).
6. `AuctionDetailPage` still shows a disabled "Bidding coming in Module 4" button; replace it when the function exists.

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
