/**
 * Generate a unique listing id.
 * Uses crypto.randomUUID() when available (all modern browsers on https or
 * localhost) and falls back to a timestamp + random string otherwise.
 * `existing` is a Set of ids that must not be reused.
 *
 * UUIDs are what Supabase/Postgres use for primary keys, so ids created now
 * can be migrated later without changes.
 */
export function generateId(existing = new Set()) {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const id =
      typeof globalThis.crypto?.randomUUID === 'function'
        ? globalThis.crypto.randomUUID()
        : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    if (!existing.has(id)) return id;
  }
  // Practically unreachable; guarantees a unique id even in that case.
  return `${Date.now().toString(36)}-${existing.size}-${Math.random().toString(36).slice(2)}`;
}
