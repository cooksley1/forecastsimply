import { getCached, setCache } from '../cache';

const CACHE_TTL = 10 * 60 * 1000; // 10 min

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const CORS_PROXIES = [
  'https://api.allorigins.win/raw?url=',
  'https://corsproxy.io/?',
  'https://api.codetabs.com/v1/proxy?quest=',
];

function daysToRange(days: number): { range: string; interval: string } {
  if (days <= 7) return { range: '5d', interval: '1h' };
  if (days <= 30) return { range: '1mo', interval: '1d' };
  if (days <= 90) return { range: '3mo', interval: '1d' };
  if (days <= 180) return { range: '6mo', interval: '1d' };
  if (days <= 365) return { range: '1y', interval: '1d' };
  if (days <= 730) return { range: '2y', interval: '1wk' };
  if (days <= 1825) return { range: '5y', interval: '1wk' };
  return { range: 'max', interval: '1mo' };
}

async function fetchWithProxy(url: string): Promise<any> {
  const errors: string[] = [];

  for (const proxy of CORS_PROXIES) {
    try {
      const fullUrl = proxy + encodeURIComponent(url);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort('Request timeout after 4s'), 4000);

      const res = await fetch(fullUrl, { signal: controller.signal });
      clearTimeout(timeout);

      if (!res.ok) {
        errors.push(`${proxy}: HTTP ${res.status}`);
        continue;
      }

      const text = await res.text();

      // Check for HTML error pages
      if (text.trim().startsWith('<!') || text.trim().startsWith('<html')) {
        errors.push(`${proxy}: returned HTML instead of JSON`);
        continue;
      }

      const parsed = JSON.parse(text);

      // Validate it's actual Yahoo data
      if (parsed?.chart?.result || parsed?.chart?.error) {
        return parsed;
      }

      errors.push(`${proxy}: unexpected JSON structure`);
    } catch (e: any) {
      errors.push(`${proxy}: ${e.message}`);
      continue;
    }
  }

  // Final attempt: direct (might work in some environments)
  try {
    const res = await fetch(url);
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // ignore
  }

  throw new Error(`All proxies failed for ${url}. Tried: ${errors.join('; ')}`);
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

  let data: any = null;

  // Try edge function proxy first (most reliable, no CORS issues)
  if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    try {
      const proxyUrl = `${SUPABASE_URL}/functions/v1/yahoo-proxy?symbol=${encodeURIComponent(symbol)}&range=${range}&interval=${interval}`;
      const res = await fetch(proxyUrl, {
        headers: { 'apikey': SUPABASE_ANON_KEY },
        signal: AbortSignal.timeout(8000),
      });
      if (res.ok) {
        const parsed = await res.json();
        if (parsed?.chart?.result || parsed?.chart?.error) {
          data = parsed;
        }
      }
    } catch (e: any) {
      console.warn('Yahoo edge proxy failed:', e.message);
    }
  }

  // Fallback to CORS proxies if edge function failed
  if (!data) {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${range}&interval=${interval}&includePrePost=false`;
    data = await fetchWithProxy(url);
  }

  if (data?.chart?.error) {
    throw new Error(data.chart.error.description || `Yahoo API error for ${symbol}`);
  }

  const result = data?.chart?.result?.[0];
  if (!result) throw new Error(`No data found for ${symbol}. The ticker may be invalid.`);

  const meta = result.meta || {};
  const quote = result.indicators?.quote?.[0] || {};
  const rawTimestamps = (result.timestamp || []).map((t: number) => t * 1000);

  const closes: number[] = [];
  const volumes: number[] = [];
  const highs: number[] = [];
  const lows: number[] = [];
  const opens: number[] = [];
  const timestamps: number[] = [];

  for (let i = 0; i < rawTimestamps.length; i++) {
    const c = quote.close?.[i];
    if (c != null && !isNaN(c)) {
      timestamps.push(rawTimestamps[i]);
      closes.push(c);
      volumes.push(quote.volume?.[i] || 0);
      highs.push(quote.high?.[i] || c);
      lows.push(quote.low?.[i] || c);
      opens.push(quote.open?.[i] || c);
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
    timestamps,
    closes,
    volumes,
    highs,
    lows,
    opens,
  };

  setCache(key, parsed);
  return parsed;
}