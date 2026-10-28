/**
 * Pure helpers for searching, filtering and sorting listings.
 * They never modify the array they are given (the stored listings stay intact).
 */

export const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest listings' },
  { value: 'ending-soon', label: 'Ending soonest' },
  { value: 'price-low', label: 'Starting price: low to high' },
  { value: 'price-high', label: 'Starting price: high to low' },
];

export const DEFAULT_SORT = 'newest';

// Module 1 URLs used these names (they sorted by current bid).
const LEGACY_SORTS = { 'bid-low': 'price-low', 'bid-high': 'price-high' };

export function normalizeSort(value) {
  const mapped = LEGACY_SORTS[value] ?? value;
  return SORT_OPTIONS.some((option) => option.value === mapped) ? mapped : DEFAULT_SORT;
}

const time = (value) => {
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
};

const sorters = {
  newest: (a, b) => time(b.createdAt) - time(a.createdAt),
  'ending-soon': (a, b) => time(a.endsAt) - time(b.endsAt),
  'price-low': (a, b) => a.startingPrice - b.startingPrice,
  'price-high': (a, b) => b.startingPrice - a.startingPrice,
};

/** Every word typed must appear in the title or the description (case-insensitive). */
export function matchesQuery(listing, query) {
  const terms = String(query ?? '')
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
  if (terms.length === 0) return true;
  const haystack = `${listing.title} ${listing.description}`.toLowerCase();
  return terms.every((term) => haystack.includes(term));
}

/**
 * options: { query, category ('all' or an id), condition ('all' or a label), sort }
 * Returns a NEW array.
 */
export function filterAndSortListings(listings, { query = '', category = 'all', condition = 'all', sort = DEFAULT_SORT } = {}) {
  const sorter = sorters[normalizeSort(sort)];
  return listings
    .filter((listing) => category === 'all' || listing.category === category)
    .filter((listing) => condition === 'all' || listing.condition === condition)
    .filter((listing) => matchesQuery(listing, query))
    .sort(sorter);
}

/** Open (not yet closed) listings for the homepage, in stored order. */
export function getFeaturedListings(listings, now, count) {
  return listings.filter((listing) => time(listing.endsAt) > now).slice(0, count);
}
