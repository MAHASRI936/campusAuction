import { RotateCcw } from 'lucide-react';
import Notice from './Notice.jsx';

/** Error message with an optional "Try again" button (used when a database request fails). */
export default function ErrorState({ title = 'Something went wrong', error, onRetry, className = '' }) {
  return (
    <div className={className}>
      <Notice type="error" title={title}>
        <p>{error?.message || 'Please try again.'}</p>
        {onRetry && (
          <button type="button" onClick={onRetry} className="btn-secondary mt-3 px-4 py-1.5">
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            Try again
          </button>
        )}
      </Notice>
    </div>
  );
}
