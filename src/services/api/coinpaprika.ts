import { getCached, setCache } from '../cache';

const BASE = 'https://api.coinpaprika.com/v1';
const CACHE_TTL = 10 * 60 * 1000;

const CG_TO_CP: Record<string, string> = {
  'bitcoin': 'btc-bitcoin',
  'ethereum': 'eth-ethereum',
  'solana': 'sol-solana',
  'binancecoin': 'bnb-binance-coin',
  'ripple': 'xrp-xrp',
  'cardano': 'ada-cardano',
  'dogecoin': 'doge-dogecoin',
  'avalanche-2': 'avax-avalanche',
  'polkadot': 'dot-polkadot',
  'chainlink': 'link-chainlink',
  'litecoin': 'ltc-litecoin',
  'bitcoin-cash': 'bch-bitcoin-cash',
  'uniswap': 'uni-uniswap',
  'cosmos': 'atom-cosmos',
  'near': 'near-near-protocol',
  'sui': 'sui-sui',
  'tron': 'trx-tron',
  'the-open-network': 'ton-toncoin',
  'shiba-inu': 'shib-shiba-inu',
  'aptos': 'apt-aptos',
  'arbitrum': 'arb-arbitrum',
  'optimism': 'op-optimism',
  'filecoin': 'fil-filecoin',
  'aave': 'aave-aave',
  'maker': 'mkr-maker',
  'pepe': 'pepe-pepe',
};

export function geckoIdToCoinPaprikaId(geckoId: string): string {
  if (CG_TO_CP[geckoId]) return CG_TO_CP[geckoId];
  // Attempt construction
  return geckoId.toLowerCase().replace(/\s+/g, '-');
}

export async function cpSearch(query: string): Promise<{ id: string; name: string; symbol: string }[]> {
  const cacheKey = `cp_search_${query}`;
  const cached = getCached<any>(cacheKey, 30 * 60 * 1000);
  if (cached) return cached;

  const res = await fetch(`${BASE}/search?q=${encodeURIComponent(query)}&c=currencies&limit=8`);
  if (!res.ok) throw new Error(`CoinPaprika ${res.status}`);
  const data = await res.json();
  const results = (data.currencies || []).map((c: any) => ({
    id: c.id,
    name: c.name,
    symbol: c.symbol,
  }));
  setCache(cacheKey, results);
  return results;
}

export async function cpTicker(coinId: string): Promise<{ price: number; change24h: number }> {
  const cacheKey = `cp_ticker_${coinId}`;
  const cached = getCached<any>(cacheKey, 2 * 60 * 1000);
  if (cached) return cached;

  const res = await fetch(`${BASE}/tickers/${coinId}`);
  if (!res.ok) throw new Error(`CoinPaprika ${res.status}`);
  const data = await res.json();
  const result = {
    price: data.quotes?.USD?.price || 0,
    change24h: data.quotes?.USD?.percent_change_24h || 0,
  };
  setCache(cacheKey, result);
  return result;
}

export interface CPHistoricalData {
  timestamps: number[];
  closes: number[];
  volumes: number[];
}

export async function cpHistorical(coinId: string, days: number): Promise<CPHistoricalData> {
  const cacheKey = `cp_hist_${coinId}_${days}`;
  const cached = getCached<CPHistoricalData>(cacheKey, CACHE_TTL);
  if (cached) return cached;

  const start = new Date();
  start.setDate(start.getDate() - days);
  const startStr = start.toISOString().split('T')[0];

  const res = await fetch(`${BASE}/tickers/${coinId}/historical?start=${startStr}&interval=1d`);
  if (!res.ok) throw new Error(`CoinPaprika ${res.status}`);
  const data = await res.json();

  if (!Array.isArray(data) || data.length === 0) throw new Error('CoinPaprika: No historical data');

  const timestamps: number[] = [];
  const closes: number[] = [];
  const volumes: number[] = [];

  for (const point of data) {
    timestamps.push(new Date(point.timestamp).getTime());
    closes.push(point.price);
    volumes.push(point.volume_24h || 0);
  }

  const result = { timestamps, closes, volumes };
  setCache(cacheKey, result);
  return result;
}
