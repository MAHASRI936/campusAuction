/**
 * Bidding rules and mapping helpers (pure functions, no network).
 *
 * THE RULES LIVE IN THE DATABASE (supabase/migrations/004_bidding.sql, function place_bid).
 * The functions here repeat them only so the form can give instant feedback and show the
 * minimum next bid. If the two ever disagree, the database wins: it is the authority and
 * the form simply shows its message.
 *
 *   minimum bid = starting price                 when there are no bids yet
 *               = highest bid + min_increment    otherwise
 *   amounts are whole rupees, at most MAX_BID
 */
import { formatINR } from './format.js';
import { parsePrice } from './validation.js';

/** Largest bid the database accepts (INR). Keep in sync with place_bid(). */
export const MAX_BID = 100000000;

/** Minimum acceptable next bid for a listing ({ currentBid, startingPrice, minIncrement }). */
export function getMinNextBid({ currentBid, startingPrice, minIncrement }) {
  return currentBid === null || currentBid === undefined ? startingPrice : currentBid + minIncrement;
}

/**
 * Usability check of what the user typed. Returns { ok: true, amount } or { ok: false, error }.
 * Not a security control: place_bid() validates everything again.
 */
export function validateBidInput(raw, minBid) {
  const text = String(raw ?? '').trim();
  if (text === '') return { ok: false, error: 'Enter your bid amount.' };

  // "10 20" would otherwise be read as 1020; a typo like that must not become a bid.
  const amount = /\d\s+\d/.test(text) ? Number.NaN : parsePrice(text);
  if (Number.isNaN(amount)) {
    return { ok: false, error: 'Enter a whole number of rupees, for example 1500 (no decimals or letters).' };
  }
  if (amount <= 0) return { ok: false, error: 'Your bid must be greater than zero.' };
  if (amount > MAX_BID) return { ok: false, error: `The largest bid allowed is ${formatINR(MAX_BID)}.` };
  if (amount < minBid) return { ok: false, error: `Your bid must be at least ${formatINR(minBid)}.` };
  return { ok: true, amount };
}

/** Friendly text for each rejection code returned by place_bid(). */
export function describeBidRejection(code, minBid) {
  switch (code) {
    case 'not_authenticated':
      return 'Please log in to place a bid.';
    case 'invalid_amount':
      return 'Enter a whole number of rupees greater than zero.';
    case 'amount_too_large':
      return `The largest bid allowed is ${formatINR(MAX_BID)}.`;
    case 'auction_not_found':
      return 'This auction no longer exists.';
    case 'own_auction':
      return 'You cannot bid on your own listing.';
    case 'auction_closed':
      return 'This auction is closed, so it no longer accepts bids.';
    case 'auction_ended':
      return 'This auction has ended, so it no longer accepts bids.';
    case 'already_highest':
      return 'You are already the highest bidder. Wait for someone to outbid you.';
    case 'bid_too_low':
      return typeof minBid === 'number'
        ? `Your bid is too low. Someone may have bid just before you. The minimum is now ${formatINR(minBid)}.`
        : 'Your bid is too low. Check the minimum next bid and try again.';
    default:
      return 'Your bid was not accepted. Please check the amount and try again.';
  }
}

const toNumber = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

/** One row of get_bid_history() -> bid shown in the history list. Returns null for an unusable row. */
export function rowToBid(row) {
  const amount = toNumber(row?.amount);
  if (!row || typeof row.bid_id !== 'string' || amount === null) return null;
  return {
    id: row.bid_id,
    amount,
    createdAt: row.created_at,
    bidderLabel: row.bidder_label || 'Bidder',
    isMine: row.is_mine === true,
    isHighest: row.is_highest === true,
  };
}

/** One row of get_my_bids() -> the user's activity on one auction. Returns null for an unusable row. */
export function rowToMyBid(row) {
  const myHighestBid = toNumber(row?.my_highest_bid);
  if (!row || typeof row.auction_id !== 'string' || myHighestBid === null) return null;
  return {
    auctionId: row.auction_id,
    title: row.title ?? '',
    imageUrl: typeof row.image_url === 'string' && /^https?:\/\//i.test(row.image_url) ? row.image_url : null,
    status: row.status ?? 'active',
    endsAt: row.ends_at,
    myHighestBid,
    myBidCount: Number(row.my_bid_count) || 0,
    currentPrice: toNumber(row.current_price),
    isLeading: row.is_leading === true,
    lastBidAt: row.last_bid_at,
  };
}

/** Bid time for the history list, e.g. "28 Oct, 3:42:10 pm". */
export function formatBidTime(isoString) {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
  });
}
