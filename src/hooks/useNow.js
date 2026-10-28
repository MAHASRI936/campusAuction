import { useEffect, useState } from 'react';

/**
 * Returns the current timestamp and re-renders on an interval,
 * so countdown labels stay up to date.
 */
export default function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  return now;
}
