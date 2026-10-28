/**
 * Translates between the frontend listing shape (camelCase, used by every page)
 * and the `public.auctions` table (snake_case). This is the ONLY place that knows
 * both sets of names, so the UI and the database cannot drift apart silently.
 *
 *   frontend         database
 *   ---------------  ---------------
 *   sellerId         seller_id
 *   startingPrice    starting_price
 *   currentBid       current_price   (null = no bids yet)
 *   minIncrement     min_increment
 *   pickupLocation   pickup_location
 *   imageUrl         image_url
 *   endsAt           ends_at
 *   createdAt        created_at
 *   updatedAt        updated_at
 */
import { isValidCondition } from '../data/conditions.js';
import { isValidImageUrl } from './validation.js';

/** A sensible default bid step for a given starting price (INR). */
export function suggestMinIncrement(price) {
  return Math.max(10, Math.round((price * 0.05) / 10) * 10);
}

const toNumberOrNull = (value) => {
  if (value === null || value === undefined) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

/** Database row -> listing used by the UI. Returns null for an unusable row. */
export function rowToListing(row) {
  if (!row || typeof row !== 'object' || typeof row.id !== 'string') return null;

  const startingPrice = toNumberOrNull(row.starting_price);
  if (startingPrice === null) return null;

  return {
    id: row.id,
    sellerId: row.seller_id,
    title: row.title ?? '',
    description: row.description ?? '',
    category: row.category || 'other',
    condition: isValidCondition(row.condition) ? row.condition : 'Good',
    startingPrice,
    currentBid: toNumberOrNull(row.current_price),
    minIncrement: toNumberOrNull(row.min_increment) ?? suggestMinIncrement(startingPrice),
    endsAt: row.ends_at,
    pickupLocation: row.pickup_location ?? '',
    imageUrl: typeof row.image_url === 'string' && isValidImageUrl(row.image_url) ? row.image_url : null,
    status: row.status ?? 'active',
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? row.created_at,
  };
}

/**
 * Validated form data -> columns for INSERT.
 * `id` is optional (only the explicit localStorage import supplies one).
 * seller_id is added by the service from the authenticated session.
 * current_price, status and the timestamps are deliberately NOT sent: the database owns them.
 */
export function listingToInsertRow(data, { id, pickupLocation = '' } = {}) {
  const row = {
    title: data.title,
    description: data.description,
    category: data.category,
    condition: data.condition,
    starting_price: data.startingPrice,
    min_increment: data.minIncrement ?? suggestMinIncrement(Number(data.startingPrice)),
    pickup_location: data.pickupLocation ?? pickupLocation,
    image_url: data.imageUrl ?? null,
    ends_at: data.endsAt,
  };
  if (id) row.id = id;
  return row;
}

/**
 * Validated form data + the current stored listing -> columns for UPDATE.
 * Only editable columns are included, so seller_id / current_price / status can
 * never be changed through this path (and the database refuses them anyway).
 */
export function listingToUpdateRow(changes, base) {
  const priceChanged = changes.startingPrice !== undefined && Number(changes.startingPrice) !== base.startingPrice;
  // Keep a bid step that was auto-suggested in step with the price; leave custom steps alone.
  const followsSuggestion = base.minIncrement === suggestMinIncrement(base.startingPrice);

  return {
    title: changes.title ?? base.title,
    description: changes.description ?? base.description,
    category: changes.category ?? base.category,
    condition: changes.condition ?? base.condition,
    starting_price: changes.startingPrice ?? base.startingPrice,
    ends_at: changes.endsAt ?? base.endsAt,
    image_url: changes.imageUrl === undefined ? base.imageUrl : changes.imageUrl,
    min_increment:
      priceChanged && followsSuggestion ? suggestMinIncrement(Number(changes.startingPrice)) : base.minIncrement,
  };
}
