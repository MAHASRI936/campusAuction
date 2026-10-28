import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, RotateCcw } from 'lucide-react';
import AuctionCard from '../components/AuctionCard.jsx';
import EmptyState from '../components/EmptyState.jsx';
import useNow from '../hooks/useNow.js';
import { categories } from '../data/categories.js';
import { getAllAuctions, getDisplayPrice } from '../data/auctions.js';

const SORT_OPTIONS = [
  { value: 'ending-soon', label: 'Ending soonest' },
  { value: 'bid-low', label: 'Current bid: low to high' },
  { value: 'bid-high', label: 'Current bid: high to low' },
];

const sorters = {
  'ending-soon': (a, b) => new Date(a.endsAt) - new Date(b.endsAt),
  'bid-low': (a, b) => getDisplayPrice(a) - getDisplayPrice(b),
  'bid-high': (a, b) => getDisplayPrice(b) - getDisplayPrice(a),
};

export default function BrowsePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const now = useNow(30000);

  const query = searchParams.get('q') ?? '';
  const category = searchParams.get('category') ?? 'all';
  const rawSort = searchParams.get('sort') ?? 'ending-soon';
  const sort = sorters[rawSort] ? rawSort : 'ending-soon';

  function updateParam(key, value, defaultValue) {
    const next = new URLSearchParams(searchParams);
    if (!value || value === defaultValue) {
      next.delete(key);
    } else {
      next.set(key, value);
    }
    setSearchParams(next, { replace: true });
  }

  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return getAllAuctions()
      .filter((auction) => category === 'all' || auction.category === category)
      .filter((auction) => !needle || auction.title.toLowerCase().includes(needle))
      .sort(sorters[sort]);
  }, [query, category, sort]);

  const hasFilters = query.trim() !== '' || category !== 'all';

  return (
    <div className="container-page py-10">
      <header>
        <h1 className="text-3xl font-extrabold tracking-tight">Browse Auctions</h1>
        <p className="mt-2 text-ink-600">
          Search, filter and sort the sample listings. These will be replaced with real listings
          in a later module.
        </p>
      </header>

      {/* Controls */}
      <div className="card mt-8 p-4 sm:p-5">
        <div className="grid gap-4 md:grid-cols-[1fr_auto]">
          <div>
            <label htmlFor="browse-search" className="field-label">
              Search by item title
            </label>
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-400"
                aria-hidden="true"
              />
              <input
                id="browse-search"
                type="search"
                value={query}
                onChange={(event) => updateParam('q', event.target.value, '')}
                placeholder="e.g. calculator, bicycle, textbook"
                className="field-input pl-11"
              />
            </div>
          </div>

          <div>
            <label htmlFor="browse-sort" className="field-label">
              Sort by
            </label>
            <select
              id="browse-sort"
              value={sort}
              onChange={(event) => updateParam('sort', event.target.value, 'ending-soon')}
              className="field-input md:w-60"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4" role="group" aria-label="Filter by category">
          <div className="flex flex-wrap gap-2">
            <CategoryChip
              active={category === 'all'}
              onClick={() => updateParam('category', 'all', 'all')}
            >
              All
            </CategoryChip>
            {categories.map((item) => (
              <CategoryChip
                key={item.id}
                active={category === item.id}
                onClick={() => updateParam('category', item.id, 'all')}
              >
                {item.label}
              </CategoryChip>
            ))}
          </div>
        </div>
      </div>

      {/* Results */}
      <p className="mt-6 text-sm text-ink-600" aria-live="polite">
        Showing <strong className="text-ink-900">{results.length}</strong>{' '}
        {results.length === 1 ? 'auction' : 'auctions'}
      </p>

      <div className="mt-4">
        {results.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {results.map((auction) => (
              <AuctionCard key={auction.id} auction={auction} now={now} />
            ))}
          </div>
        ) : (
          <EmptyState
            title="No auctions match your search"
            message="Try a different keyword, choose another category, or clear your filters."
            action={
              hasFilters && (
                <Link to="/auctions" className="btn-primary">
                  <RotateCcw className="h-4 w-4" aria-hidden="true" />
                  Clear filters
                </Link>
              )
            }
          />
        )}
      </div>
    </div>
  );
}

function CategoryChip({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
        active
          ? 'border-brand-700 bg-brand-700 text-white'
          : 'border-ink-200 bg-white text-ink-700 hover:border-brand-300 hover:bg-brand-50'
      }`}
    >
      {children}
    </button>
  );
}
