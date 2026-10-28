import { Link } from 'react-router-dom';
import { CheckCircle2, Hammer } from 'lucide-react';

const plannedFields = [
  'Title, category and description',
  'Item condition',
  'Photos of the item',
  'Starting price and minimum bid increment',
  'A closing date and time for each item',
  'Editing or cancelling your own listing',
];

export default function SellPage() {
  return (
    <div className="container-page py-14">
      <div className="card mx-auto max-w-2xl p-7 sm:p-10">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-100 text-accent-700">
          <Hammer className="h-7 w-7" aria-hidden="true" />
        </span>
        <h1 className="mt-5 text-3xl font-extrabold tracking-tight">Sell an Item</h1>
        <p className="mt-3 leading-relaxed text-ink-600">
          Listing creation will be implemented in <strong className="text-ink-900">Module 2</strong>.
          Soon you will be able to turn anything you are leaving behind into its own auction.
        </p>

        <h2 className="mt-8 text-base font-bold">What you will be able to set up</h2>
        <ul className="mt-3 space-y-2.5">
          {plannedFields.map((item) => (
            <li key={item} className="flex items-start gap-2.5 text-sm text-ink-700">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" aria-hidden="true" />
              {item}
            </li>
          ))}
        </ul>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link to="/auctions" className="btn-primary">
            Browse sample auctions
          </Link>
          <Link to="/" className="btn-secondary">
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
