import { useState, useEffect, useCallback } from 'react';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export interface ScreenerCoin {
  id: string;
  sym: string;
  name: string;
  price: number;
  change: number;
  rank: number;
  image: string;
}

let cryptoCache: { coins: ScreenerCoin[]; timestamp: number } | null = null;
const CACHE_TTL = 30 * 60 * 1000; // 30 min

export function useCryptoScreener(enabled: boolean, limit = 500) {
  const [coins, setCoins] = useState<ScreenerCoin[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch_ = useCallback(async () => {
    if (!enabled || !SUPABASE_URL || !SUPABASE_ANON_KEY) return;

    if (cryptoCache && Date.now() - cryptoCache.timestamp < CACHE_TTL) {
      setCoins(cryptoCache.coins);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `${SUPABASE_URL}/functions/v1/crypto-screener?limit=${limit}`,
        {
          headers: { apikey: SUPABASE_ANON_KEY },
          signal: AbortSignal.timeout(60000),
        }
      );

      if (!res.ok) throw new Error(`Crypto screener failed: ${res.status}`);

      const data = await res.json();
      if (data.success && Array.isArray(data.coins)) {
        cryptoCache = { coins: data.coins, timestamp: Date.now() };
        setCoins(data.coins);
      } else {
        throw new Error(data.error || 'Unknown error');
      }
    } catch (e: any) {
      console.warn('[useCryptoScreener]', e.message);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [enabled, limit]);

  useEffect(() => {
    fetch_();
  }, [fetch_]);

  return { coins, loading, error, refetch: fetch_ };
}
