import { useEffect, useRef, useCallback } from 'react';
import type { WatchlistItem } from '@/types/assets';
import { supabase } from '@/integrations/supabase/client';

const REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes

/**
 * Periodically fetches live prices for all watchlist items and calls
 * the updater so the dropdown shows accurate P&L.
 */
export function useWatchlistPriceRefresh(
  watchlist: WatchlistItem[],
  setWatchlist: React.Dispatch<React.SetStateAction<WatchlistItem[]>>,
) {
  const refreshing = useRef(false);

  const refresh = useCallback(async () => {
    if (refreshing.current || watchlist.length === 0) return;
    refreshing.current = true;

    try {
      const priceMap: Record<string, number> = {};

      // --- Crypto via CoinLore (batch by ID) ---
      const cryptoItems = watchlist.filter(w => w.assetType === 'crypto' && !w.id.includes('__sim_') && !w.id.includes('__setup_'));
      if (cryptoItems.length > 0) {
        // CoinLore allows comma-separated IDs
        const ids = cryptoItems.map(c => c.id).join(',');
        try {
          const res = await fetch(`https://api.coinlore.net/api/ticker/?id=${ids}`);
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data)) {
              for (const coin of data) {
                if (coin?.id && coin?.price_usd) {
                  priceMap[String(coin.id)] = parseFloat(coin.price_usd);
                }
              }
            }
          }
        } catch { /* silent */ }
      }

      // --- Forex via Frankfurter ---
      const forexItems = watchlist.filter(w => w.assetType === 'forex' && !w.id.includes('__sim_'));
      for (const fx of forexItems) {
        try {
          // symbol is like "AUD/THB"
          const [from, to] = fx.symbol.split('/');
          if (!from || !to) continue;
          const res = await fetch(`https://api.frankfurter.app/latest?from=${from}&to=${to}`);
          if (res.ok) {
            const data = await res.json();
            if (data?.rates?.[to]) {
              priceMap[fx.id] = data.rates[to];
            }
          }
        } catch { /* silent */ }
      }

      // --- Stocks & ETFs via yahoo-proxy (live prices) ---
      const equityItems = watchlist.filter(w => (w.assetType === 'stocks' || w.assetType === 'etfs') && !w.id.includes('__sim_') && !w.id.includes('__setup_'));
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      for (const eq of equityItems) {
        try {
          const res = await fetch(
            `${supabaseUrl}/functions/v1/yahoo-proxy?symbol=${encodeURIComponent(eq.symbol)}&range=5d&interval=1d`,
            { headers: { Authorization: `Bearer ${supabaseKey}` } },
          );
          if (res.ok) {
            const data = await res.json();
            const closes: number[] =
              data?.chart?.result?.[0]?.indicators?.quote?.[0]?.close?.filter((v: any) => v != null) || [];
            if (closes.length > 0) {
              priceMap[eq.id] = closes[closes.length - 1];
            }
          }
        } catch { /* silent */ }
      }

      // Apply updates
      if (Object.keys(priceMap).length === 0) return;

      setWatchlist(prev => {
        let changed = false;
        const next = prev.map(item => {
          const baseId = item.id.includes('__sim_') || item.id.includes('__setup_')
            ? item.id.split('__')[0]
            : item.id;
          const newPrice = priceMap[baseId] ?? priceMap[item.id];
          if (newPrice != null && Math.abs(newPrice - item.price) > 0.0001) {
            changed = true;
            return { ...item, price: newPrice };
          }
          return item;
        });
        if (changed) {
          localStorage.setItem('sf_watchlist', JSON.stringify(next));
          return next;
        }
        return prev;
      });
    } catch {
      // silent
    } finally {
      refreshing.current = false;
    }
  }, [watchlist, setWatchlist]);

  // Refresh on mount and every 5 minutes
  useEffect(() => {
    refresh();
    const id = setInterval(refresh, REFRESH_INTERVAL);
    return () => clearInterval(id);
  }, [refresh]);
}
