import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import ListingForm from '../components/ListingForm.jsx';
import DemoNotice from '../components/DemoNotice.jsx';
import { listingsService } from '../services/listingsService.js';

export default function SellPage() {
  const navigate = useNavigate();

  function handleSubmit({ data, imageAction }) {
    const listing = listingsService.create(data); // throws StorageError if the browser refuses to save
    listingsService.applyImageAction(listing.id, imageAction);
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
          Fill in the details below to turn something you are leaving behind into an auction. Fields marked with
          <span className="text-rose-600"> * </span>
          are required.
        </p>

        <DemoNotice className="mt-6" />

        <div className="mt-6">
          <ListingForm onSubmit={handleSubmit} cancelTo="/auctions" submitLabel="Create listing" />
        </div>
      </div>
    </div>
  );
}
