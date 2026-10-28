import { useEffect, useRef, useState } from 'react';
import { subscribeToAuction } from '../services/biddingService.js';

const FALLBACK_POLL_MS = 20000; // when realtime is not connected, re-fetch this often
const COALESCE_MS = 300; // several events in a burst cause one refresh

/**
 * Keeps one auction's bidding data fresh.
 *
 *  - Subscribes to changes of the auction row (Supabase Realtime). An event is only a signal:
 *    `onRefresh()` is called and the caller re-fetches from the database.
 *  - When the subscription (re)connects, `onRefresh()` is called once so nothing missed while
 *    offline is lost.
 *  - While realtime is not connected (setup missing, network drop) it falls back to polling,
 *    so bid information still updates without a page refresh.
 *  - The subscription and timers are removed on unmount or when the auction changes.
 *
 * Returns 'live' | 'connecting' | 'offline'.
 */
export default function useAuctionLive(auctionId, onRefresh) {
  const [status, setStatus] = useState('connecting');
  const refreshRef = useRef(onRefresh);
  refreshRef.current = onRefresh;

  useEffect(() => {
    if (!auctionId) return undefined;
    let active = true;
    let timer = null;
    let wasLive = false;

    const schedule = () => {
      if (timer) return;
      timer = setTimeout(() => {
        timer = null;
        if (active) refreshRef.current();
      }, COALESCE_MS);
    };

    setStatus('connecting');
    const unsubscribe = subscribeToAuction(auctionId, {
      onChange: schedule,
      onStatus: (next) => {
        if (!active) return;
        setStatus(next);
        if (next === 'live') {
          if (wasLive) schedule(); // reconnected: reconcile what we may have missed
          wasLive = true;
        }
      },
    });

    return () => {
      active = false;
      if (timer) clearTimeout(timer);
      unsubscribe();
    };
  }, [auctionId]);

  // Polling fallback while realtime is not connected.
  useEffect(() => {
    if (!auctionId || status === 'live') return undefined;
    const id = setInterval(() => {
      if (typeof document === 'undefined' || document.visibilityState !== 'hidden') refreshRef.current();
    }, FALLBACK_POLL_MS);
    return () => clearInterval(id);
  }, [auctionId, status]);

  return status;
}
