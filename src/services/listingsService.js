/**
 * LISTINGS SERVICE (Module 3: Supabase / PostgreSQL)
 *
 * The only place that reads or writes listings. UI code calls these functions
 * (usually through the hooks in `hooks/useListings.js`) and never builds a
 * Supabase query itself.
 *
 * SECURITY: ownership is enforced by the DATABASE (Row-Level Security in
 * supabase/schema.sql), not by this file and not by hidden buttons. The
 * `seller_id` we send comes from the authenticated session, and the database
 * rejects any other value. The `.eq('seller_id', ...)` filters below only make
 * error messages precise; they are not the security boundary.
 *
 * LISTING SHAPE (frontend, see utils/listingMapper.js for the column mapping):
 *   id, sellerId, title, description, category, condition, startingPrice,
 *   currentBid (null = no bids), minIncrement, endsAt (ISO), pickupLocation,
 *   imageUrl (http/https or null), status ('active' | 'closed'), createdAt, updatedAt
 */
import { supabase } from '../lib/supabaseClient.js';
import { failWith, ServiceError } from './serviceError.js';
import { listingToInsertRow, listingToUpdateRow, rowToListing } from '../utils/listingMapper.js';

const TABLE = 'auctions';
const MAX_ROWS = 500; // campus-scale list; add pagination before this is ever reached

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function client() {
  if (!supabase) {
    throw new ServiceError('Supabase is not configured. Add your keys to the .env file (see the README).', {
      code: 'config',
    });
  }
  return supabase;
}

/** The id of the logged-in user, read from the SDK session. Throws when nobody is logged in. */
async function requireUserId() {
  const { data, error } = await client().auth.getSession();
  if (error) throw failWith(error, 'Could not check your login. Please try again.');
  const userId = data.session?.user?.id;
  if (!userId) throw new ServiceError('Please log in to continue.', { code: 'auth' });
  return userId;
}

const mapRows = (rows) => (rows ?? []).map(rowToListing).filter(Boolean);

/** All active auctions, newest first. */
export async function fetchActiveListings() {
  const { data, error } = await client()
    .from(TABLE)
    .select('*')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(MAX_ROWS);
  if (error) throw failWith(error, 'Could not load the auctions.');
  return mapRows(data);
}

/** One listing by id, or null when it does not exist (or is not visible to this user). */
export async function fetchListingById(id) {
  if (typeof id !== 'string' || !UUID_PATTERN.test(id)) return null; // not a valid id: skip the request
  const { data, error } = await client().from(TABLE).select('*').eq('id', id).maybeSingle();
  if (error) throw failWith(error, 'Could not load this listing.');
  return rowToListing(data);
}

/** The logged-in user's own listings (including closed ones), newest first. */
export async function fetchMyListings() {
  const userId = await requireUserId();
  const { data, error } = await client()
    .from(TABLE)
    .select('*')
    .eq('seller_id', userId)
    .order('created_at', { ascending: false })
    .limit(MAX_ROWS);
  if (error) throw failWith(error, 'Could not load your listings.');
  return mapRows(data);
}

/** Create a listing for the logged-in user from validated form data. Returns the saved listing. */
export async function createListing(input) {
  const userId = await requireUserId();
  const { data, error } = await client()
    .from(TABLE)
    .insert({ ...listingToInsertRow(input), seller_id: userId })
    .select('*')
    .single();
  if (error) throw failWith(error, 'Your listing could not be saved.');
  return rowToListing(data);
}

/** Update one of the user's own listings. Returns the saved listing. */
export async function updateListing(id, changes) {
  const userId = await requireUserId();
  const base = await fetchListingById(id);
  if (!base) throw new ServiceError('This listing no longer exists, so your changes could not be saved.', { code: 'not_found' });
  if (base.sellerId !== userId) {
    throw new ServiceError('You can only edit your own listings.', { code: 'permission' });
  }

  const { data, error } = await client()
    .from(TABLE)
    .update(listingToUpdateRow(changes, base))
    .eq('id', id)
    .eq('seller_id', userId)
    .select('*');
  if (error) throw failWith(error, 'Your changes could not be saved.');
  // Zero rows means the database refused it (row-level security) or the listing vanished.
  if (!data || data.length === 0) {
    throw new ServiceError('Your changes were not saved. The listing may have been deleted, or it is not yours.', {
      code: 'permission',
    });
  }
  return rowToListing(data[0]);
}

/** Delete one of the user's own listings. Returns true when a row was deleted. */
export async function deleteListing(id) {
  const userId = await requireUserId();
  const { data, error } = await client().from(TABLE).delete().eq('id', id).eq('seller_id', userId).select('id');
  if (error) throw failWith(error, 'The listing could not be deleted.');
  return Array.isArray(data) && data.length > 0;
}

/**
 * Optional, explicit import of listings from the old localStorage data.
 * Every row is owned by the logged-in user. Rows keep their old UUID, so importing the
 * same listing twice (or from a second account) is ignored by the database instead of
 * creating a duplicate. Returns the number of listings that were newly created.
 */
export async function importLegacyListings(listings) {
  const userId = await requireUserId();
  if (listings.length === 0) return 0;

  const rows = listings.map((listing) => ({
    ...listingToInsertRow(listing, { id: listing.id }),
    seller_id: userId,
  }));
  const { data, error } = await client()
    .from(TABLE)
    .upsert(rows, { onConflict: 'id', ignoreDuplicates: true })
    .select('id');
  if (error) throw failWith(error, 'Could not import your saved listings.');
  return data?.length ?? 0;
}
