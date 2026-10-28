import { useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Gavel, Loader2, Lock } from 'lucide-react';
import FormField, { describeField } from './FormField.jsx';
import Notice from './Notice.jsx';
import { BidRejectedError, placeBid } from '../services/biddingService.js';
import { validateBidInput } from '../utils/bidding.js';
import { formatINR } from '../utils/format.js';

/**
 * Bid form (or the reason there is no form) for one auction.
 *
 * Hiding the form for the seller / visitors / ended auctions is a courtesy. The database
 * (place_bid) re-checks every rule, so calling the API directly gets the same answers.
 *
 * Props:
 *  auction        the listing (id, title)
 *  minBid         minimum acceptable next bid (INR)
 *  isOwner        the logged-in user is the seller
 *  isAuthenticated / authLoading
 *  biddingOpen    false once the auction has ended or closed
 *  isLeading      the logged-in user holds the highest bid
 *  onBidSettled   called after every attempt (accepted or not) so the page re-reads the database
 */
export default function BidPanel({ auction, minBid, isOwner, isAuthenticated, authLoading, biddingOpen, isLeading, onBidSettled }) {
  const location = useLocation();
  const [value, setValue] = useState('');
  const [fieldError, setFieldError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null); // { type: 'success' | 'error', title, text }
  const inFlight = useRef(false); // blocks a second submit before React has re-rendered

  if (authLoading) {
    return <p className="mt-5 text-sm text-ink-500">Checking your login…</p>;
  }

  if (isOwner) {
    return (
      <Notice type="info" title="You cannot bid on your own listing" className="mt-5">
        Bidding is turned off for sellers, so nobody can push up the price of their own item.
      </Notice>
    );
  }

  if (!biddingOpen) {
    return (
      <Notice type="warning" title="Bidding has ended" className="mt-5">
        This auction no longer accepts bids.
      </Notice>
    );
  }

  if (!isAuthenticated) {
    const from = `${location.pathname}${location.search}`;
    return (
      <div className="mt-5 rounded-xl border border-ink-200 bg-ink-50 p-4">
        <p className="flex items-center gap-2 text-sm font-semibold text-ink-800">
          <Lock className="h-4 w-4 text-ink-500" aria-hidden="true" />
          Log in to place a bid
        </p>
        <p className="mt-1 text-sm text-ink-600">You need a CampusAuction account to bid. Browsing is open to everyone.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link to="/login" state={{ from, reason: 'Please log in to place a bid.' }} className="btn-primary px-4 py-2">
            Log in
          </Link>
          <Link to="/register" className="btn-secondary px-4 py-2">
            Create account
          </Link>
        </div>
      </div>
    );
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (inFlight.current) return;

    setResult(null);
    const check = validateBidInput(value, minBid);
    if (!check.ok) {
      setFieldError(check.error);
      return;
    }
    setFieldError('');

    inFlight.current = true;
    setSubmitting(true);
    try {
      const accepted = await placeBid(auction.id, check.amount);
      setValue('');
      setResult({
        type: 'success',
        title: 'Bid placed',
        text: `Your bid of ${formatINR(accepted.amount)} was saved. You are the highest bidder. The next bid must be at least ${formatINR(accepted.minNextBid)}.`,
      });
    } catch (err) {
      const rejected = err instanceof BidRejectedError;
      setResult({
        type: 'error',
        title: rejected ? 'Bid not accepted' : 'Your bid was not placed',
        text: err.message,
      });
    } finally {
      inFlight.current = false;
      setSubmitting(false);
      onBidSettled?.(); // re-read price and history from the database, success or not
    }
  }

  const fieldId = 'bid-amount';

  return (
    <form onSubmit={handleSubmit} noValidate className="mt-5" aria-label="Place a bid">
      {isLeading && (
        <Notice type="success" title="You are the highest bidder" className="mb-4">
          Your bid is currently winning. You can bid again once someone outbids you.
        </Notice>
      )}

      <FormField
        id={fieldId}
        label="Your bid (INR)"
        error={fieldError}
        hint={`Minimum ${formatINR(minBid)}. Whole rupees only.`}
      >
        <div className="relative">
          <span
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-ink-500"
            aria-hidden="true"
          >
            ₹
          </span>
          <input
            {...describeField(fieldId, { error: fieldError, hint: true })}
            type="text"
            inputMode="numeric"
            autoComplete="off"
            value={value}
            onChange={(event) => {
              setValue(event.target.value);
              if (fieldError) setFieldError('');
            }}
            disabled={submitting || isLeading}
            placeholder={String(minBid)}
            className={`field-input pl-8 ${fieldError ? 'border-rose-400' : ''}`}
          />
        </div>
      </FormField>

      <button
        type="button"
        onClick={() => {
          setValue(String(minBid));
          setFieldError('');
        }}
        disabled={submitting || isLeading}
        className="mt-2 text-xs font-semibold text-brand-700 hover:text-brand-900 disabled:opacity-50"
      >
        Use the minimum bid ({formatINR(minBid)})
      </button>

      <button type="submit" disabled={submitting || isLeading} aria-busy={submitting} className="btn-primary mt-4 w-full">
        {submitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Placing bid…
          </>
        ) : (
          <>
            <Gavel className="h-4 w-4" aria-hidden="true" />
            Place bid
          </>
        )}
      </button>

      {result && (
        <Notice type={result.type} title={result.title} onDismiss={() => setResult(null)} className="mt-4">
          {result.text}
        </Notice>
      )}

      <p className="mt-3 text-xs leading-relaxed text-ink-500">
        A bid is a commitment to buy at that price if you win. The server checks every bid, so a stale page cannot place an invalid one.
      </p>
    </form>
  );
}
