import { Loader2 } from 'lucide-react';

/** Spinner with a text label, announced politely to screen readers. */
export default function LoadingState({ label = 'Loading…', className = 'py-16' }) {
  return (
    <div role="status" aria-live="polite" className={`flex flex-col items-center justify-center gap-3 text-ink-600 ${className}`}>
      <Loader2 className="h-8 w-8 animate-spin text-brand-600" aria-hidden="true" />
      <p className="text-sm font-medium">{label}</p>
    </div>
  );
}
