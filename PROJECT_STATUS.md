# Project Status

## Current module: 3 (Supabase authentication and database)

### Completed (code written)

- Supabase client (`src/lib/supabaseClient.js`) with environment validation and a setup screen when configuration is missing; refuses secret / service-role keys
- Register, log in, log out, session restore on refresh, loading state, email-confirmation handling, duplicate-account and invalid-credential messages
- `AuthContext` + `useAuth`, route guard `RequireAuth` for `/sell`, `/auctions/:id/edit`, `/my-listings`
- `supabase/schema.sql`: `profiles` (+ signup trigger) and `auctions`, constraints, indexes, RLS policies, column-level privileges
- Listings service rewritten for Supabase (fetch active / by id / mine, create, update, delete, optional import); consistent `ServiceError` messages
- Pages updated for async loading / empty / error states; My Listings page; owner-only controls; seller shown on detail
- Optional explicit import of Module 2 localStorage listings (never deletes old data, no duplicates)
- Module 2 features preserved: browse, search, category/condition filters, sorting, URL parameters, detail pages, create/edit/delete forms, validation, image URL + session-only file preview, styling

### Verification status (what was ACTUALLY run in the build environment)

| Check | Result |
| ----- | ------ |
| `npm test` equivalent (`node --test`): validation, filtering/sorting, config checks, column mapping, auth validation/errors, error mapping, localStorage import | **31 / 31 passed** |
| JSX/JS syntax of all 58 files under `src/` (TypeScript parser) | Passed, 0 errors |
| Every relative import resolves, every named/default import exists, no unused imports, no undefined identifiers | Passed, 0 problems |
| `npm install` | **NOT RUN.** The npm registry was unreachable from the build environment. `package-lock.json` is therefore not included (your first `npm install` creates it) |
| `npm run build` (Vite) | **NOT RUN** (needs `npm install`) |
| App running in a browser (UI, styling, responsive layout) | **NOT RUN** |
| `supabase/schema.sql` executed against PostgreSQL | **NOT RUN.** No database was available. The SQL was reviewed by hand only |
| Real sign-up / login / email confirmation against Supabase | **NOT RUN** (no Supabase project available) |
| RLS behaviour (other user cannot edit/delete/impersonate) | **NOT RUN.** Use the SQL test in the README after running the schema |
| Calls to `@supabase/supabase-js` (query shapes, error codes) | **NOT RUN** against the real SDK; written from its documented API |

If `npm install`, `npm run build`, the SQL, or any manual test in the README reports an error, send me the full
message and I will fix it.

### Manual configuration required (cannot be done from code)

1. Create a Supabase project
2. Copy the Project URL and the anon/publishable key into `.env`
3. Run `supabase/schema.sql` in the SQL Editor
4. Authentication -> URL Configuration: Site URL and Redirect URLs
5. Decide whether email confirmation is ON or OFF (Authentication -> Providers -> Email)

### Next: Module 4 (bidding). See "Module 4 integration notes" in the README.
