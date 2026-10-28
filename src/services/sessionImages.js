/**
 * Session-only image previews (carried over from Module 2).
 *
 * An image FILE chosen in the form is shown through an in-memory object URL until
 * the tab is refreshed or closed. It is never uploaded or stored, so it is only
 * visible to the person who chose it, in this tab. Permanent uploads need
 * Supabase Storage (a later module). Use an image URL for a permanent picture.
 */
const sessionImages = new Map(); // listing id -> object URL

function revoke(id) {
  const url = sessionImages.get(id);
  if (url && typeof URL !== 'undefined' && typeof URL.revokeObjectURL === 'function') URL.revokeObjectURL(url);
  sessionImages.delete(id);
}

/** Apply the choice made in the form: { type: 'attach' | 'keep' | 'remove', file? }. */
export function applyImageAction(id, action) {
  if (!action) return;
  if (action.type === 'attach' && action.file && typeof URL?.createObjectURL === 'function') {
    revoke(id);
    sessionImages.set(id, URL.createObjectURL(action.file));
  } else if (action.type === 'remove') {
    revoke(id);
  }
}

export function forgetSessionImage(id) {
  revoke(id);
}

/** Add `sessionImageUrl` to a listing when this tab has a preview for it. */
export function withSessionImage(listing) {
  if (!listing) return listing;
  const sessionImageUrl = sessionImages.get(listing.id);
  return sessionImageUrl ? { ...listing, sessionImageUrl } : listing;
}
