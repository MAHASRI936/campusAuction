import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, RotateCcw, PlusCircle } from 'lucide-react';
import AuctionCard from '../components/AuctionCard.jsx';
import EmptyState from '../components/EmptyState.jsx';
import ErrorState from '../components/ErrorState.jsx';
import LoadingState from '../components/LoadingState.jsx';
import Notice from '../components/Notice.jsx';
import useNow from '../hooks/useNow.js';
import useListings from '../hooks/useListings.js';
import useFlashNotice from '../hooks/useFlashNotice.js';
import { categories } from '../data/categories.js';
import { CONDITIONS } from '../data/conditions.js';
import { DEFAULT_SORT, SORT_OPTIONS, filterAndSortListings, normalizeSort } from '../utils/listingFilters.js';

export default function BrowsePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const now = useNow(30000);
  const { listings, loading, error, reload } = useListings();
  const [flash, dismissFlash] = useFlashNotice();

  const query = searchParams.get('q') ?? '';
  const rawCategory = searchParams.get('category') ?? 'all';
  const category = categories.some((item) => item.id === rawCategory) ? rawCategory : 'all';
  const rawCondition = searchParams.get('condition') ?? 'all';
  const condition = CONDITIONS.includes(rawCondition) ? rawCondition : 'all';
  const sort = normalizeSort(searchParams.get('sort') ?? DEFAULT_SORT);

  function updateParam(key, value, defaultValue) {
    const next = new URLSearchParams(searchParams);
    if (!value || value === defaultValue) {
      next.delete(key);
    } else {
      next.set(key, value);
    }
    setSearchParams(next, { replace: true });
  }

  /** Clears search, category and condition. The chosen sort order is kept. */
  function clearFilters() {
    const next = new URLSearchParams(searchParams);
    ['q', 'category', 'condition'].forEach((key) => next.delete(key));
    setSearchParams(next, { replace: true });
  }

  // Filtering works on a copy, so the stored listings are never changed.
  const results = useMemo(
    () => filterAndSortListings(listings, { query, category, condition, sort }),
    [listings, query, category, condition, sort],
  );

  const hasFilters = query.trim() !== '' || category !== 'all' || condition !== 'all';

  return (
    <div className="container-page py-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Browse Auctions</h1>
          <p className="mt-2 text-ink-600">
            Search, filter and sort all active listings from students on your campus.
          </p>
        </div>
        <Link to="/sell" className="btn-accent">
          <PlusCircle className="h-4 w-4" aria-hidden="true" />
          Sell an Item
        </Link>
      </header>

      {flash?.type === 'deleted' && (
        <Notice type="success" title="Listing deleted" onDismiss={dismissFlash} className="mt-6">
          {flash.title ? <span className="break-words">“{flash.title}” has been removed.</span> : 'The listing has been removed.'}
        </Notice>
      )}

      {/* Controls */}
      <div className="card mt-8 p-4 sm:p-5">
        <div className="grid gap-4 md:grid-cols-[1fr_auto_auto]">
          <div>
            <label htmlFor="browse-search" className="field-label">
              Search by title or description
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
            <label htmlFor="browse-condition" className="field-label">
              Condition
            </label>
            <select
              id="browse-condition"
              value={condition}
              onChange={(event) => updateParam('condition', event.target.value, 'all')}
              className="field-input md:w-44"
            >
              <option value="all">Any condition</option>
              {CONDITIONS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="browse-sort" className="field-label">
              Sort by
            </label>
            <select
              id="browse-sort"
              value={sort}
              onChange={(event) => updateParam('sort', event.target.value, DEFAULT_SORT)}
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

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div role="group" aria-label="Filter by category" className="flex flex-wrap gap-2">
            <CategoryChip active={category === 'all'} onClick={() => updateParam('category', 'all', 'all')}>
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

          <button type="button" onClick={clearFilters} disabled={!hasFilters} className="btn-secondary px-4 py-1.5">
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            Clear filters
          </button>
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <LoadingState label="Loading auctions…" />
      ) : error ? (
        <ErrorState title="Could not load the auctions" error={error} onRetry={reload} className="mt-6" />
      ) : (
        <>
          <p className="mt-6 text-sm text-ink-600" aria-live="polite">
            Showing <strong className="text-ink-900">{results.length}</strong>{' '}
            {hasFilters && listings.length > 0 ? `of ${listings.length} ` : ''}
            {results.length === 1 ? 'auction' : 'auctions'}
          </p>

          <div className="mt-4">
            {results.length > 0 ? (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {results.map((auction) => (
                  <AuctionCard key={auction.id} auction={auction} now={now} />
                ))}
              </div>
            ) : listings.length === 0 ? (
              <EmptyState
                title="There are no auctions yet"
                message="Nobody has listed an item yet. Be the first: list something you no longer need."
                action={
                  <Link to="/sell" className="btn-primary">
                    <PlusCircle className="h-4 w-4" aria-hidden="true" />
                    Sell an Item
                  </Link>
                }
              />
            ) : (
              <EmptyState
                title="No auctions match your search"
                message="Try a different keyword, choose another category or condition, or clear your filters."
                action={
                  hasFilters && (
                    <button type="button" onClick={clearFilters} className="btn-primary">
                      <RotateCcw className="h-4 w-4" aria-hidden="true" />
                      Clear filters
                    </button>
                  )
                }
              />
            )}
          </div>
        </>
      )}
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
