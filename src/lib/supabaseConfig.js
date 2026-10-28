/**
 * Pure validation of the Supabase settings (no imports, so it is easy to test).
 *
 * Returns { ok: true, url, key } or { ok: false, problems: [string, ...] }.
 * The check also refuses a SECRET / service-role key: those must never be placed
 * in browser code, because everything in a Vite app is visible to every visitor.
 */
export function evaluateSupabaseConfig({ url, key } = {}) {
  const problems = [];
  const cleanUrl = typeof url === 'string' ? url.trim() : '';
  const cleanKey = typeof key === 'string' ? key.trim() : '';

  if (!cleanUrl) {
    problems.push('VITE_SUPABASE_URL is missing.');
  } else if (/your-project|your_project|<|>/i.test(cleanUrl)) {
    problems.push('VITE_SUPABASE_URL still contains the placeholder text from .env.example.');
  } else {
    try {
      const parsed = new URL(cleanUrl);
      const local = parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
      if (parsed.protocol !== 'https:' && !(local && parsed.protocol === 'http:')) {
        problems.push('VITE_SUPABASE_URL must start with https:// (for example https://abcdxyz.supabase.co).');
      }
    } catch {
      problems.push('VITE_SUPABASE_URL is not a valid URL.');
    }
  }

  if (!cleanKey) {
    problems.push('VITE_SUPABASE_ANON_KEY is missing.');
  } else if (/your-anon-key|your_anon_key|<|>/i.test(cleanKey)) {
    problems.push('VITE_SUPABASE_ANON_KEY still contains the placeholder text from .env.example.');
  } else if (isSecretKey(cleanKey)) {
    problems.push(
      'VITE_SUPABASE_ANON_KEY looks like a SECRET / service-role key. Never use that in the browser. ' +
        'Use the publishable (anon) key instead.',
    );
  }

  return problems.length === 0 ? { ok: true, url: cleanUrl, key: cleanKey, problems: [] } : { ok: false, problems };
}

/** True for new-style secret keys (sb_secret_...) and legacy JWT keys whose role is service_role. */
export function isSecretKey(key) {
  if (key.startsWith('sb_secret_')) return true;
  const parts = key.split('.');
  if (parts.length !== 3) return false;
  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = typeof atob === 'function' ? atob(base64) : Buffer.from(base64, 'base64').toString('utf8');
    return JSON.parse(json)?.role === 'service_role';
  } catch {
    return false;
  }
}
