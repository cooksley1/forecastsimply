import { getCached, setCache } from '../cache';

const BASE = 'https://api.coingecko.com/api/v3';
const CACHE_TTL = 5 * 60 * 1000; // 5 min

let lastCall = 0;
async function throttledFetch(url: string) {
  const now = Date.now();
  const gap = 2200 - (now - lastCall);
  if (gap > 0) await new Promise(r => setTimeout(r, gap));
  lastCall = Date.now();
  const res = await fetch(url);
  if (!res.ok) throw new Error(`CoinGecko ${res.status}`);
  return res.json();
}

export async function searchCoins(query: string) {
  const key = `cg_search_${query}`;
  const cached = getCached<any>(key, 30 * 60 * 1000);
  if (cached) return cached;
  const data = await throttledFetch(`${BASE}/search?query=${encodeURIComponent(query)}`);
  setCache(key, data.coins?.slice(0, 10) || []);
  return data.coins?.slice(0, 10) || [];
}

export async function getCoinData(coinId: string) {
  const key = `cg_coin_${coinId}`;
  const cached = getCached<any>(key, CACHE_TTL);
  if (cached) return cached;
  const data = await throttledFetch(`${BASE}/coins/${coinId}?localization=false&tickers=false&community_data=false&developer_data=false`);
  setCache(key, data);
  return data;
}

export async function getCoinChart(coinId: string, days: number) {
  const key = `cg_chart_${coinId}_${days}`;
  const cached = getCached<any>(key, CACHE_TTL);
  if (cached) return cached;
  const data = await throttledFetch(`${BASE}/coins/${coinId}/market_chart?vs_currency=usd&days=${days}`);
  setCache(key, data);
  return data;
}

export async function getTopCoins() {
  const key = 'cg_top';
  const cached = getCached<any>(key, CACHE_TTL);
  if (cached) return cached;
  const data = await throttledFetch(`${BASE}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=12&page=1&sparkline=false`);
  setCache(key, data);
  return data;
}
