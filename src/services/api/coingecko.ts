import { getCached, setCache } from '../cache';
import { getStoredApiKey } from '@/components/settings/ApiKeySettings';

const BASE_PUBLIC = 'https://api.coingecko.com/api/v3';
const BASE_PRO = 'https://pro-api.coingecko.com/api/v3';
const CACHE_TTL = 10 * 60 * 1000; // 10 min

function getBase() {
  return getStoredApiKey() ? BASE_PRO : BASE_PUBLIC;
}

let lastCall = 0;
async function throttledFetch(url: string) {
  const apiKey = getStoredApiKey();
  const now = Date.now();
  // With API key, reduce throttle; without, keep conservative
  const minGap = apiKey ? 600 : 2200;
  const gap = minGap - (now - lastCall);
  if (gap > 0) await new Promise(r => setTimeout(r, gap));
  lastCall = Date.now();

  const separator = url.includes('?') ? '&' : '?';
  const finalUrl = apiKey ? `${url}${separator}x_cg_demo_api_key=${encodeURIComponent(apiKey)}` : url;

  const res = await fetch(finalUrl);
  if (!res.ok) throw new Error(`CoinGecko ${res.status}`);
  return res.json();
}

export async function searchCoins(query: string) {
  const key = `cg_search_${query}`;
  const cached = getCached<any>(key, 30 * 60 * 1000);
  if (cached) return cached;
  const data = await throttledFetch(`${getBase()}/search?query=${encodeURIComponent(query)}`);
  setCache(key, data.coins?.slice(0, 10) || []);
  return data.coins?.slice(0, 10) || [];
}

export async function getCoinData(coinId: string) {
  const key = `cg_coin_${coinId}`;
  const cached = getCached<any>(key, CACHE_TTL);
  if (cached) return cached;
  const data = await throttledFetch(`${getBase()}/coins/${coinId}?localization=false&tickers=false&community_data=false&developer_data=false`);
  setCache(key, data);
  return data;
}

export async function getCoinChart(coinId: string, days: number) {
  const apiKey = getStoredApiKey();
  // Free tier limited to 365 days; paid users can use 'max'
  let daysParam: string;
  if (days >= 9999) {
    daysParam = apiKey ? 'max' : '365';
  } else {
    daysParam = String(days);
  }
  const key = `cg_chart_${coinId}_${daysParam}`;
  const cached = getCached<any>(key, CACHE_TTL);
  if (cached) return cached;
  const data = await throttledFetch(`${getBase()}/coins/${coinId}/market_chart?vs_currency=usd&days=${daysParam}`);
  setCache(key, data);
  return data;
}

export async function getTopCoins(perPage = 15) {
  const key = `cg_top_${perPage}`;
  const cached = getCached<any>(key, CACHE_TTL);
  if (cached) return cached;
  const data = await throttledFetch(`${getBase()}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${perPage}&page=1&sparkline=false`);
  setCache(key, data);
  return data;
}

export async function getTrendingCoins(): Promise<{ id: string; name: string; symbol: string }[]> {
  const key = 'cg_trending';
  const cached = getCached<any>(key, CACHE_TTL);
  if (cached) return cached;
  const data = await throttledFetch(`${getBase()}/search/trending`);
  const coins = (data.coins || []).map((c: any) => ({
    id: c.item?.id,
    name: c.item?.name,
    symbol: c.item?.symbol,
  })).filter((c: any) => c.id);
  setCache(key, coins);
  return coins;
}
