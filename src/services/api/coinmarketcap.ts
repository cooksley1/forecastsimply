import { getCached, setCache } from '../cache';

const CACHE_TTL = 15 * 60 * 1000; // 15 min — conserve credits

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export interface CMCCoinData {
  id: number;
  name: string;
  symbol: string;
  slug: string;
  price: number;
  change24h: number;
  change7d: number;
  marketCap: number;
  volume24h: number;
  circulatingSupply: number;
  maxSupply: number | null;
  rank: number;
}

/**
 * Fetch coin metadata from CMC via edge function proxy.
 * Returns null if CMC is not configured or unavailable.
 */
export async function getCMCCoinData(symbol: string): Promise<CMCCoinData | null> {
  const key = `cmc_coin_${symbol}`;
  const cached = getCached<CMCCoinData>(key, CACHE_TTL);
  if (cached) return cached;

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;

  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/cmc-proxy?symbol=${encodeURIComponent(symbol)}`, {
      headers: { 'apikey': SUPABASE_ANON_KEY },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data?.data) return null;

    setCache(key, data.data);
    return data.data;
  } catch {
    return null;
  }
}
