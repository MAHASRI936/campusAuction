import { Link } from 'react-router-dom';
import { Clock, ArrowRight } from 'lucide-react';
import AuctionImage from './AuctionImage.jsx';
import { getCategoryById } from '../data/categories.js';
import { formatINR, getTimeRemaining } from '../utils/format.js';

/** Reusable listing card used on the homepage and the browse page. */
export default function AuctionCard({ auction, now }) {
  const category = getCategoryById(auction.category);
  const remaining = getTimeRemaining(auction.endsAt, now);

  return (
    <article className="card group flex h-full flex-col overflow-hidden transition-shadow hover:shadow-lift">
      <AuctionImage auction={auction} className="h-44 w-full" iconClassName="h-16 w-16" />

      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-center justify-between gap-2">
          <span className={`badge ${category?.tone.tile ?? 'bg-ink-100 text-ink-700'}`}>
            {category?.label ?? 'Other'}
          </span>
          <span className="text-xs font-medium text-ink-500">{auction.condition}</span>
        </div>

        <h3 className="mt-3 break-words text-base font-bold leading-snug text-ink-900">{auction.title}</h3>

        <dl className="mt-4 grid grid-cols-2 gap-3">
          <div>
            <dt className="text-xs font-medium text-ink-500">Current bid</dt>
            <dd className="text-lg font-extrabold text-brand-800">
              {auction.currentBid !== null ? formatINR(auction.currentBid) : 'No bids yet'}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-ink-500">Starting price</dt>
            <dd className="text-lg font-semibold text-ink-700">{formatINR(auction.startingPrice)}</dd>
          </div>
        </dl>

        <p
          className={`mt-4 inline-flex items-center gap-1.5 text-sm font-medium ${
            remaining.closed ? 'text-ink-500' : remaining.urgent ? 'text-rose-600' : 'text-ink-600'
          }`}
        >
          <Clock className="h-4 w-4" aria-hidden="true" />
          {remaining.label}
        </p>

        <Link
          to={`/auctions/${auction.id}`}
          className="btn-primary mt-5 w-full"
          aria-label={`View details for ${auction.title}`}
        >
          View Details
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    </article>
  );
}
