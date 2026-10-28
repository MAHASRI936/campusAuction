import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import ListingForm from '../components/ListingForm.jsx';
import DemoNotice from '../components/DemoNotice.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { useListing } from '../hooks/useListings.js';
import { listingsService } from '../services/listingsService.js';

export default function EditListingPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const listing = useListing(id);

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

  function handleSubmit({ data, imageAction }) {
    const updated = listingsService.update(listing.id, data); // throws StorageError if it cannot be saved
    if (!updated) throw new Error('This listing no longer exists, so your changes could not be saved.');
    listingsService.applyImageAction(listing.id, imageAction);
    navigate(`/auctions/${listing.id}`, { state: { notice: 'updated' } });
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

        <DemoNotice className="mt-6" />

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
