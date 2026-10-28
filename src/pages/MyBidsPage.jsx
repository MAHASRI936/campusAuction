import { Link } from 'react-router-dom';
import { Clock, Gavel } from 'lucide-react';
import AuctionImage from '../components/AuctionImage.jsx';
import EmptyState from '../components/EmptyState.jsx';
import ErrorState from '../components/ErrorState.jsx';
import LoadingState from '../components/LoadingState.jsx';
import useAsyncData from '../hooks/useAsyncData.js';
import useAuth from '../hooks/useAuth.js';
import useNow from '../hooks/useNow.js';
import { fetchMyBids } from '../services/biddingService.js';
import { formatBidTime } from '../utils/bidding.js';
import { formatINR, getTimeRemaining } from '../utils/format.js';

/** The logged-in user's own bidding activity: one card per auction they have bid on. */
export default function MyBidsPage() {
  const now = useNow(30000);
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const { data: bids, loading, error, reload } = useAsyncData(fetchMyBids, [userId]);

  return (
    <div className="container-page py-10">
      <header>
        <h1 className="text-3xl font-extrabold tracking-tight">My Bids</h1>
        <p className="mt-2 text-ink-600">Auctions you have bid on. Only you can see this page.</p>
      </header>

      <div className="mt-8">
        {loading ? (
          <LoadingState label="Loading your bids…" />
        ) : error ? (
          <ErrorState title="Could not load your bids" error={error} onRetry={reload} />
        ) : !bids || bids.length === 0 ? (
          <EmptyState
            title="You have not placed any bids yet"
            message="Find something you like and place a bid. Your bidding activity will appear here."
            action={
              <Link to="/auctions" className="btn-primary">
                <Gavel className="h-4 w-4" aria-hidden="true" />
                Browse auctions
              </Link>
            }
          />
        ) : (
          <ul className="space-y-4">
            {bids.map((bid) => {
              const ended = bid.status !== 'active' || getTimeRemaining(bid.endsAt, now).closed;
              const remaining = getTimeRemaining(bid.endsAt, now);
              return (
                <li key={bid.auctionId} className="card flex flex-col gap-4 overflow-hidden sm:flex-row">
                  <AuctionImage
                    auction={{ id: bid.auctionId, title: bid.title, imageUrl: bid.imageUrl, category: 'other' }}
                    className="h-40 w-full sm:h-auto sm:w-48 sm:shrink-0"
                    iconClassName="h-14 w-14"
                  />
                  <div className="flex min-w-0 flex-1 flex-col gap-3 p-5 sm:pl-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {ended ? (
                        <span className="badge bg-ink-100 text-ink-700">Auction ended</span>
                      ) : bid.isLeading ? (
                        <span className="badge bg-emerald-100 text-emerald-800">Highest bidder</span>
                      ) : (
                        <span className="badge bg-rose-100 text-rose-700">Outbid</span>
                      )}
                      <span className="text-xs text-ink-500">
                        {bid.myBidCount} bid{bid.myBidCount === 1 ? '' : 's'} by you · last on {formatBidTime(bid.lastBidAt)}
                      </span>
                    </div>
                    <h2 className="break-words text-lg font-bold">{bid.title}</h2>
                    <dl className="grid grid-cols-2 gap-4 text-sm sm:max-w-sm">
                      <div>
                        <dt className="text-ink-500">Your highest bid</dt>
                        <dd className="text-base font-semibold">{formatINR(bid.myHighestBid)}</dd>
                      </div>
                      <div>
                        <dt className="text-ink-500">Current highest bid</dt>
                        <dd className="text-base font-semibold">
                          {bid.currentPrice === null ? '—' : formatINR(bid.currentPrice)}
                        </dd>
                      </div>
                    </dl>
                    <div className="mt-auto flex flex-wrap items-center justify-between gap-3">
                      <p className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-600">
                        <Clock className="h-4 w-4" aria-hidden="true" />
                        {remaining.label}
                      </p>
                      <Link to={`/auctions/${bid.auctionId}`} className="btn-secondary px-4 py-1.5">
                        View auction
                      </Link>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
