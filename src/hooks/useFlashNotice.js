import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const normalize = (value) => (typeof value === 'string' ? { type: value } : (value ?? null));

/**
 * One-time success message passed through router state, e.g.
 *   navigate('/auctions/123', { state: { notice: { type: 'created' } } })
 *
 * The message is read once and then removed from the history entry, so a page
 * refresh or the Back button does not show it again. It is only returned while
 * the user stays on the same path.
 *
 * Returns [notice, dismiss]; notice is { type, ...extra } or null.
 */
export default function useFlashNotice() {
  const location = useLocation();
  const navigate = useNavigate();
  const [flash, setFlash] = useState(() => ({
    value: normalize(location.state?.notice),
    path: location.pathname,
  }));

  useEffect(() => {
    const incoming = normalize(location.state?.notice);
    if (!incoming) return;
    setFlash({ value: incoming, path: location.pathname });
    navigate({ pathname: location.pathname, search: location.search, hash: location.hash }, { replace: true, state: null });
    // Only react to navigation events, not to every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.key]);

  const notice = flash.path === location.pathname ? flash.value : null;
  return [notice, () => setFlash({ value: null, path: location.pathname })];
}
