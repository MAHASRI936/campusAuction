/**
 * Turns the raw answer of the place_bid() database function into either an accepted-bid result
 * or a thrown error with a safe, friendly message. Pure (no network), so it is unit-tested.
 *
 * place_bid() answers:
 *   { ok: true, bid_id, amount, min_next_bid }                       the bid was STORED
 *   { ok: false, code, message, min_bid? }                           a rule rejected it; nothing was stored
 * or the request fails with an SQL / HTTP error (login missing, lock timeout, function missing ...).
 */
import { failWith, ServiceError } from './serviceError.js';
import { describeBidRejection } from '../utils/bidding.js';

/** A bid the database refused for a business reason (too low, own auction, ended ...). */
export class BidRejectedError extends ServiceError {
  constructor(code, minBid) {
    super(describeBidRejection(code, minBid), { code });
    this.name = 'BidRejectedError';
    this.minBid = typeof minBid === 'number' && Number.isFinite(minBid) ? minBid : null;
  }
}

/** Returns { amount, minNextBid } only for an accepted bid; otherwise throws. */
export function interpretPlaceBidResponse({ data, error }) {
  if (error) {
    // 42501 / 401 / 403 from the RPC means the request had no valid logged-in user.
    if (error.code === '42501' || error.code === 'PGRST301' || error.status === 401 || error.status === 403) {
      console.error('CampusAuction:', error);
      throw new ServiceError('Your login has expired. Please log in again and retry your bid.', {
        code: 'auth',
        cause: error,
      });
    }
    throw failWith(error, 'Your bid could not be placed. Please try again.');
  }

  if (!data || typeof data !== 'object') {
    throw new ServiceError('Your bid could not be confirmed. Refresh the page to see whether it was placed.', {
      code: 'unknown',
    });
  }
  if (data.ok !== true) {
    throw new BidRejectedError(String(data.code ?? 'unknown'), data.min_bid == null ? undefined : Number(data.min_bid));
  }

  const amount = Number(data.amount);
  const minNextBid = Number(data.min_next_bid);
  if (!Number.isFinite(amount) || !Number.isFinite(minNextBid)) {
    throw new ServiceError('Your bid could not be confirmed. Refresh the page to see whether it was placed.', {
      code: 'unknown',
    });
  }
  return { amount, minNextBid };
}
