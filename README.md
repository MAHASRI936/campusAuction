# CampusBid - Campus Second-Hand Auction Marketplace

Module 1: project foundation and working homepage.

CampusBid lets final-year students sell used items (cycles, calculators, books, electronics, hostel
essentials) through auctions, while junior students browse and bid. This module delivers the
front-end foundation only: no backend, no authentication, no real bidding yet.

## Tech stack

- React 18 + Vite 5 (JavaScript)
- Tailwind CSS 3
- React Router 6
- Lucide React icons

## Prerequisites

- Node.js 18 or newer (20 LTS recommended). Check with `node -v`.
- npm (installed with Node.js). Check with `npm -v`.
- An internet connection for the first `npm install`.

## Run it locally, step by step

1. Extract `CampusAuction-Module1.zip`. You will get a folder named `campusbid`.
2. Open a terminal and go into that folder:

   ```bash
   cd campusbid
   ```

3. Install dependencies:

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
npm run build     # creates the production build in dist/
npm run preview   # serves the production build locally (run build first)
```

> Note: the project was written in an environment without access to the npm registry, so
> `npm install` and `npm run build` have NOT been run by the author. If either command reports an
> error, please send me the full message and I will fix it in the next step. `npm install` will
> also create `package-lock.json`; commit it to Git.

## Push to GitHub (hackathon requirement)

```bash
git init
git add .
git commit -m "Module 1: project foundation and homepage"
git branch -M main
git remote add origin https://github.com/<your-username>/<your-repo>.git
git push -u origin main
```

Create the empty repository on GitHub first, then replace the remote URL above. Commit after each
finished piece of work so the history shows your progress.

## Routes

| Route            | Page                                                        |
| ---------------- | ----------------------------------------------------------- |
| `/`              | Homepage (hero, categories, featured auctions, how it works) |
| `/auctions`      | Browse: search, category filter, sorting, empty state        |
| `/auctions/:id`  | Auction detail (disabled "Bidding coming in Module 4" button) |
| `/login`         | Login placeholder (real auth in Module 3)                    |
| `/register`      | Registration placeholder (real auth in Module 3)             |
| `/sell`          | Sell placeholder (listing creation in Module 2)              |
| `/#how-it-works` | Section of the homepage linked from the navbar               |

Browse page URL parameters: `?q=<text>`, `?category=<books|electronics|calculators|cycles|hostel|other>`
and `?sort=<ending-soon|bid-low|bid-high>`.

## Project structure

```
campusbid/
├── index.html
├── package.json
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── .env.example
├── public/favicon.svg
└── src/
    ├── main.jsx            # entry point, BrowserRouter
    ├── App.jsx             # route table
    ├── index.css           # Tailwind + shared component classes
    ├── layouts/MainLayout.jsx
    ├── components/         # Navbar, Footer, AuctionCard, CategoryCard, HowItWorks, ...
    ├── pages/              # Home, Browse, AuctionDetail, Login, Register, Sell, NotFound
    ├── data/
    │   ├── auctions.js     # ALL sample listings + helper functions (single source of truth)
    │   └── categories.js   # category list, icons and colours
    ├── hooks/useNow.js     # ticking clock for countdown labels
    └── utils/format.js     # rupee formatting and remaining-time helpers
```

## Sample data

All demo listings live in `src/data/auctions.js`. Pages only use the helper functions at the bottom
of that file (`getAllAuctions`, `getFeaturedAuctions`, `getAuctionById`), so Module 2 can replace
them with database queries without rewriting the pages. Closing times are calculated relative to
when the app loads so the demo auctions never show as closed; real listings will store a fixed
closing time.

## Known limitations (by design for Module 1)

- No backend, database or authentication.
- No real bidding, bid history, notifications or listing creation.
- Items use local illustrated placeholders instead of photos.
- No automated tests yet.

## Next step

Module 2: seller listing creation (form, validation, photos, edit and cancel) plus the database
setup. See `PROJECT_STATUS.md`.
