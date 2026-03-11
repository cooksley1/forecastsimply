/**
 * Coins that are known to be unavailable across all free data sources.
 * Maps CoinGecko-style IDs (lowercase, hyphenated) to display info.
 */
export const UNSUPPORTED_COINS: Record<string, { name: string; reason: string }> = {
  'pi-network': {
    name: 'Pi Network (PI)',
    reason: 'Pi Network is not listed on any of our supported free data sources (CoinGecko, CoinPaprika, Yahoo Finance).',
  },
  'world-liberty-financial': {
    name: 'World Liberty Financial (WLFI)',
    reason: 'World Liberty Financial is not available on supported free data APIs.',
  },
  'pax-gold': {
    name: 'PAX Gold (PAXG)',
    reason: 'PAX Gold historical data is unavailable on our free data sources. Try searching for "paxos-standard" or "tether-gold" instead.',
  },
};

/**
 * Check if a coin ID or search query matches an unsupported coin.
 * Returns the entry if unsupported, or null if fine.
 */
export function getUnsupportedCoin(query: string): { name: string; reason: string } | null {
  const normalised = query.toLowerCase().replace(/\s+/g, '-');
  // Direct match
  if (UNSUPPORTED_COINS[normalised]) return UNSUPPORTED_COINS[normalised];
  // Partial match (e.g. user types "pi network")
  for (const [id, info] of Object.entries(UNSUPPORTED_COINS)) {
    if (normalised.includes(id) || id.includes(normalised)) return info;
  }
  return null;
}
