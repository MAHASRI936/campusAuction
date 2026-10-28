import { Link } from 'react-router-dom';
import { Lock } from 'lucide-react';

/**
 * Shared shell for the Login and Register placeholder pages.
 * Nothing is submitted or stored. Real authentication arrives in Module 3.
 */
export default function AuthPlaceholder({ title, subtitle, fields, submitLabel, altText, altLink, altLabel }) {
  return (
    <div className="container-page flex justify-center py-14">
      <div className="card w-full max-w-md p-7 sm:p-8">
        <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-100 text-brand-700">
          <Lock className="h-6 w-6" aria-hidden="true" />
        </span>
        <h1 className="mt-4 text-2xl font-extrabold tracking-tight">{title}</h1>
        <p className="mt-1 text-sm text-ink-600">{subtitle}</p>

        <p className="mt-5 rounded-xl border border-accent-200 bg-accent-50 p-3 text-sm text-ink-700" role="note">
          Placeholder only. Real authentication will be added in <strong>Module 3</strong>. This form
          does not send or store anything.
        </p>

        <form className="mt-6 space-y-4" onSubmit={(event) => event.preventDefault()} noValidate>
          {fields.map((field) => (
            <div key={field.id}>
              <label htmlFor={field.id} className="field-label">
                {field.label}
              </label>
              <input
                id={field.id}
                type={field.type}
                placeholder={field.placeholder}
                autoComplete={field.autoComplete}
                disabled
                className="field-input"
              />
            </div>
          ))}
          <button type="submit" disabled className="btn-primary w-full">
            {submitLabel} (available in Module 3)
          </button>
        </form>

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
