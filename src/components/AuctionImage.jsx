import { useState } from 'react';
import { getCategoryById } from '../data/categories.js';

/**
 * Shows the auction photo if `imageUrl` (or a session-only uploaded image) exists
 * and loads; otherwise a local category illustration (gradient plus icon), so a
 * missing or broken image never leaves an empty box.
 */
export default function AuctionImage({ auction, className = '', iconClassName = 'h-16 w-16' }) {
  const src = auction.imageUrl || auction.sessionImageUrl || null;
  // Remember which source failed, so a new image URL (after an edit) is tried again.
  const [failedSrc, setFailedSrc] = useState(null);
  const category = getCategoryById(auction.category);

  if (src && failedSrc !== src) {
    return (
      <img
        src={src}
        alt={auction.title}
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={() => setFailedSrc(src)}
        className={`object-cover ${className}`}
      />
    );
  }

  const Icon = category?.icon;
  const gradient = category?.tone.gradient ?? 'from-ink-100 to-white';
  const iconTone = category?.tone.icon ?? 'text-ink-500';

  return (
    <div
      role="img"
      aria-label={`${auction.title} (placeholder illustration)`}
      className={`relative flex items-center justify-center overflow-hidden bg-gradient-to-br ${gradient} ${className}`}
    >
      <span className="absolute -right-6 -top-6 h-28 w-28 rounded-full bg-white/60" aria-hidden="true" />
      <span className="absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-white/50" aria-hidden="true" />
      {Icon && <Icon className={`relative ${iconClassName} ${iconTone}`} strokeWidth={1.5} aria-hidden="true" />}
    </div>
  );
}
