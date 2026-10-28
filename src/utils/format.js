const inrFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

/** Format a number as Indian rupees, e.g. 14500 -> "₹14,500". */
export function formatINR(amount) {
  return inrFormatter.format(amount);
}

/** Readable closing date and time, e.g. "29 Oct, 4:30 pm". */
export function formatEndDate(isoString) {
  return new Date(isoString).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/**
 * Remaining time until an auction closes.
 * Returns { label, closed, urgent } where `urgent` means under 6 hours left.
 * Pass `{ seconds: true }` for a detailed countdown on the detail page.
 */
export function getTimeRemaining(isoString, now = Date.now(), { seconds = false } = {}) {
  const diff = new Date(isoString).getTime() - now;

  if (diff <= 0) {
    return { label: 'Auction closed', closed: true, urgent: false };
  }

  const totalSeconds = Math.floor(diff / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  let label;
  if (days > 0) {
    label = `${days}d ${hours}h left`;
  } else if (hours > 0) {
    label = `${hours}h ${minutes}m left`;
  } else if (seconds) {
    label = `${minutes}m ${secs}s left`;
  } else {
    label = `${Math.max(minutes, 1)}m left`;
  }

  return { label, closed: false, urgent: diff < 6 * 3600 * 1000 };
}
