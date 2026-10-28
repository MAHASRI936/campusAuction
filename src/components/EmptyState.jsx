import { SearchX } from 'lucide-react';

export default function EmptyState({ title, message, action }) {
  return (
    <div className="card flex flex-col items-center px-6 py-14 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-ink-100 text-ink-500">
        <SearchX className="h-7 w-7" aria-hidden="true" />
      </span>
      <h3 className="mt-4 text-lg font-bold">{title}</h3>
      <p className="mt-1 max-w-md text-sm text-ink-600">{message}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
