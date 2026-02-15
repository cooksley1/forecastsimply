import { getCached, setCache } from '../cache';

const BASE = 'https://api.coinlore.net/api';
const CACHE_TTL = 3 * 60 * 1000; // 3 min — CoinLore has no rate limits so we can refresh more often

export interface CoinLoreTicker {
  id: string;
  symbol: string;
  name: string;
  price_usd: string;
  percent_change_24h: string;
  percent_change_7d: string;
  percent_change_1h: string;
  market_cap_usd: string;
  volume24: number;
  csupply: string;
  msupply: string;
  tsupply: string;
  rank: number;
}

/** Fetch top N coins by market cap (paginated, 100 per call) */
export async function getTopTickers(limit = 50): Promise<CoinLoreTicker[]> {
  const key = `cl_top_${limit}`;
  const cached = getCached<CoinLoreTicker[]>(key, CACHE_TTL);
  if (cached) return cached;

  const all: CoinLoreTicker[] = [];
  const pageSize = 100;
  for (let start = 0; start < limit; start += pageSize) {
    const batchLimit = Math.min(pageSize, limit - start);
    const res = await fetch(`${BASE}/tickers/?start=${start}&limit=${batchLimit}`);
    if (!res.ok) throw new Error(`CoinLore ${res.status}`);
    const data = await res.json();
    const tickers: CoinLoreTicker[] = data.data || [];
    all.push(...tickers);
    if (tickers.length < batchLimit) break;
  }

  setCache(key, all);
  return all;
}

/** Fetch a specific coin by CoinLore ID */
export async function getTickerById(coinloreId: string): Promise<CoinLoreTicker | null> {
  const key = `cl_ticker_${coinloreId}`;
  const cached = getCached<CoinLoreTicker | null>(key, CACHE_TTL);
  if (cached) return cached;

  const res = await fetch(`${BASE}/ticker/?id=${coinloreId}`);
  if (!res.ok) throw new Error(`CoinLore ${res.status}`);
  const data = await res.json();
  const ticker = data?.[0] || null;
  setCache(key, ticker);
  return ticker;
}

/** Fetch global crypto market data */
export async function getGlobalData() {
  const key = 'cl_global';
  const cached = getCached<any>(key, CACHE_TTL);
  if (cached) return cached;

  const res = await fetch(`${BASE}/global/`);
  if (!res.ok) throw new Error(`CoinLore ${res.status}`);
  const data = await res.json();
  setCache(key, data?.[0] || data);
  return data?.[0] || data;
}

/**
 * Map CoinLore symbol to CoinGecko ID for chart data fallback.
 * This covers the most common coins; unknown symbols return lowercase name with spaces replaced.
 */
const SYMBOL_TO_COINGECKO: Record<string, string> = {
  BTC: 'bitcoin', ETH: 'ethereum', SOL: 'solana', ADA: 'cardano',
  LINK: 'chainlink', AVAX: 'avalanche-2', DOT: 'polkadot', MATIC: 'polygon-ecosystem-token',
  NEAR: 'near', SUI: 'sui', RNDR: 'render-token', INJ: 'injective-protocol',
  TIA: 'celestia', SEI: 'sei-network', JUP: 'jupiter-exchange-solana',
  DOGE: 'dogecoin', XRP: 'ripple', BNB: 'binancecoin', TRX: 'tron',
  TON: 'the-open-network', SHIB: 'shiba-inu', LTC: 'litecoin', BCH: 'bitcoin-cash',
  UNI: 'uniswap', APT: 'aptos', ARB: 'arbitrum', OP: 'optimism',
  FIL: 'filecoin', ATOM: 'cosmos', IMX: 'immutable-x', HBAR: 'hedera-hashgraph',
  STX: 'blockstack', PEPE: 'pepe', FET: 'fetch-ai', GRT: 'the-graph',
  AAVE: 'aave', MKR: 'maker', RUNE: 'thorchain', TAO: 'bittensor',
  WIF: 'dogwifcoin', BONK: 'bonk', FLOKI: 'floki',
};

export function coinloreSymbolToGeckoId(symbol: string, name: string): string {
  const upper = symbol.toUpperCase();
  if (SYMBOL_TO_COINGECKO[upper]) return SYMBOL_TO_COINGECKO[upper];
  // Fallback: lowercase name, replace spaces with hyphens
  return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}
