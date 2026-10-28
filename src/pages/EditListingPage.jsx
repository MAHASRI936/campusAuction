import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import ListingForm from '../components/ListingForm.jsx';
import EmptyState from '../components/EmptyState.jsx';
import ErrorState from '../components/ErrorState.jsx';
import LoadingState from '../components/LoadingState.jsx';
import useAuth from '../hooks/useAuth.js';
import { useListing } from '../hooks/useListings.js';
import { updateListing } from '../services/listingsService.js';
import { applyImageAction } from '../services/sessionImages.js';

export default function EditListingPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { listing, loading, error, reload } = useListing(id);

  if (loading) return <LoadingState label="Loading listing…" />;

  if (error) {
    return (
      <div className="container-page py-16">
        <ErrorState title="Could not load this listing" error={error} onRetry={reload} />
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="container-page py-16">
        <EmptyState
          title="Listing not found"
          message="There is nothing to edit here. This listing doesn't exist, or it may have been deleted."
          action={
            <Link to="/auctions" className="btn-primary">
              Back to auctions
            </Link>
          }
        />
      </div>
    );
  }

  // Friendly message only. The database refuses the update anyway if the seller is someone else.
  if (listing.sellerId !== user?.id) {
    return (
      <div className="container-page py-16">
        <EmptyState
          title="You can't edit this listing"
          message="Only the seller can edit a listing. Open it to see the details, or browse other auctions."
          action={
            <Link to={`/auctions/${listing.id}`} className="btn-primary">
              View listing
            </Link>
          }
        />
      </div>
    );
  }

  async function handleSubmit({ data, imageAction }) {
    const updated = await updateListing(listing.id, data); // throws a ServiceError if it was not saved
    applyImageAction(updated.id, imageAction);
    navigate(`/auctions/${updated.id}`, { state: { notice: 'updated' } });
  }

  return (
    <div className="container-page py-10">
      <div className="mx-auto max-w-3xl">
        <Link
          to={`/auctions/${listing.id}`}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-700 hover:text-brand-900"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to listing
        </Link>

        <h1 className="mt-4 text-3xl font-extrabold tracking-tight">Edit listing</h1>
        <p className="mt-2 break-words leading-relaxed text-ink-600">
          Update the details of <strong className="text-ink-900">{listing.title}</strong>.
        </p>

        <div className="mt-6">
          <ListingForm
            key={listing.id}
            listing={listing}
            onSubmit={handleSubmit}
            cancelTo={`/auctions/${listing.id}`}
            submitLabel="Save changes"
          />
        </div>
      </div>
    </div>
  );
}
