import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import ListingForm from '../components/ListingForm.jsx';
import { createListing } from '../services/listingsService.js';
import { applyImageAction } from '../services/sessionImages.js';

/** Create a listing. Only reachable when logged in (see RequireAuth in App.jsx); the database also enforces it. */
export default function SellPage() {
  const navigate = useNavigate();

  async function handleSubmit({ data, imageAction }) {
    const listing = await createListing(data); // throws a ServiceError (shown by the form) if it was not saved
    applyImageAction(listing.id, imageAction);
    navigate(`/auctions/${listing.id}`, { state: { notice: 'created' } });
  }

  return (
    <div className="container-page py-10">
      <div className="mx-auto max-w-3xl">
        <Link
          to="/auctions"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-700 hover:text-brand-900"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to all auctions
        </Link>

        <h1 className="mt-4 text-3xl font-extrabold tracking-tight">Sell an Item</h1>
        <p className="mt-2 leading-relaxed text-ink-600">
          Fill in the details below to turn something you are leaving behind into an auction. The listing is saved to
          your account. Fields marked with
          <span className="text-rose-600"> * </span>
          are required.
        </p>

        <div className="mt-6">
          <ListingForm onSubmit={handleSubmit} cancelTo="/auctions" submitLabel="Create listing" />
        </div>
      </div>
    </div>
  );
}
