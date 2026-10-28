import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Clock, Gavel, Info, MapPin, Pencil, ShieldCheck, Tag, Trash2, TrendingUp } from 'lucide-react';
import AuctionImage from '../components/AuctionImage.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import EmptyState from '../components/EmptyState.jsx';
import Notice from '../components/Notice.jsx';
import useNow from '../hooks/useNow.js';
import { useListing } from '../hooks/useListings.js';
import useFlashNotice from '../hooks/useFlashNotice.js';
import { listingsService } from '../services/listingsService.js';
import { getCategoryById } from '../data/categories.js';
import { formatEndDate, formatINR, getTimeRemaining } from '../utils/format.js';

export default function AuctionDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const now = useNow(1000);
  const auction = useListing(id);
  const [flash, dismissFlash] = useFlashNotice();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  if (!auction) {
    return (
      <div className="container-page py-16">
        <EmptyState
          title="Auction not found"
          message="This listing doesn't exist or may have been deleted. Check the link, or browse the available auctions."
          action={
            <Link to="/auctions" className="btn-primary">
              Back to auctions
            </Link>
          }
        />
      </div>
    );
  }

  function handleDelete() {
    try {
      if (listingsService.remove(auction.id)) {
        navigate('/auctions', { state: { notice: { type: 'deleted', title: auction.title } } });
        return;
      }
      setDeleteError('This listing was already deleted.');
    } catch (error) {
      setDeleteError(error.message);
    }
    setConfirmOpen(false);
  }

  const category = getCategoryById(auction.category);
  const remaining = getTimeRemaining(auction.endsAt, now, { seconds: true });
  const hasBids = auction.currentBid !== null;
  const minNextBid = hasBids ? auction.currentBid + auction.minIncrement : auction.startingPrice;

  return (
    <div className="container-page py-10">
      <Link
        to="/auctions"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-700 hover:text-brand-900"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to all auctions
      </Link>

      {flash?.type === 'created' && (
        <Notice type="success" title="Listing created" onDismiss={dismissFlash} className="mt-6">
          Your auction is live in this browser. You can edit or delete it from the panel on this page.
        </Notice>
      )}
      {flash?.type === 'updated' && (
        <Notice type="success" title="Changes saved" onDismiss={dismissFlash} className="mt-6">
          The listing has been updated.
        </Notice>
      )}
      {deleteError && (
        <Notice type="error" title="Could not delete this listing" className="mt-6">
          {deleteError}
        </Notice>
      )}

      <div className="mt-6 grid gap-8 lg:grid-cols-5">
        {/* Left: image and description */}
        <div className="lg:col-span-3">
          <div className="card overflow-hidden">
            <AuctionImage auction={auction} className="h-72 w-full sm:h-96" iconClassName="h-28 w-28" />
          </div>

          <section className="card mt-6 p-6" aria-labelledby="description-heading">
            <h2 id="description-heading" className="text-lg font-bold">
              Item description
            </h2>
            <p className="mt-3 whitespace-pre-line break-words leading-relaxed text-ink-700">{auction.description}</p>

            <dl className="mt-6 grid gap-4 border-t border-ink-100 pt-6 sm:grid-cols-2">
              <Detail icon={Tag} label="Category" value={category?.label ?? 'Other'} />
              <Detail icon={ShieldCheck} label="Condition" value={auction.condition} />
              <Detail icon={MapPin} label="Handover" value={auction.pickupLocation || 'To be arranged with the seller'} />
              <Detail
                icon={Clock}
                label={remaining.closed ? 'Closed on' : 'Closes on'}
                value={formatEndDate(auction.endsAt)}
              />
            </dl>
          </section>
        </div>

        {/* Right: bidding panel */}
        <aside className="lg:col-span-2" aria-label="Auction summary">
          <div className="card p-6 lg:sticky lg:top-24">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`badge ${category?.tone.tile ?? 'bg-ink-100 text-ink-700'}`}>
                {category?.label ?? 'Other'}
              </span>
              <span className="badge bg-ink-100 text-ink-700">{auction.condition}</span>
              {remaining.closed && <span className="badge bg-rose-100 text-rose-700">Auction ended</span>}
            </div>
            <h1 className="mt-3 break-words text-2xl font-extrabold leading-tight tracking-tight">{auction.title}</h1>

            <div className="mt-5 rounded-xl bg-brand-50 p-4">
              <p className="text-sm font-medium text-brand-800">Current bid</p>
              <p className="mt-1 text-3xl font-extrabold text-brand-900">
                {hasBids ? formatINR(auction.currentBid) : 'No bids yet'}
              </p>
            </div>

            <dl className="mt-4 grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-ink-500">Starting price</dt>
                <dd className="mt-0.5 text-base font-semibold">{formatINR(auction.startingPrice)}</dd>
              </div>
              <div>
                <dt className="text-ink-500">Minimum increment</dt>
                <dd className="mt-0.5 text-base font-semibold">{formatINR(auction.minIncrement)}</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-ink-500">Minimum next bid</dt>
                <dd className="mt-0.5 flex items-center gap-1.5 text-base font-semibold">
                  <TrendingUp className="h-4 w-4 text-brand-600" aria-hidden="true" />
                  {formatINR(minNextBid)}
                </dd>
              </div>
            </dl>

            <div
              className={`mt-5 flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold ${
                remaining.closed
                  ? 'border-ink-200 bg-ink-50 text-ink-600'
                  : remaining.urgent
                    ? 'border-rose-200 bg-rose-50 text-rose-700'
                    : 'border-ink-200 bg-white text-ink-800'
              }`}
            >
              <Clock className="h-4 w-4" aria-hidden="true" />
              <span>{remaining.closed ? `This auction ended on ${formatEndDate(auction.endsAt)}` : remaining.label}</span>
            </div>

            <button type="button" disabled className="btn-primary mt-5 w-full">
              <Gavel className="h-4 w-4" aria-hidden="true" />
              Bidding coming in Module 4
            </button>

            <p className="mt-4 flex items-start gap-2 text-xs leading-relaxed text-ink-500">
              <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              {auction.isSample
                ? 'This is sample data. Bidding, bid history and login are added in later modules.'
                : 'This listing was created in this browser. Bidding, bid history and login are added in later modules.'}
            </p>
          </div>

          {/* Demo-only management actions: there is no login, so these are NOT protected. */}
          <section className="card mt-6 p-5" aria-labelledby="manage-heading">
            <h2 id="manage-heading" className="text-base font-bold">
              Manage listing (demo)
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-ink-500">
              Demo feature: there is no login yet, so anyone using this browser can edit or delete this listing.
              Real ownership checks arrive with authentication.
            </p>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row lg:flex-col xl:flex-row">
              <Link to={`/auctions/${auction.id}/edit`} className="btn-secondary flex-1">
                <Pencil className="h-4 w-4" aria-hidden="true" />
                Edit listing
              </Link>
              <button type="button" onClick={() => setConfirmOpen(true)} className="btn-secondary flex-1 text-rose-700 hover:border-rose-300 hover:bg-rose-50">
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                Delete listing
              </button>
            </div>
          </section>
        </aside>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Delete this listing?"
        message={`“${auction.title}” will be removed from this browser. This cannot be undone.`}
        confirmLabel="Delete listing"
        onConfirm={handleDelete}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}

function Detail({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-ink-100 text-ink-600">
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <div>
        <dt className="text-xs font-medium text-ink-500">{label}</dt>
        <dd className="text-sm font-semibold text-ink-900">{value}</dd>
      </div>
    </div>
  );
}
