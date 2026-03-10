import { getCached, setCache } from '../cache';

const BASE = 'https://www.alphavantage.co/query';
const STORAGE_KEY = 'sf_avk';
const USAGE_DATE_KEY = 'sf_avd';
const USAGE_COUNT_KEY = 'sf_avc';
const CACHE_TTL = 10 * 60 * 1000;
const DEFAULT_KEY = 'DDA2XK5P7Q9CO756';

export function getAVApiKey(): string {
  try { return localStorage.getItem(STORAGE_KEY) || DEFAULT_KEY; } catch { return DEFAULT_KEY; }
}

export function setAVApiKey(key: string) {
  if (key.trim()) localStorage.setItem(STORAGE_KEY, key.trim());
  else localStorage.removeItem(STORAGE_KEY);
}

export function getAVDailyUsage(): { count: number; remaining: number } {
  try {
    const today = new Date().toISOString().split('T')[0];
    const storedDate = localStorage.getItem(USAGE_DATE_KEY);
    if (storedDate !== today) {
      localStorage.setItem(USAGE_DATE_KEY, today);
      localStorage.setItem(USAGE_COUNT_KEY, '0');
      return { count: 0, remaining: 25 };
    }
    const count = parseInt(localStorage.getItem(USAGE_COUNT_KEY) || '0', 10);
    return { count, remaining: Math.max(0, 25 - count) };
  } catch {
    return { count: 0, remaining: 25 };
  }
}

function incrementUsage() {
  try {
    const today = new Date().toISOString().split('T')[0];
    const storedDate = localStorage.getItem(USAGE_DATE_KEY);
    if (storedDate !== today) {
      localStorage.setItem(USAGE_DATE_KEY, today);
      localStorage.setItem(USAGE_COUNT_KEY, '1');
    } else {
      const count = parseInt(localStorage.getItem(USAGE_COUNT_KEY) || '0', 10);
      localStorage.setItem(USAGE_COUNT_KEY, String(count + 1));
    }
  } catch { /* ignore */ }
}

// Throttle: max 5 calls/min
let lastCall = 0;
async function avFetch(params: Record<string, string>): Promise<any> {
  const now = Date.now();
  const gap = 12500 - (now - lastCall); // ~5/min = 12s gap
  if (gap > 0) await new Promise(r => setTimeout(r, gap));
  lastCall = Date.now();

  const key = getAVApiKey();
  const qs = new URLSearchParams({ ...params, apikey: key }).toString();
  const res = await fetch(`${BASE}?${qs}`);
  if (!res.ok) throw new Error(`Alpha Vantage HTTP ${res.status}`);
  const data = await res.json();

  if (data['Error Message']) throw new Error(`AV: Invalid symbol`);
  if (data['Note'] || data['Information']) throw new Error(`AV: Rate limited`);

  incrementUsage();
  return data;
}

export async function avSearch(query: string): Promise<{ symbol: string; name: string; type: string; region: string }[]> {
  const key = `av_search_${query}`;
  const cached = getCached<any>(key, 30 * 60 * 1000);
  if (cached) return cached;

  const data = await avFetch({ function: 'SYMBOL_SEARCH', keywords: query });
  const results = (data.bestMatches || []).map((m: any) => ({
    symbol: m['1. symbol'],
    name: m['2. name'],
    type: m['3. type'],
    region: m['4. region'],
  }));
  setCache(key, results);
  return results;
}

export async function avGlobalQuote(symbol: string): Promise<{ price: number; previousClose: number }> {
  const data = await avFetch({ function: 'GLOBAL_QUOTE', symbol });
  const gq = data['Global Quote'];
  if (!gq) throw new Error('AV: No quote data');
  return {
    price: parseFloat(gq['05. price']),
    previousClose: parseFloat(gq['08. previous close']),
  };
}

export interface AVHistoricalData {
  timestamps: number[];
  closes: number[];
  volumes: number[];
}

export async function avDailyHistory(symbol: string): Promise<AVHistoricalData> {
  const cacheKey = `av_daily_${symbol}`;
  const cached = getCached<AVHistoricalData>(cacheKey, CACHE_TTL);
  if (cached) return cached;

  const data = await avFetch({ function: 'TIME_SERIES_DAILY', symbol, outputsize: 'full' });
  const ts = data['Time Series (Daily)'];
  if (!ts) throw new Error('AV: No time series data');

  const dates = Object.keys(ts).sort();
  const timestamps: number[] = [];
  const closes: number[] = [];
  const volumes: number[] = [];

  for (const date of dates) {
    timestamps.push(new Date(date).getTime());
    closes.push(parseFloat(ts[date]['4. close']));
    volumes.push(parseFloat(ts[date]['5. volume'] || '0'));
  }

  const result = { timestamps, closes, volumes };
  setCache(cacheKey, result);
  return result;
}

export async function avForexDaily(from: string, to: string): Promise<AVHistoricalData> {
  const cacheKey = `av_fx_${from}_${to}`;
  const cached = getCached<AVHistoricalData>(cacheKey, CACHE_TTL);
  if (cached) return cached;

  const data = await avFetch({ function: 'FX_DAILY', from_symbol: from, to_symbol: to, outputsize: 'full' });
  const ts = data['Time Series FX (Daily)'];
  if (!ts) throw new Error('AV: No forex data');

  const dates = Object.keys(ts).sort();
  const timestamps: number[] = [];
  const closes: number[] = [];

  for (const date of dates) {
    timestamps.push(new Date(date).getTime());
    closes.push(parseFloat(ts[date]['4. close']));
  }

  const result = { timestamps, closes, volumes: new Array(closes.length).fill(0) };
  setCache(cacheKey, result);
  return result;
}

export async function avForexRate(from: string, to: string): Promise<number> {
  const data = await avFetch({ function: 'CURRENCY_EXCHANGE_RATE', from_currency: from, to_currency: to });
  const rate = data['Realtime Currency Exchange Rate'];
  if (!rate) throw new Error('AV: No exchange rate data');
  return parseFloat(rate['5. Exchange Rate']);
}
