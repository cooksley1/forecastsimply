import { getCached, setCache } from '../cache';

const CACHE_TTL = 10 * 60 * 1000; // 10 min

const CORS_PROXIES = [
  'https://corsproxy.io/?',
  'https://api.allorigins.win/raw?url=',
];

function daysToRange(days: number): { range: string; interval: string } {
  if (days <= 30) return { range: '1mo', interval: '1d' };
  if (days <= 90) return { range: '3mo', interval: '1d' };
  if (days <= 180) return { range: '6mo', interval: '1d' };
  if (days <= 365) return { range: '1y', interval: '1d' };
  if (days <= 730) return { range: '2y', interval: '1wk' };
  return { range: '5y', interval: '1wk' };
}

async function fetchWithProxy(url: string): Promise<any> {
  // Try each proxy in order
  for (const proxy of CORS_PROXIES) {
    try {
      const res = await fetch(proxy + encodeURIComponent(url));
      if (!res.ok) continue;
      const text = await res.text();
      return JSON.parse(text);
    } catch {
      continue;
    }
  }
  // Final attempt: direct (might work in some environments)
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Yahoo Finance API error: ${res.status}`);
  return res.json();
}

export interface YahooChartResult {
  symbol: string;
  name: string;
  currency: string;
  exchange: string;
  regularMarketPrice: number;
  previousClose: number;
  timestamps: number[];
  closes: number[];
  volumes: number[];
  highs: number[];
  lows: number[];
  opens: number[];
}

export async function getStockChart(symbol: string, days: number): Promise<YahooChartResult> {
  const key = `yf_chart_${symbol}_${days}`;
  const cached = getCached<YahooChartResult>(key, CACHE_TTL);
  if (cached) return cached;

  const { range, interval } = daysToRange(days);
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${range}&interval=${interval}&includePrePost=false`;

  const data = await fetchWithProxy(url);

  const result = data?.chart?.result?.[0];
  if (!result) throw new Error(`No data found for ${symbol}`);

  const meta = result.meta || {};
  const quote = result.indicators?.quote?.[0] || {};
  const timestamps = (result.timestamp || []).map((t: number) => t * 1000); // to ms

  const closes: number[] = [];
  const volumes: number[] = [];
  const highs: number[] = [];
  const lows: number[] = [];
  const opens: number[] = [];

  // Filter out null values
  for (let i = 0; i < timestamps.length; i++) {
    const c = quote.close?.[i];
    if (c != null && !isNaN(c)) {
      closes.push(c);
      volumes.push(quote.volume?.[i] || 0);
      highs.push(quote.high?.[i] || c);
      lows.push(quote.low?.[i] || c);
      opens.push(quote.open?.[i] || c);
    } else {
      // Skip this data point — also remove timestamp
      timestamps.splice(i, 1);
      i--;
    }
  }

  if (closes.length < 5) throw new Error(`Insufficient data for ${symbol}`);

  const parsed: YahooChartResult = {
    symbol: meta.symbol || symbol,
    name: meta.longName || meta.shortName || symbol,
    currency: meta.currency || 'USD',
    exchange: meta.exchangeName || '',
    regularMarketPrice: meta.regularMarketPrice || closes[closes.length - 1],
    previousClose: meta.chartPreviousClose || meta.previousClose || closes[0],
    timestamps: timestamps.slice(0, closes.length),
    closes,
    volumes,
    highs,
    lows,
    opens,
  };

  setCache(key, parsed);
  return parsed;
}
