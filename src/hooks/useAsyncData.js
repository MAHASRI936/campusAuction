import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Runs an async loader and tracks { data, loading, error }.
 * `deps` work like useEffect deps (reload when they change); `reload()` fetches again.
 * Results from an outdated request are ignored, so fast navigation cannot show stale data.
 *
 * `refresh()` (Module 4) fetches again WITHOUT switching to the loading state, and a failed
 * refresh keeps the data already on screen. It is used to update live bidding data in place.
 */
export default function useAsyncData(loader, deps = []) {
  const [state, setState] = useState({ data: null, loading: true, error: null });
  const [version, setVersion] = useState(0);
  const loaderRef = useRef(loader);
  loaderRef.current = loader;
  const silentRef = useRef(false);

  useEffect(() => {
    let active = true;
    const silent = silentRef.current;
    silentRef.current = false;
    if (!silent) setState((current) => ({ ...current, loading: true, error: null }));
    loaderRef
      .current()
      .then((data) => {
        if (active) setState({ data, loading: false, error: null });
      })
      .catch((error) => {
        if (!active) return;
        if (silent) console.error('CampusAuction: background refresh failed.', error);
        else setState({ data: null, loading: false, error });
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, version]);

  const reload = useCallback(() => setVersion((value) => value + 1), []);
  const refresh = useCallback(() => {
    silentRef.current = true;
    setVersion((value) => value + 1);
  }, []);
  return { ...state, reload, refresh };
}
