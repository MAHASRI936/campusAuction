import { AlertCircle } from 'lucide-react';

/** Label + control + hint or error message. The error appears directly under the field. */
export default function FormField({ id, label, required = false, hint, error, children }) {
  return (
    <div>
      <label htmlFor={id} className="field-label">
        {label}
        {required && (
          <span className="text-rose-600" aria-hidden="true">
            {' '}
            *
          </span>
        )}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="mt-1.5 flex items-start gap-1.5 text-sm font-medium text-rose-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </p>
      ) : (
        hint && (
          <p id={`${id}-hint`} className="mt-1.5 text-xs text-ink-500">
            {hint}
          </p>
        )
      )}
    </div>
  );
}

/** Accessibility attributes that connect an input to its error or hint text. */
export function describeField(id, { error, hint } = {}) {
  return {
    id,
    'aria-invalid': error ? 'true' : undefined,
    'aria-describedby': error ? `${id}-error` : hint ? `${id}-hint` : undefined,
  };
}
