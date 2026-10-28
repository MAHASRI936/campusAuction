import { Crown, Radio, WifiOff } from 'lucide-react';
import ErrorState from './ErrorState.jsx';
import LoadingState from './LoadingState.jsx';
import { formatBidTime } from '../utils/bidding.js';
import { formatINR } from '../utils/format.js';

const LIVE_TEXT = {
  live: { icon: Radio, text: 'Live updates on', tone: 'text-emerald-700' },
  connecting: { icon: Radio, text: 'Connecting…', tone: 'text-ink-500' },
  offline: { icon: WifiOff, text: 'Refreshing every 20 seconds', tone: 'text-ink-500' },
};

/**
 * Bid history of one auction: highest bid first, earlier bids below.
 * Bidders are shown as "Bidder 1", "Bidder 2" ...; no names, emails or account ids are ever shown.
 * Props: history ({ bids, total } | null), loading, error, onRetry, liveStatus
 */
export default function BidHistory({ history, loading, error, onRetry, liveStatus = 'connecting' }) {
  const live = LIVE_TEXT[liveStatus] ?? LIVE_TEXT.connecting;
  const LiveIcon = live.icon;
  const bids = history?.bids ?? [];
  const total = history?.total ?? 0;

  return (
    <section className="card mt-6 p-6" aria-labelledby="bid-history-heading">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="bid-history-heading" className="text-lg font-bold">
          Bid history{total > 0 && <span className="ml-2 text-sm font-medium text-ink-500">({total})</span>}
        </h2>
        <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${live.tone}`} aria-live="polite">
          <LiveIcon className="h-3.5 w-3.5" aria-hidden="true" />
          {live.text}
        </span>
      </div>

      {loading && !history ? (
        <LoadingState label="Loading bids…" className="py-8" />
      ) : error && !history ? (
        <ErrorState title="Could not load the bid history" error={error} onRetry={onRetry} className="mt-4" />
      ) : bids.length === 0 ? (
        <div className="mt-4 rounded-xl border border-dashed border-ink-200 bg-ink-50 px-4 py-8 text-center">
          <p className="font-semibold text-ink-800">No bids yet</p>
          <p className="mt-1 text-sm text-ink-600">The first valid bid starts the auction. Bids appear here as soon as they are saved.</p>
        </div>
      ) : (
        <>
          <ol className="mt-4 divide-y divide-ink-100 overflow-hidden rounded-xl border border-ink-100">
            {bids.map((bid) => (
              <li
                key={bid.id}
                className={`flex items-center justify-between gap-3 px-4 py-3 ${bid.isHighest ? 'bg-brand-50' : 'bg-white'}`}
              >
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-ink-900">
                    <span className="truncate">{bid.bidderLabel}</span>
                    {bid.isMine && <span className="badge bg-ink-100 text-ink-700">You</span>}
                    {bid.isHighest && (
                      <span className="badge bg-brand-100 text-brand-800">
                        <Crown className="h-3 w-3" aria-hidden="true" />
                        Highest bid
                      </span>
                    )}
                  </p>
                  <p className="mt-0.5 text-xs text-ink-500">
                    <time dateTime={bid.createdAt}>{formatBidTime(bid.createdAt)}</time>
                  </p>
                </div>
                <p className={`shrink-0 text-base ${bid.isHighest ? 'font-extrabold text-brand-900' : 'font-semibold text-ink-700'}`}>
                  {formatINR(bid.amount)}
                </p>
              </li>
            ))}
          </ol>
          {total > bids.length && (
            <p className="mt-3 text-xs text-ink-500">
              Showing the {bids.length} highest of {total} bids.
            </p>
          )}
        </>
      )}
    </section>
  );
}
