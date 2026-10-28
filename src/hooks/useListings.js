import { useSyncExternalStore } from 'react';
import { listingsService } from '../services/listingsService.js';

/** All listings. Re-renders the component whenever a listing is created, edited or deleted. */
export default function useListings() {
  return useSyncExternalStore(listingsService.subscribe, listingsService.getSnapshot);
}

/** One listing by id, or null when it does not exist (invalid id or deleted). */
export function useListing(id) {
  const listings = useListings();
  return listings.find((listing) => listing.id === id) ?? null;
}
