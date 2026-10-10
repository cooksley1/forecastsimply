import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { isDataStale } from '@/utils/dataFreshness';

const CHECK_INTERVAL_MS = 15 * 60 * 1000;

/**
 * Tracks when the analysis pipeline last ran, so the app can tell users the
 * figures they're seeing are no longer being refreshed.
 *
 * `offline` is true when the backend can't be reached at all — that covers a
 * paused backend just as well as a dropped connection.
 */
export function useDataFreshness() {
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [offline, setOffline] = useState(false);
  const [checking, setChecking] = useState(true);

  const check = useCallback(async () => {
    let nextLastUpdated: string | null = null;
    let nextOffline = false;

    try {
      const { data, error } = await supabase
        .from('daily_analysis_cache')
        .select('analyzed_at')
        .order('analyzed_at', { ascending: false })
        .limit(1);

      if (error) {
        nextOffline = true;
      } else {
        nextLastUpdated = data?.[0]?.analyzed_at ?? null;
      }
    } catch {
      nextOffline = true;
    }

    setLastUpdated(nextLastUpdated);
    setOffline(nextOffline);
    setChecking(false);
  }, []);

  useEffect(() => {
    check();
    const timer = setInterval(check, CHECK_INTERVAL_MS);
    const onOnline = () => check();
    window.addEventListener('online', onOnline);

    return () => {
      clearInterval(timer);
      window.removeEventListener('online', onOnline);
    };
  }, [check]);

  return {
    lastUpdated,
    offline,
    checking,
    stale: isDataStale(lastUpdated, offline),
    refetch: check,
  };
}
