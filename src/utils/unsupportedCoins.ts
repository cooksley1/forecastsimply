import { supabase } from '@/integrations/supabase/client';

interface UnsupportedCoin {
  coin_id: string;
  name: string;
  reason: string;
}

let cachedList: UnsupportedCoin[] | null = null;
let cacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch unsupported coins from the database (cached for 5 min).
 */
export async function loadUnsupportedCoins(): Promise<UnsupportedCoin[]> {
  if (cachedList && Date.now() - cacheTime < CACHE_TTL) return cachedList;
  const { data } = await supabase.from('unsupported_coins').select('coin_id, name, reason');
  cachedList = (data as UnsupportedCoin[]) || [];
  cacheTime = Date.now();
  return cachedList;
}

/** Bust the cache after admin changes. */
export function bustUnsupportedCache() {
  cachedList = null;
  cacheTime = 0;
}

/**
 * Check if a coin ID or search query matches an unsupported coin.
 * Must be called after loadUnsupportedCoins().
 */
export function getUnsupportedCoin(query: string): { name: string; reason: string } | null {
  if (!cachedList) return null;
  const normalised = query.toLowerCase().replace(/\s+/g, '-');
  for (const coin of cachedList) {
    if (normalised === coin.coin_id || normalised.includes(coin.coin_id) || coin.coin_id.includes(normalised)) {
      return { name: coin.name, reason: coin.reason };
    }
  }
  return null;
}
