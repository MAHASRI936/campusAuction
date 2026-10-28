import { useState } from 'react';
import { getCategoryById } from '../data/categories.js';

/**
 * Shows the auction photo if `imageUrl` exists and loads; otherwise a local
 * category illustration (gradient plus icon) so no external images are needed.
 */
export default function AuctionImage({ auction, className = '', iconClassName = 'h-16 w-16' }) {
  const [failed, setFailed] = useState(false);
  const category = getCategoryById(auction.category);

  if (auction.imageUrl && !failed) {
    return (
      <img
        src={auction.imageUrl}
        alt={auction.title}
        loading="lazy"
        onError={() => setFailed(true)}
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
