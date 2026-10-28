import { useMemo } from 'react';
import useAsyncData from './useAsyncData.js';
import useAuth from './useAuth.js';
import { fetchActiveListings, fetchListingById, fetchMyListings } from '../services/listingsService.js';
import { withSessionImage } from '../services/sessionImages.js';

/** All active listings: { listings, loading, error, reload }. */
export default function useListings() {
  const { data, loading, error, reload } = useAsyncData(fetchActiveListings, []);
  const listings = useMemo(() => (data ?? []).map(withSessionImage), [data]);
  return { listings, loading, error, reload };
}

/** One listing by id: { listing, loading, error, reload }. `listing` is null when it does not exist. */
export function useListing(id) {
  const { data, loading, error, reload } = useAsyncData(() => fetchListingById(id), [id]);
  const listing = useMemo(() => withSessionImage(data), [data]);
  return { listing, loading, error, reload };
}

/** The logged-in user's own listings: { listings, loading, error, reload }. */
export function useMyListings() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const { data, loading, error, reload } = useAsyncData(fetchMyListings, [userId]);
  const listings = useMemo(() => (data ?? []).map(withSessionImage), [data]);
  return { listings, loading, error, reload };
}
