import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
const BATCH_SIZE = 40;
const YAHOO_DELAY = 150; // ms between Yahoo calls

// ═══════════════════════════════════════════════════
//  TECHNICAL ANALYSIS INDICATORS (ported from client)
// ═══════════════════════════════════════════════════

function sma(data: number[], period: number): number[] {
  const result: number[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) { result.push(NaN); continue; }
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) sum += data[j];
    result.push(sum / period);
  }
  return result;
}

function ema(data: number[], period: number): number[] {
  const k = 2 / (period + 1);
  const result: number[] = [data[0]];
  for (let i = 1; i < data.length; i++) {
    result.push(data[i] * k + result[i - 1] * (1 - k));
  }
  return result;
}

function rsi(closes: number[], period = 14): number[] {
  const result: number[] = new Array(closes.length).fill(NaN);
  if (closes.length < period + 1) return result;
  let avgGain = 0, avgLoss = 0;
  for (let i = 1; i <= period; i++) {
    const change = closes[i] - closes[i - 1];
    if (change > 0) avgGain += change; else avgLoss += Math.abs(change);
  }
  avgGain /= period; avgLoss /= period;
  result[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  for (let i = period + 1; i < closes.length; i++) {
    const change = closes[i] - closes[i - 1];
    avgGain = (avgGain * (period - 1) + (change > 0 ? change : 0)) / period;
    avgLoss = (avgLoss * (period - 1) + (change < 0 ? -change : 0)) / period;
    result[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  }
  return result;
}

function bollingerBands(closes: number[], period = 20, mult = 2) {
  const mid = sma(closes, period);
  const upper: number[] = [], lower: number[] = [];
  for (let i = 0; i < closes.length; i++) {
    if (i < period - 1) { upper.push(NaN); lower.push(NaN); continue; }
    let sumSq = 0;
    for (let j = i - period + 1; j <= i; j++) sumSq += (closes[j] - mid[i]) ** 2;
    const std = Math.sqrt(sumSq / period);
    upper.push(mid[i] + mult * std);
    lower.push(mid[i] - mult * std);
  }
  return { upper, middle: mid, lower };
}

function macd(closes: number[]) {
  const ema12 = ema(closes, 12);
  const ema26 = ema(closes, 26);
  const line = ema12.map((v, i) => v - ema26[i]);
  const signal = ema(line, 9);
  const histogram = line.map((v, i) => v - signal[i]);
  return { line, signal, histogram };
}

function stochastic(closes: number[], kPeriod = 14) {
  const kValues: number[] = new Array(closes.length).fill(NaN);
  for (let i = kPeriod - 1; i < closes.length; i++) {
    let hh = -Infinity, ll = Infinity;
    for (let j = i - kPeriod + 1; j <= i; j++) {
      if (closes[j] > hh) hh = closes[j];
      if (closes[j] < ll) ll = closes[j];
    }
    kValues[i] = hh === ll ? 50 : ((closes[i] - ll) / (hh - ll)) * 100;
  }
  return kValues;
}

// ═══════════════════════════════════════════════════
//  SIGNAL SCORING (same logic as client signals.ts)
// ═══════════════════════════════════════════════════

interface AnalysisResult {
  signal_score: number;
  signal_label: string;
  confidence: number;
  market_phase: string;
  target_price: number;
  stop_loss: number;
  forecast_return_pct: number;
  rsi_val: number;
  sma20_val: number;
  sma50_val: number;
  macd_hist: number;
  bb_pos: number;
  stoch_k: number;
}

function analyseCloses(closes: number[]): AnalysisResult | null {
  if (closes.length < 30) return null;

  const currentPrice = closes[closes.length - 1];
  const sma20Arr = sma(closes, 20);
  const sma50Arr = sma(closes, Math.min(50, Math.floor(closes.length * 0.4)));
  const rsiValues = rsi(closes);
  const bb = bollingerBands(closes);
  const macdResult = macd(closes);
  const stochK = stochastic(closes);

  const lastSma20 = sma20Arr.filter(v => !isNaN(v)).pop() || currentPrice;
  const lastSma50 = sma50Arr.filter(v => !isNaN(v)).pop() || currentPrice;
  const currentRsi = rsiValues.filter(v => !isNaN(v)).pop() || 50;
  const lastBBU = bb.upper.filter(v => !isNaN(v)).pop() || currentPrice;
  const lastBBL = bb.lower.filter(v => !isNaN(v)).pop() || currentPrice;
  const lastStochK = stochK.filter(v => !isNaN(v)).pop() || 50;
  const lastMacdHist = macdResult.histogram.filter(v => !isNaN(v));

  // Trend strength detection
  const sma20Rising = sma20Arr.length >= 5 && sma20Arr[sma20Arr.length - 1] > sma20Arr[sma20Arr.length - 5];
  const sma50Rising = sma50Arr.length >= 5 && sma50Arr[sma50Arr.length - 1] > sma50Arr[sma50Arr.length - 5];
  const strongUptrend = lastSma20 > lastSma50 && sma20Rising && sma50Rising;
  const strongDowntrend = lastSma20 < lastSma50 && !sma20Rising && !sma50Rising;

  let score = 0;

  // 1. SMA(20)
  score += currentPrice > lastSma20 ? 1 : -1;
  // 2. SMA(50)
  score += currentPrice > lastSma50 ? 1 : -1;
  // 3. MA Crossover
  score += lastSma20 > lastSma50 ? 1 : -1;

  // 4. RSI
  let rsiC = 0;
  if (currentRsi < 25) rsiC = 3;
  else if (currentRsi < 35) rsiC = 1;
  else if (currentRsi > 75) rsiC = -3;
  else if (currentRsi > 65) rsiC = -1;
  if (strongUptrend && rsiC < 0) rsiC = Math.round(rsiC * 0.5);
  if (strongDowntrend && rsiC > 0) rsiC = Math.round(rsiC * 0.5);
  score += rsiC;

  // 5. MACD
  if (lastMacdHist.length >= 2) {
    const last = lastMacdHist[lastMacdHist.length - 1];
    const prev = lastMacdHist[lastMacdHist.length - 2];
    let c = last > prev ? 1 : -1;
    if (prev < 0 && last > 0) c += 1;
    else if (prev > 0 && last < 0) c -= 1;
    if (strongUptrend && c < 0) c = Math.round(c * 0.5);
    if (strongDowntrend && c > 0) c = Math.round(c * 0.5);
    score += c;
  }

  // 6. Bollinger Bands
  const bbPos = lastBBU !== lastBBL ? (currentPrice - lastBBL) / (lastBBU - lastBBL) : 0.5;
  if (bbPos < 0.15) score += 1;
  else if (bbPos > 0.85) score -= 1;

  // 7. Stochastic
  if (lastStochK < 20) score += 1;
  else if (lastStochK > 80) score -= 1;

  // 8. Trend strength bonus
  if (strongUptrend) score += 2;
  else if (strongDowntrend) score -= 2;

  score = Math.max(-10, Math.min(10, score));

  // Label
  let label: string;
  if (score >= 6) label = 'Strong Buy';
  else if (score >= 3) label = 'Buy';
  else if (score <= -6) label = 'Strong Sell';
  else if (score <= -3) label = 'Sell';
  else label = 'Hold';

  const confidence = Math.min(95, 45 + Math.abs(score) * 5);

  // Market phase
  const recent = closes.slice(-20);
  const n = recent.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  for (let i = 0; i < n; i++) { sumX += i; sumY += recent[i]; sumXY += i * recent[i]; sumX2 += i * i; }
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const normSlope = slope / currentPrice;

  let phase = 'Consolidation';
  if (currentPrice > lastSma20 && lastSma20 > lastSma50 && normSlope > 0.001) phase = 'Markup / Uptrend';
  else if (currentPrice < lastSma20 && lastSma20 < lastSma50 && normSlope < -0.001) phase = 'Markdown / Downtrend';
  else if (currentPrice < lastSma20 && lastSma20 > lastSma50) phase = 'Distribution';
  else if (currentPrice > lastSma20 && lastSma20 < lastSma50) phase = 'Accumulation';
  else if (normSlope > 0) phase = 'Recovery';
  else if (normSlope < -0.001) phase = 'Decline';

  // Simple forecast: linear regression projection
  const forecastDays = 30;
  const endPrice = currentPrice + slope * forecastDays;
  const forecastReturn = ((endPrice - currentPrice) / currentPrice) * 100;

  // Target / stop loss
  const atrEst = closes.slice(-14).reduce((s, c, i, a) => i === 0 ? 0 : s + Math.abs(c - a[i - 1]), 0) / 13;
  const isBullish = score >= 0;
  const target = isBullish ? currentPrice + atrEst * 3 : currentPrice - atrEst * 3;
  const stopLoss = isBullish ? currentPrice - atrEst * 2 : currentPrice + atrEst * 2;

  return {
    signal_score: score,
    signal_label: label,
    confidence,
    market_phase: phase,
    target_price: target,
    stop_loss: stopLoss,
    forecast_return_pct: Math.round(forecastReturn * 100) / 100,
    rsi_val: Math.round(currentRsi * 100) / 100,
    sma20_val: Math.round(lastSma20 * 1000) / 1000,
    sma50_val: Math.round(lastSma50 * 1000) / 1000,
    macd_hist: Math.round((lastMacdHist[lastMacdHist.length - 1] || 0) * 10000) / 10000,
    bb_pos: Math.round(bbPos * 100) / 100,
    stoch_k: Math.round(lastStochK * 100) / 100,
  };
}

// ═══════════════════════════════════════════════════
//  YAHOO FINANCE DATA FETCHING (with auth)
// ═══════════════════════════════════════════════════

let yahooSession: { crumb: string; cookies: string } | null = null;

async function getYahooSession(): Promise<{ crumb: string; cookies: string }> {
  if (yahooSession) return yahooSession;

  const initRes = await fetch('https://fc.yahoo.com', {
    headers: { 'User-Agent': UA },
    redirect: 'manual',
  });

  const allCookies: string[] = [];
  const setCookies = initRes.headers.getSetCookie?.() || [];
  for (const c of setCookies) allCookies.push(c.split(';')[0]);
  for (const [key, value] of initRes.headers.entries()) {
    if (key.toLowerCase() === 'set-cookie') {
      const part = value.split(';')[0];
      if (!allCookies.includes(part)) allCookies.push(part);
    }
  }
  try { await initRes.text(); } catch {}

  const cookieStr = allCookies.join('; ');
  const crumbRes = await fetch('https://query2.finance.yahoo.com/v1/test/getcrumb', {
    headers: { 'User-Agent': UA, 'Cookie': cookieStr },
  });

  if (!crumbRes.ok) {
    const crumbRes2 = await fetch('https://query1.finance.yahoo.com/v1/test/getcrumb', {
      headers: { 'User-Agent': UA, 'Cookie': cookieStr },
    });
    if (!crumbRes2.ok) throw new Error(`Crumb failed: ${crumbRes2.status}`);
    const crumb = await crumbRes2.text();
    yahooSession = { crumb, cookies: cookieStr };
    return yahooSession;
  }

  const crumb = await crumbRes.text();
  yahooSession = { crumb, cookies: cookieStr };
  return yahooSession;
}

async function fetchYahooChart(symbol: string, range = '3mo', interval = '1d'): Promise<number[]> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${range}&interval=${interval}&includePrePost=false`;
  const res = await fetch(url, {
    headers: { 'User-Agent': UA },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`Yahoo ${res.status} for ${symbol}`);
  const data = await res.json();
  const result = data?.chart?.result?.[0];
  if (!result?.indicators?.quote?.[0]?.close) throw new Error(`No data for ${symbol}`);
  return result.indicators.quote[0].close.filter((v: any) => v != null && !isNaN(v));
}

// ═══════════════════════════════════════════════════
//  STOCK LIST FETCHING (via Yahoo screener)
// ═══════════════════════════════════════════════════

interface ExchangeConfig {
  region: string;
  exchangeFilter?: string;
  suffix: string;
  maxEquities: number;
}

const EXCHANGE_CONFIGS: Record<string, ExchangeConfig> = {
  ASX:    { region: 'au', suffix: '.AX', maxEquities: 2500 },
  NYSE:   { region: 'us', exchangeFilter: 'NYQ', suffix: '', maxEquities: 2500 },
  NASDAQ: { region: 'us', exchangeFilter: 'NMS', suffix: '', maxEquities: 4500 },
};

async function fetchStockList(exchange: string): Promise<{ sym: string; name: string; divYield: number }[]> {
  const config = EXCHANGE_CONFIGS[exchange];
  if (!config) return [];

  let session: { crumb: string; cookies: string } | null = null;
  try { session = await getYahooSession(); } catch (e) {
    console.warn('[analysis] Yahoo session failed:', e);
  }

  const allStocks: { sym: string; name: string; divYield: number }[] = [];
  let offset = 0;
  const size = 250;
  let total = Infinity;

  while (offset < total && offset < config.maxEquities) {
    try {
      const operands: any[] = [
        { operator: 'EQ', operands: ['region', config.region] },
      ];
      if (config.exchangeFilter) {
        operands.push({ operator: 'EQ', operands: ['exchange', config.exchangeFilter] });
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'User-Agent': UA,
      };
      let screenerUrl = 'https://query2.finance.yahoo.com/v1/finance/screener';
      if (session) {
        screenerUrl += `?crumb=${encodeURIComponent(session.crumb)}`;
        headers['Cookie'] = session.cookies;
      }

      const res = await fetch(screenerUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          size, offset,
          sortField: 'intradaymarketcap',
          sortType: 'DESC',
          quoteType: 'EQUITY',
          query: { operator: 'AND', operands },
        }),
        signal: AbortSignal.timeout(15000),
      });

      if (!res.ok) break;
      const data = await res.json();
      const result = data?.finance?.result?.[0];
      if (!result?.quotes?.length) break;

      total = result.total || 0;
      for (const q of result.quotes) {
        if (q.regularMarketPrice > 0 && q.symbol) {
          allStocks.push({
            sym: q.symbol,
            name: q.longName || q.shortName || q.symbol,
            divYield: ((q.trailingAnnualDividendYield ?? q.dividendYield ?? 0) * 100),
          });
        }
      }
      offset += size;
      if (offset < total) await new Promise(r => setTimeout(r, 200));
    } catch (err) {
      console.warn(`[analysis] Screener error at offset ${offset}:`, err);
      break;
    }
  }

  return allStocks;
}

// ═══════════════════════════════════════════════════
//  CRYPTO LIST FETCHING
// ═══════════════════════════════════════════════════

async function fetchCryptoList(limit = 300): Promise<{ id: string; sym: string; name: string; price: number; change: number }[]> {
  const all: any[] = [];
  const perPage = 250;
  const pages = Math.ceil(limit / perPage);

  for (let page = 1; page <= pages; page++) {
    const count = Math.min(perPage, limit - all.length);
    const url = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${count}&page=${page}&sparkline=false`;
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': UA, 'Accept': 'application/json' },
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) break;
      const data = await res.json();
      if (!Array.isArray(data) || data.length === 0) break;
      all.push(...data);
      if (page < pages) await new Promise(r => setTimeout(r, 1500));
    } catch { break; }
  }

  return all.map(c => ({
    id: c.id,
    sym: c.symbol?.toUpperCase() || '',
    name: c.name || '',
    price: c.current_price || 0,
    change: c.price_change_percentage_24h || 0,
  }));
}

// ═══════════════════════════════════════════════════
//  GECKO ID → YAHOO TICKER MAP
// ═══════════════════════════════════════════════════

const GECKO_TO_YAHOO: Record<string, string> = {
  'bitcoin': 'BTC-USD', 'ethereum': 'ETH-USD', 'solana': 'SOL-USD',
  'binancecoin': 'BNB-USD', 'ripple': 'XRP-USD', 'cardano': 'ADA-USD',
  'dogecoin': 'DOGE-USD', 'avalanche-2': 'AVAX-USD', 'polkadot': 'DOT-USD',
  'chainlink': 'LINK-USD', 'litecoin': 'LTC-USD', 'bitcoin-cash': 'BCH-USD',
  'uniswap': 'UNI-USD', 'cosmos': 'ATOM-USD', 'near': 'NEAR-USD',
  'tron': 'TRX-USD', 'shiba-inu': 'SHIB-USD', 'aave': 'AAVE-USD',
  'maker': 'MKR-USD', 'pepe': 'PEPE-USD', 'sui': 'SUI-USD',
  'the-open-network': 'TON-USD', 'filecoin': 'FIL-USD', 'stellar': 'XLM-USD',
  'hedera-hashgraph': 'HBAR-USD', 'internet-computer': 'ICP-USD',
};

function geckoToYahoo(geckoId: string): string {
  return GECKO_TO_YAHOO[geckoId] || `${geckoId.toUpperCase().replace(/-/g, '')}-USD`;
}

// ═══════════════════════════════════════════════════
//  MAIN HANDLER
// ═══════════════════════════════════════════════════

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
  const db = createClient(supabaseUrl, serviceKey);

  const url = new URL(req.url);
  const assetType = url.searchParams.get('asset_type') || 'stocks';
  const exchange = url.searchParams.get('exchange') || 'ASX';
  const offset = parseInt(url.searchParams.get('offset') || '0');
  const batchSize = parseInt(url.searchParams.get('batch_size') || String(BATCH_SIZE));
  const timeframeDays = parseInt(url.searchParams.get('timeframe') || '90');

  const startTime = Date.now();
  const results = { processed: 0, succeeded: 0, failed: 0, skipped: 0 };

  console.log(`[daily-analysis] Starting: ${assetType}/${exchange} offset=${offset} batch=${batchSize} tf=${timeframeDays}d`);

  try {
    let assets: { id: string; sym: string; name: string; price?: number; change?: number; divYield?: number }[] = [];

    if (assetType === 'crypto') {
      // For crypto, fetch full list only on first batch
      const cryptoList = await fetchCryptoList(300);
      assets = cryptoList.map(c => ({ id: c.id, sym: c.sym, name: c.name, price: c.price, change: c.change, divYield: 0 }));
    } else {
      // For stocks, fetch full list from screener
      const stockList = await fetchStockList(exchange);
      assets = stockList.map(s => ({ id: s.sym, sym: s.sym, name: s.name, divYield: s.divYield }));
    }

    const totalAssets = assets.length;
    console.log(`[daily-analysis] Total assets: ${totalAssets}, processing offset ${offset}–${offset + batchSize}`);

    const batch = assets.slice(offset, offset + batchSize);

    // Determine Yahoo range param from timeframe
    const rangeMap: Record<number, string> = { 30: '1mo', 90: '3mo', 180: '6mo', 365: '1y' };
    const range = rangeMap[timeframeDays] || '3mo';

    for (const asset of batch) {
      results.processed++;
      try {
        const yahooTicker = assetType === 'crypto' ? geckoToYahoo(asset.id) : asset.sym;
        const closes = await fetchYahooChart(yahooTicker, range);

        if (closes.length < 20) {
          results.skipped++;
          continue;
        }

        const analysis = analyseCloses(closes);
        if (!analysis) {
          results.skipped++;
          continue;
        }

        const currentPrice = closes[closes.length - 1];
        const prevPrice = closes.length >= 2 ? closes[closes.length - 2] : currentPrice;
        const changePct = asset.change ?? ((currentPrice - prevPrice) / prevPrice) * 100;

        await db.from('daily_analysis_cache').upsert({
          asset_id: asset.id,
          symbol: asset.sym,
          name: asset.name,
          asset_type: assetType === 'crypto' ? 'crypto' : 'stocks',
          exchange: assetType === 'crypto' ? null : exchange,
          price: currentPrice,
          change_pct: Math.round(changePct * 100) / 100,
          dividend_yield: Math.round((asset.divYield || 0) * 10) / 10,
          signal_score: analysis.signal_score,
          signal_label: analysis.signal_label,
          confidence: analysis.confidence,
          market_phase: analysis.market_phase,
          target_price: Math.round(analysis.target_price * 100) / 100,
          stop_loss: Math.round(analysis.stop_loss * 100) / 100,
          forecast_return_pct: analysis.forecast_return_pct,
          rsi: analysis.rsi_val,
          sma20: analysis.sma20_val,
          sma50: analysis.sma50_val,
          macd_histogram: analysis.macd_hist,
          bb_position: analysis.bb_pos,
          stochastic_k: analysis.stoch_k,
          analyzed_at: new Date().toISOString(),
          timeframe_days: timeframeDays,
        }, { onConflict: 'asset_id,timeframe_days' });

        results.succeeded++;
      } catch (err: any) {
        results.failed++;
        if (results.failed <= 3) console.warn(`[daily-analysis] Failed ${asset.sym}:`, err.message);
      }

      // Throttle
      await new Promise(r => setTimeout(r, YAHOO_DELAY));
    }

    // Self-chain: if more assets remain, trigger next batch
    const nextOffset = offset + batchSize;
    let chainedNext = false;

    if (nextOffset < totalAssets) {
      chainedNext = true;
      const nextUrl = `${supabaseUrl}/functions/v1/run-daily-analysis?asset_type=${assetType}&exchange=${exchange}&offset=${nextOffset}&batch_size=${batchSize}&timeframe=${timeframeDays}`;
      // Fire and forget — don't await
      fetch(nextUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${serviceKey}`,
          'Content-Type': 'application/json',
        },
      }).catch(err => console.warn('[daily-analysis] Chain failed:', err.message));
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    const summary = `${assetType}/${exchange} [${offset}–${offset + batch.length}/${totalAssets}] in ${elapsed}s — OK:${results.succeeded} Fail:${results.failed} Skip:${results.skipped}${chainedNext ? ' → chaining next batch' : ' ✓ COMPLETE'}`;
    console.log(`[daily-analysis] ${summary}`);

    return new Response(
      JSON.stringify({ success: true, summary, results, nextOffset: chainedNext ? nextOffset : null }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('[daily-analysis] Fatal error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
