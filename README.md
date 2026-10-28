# CampusBid - Campus Second-Hand Auction Marketplace

**Module 2: functional auction listings management.** Sellers can create, edit and delete listings;
buyers can search, filter, sort and open them. Everything is saved in the browser (localStorage) for
now. There is still no backend, no real authentication and no real bidding.

## Tech stack

- React 18 + Vite 5 (JavaScript)
- Tailwind CSS 3
- React Router 6
- Lucide React icons
- No new dependencies were added in Module 2.

## Prerequisites

- Node.js 18 or newer (20 LTS recommended). Check with `node -v`.
- npm (installed with Node.js). Check with `npm -v`.
- An internet connection for the first `npm install`.

## Run it locally, step by step

1. Extract `CampusAuction-Module2.zip`. You will get a folder named `campusbid`.
2. Open a terminal and go into that folder:

   ```bash
   cd campusbid
   ```

3. Install dependencies (this also creates `package-lock.json`; commit it):

   ```bash
   npm install
   ```

4. Start the development server:

   ```bash
   npm run dev
   ```

5. Open the address printed in the terminal (normally http://localhost:5173).

Other commands:

```bash
npm run build     # production build in dist/
npm run preview   # serve the production build locally (run build first)
npm test          # logic tests (validation, filtering, storage service); needs Node 18+, no extra packages
```

> **Honest note on verification:** the environment this module was written in could not reach the npm
> registry, so `npm install` and `npm run build` have **not** been run by the author. See
> `PROJECT_STATUS.md` for exactly what was and was not tested. If either command reports an error,
> send me the full message and I will fix it.

## What you can do in Module 2

| Feature | Where |
| ------- | ----- |
| Create a listing (validated form, image URL or file preview, success message, redirect to the new auction) | `/sell` |
| Browse all listings: search title + description, filter by category and condition, sort, clear filters, empty state | `/auctions` |
| Open a listing: image, description, category, condition, starting price, end date/time, "ended" indicator | `/auctions/:id` |
| Edit a listing (form pre-filled with its values) | `/auctions/:id/edit` |
| Delete a listing (only after confirming in a dialog) | button on the detail page |
| Reset demo data (removes your listings and edits, restores the samples) | link at the bottom of `/auctions` |

Listings you create survive a browser refresh. Sample listings can also be edited or deleted; those
changes persist too.

### Routes

| Route                | Page                                                              |
| -------------------- | ----------------------------------------------------------------- |
| `/`                  | Homepage (hero, categories, featured open auctions, how it works) |
| `/auctions`          | Browse with search, filters, sorting                              |
| `/auctions/:id`      | Auction detail (+ demo edit/delete panel)                         |
| `/auctions/:id/edit` | Edit listing form                                                 |
| `/sell`              | Create listing form                                               |
| `/login`, `/register`| Placeholders (real authentication in a later module)              |
| `/#how-it-works`     | Section of the homepage linked from the navbar                    |

Browse URL parameters: `?q=<text>`, `?category=<books|electronics|calculators|cycles|hostel|other>`,
`?condition=<New|Like New|Good|Fair>` and `?sort=<newest|ending-soon|price-low|price-high>`.
(Module 1's `bid-low` / `bid-high` still work and map to `price-low` / `price-high`.)

## Project structure

```
campusbid/
├── index.html, package.json, vite.config.js, tailwind.config.js, postcss.config.js
├── .env.example, .gitignore, README.md, PROJECT_STATUS.md
├── public/favicon.svg
├── tests/listings.test.mjs      # Node built-in test runner, no extra dependencies
└── src/
    ├── main.jsx, App.jsx, index.css
    ├── layouts/MainLayout.jsx
    ├── services/
    │   └── listingsService.js   # ALL listing storage logic (localStorage). Replace with Supabase later.
    ├── hooks/
    │   ├── useListings.js       # subscribes components to the service (useSyncExternalStore)
    │   ├── useFlashNotice.js    # one-time success messages after redirects
    │   └── useNow.js
    ├── utils/
    │   ├── validation.js        # form validation rules + messages
    │   ├── listingFilters.js    # search / filter / sort (pure functions, never mutate)
    │   ├── dateTime.js, id.js, format.js
    ├── data/
    │   ├── auctions.js          # built-in sample listings
    │   ├── categories.js, conditions.js
    ├── components/              # existing components + ListingForm, ListingImageField, FormField,
    │                            #   Notice, DemoNotice, ConfirmDialog
    └── pages/                   # Home, Browse, AuctionDetail, Sell, EditListing, Login, Register, NotFound
```

## How persistence works

- `src/services/listingsService.js` is the only code that touches `localStorage` (key
  `campusauction.listings.v1`). Components use it through hooks, so pages update immediately after a
  create, edit or delete (other open tabs are designed to sync too, but that was not tested).
- Built-in samples live in code. localStorage stores only **your** listings, edited copies of samples,
  and the ids of deleted samples. This keeps the samples' relative closing times ("ends in 3 hours")
  working exactly like Module 1.
- Unreadable or partly invalid saved data is ignored safely (bad entries are dropped, the app still
  loads). If `localStorage` is blocked, the app still works but warns that changes last only until
  refresh. If a save fails (for example storage is full) the form shows an error and nothing is half-saved.
- Ids are UUIDs (`crypto.randomUUID`), the same type Postgres/Supabase uses.

### Listing data shape (ready for a Supabase table)

```
id, title, description, category, condition, startingPrice (INR, whole number),
currentBid (null until bidding exists), minIncrement, endsAt (ISO, UTC),
pickupLocation, imageUrl (http/https URL or null), createdAt, updatedAt, isSample (samples only)
```

In Module 3 or later, re-implement the methods of `createListingsService` (`getAll`, `getById`,
`create`, `update`, `remove`, `reset`, `subscribe`, `getSnapshot`) against Supabase and keep the pages.

## Design decisions (and limitations)

1. **Images.** Image files are never stored in localStorage (base64 would fill the ~5 MB quota fast).
   - *Image URL:* saved with the listing; works after refresh. Some sites block hot-linking, in which
     case a category illustration is shown instead.
   - *File upload:* shows a preview before saving and on the listing page **until the tab is refreshed
     or closed**, then falls back to the illustration. The form says so. Permanent uploads need
     cloud storage (Supabase Storage) in a later module.
2. **No authentication, no ownership.** Edit and delete are open to anyone using the browser. They are
   labelled "demo" in the UI and are **not secure**. Real seller accounts and permissions come with
   authentication; they must be enforced on the server (e.g. Supabase Row Level Security), never only
   in the front end.
3. **Price** is a whole number of rupees (`formatINR` already shows no paise). Maximum ₹1,00,00,000.
4. **End time** must be in the future when creating (and at most 365 days ahead). When editing, the
   end time may stay unchanged even if it has passed; changing it requires a future time.
5. **Starting price vs sample bids.** Sample listings already show a current bid. Their starting price
   can't be edited above that bid.
6. **Bid step** (`minIncrement`) and **handover place** are not on the form (not requested). New
   listings get an automatic bid step (about 5% of the price, rounded to ₹10) and show "To be arranged
   with the seller".
7. **Sorting.** "Newest listings" is the new default. Price sorting now uses the *starting price*, as
   requested. "Ending soonest" from Module 1 is kept.
8. **Removed helpers.** `getAllAuctions`, `getFeaturedAuctions`, `getAuctionById` were removed from
   `data/auctions.js` (they would have created a circular import with the service). Pages now use
   `useListings` / `useListing`.
9. **Homepage** "featured" now shows the first 6 *open* listings, so deleted or expired ones drop out.
10. Loading states are minimal on purpose: localStorage is synchronous. The save button shows
    "Saving…" and is disabled while submitting to prevent double submits.

## Push to GitHub

```bash
git init
git add .
git commit -m "Module 2: functional listings management"
git branch -M main
git remote add origin https://github.com/<your-username>/<your-repo>.git
git push -u origin main
```

## Next step

Module 3: authentication and Supabase. See `PROJECT_STATUS.md`.
