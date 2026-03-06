import { useState, useEffect, useCallback } from 'react';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export interface ScreenerStock {
  sym: string;
  name: string;
  price: number;
  change: number;
  div: boolean;
  yield: number;
}

// In-memory cache keyed by exchange+type+subgroup
let screenerCache: Record<string, { stocks: ScreenerStock[]; timestamp: number }> = {};
const CACHE_TTL = 30 * 60 * 1000; // 30 min

export type ScreenerType = 'equity' | 'etf';
export type ScreenerSubgroup = 'all' | 'asx200';

export function useExchangeScreener(
  exchange: string,
  enabled: boolean,
  type: ScreenerType = 'equity',
  subgroup: ScreenerSubgroup = 'all',
) {
  const [stocks, setStocks] = useState<ScreenerStock[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cacheKey = `${exchange}_${type}_${subgroup}`;

  const fetch_ = useCallback(async () => {
    if (!enabled || !SUPABASE_URL || !SUPABASE_ANON_KEY) return;

    const cached = screenerCache[cacheKey];
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      setStocks(cached.stocks);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        exchange,
        type,
        subgroup,
      });
      const res = await fetch(
        `${SUPABASE_URL}/functions/v1/exchange-screener?${params}`,
        {
          headers: { apikey: SUPABASE_ANON_KEY },
          signal: AbortSignal.timeout(120000),
        }
      );

      if (!res.ok) throw new Error(`Screener failed: ${res.status}`);

      const data = await res.json();
      if (data.success && Array.isArray(data.stocks)) {
        screenerCache[cacheKey] = { stocks: data.stocks, timestamp: Date.now() };
        setStocks(data.stocks);
      } else {
        throw new Error(data.error || 'Unknown screener error');
      }
    } catch (e: any) {
      console.warn('[useExchangeScreener]', e.message);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [exchange, enabled, type, subgroup, cacheKey]);

  useEffect(() => {
    fetch_();
  }, [fetch_]);

  return { stocks, loading, error, refetch: fetch_ };
}

export interface SearchResult {
  symbol: string;
  name: string;
  exchange: string;
  type: string;
}

export async function searchTickers(query: string, exchangeSuffix?: string): Promise<SearchResult[]> {
  if (!query || query.length < 1 || !SUPABASE_URL || !SUPABASE_ANON_KEY) return [];

  try {
    const params = new URLSearchParams({ q: query, limit: '10' });
    if (exchangeSuffix) params.set('exchange', exchangeSuffix);

    const res = await fetch(
      `${SUPABASE_URL}/functions/v1/yahoo-search?${params}`,
      {
        headers: { apikey: SUPABASE_ANON_KEY },
        signal: AbortSignal.timeout(5000),
      }
    );

    if (!res.ok) return [];
    const data = await res.json();
    return data.results || [];
  } catch {
    return [];
  }
}
