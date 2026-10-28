import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Clock, DatabaseBackup, Pencil, PlusCircle, Trash2 } from 'lucide-react';
import AuctionImage from '../components/AuctionImage.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import EmptyState from '../components/EmptyState.jsx';
import ErrorState from '../components/ErrorState.jsx';
import LoadingState from '../components/LoadingState.jsx';
import Notice from '../components/Notice.jsx';
import useNow from '../hooks/useNow.js';
import { useMyListings } from '../hooks/useListings.js';
import { deleteListing, importLegacyListings } from '../services/listingsService.js';
import { findImportableListings, markImported } from '../services/legacyLocalListings.js';
import { forgetSessionImage } from '../services/sessionImages.js';
import { getCategoryById } from '../data/categories.js';
import { formatEndDate, formatINR, getTimeRemaining } from '../utils/format.js';

/** The logged-in seller's own listings, with edit and delete controls. */
export default function MyListingsPage() {
  const now = useNow(30000);
  const { listings, loading, error, reload } = useMyListings();
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState(null); // { type, title, text }

  // Listings the Module 2 demo saved in this browser (offered for an explicit, optional import).
  const [legacy, setLegacy] = useState(() => findImportableListings());
  const [importOpen, setImportOpen] = useState(false);
  const [importing, setImporting] = useState(false);

  async function handleDelete() {
    if (!toDelete || deleting) return;
    setDeleting(true);
    try {
      const removed = await deleteListing(toDelete.id);
      forgetSessionImage(toDelete.id);
      setMessage(
        removed
          ? { type: 'success', title: 'Listing deleted', text: `“${toDelete.title}” has been removed.` }
          : { type: 'error', title: 'Nothing was deleted', text: 'That listing was already deleted, or it is not yours.' },
      );
      reload();
    } catch (err) {
      setMessage({ type: 'error', title: 'Could not delete this listing', text: err.message });
    }
    setDeleting(false);
    setToDelete(null);
  }

  async function handleImport() {
    if (importing) return;
    setImporting(true);
    try {
      const created = await importLegacyListings(legacy.importable);
      markImported(legacy.importable.map((listing) => listing.id));
      setLegacy(findImportableListings());
      setMessage({
        type: 'success',
        title: 'Import finished',
        text:
          created === legacy.importable.length
            ? `${created} listing${created === 1 ? '' : 's'} copied into your account. Nothing was removed from this browser.`
            : `${created} of ${legacy.importable.length} listings were new. The rest already existed, so no duplicates were created.`,
      });
      reload();
    } catch (err) {
      setMessage({ type: 'error', title: 'Could not import your saved listings', text: err.message });
    }
    setImporting(false);
    setImportOpen(false);
  }

  return (
    <div className="container-page py-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">My Listings</h1>
          <p className="mt-2 text-ink-600">Items you are selling. Only you can edit or delete them.</p>
        </div>
        <Link to="/sell" className="btn-accent">
          <PlusCircle className="h-4 w-4" aria-hidden="true" />
          Sell an Item
        </Link>
      </header>

      {message && (
        <Notice type={message.type} title={message.title} onDismiss={() => setMessage(null)} className="mt-6">
          <span className="break-words">{message.text}</span>
        </Notice>
      )}

      {legacy.importable.length > 0 && (
        <Notice type="info" title="Listings found in this browser" className="mt-6">
          <p>
            The earlier demo version saved {legacy.importable.length} listing{legacy.importable.length === 1 ? '' : 's'} created in
            this browser. They are not shown in the marketplace any more. You can copy them into your account. Nothing is deleted
            from this browser, and importing twice will not create duplicates.
            {legacy.skipped > 0 && ` ${legacy.skipped} saved record${legacy.skipped === 1 ? '' : 's'} cannot be imported (invalid data).`}
          </p>
          <button type="button" onClick={() => setImportOpen(true)} className="btn-secondary mt-3 px-4 py-1.5">
            <DatabaseBackup className="h-4 w-4" aria-hidden="true" />
            Import to my account
          </button>
        </Notice>
      )}

      <div className="mt-8">
        {loading ? (
          <LoadingState label="Loading your listings…" />
        ) : error ? (
          <ErrorState title="Could not load your listings" error={error} onRetry={reload} />
        ) : listings.length === 0 ? (
          <EmptyState
            title="You have no listings yet"
            message="List something you no longer need, and it will appear here."
            action={
              <Link to="/sell" className="btn-primary">
                <PlusCircle className="h-4 w-4" aria-hidden="true" />
                Sell an Item
              </Link>
            }
          />
        ) : (
          <ul className="space-y-4">
            {listings.map((listing) => {
              const category = getCategoryById(listing.category);
              const remaining = getTimeRemaining(listing.endsAt, now);
              return (
                <li key={listing.id} className="card flex flex-col gap-4 overflow-hidden sm:flex-row">
                  <AuctionImage auction={listing} className="h-40 w-full sm:h-auto sm:w-48 sm:shrink-0" iconClassName="h-14 w-14" />
                  <div className="flex min-w-0 flex-1 flex-col gap-3 p-5 sm:pl-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`badge ${category?.tone.tile ?? 'bg-ink-100 text-ink-700'}`}>{category?.label ?? 'Other'}</span>
                      <span className="badge bg-ink-100 text-ink-700">{listing.condition}</span>
                      <span className={`badge ${remaining.closed ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
                        {remaining.closed ? 'Ended' : 'Active'}
                      </span>
                    </div>
                    <h2 className="break-words text-lg font-bold leading-snug">{listing.title}</h2>
                    <p className="text-sm text-ink-600">
                      Starting price <strong className="text-ink-900">{formatINR(listing.startingPrice)}</strong>
                      <span className="mx-2 text-ink-300" aria-hidden="true">
                        |
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-4 w-4" aria-hidden="true" />
                        {remaining.closed ? `Ended ${formatEndDate(listing.endsAt)}` : `${remaining.label} (ends ${formatEndDate(listing.endsAt)})`}
                      </span>
                    </p>
                    <div className="mt-auto flex flex-wrap gap-3">
                      <Link to={`/auctions/${listing.id}`} className="btn-secondary px-4 py-1.5">
                        View
                      </Link>
                      <Link to={`/auctions/${listing.id}/edit`} className="btn-secondary px-4 py-1.5">
                        <Pencil className="h-4 w-4" aria-hidden="true" />
                        Edit
                      </Link>
                      <button
                        type="button"
                        onClick={() => setToDelete(listing)}
                        className="btn-secondary px-4 py-1.5 text-rose-700 hover:border-rose-300 hover:bg-rose-50"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                        Delete
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <ConfirmDialog
        open={toDelete !== null}
        title="Delete this listing?"
        message={toDelete ? `“${toDelete.title}” will be permanently deleted from the marketplace. This cannot be undone.` : ''}
        confirmLabel={deleting ? 'Deleting…' : 'Delete listing'}
        onConfirm={handleDelete}
        onCancel={() => setToDelete(null)}
      />

      <ConfirmDialog
        open={importOpen}
        destructive={false}
        title="Import listings into your account?"
        message={`${legacy.importable.length} listing${legacy.importable.length === 1 ? '' : 's'} saved in this browser will be copied into your account and become visible to everyone. Nothing is removed from this browser.`}
        confirmLabel={importing ? 'Importing…' : 'Import listings'}
        onConfirm={handleImport}
        onCancel={() => setImportOpen(false)}
      />
    </div>
  );
}
