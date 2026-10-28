// Module 4 tests for the bidding logic that does not need a live database:
// minimum-bid rule, input validation, rejection messages, response interpretation, row mapping, error mapping.
// The database rules themselves are tested in supabase/tests/ (SQL + concurrency) against real PostgreSQL.
// Run with:  npm test
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  MAX_BID,
  describeBidRejection,
  formatBidTime,
  getMinNextBid,
  rowToBid,
  rowToMyBid,
  validateBidInput,
} from '../src/utils/bidding.js';
import { BidRejectedError, interpretPlaceBidResponse } from '../src/services/bidResponse.js';
import { ServiceError, toServiceError } from '../src/services/serviceError.js';

const silence = (fn) => {
  const original = console.error;
  console.error = () => {};
  try {
    return fn();
  } finally {
    console.error = original;
  }
};

test('minimum next bid: starting price with no bids, highest + increment afterwards', () => {
  assert.equal(getMinNextBid({ currentBid: null, startingPrice: 500, minIncrement: 25 }), 500);
  assert.equal(getMinNextBid({ currentBid: 500, startingPrice: 500, minIncrement: 25 }), 525);
  assert.equal(getMinNextBid({ currentBid: 1200, startingPrice: 500, minIncrement: 50 }), 1250);
});

test('bid input: accepts whole rupees, commas and a rupee sign', () => {
  assert.deepEqual(validateBidInput('525', 525), { ok: true, amount: 525 });
  assert.deepEqual(validateBidInput(' ₹1,500 ', 525), { ok: true, amount: 1500 });
  assert.equal(validateBidInput(String(MAX_BID), 100).ok, true);
});

test('bid input: rejects empty, non-numeric, decimal, zero, negative, too low and too large values', () => {
  assert.match(validateBidInput('', 100).error, /Enter your bid/);
  assert.match(validateBidInput('   ', 100).error, /Enter your bid/);
  for (const bad of ['abc', '12.5', '-50', '1e3', '10 20', '0x10']) {
    assert.equal(validateBidInput(bad, 10).ok, false, `${bad} must be rejected`);
  }
  assert.match(validateBidInput('0', 10).error, /greater than zero/);
  assert.match(validateBidInput('524', 525).error, /at least/);
  assert.match(validateBidInput(String(MAX_BID + 1), 100).error, /largest bid/);
});

test('rejection codes map to clear messages, and the too-low message shows the new minimum', () => {
  for (const code of ['not_authenticated', 'invalid_amount', 'amount_too_large', 'auction_not_found', 'own_auction', 'auction_closed', 'auction_ended', 'already_highest', 'bid_too_low']) {
    assert.ok(describeBidRejection(code).length > 10, code);
  }
  assert.match(describeBidRejection('bid_too_low', 1250), /1,250/);
  assert.match(describeBidRejection('own_auction'), /own listing/);
  assert.match(describeBidRejection('something_new'), /not accepted/); // unknown code: safe generic text
});

test('place_bid response: an accepted bid returns the amount and the next minimum', () => {
  assert.deepEqual(
    interpretPlaceBidResponse({ data: { ok: true, bid_id: 'x', amount: 600, min_next_bid: 650 }, error: null }),
    { amount: 600, minNextBid: 650 },
  );
});

test('place_bid response: a rule rejection is thrown, never reported as success', () => {
  const err = (() => {
    try {
      interpretPlaceBidResponse({ data: { ok: false, code: 'bid_too_low', min_bid: 650 }, error: null });
    } catch (e) {
      return e;
    }
    return null;
  })();
  assert.ok(err instanceof BidRejectedError);
  assert.ok(err instanceof ServiceError);
  assert.equal(err.code, 'bid_too_low');
  assert.equal(err.minBid, 650);
  assert.match(err.message, /650/);

  const own = (() => {
    try {
      interpretPlaceBidResponse({ data: { ok: false, code: 'own_auction' }, error: null });
    } catch (e) {
      return e;
    }
    return null;
  })();
  assert.equal(own.minBid, null);
});

test('place_bid response: malformed or empty answers are failures, not successes', () => {
  for (const data of [null, undefined, 'ok', { ok: 'true' }, { ok: true }, { ok: true, amount: 'x', min_next_bid: 5 }]) {
    assert.throws(() => interpretPlaceBidResponse({ data, error: null }), ServiceError, JSON.stringify(data));
  }
});

test('place_bid response: SQL / HTTP errors become safe messages without raw database text', () => {
  const run = (error) => silence(() => {
    try {
      interpretPlaceBidResponse({ data: null, error });
    } catch (e) {
      return e;
    }
    return null;
  });

  assert.equal(run({ code: '42501', message: 'permission denied for function place_bid' }).code, 'auth');
  assert.equal(run({ status: 401, message: 'JWT expired' }).code, 'auth');
  assert.equal(run({ code: '55P03', message: 'canceling statement due to lock timeout' }).code, 'busy');
  assert.equal(run({ code: 'PGRST202', message: 'Could not find the function public.place_bid' }).code, 'config');
  assert.equal(run({ name: 'TypeError', message: 'Failed to fetch' }).code, 'network');
  const unknown = run({ code: 'XX000', message: 'secret internal detail at line 42' });
  assert.equal(unknown.code, 'unknown');
  assert.doesNotMatch(unknown.message, /secret|line 42/);
});

test('error mapping: price/deadline lock and missing function', () => {
  const locked = silence(() => toServiceError({ code: 'CA001', message: 'whatever' }));
  assert.equal(locked.code, 'locked');
  assert.match(locked.message, /after bids/);
  assert.equal(silence(() => toServiceError({ code: '42883' })).code, 'config');
});

test('history rows: mapped to the UI shape; unusable rows dropped', () => {
  const row = { bid_id: 'b1', amount: '1250.00', created_at: '2026-10-28T10:00:00Z', bidder_label: 'Bidder 2', is_mine: true, is_highest: true, total_count: 3 };
  assert.deepEqual(rowToBid(row), { id: 'b1', amount: 1250, createdAt: '2026-10-28T10:00:00Z', bidderLabel: 'Bidder 2', isMine: true, isHighest: true });
  assert.equal(rowToBid({ ...row, amount: 'x' }), null);
  assert.equal(rowToBid({ ...row, bid_id: null }), null);
  assert.equal(rowToBid(null), null);
  assert.equal(rowToBid({ ...row, is_mine: null }).isMine, false);
  const mapped = rowToBid(row);
  assert.deepEqual(Object.keys(mapped).sort(), ['amount', 'bidderLabel', 'createdAt', 'id', 'isHighest', 'isMine']); // no bidder id / email field
});

test('my-bids rows: mapped, image URL restricted to http(s)', () => {
  const row = { auction_id: 'a1', title: 'Bike', image_url: 'javascript:alert(1)', status: 'active', ends_at: '2030-01-01T00:00:00Z', my_highest_bid: '600', my_bid_count: 2, current_price: '650', is_leading: false, last_bid_at: '2026-10-28T10:00:00Z' };
  const mapped = rowToMyBid(row);
  assert.equal(mapped.myHighestBid, 600);
  assert.equal(mapped.currentPrice, 650);
  assert.equal(mapped.imageUrl, null);
  assert.equal(mapped.isLeading, false);
  assert.equal(rowToMyBid({ ...row, my_highest_bid: null }), null);
  assert.equal(rowToMyBid({ ...row, image_url: 'https://x.test/a.png' }).imageUrl, 'https://x.test/a.png');
});

test('bid time formatting tolerates bad input', () => {
  assert.equal(formatBidTime('garbage'), '');
  assert.match(formatBidTime('2026-10-28T10:00:00Z'), /Oct/);
});
