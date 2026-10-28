import { AlertTriangle } from 'lucide-react';
import { supabaseConfigProblems } from '../lib/supabaseClient.js';

/** Full-page setup message shown when the Supabase environment variables are missing or wrong. */
export default function ConfigMissing() {
  return (
    <main className="container-page flex min-h-screen items-center justify-center py-14">
      <div className="card w-full max-w-2xl p-7 sm:p-9" role="alert">
        <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent-100 text-accent-700">
          <AlertTriangle className="h-6 w-6" aria-hidden="true" />
        </span>
        <h1 className="mt-4 text-2xl font-extrabold tracking-tight">Supabase is not set up yet</h1>
        <p className="mt-2 text-ink-600">CampusAuction needs your Supabase project details before it can start.</p>

        <ul className="mt-5 list-disc space-y-1 pl-5 text-sm font-medium text-rose-700">
          {supabaseConfigProblems.map((problem) => (
            <li key={problem}>{problem}</li>
          ))}
        </ul>

        <ol className="mt-6 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-ink-700">
          <li>
            In the project folder, copy <code className="rounded bg-ink-100 px-1.5 py-0.5">.env.example</code> to a new file
            named <code className="rounded bg-ink-100 px-1.5 py-0.5">.env</code>.
          </li>
          <li>
            In the Supabase dashboard open <strong>Project Settings → API</strong>, then copy the{' '}
            <strong>Project URL</strong> and the <strong>anon / publishable key</strong> into{' '}
            <code className="rounded bg-ink-100 px-1.5 py-0.5">VITE_SUPABASE_URL</code> and{' '}
            <code className="rounded bg-ink-100 px-1.5 py-0.5">VITE_SUPABASE_ANON_KEY</code>.
          </li>
          <li>
            Run <code className="rounded bg-ink-100 px-1.5 py-0.5">supabase/schema.sql</code> once in the Supabase SQL Editor.
          </li>
          <li>Stop the dev server and start it again with <code className="rounded bg-ink-100 px-1.5 py-0.5">npm run dev</code>.</li>
        </ol>
        <p className="mt-5 text-xs text-ink-500">
          Never use the service-role / secret key here. See the README for the full step-by-step guide.
        </p>
      </div>
    </main>
  );
}
