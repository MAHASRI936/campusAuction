import { Link } from 'react-router-dom';
import { Gavel } from 'lucide-react';

export default function Logo({ light = false }) {
  return (
    <Link
      to="/"
      className="inline-flex items-center gap-2.5 rounded-lg"
      aria-label="CampusBid home"
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-700 text-accent-300 shadow-sm">
        <Gavel className="h-5 w-5" aria-hidden="true" />
      </span>
      <span
        className={`font-display text-xl font-extrabold tracking-tight ${
          light ? 'text-white' : 'text-ink-900'
        }`}
      >
        Campus<span className={light ? 'text-accent-300' : 'text-brand-700'}>Bid</span>
      </span>
    </Link>
  );
}
