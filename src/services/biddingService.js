/**
 * BIDDING SERVICE (Module 4)
 *
 * The only place that talks to the bidding functions in the database. UI code calls
 * these functions and never builds a Supabase request itself.
 *
 * SECURITY: bids are created ONLY by the database function public.place_bid(), which
 * takes the bidder from the verified session (auth.uid()), locks the auction row and
 * validates everything. This file sends just the auction id and the amount; there is
 * no bidder id to tamper with, and the bids table cannot be written from the browser.
 * Nothing here is an authorisation check.
 */
import { supabase } from '../lib/supabaseClient.js';
import { BidRejectedError, interpretPlaceBidResponse } from './bidResponse.js';
import { failWith, ServiceError } from './serviceError.js';
import { rowToBid, rowToMyBid } from '../utils/bidding.js';

export { BidRejectedError };

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const HISTORY_LIMIT = 100;

function client() {
  if (!supabase) {
    throw new ServiceError('Supabase is not configured. Add your keys to the .env file (see the README).', {
      code: 'config',
    });
  }
  return supabase;
}

/**
 * Place a bid for the logged-in user. Resolves with { amount, minNextBid } only when the
 * database ACCEPTED and stored the bid. Throws BidRejectedError for a rule violation and
 * ServiceError for anything else (network, login expired, setup missing).
 */
export async function placeBid(auctionId, amount) {
  if (typeof auctionId !== 'string' || !UUID_PATTERN.test(auctionId)) {
    throw new BidRejectedError('auction_not_found');
  }
  if (!Number.isFinite(amount)) throw new BidRejectedError('invalid_amount');

  const { data: sessionData, error: sessionError } = await client().auth.getSession();
  if (sessionError) throw failWith(sessionError, 'Could not check your login. Please try again.');
  if (!sessionData.session) throw new ServiceError('Please log in to place a bid.', { code: 'auth' });

  const response = await client().rpc('place_bid', { p_auction_id: auctionId, p_amount: amount });
  return interpretPlaceBidResponse(response);
}

/**
 * Bid history of one auction, highest first: { bids, total }.
 * Public: bidders appear only as "Bidder 1", "Bidder 2" ... and `isMine` marks the caller's own bids.
 * `total` can exceed bids.length (only the HISTORY_LIMIT highest bids are returned).
 */
export async function fetchBidHistory(auctionId) {
  if (typeof auctionId !== 'string' || !UUID_PATTERN.test(auctionId)) return { bids: [], total: 0 };
  const { data, error } = await client().rpc('get_bid_history', { p_auction_id: auctionId, p_limit: HISTORY_LIMIT });
  if (error) throw failWith(error, 'Could not load the bid history.');
  const rows = Array.isArray(data) ? data : [];
  const bids = rows.map(rowToBid).filter(Boolean);
  const total = rows.length > 0 ? Number(rows[0].total_count) || bids.length : 0;
  return { bids, total };
}

/** The logged-in user's own bidding activity, one entry per auction, newest first. */
export async function fetchMyBids() {
  const { data: sessionData, error: sessionError } = await client().auth.getSession();
  if (sessionError) throw failWith(sessionError, 'Could not check your login. Please try again.');
  if (!sessionData.session) throw new ServiceError('Please log in to continue.', { code: 'auth' });

  const { data, error } = await client().rpc('get_my_bids');
  if (error) throw failWith(error, 'Could not load your bids.');
  return (Array.isArray(data) ? data : []).map(rowToMyBid).filter(Boolean);
}

/**
 * Listen for changes to ONE auction row (a new bid updates its current price).
 * The event is only a SIGNAL to re-fetch from the database; its payload is never trusted or shown.
 * Returns an unsubscribe function. `onStatus` receives 'live' | 'connecting' | 'offline'.
 */
export function subscribeToAuction(auctionId, { onChange, onStatus }) {
  if (!supabase || typeof auctionId !== 'string' || !UUID_PATTERN.test(auctionId)) {
    onStatus?.('offline');
    return () => {};
  }

  const channel = supabase
    .channel(`auction-${auctionId}`)
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'auctions', filter: `id=eq.${auctionId}` },
      () => onChange(),
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') onStatus?.('live');
      else if (status === 'CLOSED' || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') onStatus?.('offline');
      else onStatus?.('connecting');
    });

  return () => {
    supabase.removeChannel(channel);
  };
}
