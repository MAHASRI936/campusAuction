# Project Status

## Current module: 2 (Functional auction listings management)

### Completed

**Create listing (`/sell`)**
- Form: title, detailed description, category, condition (New / Like New / Good / Fair), starting
  price in INR, auction end date and time, image URL or file upload with preview
- Validation with a message beside each field, an error summary, and focus moved to the first problem:
  required fields, price must be a positive whole number, end time must be in the future, image URL
  must be http(s)
- Image preview before submitting; friendly message if an image link cannot be loaded
- Success message, then redirect to the new auction's detail page; Cancel returns to browsing

**Persistence**
- `src/services/listingsService.js` (localStorage) is the single place that reads and writes listings;
  UI uses `useListings` / `useListing`
- Samples kept; saved listings load at start-up and survive refresh; UUID ids
- Corrupted or partly invalid saved data is handled safely; storage-full and storage-blocked cases
  show clear messages
- Image files are never stored as base64 (see limitations)
- Data shape is Supabase-ready

**Manage listings**
- Browse all, open detail, edit (pre-filled form), delete with a confirmation dialog
- "Listing not found" messages for invalid or deleted ids (detail and edit)
- Browse, detail and homepage update immediately after any change
- Clearly labelled demo feature (no ownership or security claimed)
- Extra: "Reset demo data" link on the Browse page (with confirmation) to restore the samples

**Browse and filter**
- Search title + description (all words must match), category filter, condition filter,
  sort: newest / ending soonest / starting price low to high / high to low, Clear filters,
  useful empty states (no match; no listings at all). All combine; original data is never modified.
  Filters are kept in the URL.

**Detail page**
- Image (with fallback), title, description, category, condition, starting price, end date/time,
  "Auction ended" indicator, demo edit/delete panel; the Module 1 disabled bidding button is kept

**Module 1 features preserved:** routes, layout, navbar/footer, homepage sections, category links,
URL search parameters, Login/Register placeholders, 404 page, styling. No new dependencies.

### Verification status (what was ACTUALLY run)

| Check | Result |
| ----- | ------ |
| `npm install` | **NOT RUN.** The npm registry was unreachable from the build environment (`ENOTFOUND`) |
| `npm run build` (Vite) | **NOT RUN** (depends on `npm install`) |
| `package-lock.json` | **NOT INCLUDED** (created by your first `npm install`) |
| JSX syntax of all 42 source files (esbuild) | Passed, 0 errors |
| Every relative import and named import resolves | Passed, 0 problems |
| `npm test` logic tests (`node --test`), 26 tests: validation, search/filter/sort, storage service incl. simulated refresh, corrupted data, write failure, unavailable storage | **26 / 26 passed** |
| Browser run in headless Chromium, 87 checks (see below) | **87 / 87 passed** |
| Real browser run with the real `react-router-dom`, `lucide-react`, Tailwind CSS and React 18 | **NOT DONE** |
| Visual layout, styling and responsive look on desktop and phone | **NOT CHECKED** (the browser run had no Tailwind CSS) |
| Tab-key focus trap in dialog, cross-tab sync, Safari/Firefox | **NOT TESTED** |

**About the browser run.** It bundled the real `src/` code with esbuild but substituted a small
router look-alike for `react-router-dom` and a stub for `lucide-react`, used React 19 (the project
targets 18), and had no CSS. It therefore proves the app logic and component behaviour in a real DOM,
but is **not** a substitute for `npm run build` plus a manual look in your browser. It covered:
creating a listing, refresh persistence, every validation rule, search + category + condition +
sorting together, clear filters, empty states, edit (including a sample listing), delete with
cancel / Escape / confirm, deleted-stays-deleted after refresh, invalid ids on detail and edit,
expired auctions, corrupted localStorage, URL and file image handling, reset, and all Module 1
routes.

### Known limitations

- **Not secure by design:** anyone using the browser can edit or delete any listing; no login
- Data lives only in this browser/profile; clearing site data or using another browser loses it
- Uploaded image files show only until refresh (use an image URL for a permanent image)
- Image URLs from sites that block hot-linking fall back to the category illustration
- No bidding, bid history, bid increment or handover-place fields on the form yet
- Whole-rupee prices only; no draft/cancel status; no photo gallery (one image per listing)
- Editing a sample listing freezes its "relative" closing time to a fixed date/time
- localStorage is limited to about 5 MB (plenty for text listings)

### Not started (later modules)

- Authentication (replace Login/Register placeholders) and Supabase
- Real ownership / permissions, image storage
- Bidding, bid history, closing and sale flow, notifications

## Next module: Module 3

1. Run `npm install` and `npm run build` and send me any error output.
2. Add Supabase (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` in `.env`) and real authentication.
3. Create the `listings` table from the data shape in `README.md`; store `seller_id`.
4. Re-implement `src/services/listingsService.js` against Supabase (same method names).
5. Enforce who can edit/delete with Row Level Security; remove the "demo" notices.
6. Move image uploads to Supabase Storage.
