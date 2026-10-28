import { createClient } from '@supabase/supabase-js';
import { evaluateSupabaseConfig } from './supabaseConfig.js';

/**
 * The one Supabase client used by the whole app.
 *
 * Only the project URL and the PUBLIC (anon / publishable) key are used here.
 * They are safe in the browser because Row-Level Security in the database
 * decides what each user may do. NEVER put a service-role / secret key in this app.
 */
const config = evaluateSupabaseConfig({
  url: import.meta.env.VITE_SUPABASE_URL,
  key: import.meta.env.VITE_SUPABASE_ANON_KEY,
});

/** False when the .env file is missing or wrong; the app then shows a setup screen. */
export const isSupabaseConfigured = config.ok;

/** Human-readable list of what is wrong (empty when configured). */
export const supabaseConfigProblems = config.problems;

/** The client, or null when the configuration is missing (check isSupabaseConfigured first). */
export const supabase = config.ok
  ? createClient(config.url, config.key, {
      auth: {
        persistSession: true, // keeps the user logged in after a refresh (stored by the SDK, never the password)
        autoRefreshToken: true,
        detectSessionInUrl: true, // needed for the email-confirmation link
      },
    })
  : null;
