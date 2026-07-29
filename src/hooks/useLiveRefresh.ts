import { useEffect } from 'react';

/** Re-fetches server data after local mutations, tab focus, and on a short interval. */
export function announceDataChange(resource = 'all') {
  window.dispatchEvent(new CustomEvent('studymate:data-change', { detail: resource }));
}

export function useLiveRefresh(refresh: () => void, intervalMs = 10000) {
  useEffect(() => {
    const onChange = () => refresh();
    const onVisible = () => { if (document.visibilityState === 'visible') refresh(); };
    window.addEventListener('studymate:data-change', onChange);
    document.addEventListener('visibilitychange', onVisible);
    const timer = window.setInterval(refresh, intervalMs);
    return () => {
      window.removeEventListener('studymate:data-change', onChange);
      document.removeEventListener('visibilitychange', onVisible);
      window.clearInterval(timer);
    };
  }, [refresh, intervalMs]);
}
