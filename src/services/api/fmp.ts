import { getCached, setCache } from '../cache';

const BASE = 'https://financialmodelingprep.com/api/v3';
const STORAGE_KEY = 'sf_fmpk';
const CACHE_TTL = 10 * 60 * 1000;

export function getFMPApiKey(): string | null {
  try { return localStorage.getItem(STORAGE_KEY) || null; } catch { return null; }
}

export function setFMPApiKey(key: string) {
  if (key.trim()) localStorage.setItem(STORAGE_KEY, key.trim());
  else localStorage.removeItem(STORAGE_KEY);
}

async function fmpFetch(endpoint: string): Promise<any> {
  const key = getFMPApiKey();
  if (!key) throw new Error('FMP: No API key configured');

  const separator = endpoint.includes('?') ? '&' : '?';
  const res = await fetch(`${BASE}${endpoint}${separator}apikey=${encodeURIComponent(key)}`);
  if (!res.ok) throw new Error(`FMP HTTP ${res.status}`);
  return res.json();
}

export async function fmpSearch(query: string): Promise<{ symbol: string; name: string }[]> {
  const cacheKey = `fmp_search_${query}`;
  const cached = getCached<any>(cacheKey, 30 * 60 * 1000);
  if (cached) return cached;

  const data = await fmpFetch(`/search?query=${encodeURIComponent(query)}`);
  const results = (data || []).slice(0, 10).map((item: any) => ({
    symbol: item.symbol,
    name: item.name,
  }));
  setCache(cacheKey, results);
  return results;
}

export async function fmpQuote(symbol: string): Promise<{ price: number; previousClose: number }> {
  const data = await fmpFetch(`/quote/${encodeURIComponent(symbol)}`);
  const quote = data?.[0];
  if (!quote) throw new Error('FMP: No quote data');
  return {
    price: quote.price,
    previousClose: quote.previousClose,
  };
}

export interface FMPHistoricalData {
  timestamps: number[];
  closes: number[];
  volumes: number[];
}

export async function fmpDailyHistory(symbol: string): Promise<FMPHistoricalData> {
  const cacheKey = `fmp_daily_${symbol}`;
  const cached = getCached<FMPHistoricalData>(cacheKey, CACHE_TTL);
  if (cached) return cached;

  const data = await fmpFetch(`/historical-price-full/${encodeURIComponent(symbol)}`);
  const historical = data?.historical;
  if (!historical || !Array.isArray(historical) || historical.length === 0) {
    throw new Error('FMP: No historical data');
  }

  // FMP returns reverse chronological — reverse it
  const sorted = [...historical].reverse();
  const timestamps: number[] = [];
  const closes: number[] = [];
  const volumes: number[] = [];

  for (const day of sorted) {
    timestamps.push(new Date(day.date).getTime());
    closes.push(day.close);
    volumes.push(day.volume || 0);
  }

  const result = { timestamps, closes, volumes };
  setCache(cacheKey, result);
  return result;
}
