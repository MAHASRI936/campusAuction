import { Link } from 'react-router-dom';
import { Lock } from 'lucide-react';

/** Shared shell for the Login and Register pages (icon, title, form area and the link to the other page). */
export default function AuthCard({ title, subtitle, children, altText, altLink, altLabel }) {
  return (
    <div className="container-page flex justify-center py-14">
      <div className="card w-full max-w-md p-7 sm:p-8">
        <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-100 text-brand-700">
          <Lock className="h-6 w-6" aria-hidden="true" />
        </span>
        <h1 className="mt-4 text-2xl font-extrabold tracking-tight">{title}</h1>
        <p className="mt-1 text-sm text-ink-600">{subtitle}</p>

        <div className="mt-6">{children}</div>

        <p className="mt-6 text-center text-sm text-ink-600">
          {altText}{' '}
          <Link to={altLink} className="font-semibold text-brand-700 hover:text-brand-900">
            {altLabel}
          </Link>
        </p>
      </div>
    </div>
  );
}
