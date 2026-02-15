import { getCached, setCache } from '../cache';

const BASE = 'https://api.diadata.org/v1';
const CACHE_TTL = 2 * 60 * 1000; // 2 min — DIA updates every 120s

export interface DIAQuotation {
  Symbol: string;
  Name: string;
  Price: number;
  PriceYesterday: number;
  VolumeYesterdayUSD: number;
  Time: string;
  Source: string;
}

export interface DIAForexQuotation {
  Symbol: string;
  Name: string;
  Price: number;
  PriceYesterday: number;
  Time: string;
  Source: string;
}

/**
 * Get current price for a crypto symbol (e.g. "BTC", "ETH", "SOL")
 * Free, no API key, no rate limits
 */
export async function getDIAQuotation(symbol: string): Promise<DIAQuotation> {
  const key = `dia_q_${symbol}`;
  const cached = getCached<DIAQuotation>(key, CACHE_TTL);
  if (cached) return cached;

  const res = await fetch(`${BASE}/quotation/${encodeURIComponent(symbol)}`);
  if (!res.ok) throw new Error(`DIA API ${res.status}`);
  const data: DIAQuotation = await res.json();
  setCache(key, data);
  return data;
}

/**
 * Get forex rate (e.g. "EUR", "GBP", "AUD")
 * Returns rate against USD
 */
export async function getDIAForex(symbol: string): Promise<DIAForexQuotation> {
  const key = `dia_fx_${symbol}`;
  const cached = getCached<DIAForexQuotation>(key, CACHE_TTL);
  if (cached) return cached;

  const res = await fetch(`${BASE}/foreignQuotation/${encodeURIComponent(symbol)}`);
  if (!res.ok) throw new Error(`DIA Forex API ${res.status}`);
  const data: DIAForexQuotation = await res.json();
  setCache(key, data);
  return data;
}

/**
 * Get crypto price with change percentage calculated
 */
export async function getDIACryptoPrice(symbol: string): Promise<{
  price: number;
  priceYesterday: number;
  change24h: number;
  volume24h: number;
  name: string;
  symbol: string;
}> {
  const q = await getDIAQuotation(symbol);
  const change24h = q.PriceYesterday > 0
    ? ((q.Price - q.PriceYesterday) / q.PriceYesterday) * 100
    : 0;

  return {
    price: q.Price,
    priceYesterday: q.PriceYesterday,
    change24h,
    volume24h: q.VolumeYesterdayUSD,
    name: q.Name,
    symbol: q.Symbol,
  };
}

/**
 * Batch fetch multiple crypto prices via DIA
 * Since DIA has no rate limits, we can fire all requests in parallel
 */
export async function getDIAMultiplePrices(symbols: string[]): Promise<Map<string, DIAQuotation>> {
  const results = new Map<string, DIAQuotation>();
  const fetches = symbols.map(async (sym) => {
    try {
      const q = await getDIAQuotation(sym);
      results.set(sym, q);
    } catch {
      // Skip failed symbols
    }
  });
  await Promise.allSettled(fetches);
  return results;
}

/**
 * Map common CoinGecko IDs to DIA symbols for cross-referencing
 */
const GECKO_TO_DIA: Record<string, string> = {
  bitcoin: 'BTC', ethereum: 'ETH', solana: 'SOL', cardano: 'ADA',
  chainlink: 'LINK', 'avalanche-2': 'AVAX', polkadot: 'DOT',
  'polygon-ecosystem-token': 'POL', near: 'NEAR', sui: 'SUI',
  'render-token': 'RNDR', 'injective-protocol': 'INJ',
  celestia: 'TIA', 'sei-network': 'SEI', dogecoin: 'DOGE',
  ripple: 'XRP', binancecoin: 'BNB', tron: 'TRX',
  'the-open-network': 'TON', 'shiba-inu': 'SHIB', litecoin: 'LTC',
  'bitcoin-cash': 'BCH', uniswap: 'UNI', aptos: 'APT',
  arbitrum: 'ARB', optimism: 'OP', filecoin: 'FIL',
  cosmos: 'ATOM', 'immutable-x': 'IMX', 'hedera-hashgraph': 'HBAR',
  pepe: 'PEPE', 'fetch-ai': 'FET', 'the-graph': 'GRT',
  aave: 'AAVE', maker: 'MKR', thorchain: 'RUNE', bittensor: 'TAO',
};

export function geckoIdToDIASymbol(geckoId: string): string | null {
  return GECKO_TO_DIA[geckoId] || null;
}
