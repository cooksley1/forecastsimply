import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
const BATCH_SIZE = 40;
const YAHOO_DELAY = 150;
const MAX_RETRIES = 3;

// ═══════════════════════════════════════════════════
//  RETRY WRAPPER — exponential backoff for all API calls
// ═══════════════════════════════════════════════════

async function fetchWithRetry(
  url: string,
  options: RequestInit & { signal?: AbortSignal } = {},
  retries = MAX_RETRIES,
): Promise<Response> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, options);
      // Retry on rate-limit or server errors
      if ((res.status === 429 || res.status >= 500) && attempt < retries) {
        const wait = 1000 * Math.pow(2, attempt - 1) + Math.random() * 500;
        console.warn(`[retry] ${res.status} for ${url.slice(0, 80)}… attempt ${attempt}/${retries}, waiting ${Math.round(wait)}ms`);
        await new Promise(r => setTimeout(r, wait));
        continue;
      }
      return res;
    } catch (err: any) {
      if (attempt >= retries) throw err;
      const wait = 1000 * Math.pow(2, attempt - 1);
      console.warn(`[retry] Network error for ${url.slice(0, 80)}… attempt ${attempt}/${retries}: ${err.message}`);
      await new Promise(r => setTimeout(r, wait));
    }
  }
  throw new Error(`Max retries (${retries}) exceeded for ${url.slice(0, 80)}`);
}

// ═══════════════════════════════════════════════════
//  TECHNICAL ANALYSIS INDICATORS
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

function calcATR(closes: number[], period = 14): number {
  if (closes.length < period + 1) return 0;
  let sum = 0;
  for (let i = closes.length - period; i < closes.length; i++) {
    sum += Math.abs(closes[i] - closes[i - 1]);
  }
  return sum / period;
}

function calcOBV(closes: number[], volumes: number[]): number[] {
  const obv: number[] = [0];
  for (let i = 1; i < closes.length; i++) {
    if (closes[i] > closes[i - 1]) obv.push(obv[i - 1] + (volumes[i] || 0));
    else if (closes[i] < closes[i - 1]) obv.push(obv[i - 1] - (volumes[i] || 0));
    else obv.push(obv[i - 1]);
  }
  return obv;
}

// ═══════════════════════════════════════════════════
//  MARKET STRUCTURE (BOS, CHoCH, Supply/Demand, Fib, Volume Profile)
// ═══════════════════════════════════════════════════

interface SwingPoint { index: number; price: number; type: 'high' | 'low'; }

function detectSwingPoints(closes: number[], order = 3): SwingPoint[] {
  const points: SwingPoint[] = [];
  if (closes.length < order * 2 + 1) return points;
  for (let i = order; i < closes.length - order; i++) {
    let isHigh = true, isLow = true;
    for (let j = 1; j <= order; j++) {
      if (closes[i] <= closes[i - j] || closes[i] <= closes[i + j]) isHigh = false;
      if (closes[i] >= closes[i - j] || closes[i] >= closes[i + j]) isLow = false;
    }
    if (isHigh) points.push({ index: i, price: closes[i], type: 'high' });
    if (isLow) points.push({ index: i, price: closes[i], type: 'low' });
  }
  return points;
}

function detectStructureBreaks(closes: number[], swings: SwingPoint[]): { type: string; direction: string; score: number } | null {
  if (swings.length < 3) return null;
  const recentHighs = swings.filter(s => s.type === 'high').slice(-3);
  const recentLows = swings.filter(s => s.type === 'low').slice(-3);
  const isUptrend = recentHighs.length >= 2 && recentHighs[recentHighs.length - 1].price > recentHighs[recentHighs.length - 2].price;
  const isDowntrend = recentLows.length >= 2 && recentLows[recentLows.length - 1].price < recentLows[recentLows.length - 2].price;
  const currentPrice = closes[closes.length - 1];
  const lastHigh = recentHighs[recentHighs.length - 1];
  const lastLow = recentLows[recentLows.length - 1];

  if (lastHigh && closes.length - lastHigh.index < 30 && currentPrice > lastHigh.price) {
    if (isUptrend) return { type: 'bos', direction: 'bullish', score: 1 };
    if (isDowntrend) return { type: 'choch', direction: 'bullish', score: 3 };
  }
  if (lastLow && closes.length - lastLow.index < 30 && currentPrice < lastLow.price) {
    if (isDowntrend) return { type: 'bos', direction: 'bearish', score: -1 };
    if (isUptrend) return { type: 'choch', direction: 'bearish', score: -3 };
  }
  return null;
}

function clusterLevels(levels: number[], threshold: number): number[][] {
  if (levels.length === 0) return [];
  const sorted = [...levels].sort((a, b) => a - b);
  const clusters: number[][] = [[sorted[0]]];
  for (let i = 1; i < sorted.length; i++) {
    const last = clusters[clusters.length - 1];
    const avg = last.reduce((a, b) => a + b, 0) / last.length;
    if (Math.abs(sorted[i] - avg) <= threshold) last.push(sorted[i]);
    else clusters.push([sorted[i]]);
  }
  return clusters.filter(c => c.length >= 2);
}

function scoreSupplyDemandZones(closes: number[], swings: SwingPoint[], atr: number): number {
  if (swings.length < 2 || atr <= 0) return 0;
  const currentPrice = closes[closes.length - 1];
  const threshold = atr * 0.5;

  // Supply zones from swing highs
  const highs = swings.filter(s => s.type === 'high').map(s => s.price);
  const highClusters = clusterLevels(highs, threshold);
  for (const cluster of highClusters) {
    const avg = cluster.reduce((a, b) => a + b, 0) / cluster.length;
    const dist = Math.abs(currentPrice - avg);
    if (dist < atr && currentPrice >= avg - atr * 0.2) {
      return -Math.min(3, cluster.length);
    }
  }

  // Demand zones from swing lows
  const lows = swings.filter(s => s.type === 'low').map(s => s.price);
  const lowClusters = clusterLevels(lows, threshold);
  for (const cluster of lowClusters) {
    const avg = cluster.reduce((a, b) => a + b, 0) / cluster.length;
    const dist = Math.abs(currentPrice - avg);
    if (dist < atr && currentPrice <= avg + atr * 0.2) {
      return Math.min(3, cluster.length);
    }
  }
  return 0;
}

function scoreFibLevels(closes: number[], atr: number): number {
  if (closes.length < 20 || atr <= 0) return 0;
  const segment = closes.slice(-Math.min(60, closes.length));
  const high = Math.max(...segment);
  const low = Math.min(...segment);
  const diff = high - low;
  if (diff <= 0) return 0;

  const highIdx = segment.indexOf(high);
  const lowIdx = segment.indexOf(low);
  const isUpswing = lowIdx < highIdx;
  const currentPrice = closes[closes.length - 1];

  const keyRatios = [0.382, 0.5, 0.618];
  let nearestDist = Infinity;
  let nearestPrice = 0;
  let nearestRatio = 0;

  for (const r of keyRatios) {
    const price = isUpswing ? high - diff * r : low + diff * r;
    const dist = Math.abs(currentPrice - price);
    if (dist < nearestDist) {
      nearestDist = dist;
      nearestPrice = price;
      nearestRatio = r;
    }
  }

  if (nearestDist > atr * 1.5) return 0;
  const factor = 1 - (nearestDist / (atr * 1.5));
  const strength = nearestRatio === 0.618 ? 1.5 : nearestRatio === 0.5 ? 1.2 : 1.0;
  const isBelow = currentPrice < nearestPrice;
  return Math.max(-2, Math.min(2, Math.round((isBelow ? -1 : 1) * factor * strength)));
}

function scoreVolumeProfile(closes: number[], volumes: number[], lookback = 20): number {
  if (!volumes || volumes.length < lookback || !volumes.some(v => v > 0)) return 0;
  const rc = closes.slice(-lookback);
  const rv = volumes.slice(-lookback);
  let upVol = 0, downVol = 0, upCount = 0, downCount = 0;
  for (let i = 1; i < rc.length; i++) {
    if (rc[i] > rc[i - 1]) { upVol += rv[i]; upCount++; }
    else if (rc[i] < rc[i - 1]) { downVol += rv[i]; downCount++; }
  }
  const avgUp = upCount > 0 ? upVol / upCount : 0;
  const avgDown = downCount > 0 ? downVol / downCount : 0;
  if (avgUp > 0 && avgDown > 0) {
    const ratio = avgUp / avgDown;
    if (ratio > 1.5) return 2;
    if (ratio < 0.67) return -2;
  }
  // Volume trend
  const avgVol = rv.reduce((a, b) => a + b, 0) / rv.length;
  const recentAvg = rv.slice(-5).reduce((a, b) => a + b, 0) / 5;
  const volTrend = avgVol > 0 ? (recentAvg - avgVol) / avgVol : 0;
  if (volTrend > 0.3) return rc[rc.length - 1] > rc[0] ? 1 : -1;
  if (volTrend < -0.3) return rc[rc.length - 1] > rc[0] ? -1 : 1;
  return 0;
}

function detectOBVDivergence(closes: number[], obv: number[], lookback = 20): number {
  if (closes.length < lookback || obv.length < lookback) return 0;
  const rc = closes.slice(-lookback);
  const ro = obv.slice(-lookback);
  const half = Math.floor(lookback / 2);
  const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;
  const pFirst = avg(rc.slice(0, half)), pSecond = avg(rc.slice(half));
  const oFirst = avg(ro.slice(0, half)), oSecond = avg(ro.slice(half));
  const pTrend = pSecond > pFirst ? 1 : -1;
  const oTrend = oSecond > oFirst ? 1 : -1;
  if (pTrend > 0 && oTrend < 0) return -1;
  if (pTrend < 0 && oTrend > 0) return 1;
  return 0;
}

function detectRSIDivergence(closes: number[], rsiValues: number[]): number {
  if (closes.length < 30 || rsiValues.length < 30) return 0;
  const len = Math.min(closes.length, 30);
  const c = closes.slice(-len);
  const r = rsiValues.slice(-len).map(v => (isNaN(v) ? 50 : v));

  const lows: { price: number; rsi: number }[] = [];
  for (let i = 2; i < len - 2; i++) {
    if (c[i] < c[i - 1] && c[i] < c[i - 2] && c[i] < c[i + 1] && c[i] < c[i + 2]) {
      lows.push({ price: c[i], rsi: r[i] });
    }
  }
  if (lows.length >= 2) {
    const [prev, curr] = lows.slice(-2);
    if (curr.price < prev.price && curr.rsi > prev.rsi) return 2; // bullish divergence
  }

  const highs: { price: number; rsi: number }[] = [];
  for (let i = 2; i < len - 2; i++) {
    if (c[i] > c[i - 1] && c[i] > c[i - 2] && c[i] > c[i + 1] && c[i] > c[i + 2]) {
      highs.push({ price: c[i], rsi: r[i] });
    }
  }
  if (highs.length >= 2) {
    const [prev, curr] = highs.slice(-2);
    if (curr.price > prev.price && curr.rsi < prev.rsi) return -2; // bearish divergence
  }
  return 0;
}

// ═══════════════════════════════════════════════════
//  FULL 15-INDICATOR SIGNAL SCORING
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

function analyseCloses(closes: number[], volumes?: number[]): AnalysisResult | null {
  if (closes.length < 15) return null;

  const currentPrice = closes[closes.length - 1];
  const sma20Arr = sma(closes, Math.min(20, closes.length - 1));
  const sma50Arr = sma(closes, Math.min(50, Math.max(Math.floor(closes.length * 0.6), 10)));
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

  // Trend strength
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

  // 4. RSI (with trend adjustment)
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

  // 8. OBV Divergence
  const hasVolume = volumes && volumes.length > 0 && volumes.some(v => v > 0);
  if (hasVolume) {
    const obv = calcOBV(closes, volumes!);
    score += detectOBVDivergence(closes, obv);
  }

  // 9. RSI/Price Divergence
  score += detectRSIDivergence(closes, rsiValues);

  // 10. Trend Strength bonus
  if (strongUptrend) score += 2;
  else if (strongDowntrend) score -= 2;

  // ═══ NEW: Market Structure Indicators ═══

  const atr = calcATR(closes);

  // 11. Market Structure (BOS / CHoCH)
  if (closes.length >= 20) {
    const swings = detectSwingPoints(closes, 3);
    const structBreak = detectStructureBreaks(closes, swings);
    if (structBreak) score += structBreak.score;

    // 12. Supply / Demand Zones
    if (atr > 0) {
      score += scoreSupplyDemandZones(closes, swings, atr);
    }
  }

  // 13. Fibonacci Levels
  score += scoreFibLevels(closes, atr);

  // 14. Volume Profile
  if (hasVolume) {
    score += scoreVolumeProfile(closes, volumes!, 20);
  }

  // Clamp to ±15 (expanded range for 15 indicators)
  score = Math.max(-15, Math.min(15, score));

  // Labels (calibrated for expanded range)
  let label: string;
  if (score >= 8) label = 'Strong Buy';
  else if (score >= 4) label = 'Buy';
  else if (score <= -8) label = 'Strong Sell';
  else if (score <= -4) label = 'Sell';
  else label = 'Hold';

  const confidence = Math.min(95, 40 + Math.abs(score) * 4);

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

  // Forecast
  const forecastDays = 30;
  const endPrice = currentPrice + slope * forecastDays;
  const forecastReturn = ((endPrice - currentPrice) / currentPrice) * 100;

  // Target / stop loss
  const atrEst = atr > 0 ? atr : closes.slice(-14).reduce((s, c, i, a) => i === 0 ? 0 : s + Math.abs(c - a[i - 1]), 0) / 13;
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
//  CROSS-TIMEFRAME DAMPENING
// ═══════════════════════════════════════════════════

const LABEL_SCORE_MAP: Record<string, number> = {
  'Strong Buy': 2, 'Buy': 1, 'Hold': 0, 'Sell': -1, 'Strong Sell': -2,
};

function applyCrossTimeframeDampening(
  analysis: AnalysisResult,
  currentTfDays: number,
  longerTfRows: { timeframe_days: number; signal_score: number | null; signal_label: string | null; confidence: number | null }[],
): AnalysisResult {
  const longer = longerTfRows.filter(r => r.timeframe_days > currentTfDays && r.signal_score !== null);
  if (longer.length === 0) return analysis;

  const isBullish = analysis.signal_score > 0;
  const isBearish = analysis.signal_score < 0;
  if (!isBullish && !isBearish) return analysis;

  let contradictions = 0;
  let lowConfCount = 0;

  for (const tf of longer) {
    const tfDir = (LABEL_SCORE_MAP[tf.signal_label ?? ''] ?? 0);
    if (isBullish && tfDir < 0) contradictions++;
    if (isBearish && tfDir > 0) contradictions++;
    if ((tf.confidence ?? 50) < 50) lowConfCount++;
  }

  let factor = 1;
  if (contradictions > 0) {
    const ratio = contradictions / longer.length;
    factor *= ratio >= 0.5 ? 0.5 : 0.75;
  }
  if (lowConfCount > 0 && contradictions === 0) {
    if (lowConfCount / longer.length >= 0.5) factor *= 0.8;
  }

  if (factor >= 1) return analysis;

  const adjustedScore = Math.max(-15, Math.min(15, Math.round(analysis.signal_score * factor)));

  let label: string;
  if (adjustedScore >= 8) label = 'Strong Buy';
  else if (adjustedScore >= 4) label = 'Buy';
  else if (adjustedScore <= -8) label = 'Strong Sell';
  else if (adjustedScore <= -4) label = 'Sell';
  else label = 'Hold';

  const confidence = Math.min(95, 40 + Math.abs(adjustedScore) * 4);

  return { ...analysis, signal_score: adjustedScore, signal_label: label, confidence };
}

// ═══════════════════════════════════════════════════
//  YAHOO FINANCE DATA FETCHING
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

interface ChartData { closes: number[]; volumes: number[]; }

async function fetchYahooChart(symbol: string, range = '3mo', interval = '1d'): Promise<ChartData> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${range}&interval=${interval}&includePrePost=false`;
  const res = await fetchWithRetry(url, {
    headers: { 'User-Agent': UA },
    signal: AbortSignal.timeout(12000),
  });
  if (!res.ok) throw new Error(`Yahoo ${res.status} for ${symbol}`);
  const data = await res.json();
  const result = data?.chart?.result?.[0];
  if (!result?.indicators?.quote?.[0]?.close) throw new Error(`No data for ${symbol}`);
  
  const rawCloses: (number | null)[] = result.indicators.quote[0].close;
  const rawVolumes: (number | null)[] = result.indicators.quote[0].volume || [];
  
  const closes: number[] = [];
  const volumes: number[] = [];
  for (let i = 0; i < rawCloses.length; i++) {
    const c = rawCloses[i];
    if (c != null && !isNaN(c)) {
      closes.push(c);
      volumes.push(rawVolumes[i] ?? 0);
    }
  }
  
  return { closes, volumes };
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

// ETF exchange configs — same regions but uses quoteType 'ETF'
const ETF_EXCHANGE_CONFIGS: Record<string, ExchangeConfig> = {
  ASX:    { region: 'au', suffix: '.AX', maxEquities: 500 },
  NYSE:   { region: 'us', exchangeFilter: 'PCX', suffix: '', maxEquities: 1000 },
  NASDAQ: { region: 'us', exchangeFilter: 'NMS', suffix: '', maxEquities: 500 },
};

// Curated ETF lists as fallback when screener returns 0
const CURATED_ETFS: Record<string, { sym: string; name: string }[]> = {
  ASX: [
    // Broad market
    { sym: 'VAS.AX', name: 'Vanguard Australian Shares' }, { sym: 'A200.AX', name: 'BetaShares ASX 200' },
    { sym: 'IOZ.AX', name: 'iShares Core S&P/ASX 200' }, { sym: 'STW.AX', name: 'SPDR S&P/ASX 200' },
    { sym: 'MVW.AX', name: 'VanEck Australian Equal Weight' }, { sym: 'QOZ.AX', name: 'BetaShares FTSE RAFI Aus 200' },
    { sym: 'EX20.AX', name: 'BetaShares ASX 200 Equal Weight' },
    // International shares
    { sym: 'VGS.AX', name: 'Vanguard MSCI Intl Shares' }, { sym: 'VGAD.AX', name: 'Vanguard MSCI Intl Hedged' },
    { sym: 'IVV.AX', name: 'iShares S&P 500' }, { sym: 'IHVV.AX', name: 'iShares S&P 500 Hedged' },
    { sym: 'NDQ.AX', name: 'BetaShares NASDAQ 100' }, { sym: 'HNDQ.AX', name: 'BetaShares NASDAQ 100 Hedged' },
    { sym: 'VTS.AX', name: 'Vanguard US Total Market' }, { sym: 'VEU.AX', name: 'Vanguard All-World ex-US' },
    { sym: 'QUAL.AX', name: 'VanEck MSCI Intl Quality' }, { sym: 'MOAT.AX', name: 'VanEck Morningstar Wide Moat' },
    { sym: 'IEM.AX', name: 'iShares MSCI Emerging Markets' }, { sym: 'VISM.AX', name: 'Vanguard MSCI Intl Small Companies' },
    { sym: 'WXOZ.AX', name: 'SPDR S&P World ex-Australia' },
    // Diversified / multi-asset
    { sym: 'VDHG.AX', name: 'Vanguard Diversified High Growth' }, { sym: 'DHHF.AX', name: 'BetaShares Diversified All Growth' },
    { sym: 'VDGR.AX', name: 'Vanguard Diversified Growth' }, { sym: 'VDBA.AX', name: 'Vanguard Diversified Balanced' },
    { sym: 'DBBF.AX', name: 'BetaShares Ethical Diversified Balanced' },
    // Income / dividends
    { sym: 'VHY.AX', name: 'Vanguard Australian Shares High Yield' }, { sym: 'SYI.AX', name: 'SPDR MSCI Australia Select High Dividend Yield' },
    { sym: 'HVST.AX', name: 'BetaShares Diversified Markets Income' }, { sym: 'IHD.AX', name: 'iShares S&P/ASX Dividend Opportunities' },
    { sym: 'RDIV.AX', name: 'Russell Investments High Dividend Australian Shares' },
    // Thematic / sector
    { sym: 'SEMI.AX', name: 'BetaShares Global Semiconductors' }, { sym: 'RBTZ.AX', name: 'BetaShares Global Robotics & AI' },
    { sym: 'HACK.AX', name: 'BetaShares Global Cybersecurity' }, { sym: 'FANG.AX', name: 'BetaShares FANG+' },
    { sym: 'ACDC.AX', name: 'ETFS Battery Tech & Lithium' }, { sym: 'CLNE.AX', name: 'BetaShares Climate Change Innovation' },
    { sym: 'DRIV.AX', name: 'BetaShares Electric Vehicles & Future Mobility' }, { sym: 'FUEL.AX', name: 'BetaShares Global Energy Companies' },
    { sym: 'FOOD.AX', name: 'BetaShares Global Agriculture' }, { sym: 'BNKS.AX', name: 'BetaShares Global Banks' },
    { sym: 'ASIA.AX', name: 'BetaShares Asia Technology Tigers' }, { sym: 'ETHI.AX', name: 'BetaShares Global Sustainability' },
    { sym: 'ERTH.AX', name: 'BetaShares Climate Change Innovation' }, { sym: 'DRUG.AX', name: 'BetaShares Global Healthcare' },
    { sym: 'CRYP.AX', name: 'BetaShares Crypto Innovators' }, { sym: 'MNRS.AX', name: 'BetaShares Global Gold Miners' },
    { sym: 'GEAR.AX', name: 'BetaShares Geared Australian Equity' }, { sym: 'BBOZ.AX', name: 'BetaShares Australian Equities Bear Hedge' },
    { sym: 'BBUS.AX', name: 'BetaShares US Equities Strong Bear Hedge' },
    // Fixed income / cash
    { sym: 'AAA.AX', name: 'BetaShares High Interest Cash' }, { sym: 'QPON.AX', name: 'BetaShares Aus Bank Sr Floating Rate Bond' },
    { sym: 'VAF.AX', name: 'Vanguard Australian Fixed Interest' }, { sym: 'VIF.AX', name: 'Vanguard Intl Fixed Interest' },
    { sym: 'IAF.AX', name: 'iShares Core Composite Bond' }, { sym: 'CRED.AX', name: 'BetaShares Australian Investment Grade Corp Bond' },
    { sym: 'HBRD.AX', name: 'BetaShares Active Australian Hybrids' }, { sym: 'FLOT.AX', name: 'VanEck Australian Floating Rate' },
    // Commodities
    { sym: 'GOLD.AX', name: 'ETFS Physical Gold' }, { sym: 'PMGOLD.AX', name: 'Perth Mint Gold' },
    { sym: 'QAU.AX', name: 'BetaShares Gold Bullion' }, { sym: 'OOO.AX', name: 'BetaShares Crude Oil Index' },
    // Property / REITs
    { sym: 'VAP.AX', name: 'Vanguard Australian Property Securities' }, { sym: 'MVA.AX', name: 'VanEck Australian Property' },
    { sym: 'SLF.AX', name: 'SPDR S&P/ASX 200 Listed Property' },
    // Small / mid cap
    { sym: 'MVS.AX', name: 'VanEck Small Companies Masters' }, { sym: 'SMLL.AX', name: 'BetaShares Australian Small Companies Select' },
    { sym: 'ISO.AX', name: 'iShares S&P/ASX Small Ordinaries' },
    // ESG
    { sym: 'FAIR.AX', name: 'BetaShares Australian Sustainability Leaders' }, { sym: 'VESG.AX', name: 'Vanguard Ethically Conscious Intl Shares' },
    // Currency hedged / other
    { sym: 'QHAL.AX', name: 'VanEck MSCI Intl Quality (Hedged)' },
    { sym: 'VBLD.AX', name: 'Vanguard Global Infrastructure' },
    { sym: 'IFRA.AX', name: 'VanEck FTSE Global Infrastructure (Hedged)' },
    { sym: 'GGUS.AX', name: 'BetaShares Geared US Equity' },
  ],
  NYSE: [
    { sym: 'SPY', name: 'SPDR S&P 500 ETF' }, { sym: 'VOO', name: 'Vanguard S&P 500 ETF' },
    { sym: 'IVV', name: 'iShares Core S&P 500' }, { sym: 'VTI', name: 'Vanguard Total Stock Market' },
    { sym: 'QQQ', name: 'Invesco QQQ Trust' }, { sym: 'VEA', name: 'Vanguard FTSE Developed Markets' },
    { sym: 'VWO', name: 'Vanguard FTSE Emerging Markets' }, { sym: 'BND', name: 'Vanguard Total Bond Market' },
    { sym: 'AGG', name: 'iShares Core US Aggregate Bond' }, { sym: 'GLD', name: 'SPDR Gold Shares' },
    { sym: 'TLT', name: 'iShares 20+ Year Treasury Bond' }, { sym: 'VIG', name: 'Vanguard Dividend Appreciation' },
    { sym: 'SCHD', name: 'Schwab US Dividend Equity' }, { sym: 'VNQ', name: 'Vanguard Real Estate' },
    { sym: 'IWM', name: 'iShares Russell 2000' }, { sym: 'EFA', name: 'iShares MSCI EAFE' },
    { sym: 'DIA', name: 'SPDR Dow Jones Industrial Average' }, { sym: 'XLF', name: 'Financial Select Sector SPDR' },
    { sym: 'XLK', name: 'Technology Select Sector SPDR' }, { sym: 'XLE', name: 'Energy Select Sector SPDR' },
    { sym: 'XLV', name: 'Health Care Select Sector SPDR' }, { sym: 'XLI', name: 'Industrial Select Sector SPDR' },
    { sym: 'XLP', name: 'Consumer Staples Select Sector SPDR' }, { sym: 'XLY', name: 'Consumer Discretionary Select Sector SPDR' },
    { sym: 'XLB', name: 'Materials Select Sector SPDR' }, { sym: 'XLU', name: 'Utilities Select Sector SPDR' },
    { sym: 'ARKK', name: 'ARK Innovation ETF' }, { sym: 'ARKG', name: 'ARK Genomic Revolution ETF' },
    { sym: 'VGT', name: 'Vanguard Information Technology' }, { sym: 'SMH', name: 'VanEck Semiconductor' },
    { sym: 'SOXX', name: 'iShares Semiconductor' }, { sym: 'KWEB', name: 'KraneShares CSI China Internet' },
    { sym: 'EEM', name: 'iShares MSCI Emerging Markets' }, { sym: 'HYG', name: 'iShares iBoxx High Yield Corp Bond' },
    { sym: 'LQD', name: 'iShares iBoxx Investment Grade Corp Bond' }, { sym: 'SLV', name: 'iShares Silver Trust' },
    { sym: 'USO', name: 'United States Oil Fund' }, { sym: 'IBIT', name: 'iShares Bitcoin Trust' },
    { sym: 'BITO', name: 'ProShares Bitcoin Strategy' }, { sym: 'TQQQ', name: 'ProShares UltraPro QQQ' },
  ],
  NASDAQ: [
    // Core index
    { sym: 'QQQ', name: 'Invesco QQQ Trust' }, { sym: 'QQQM', name: 'Invesco NASDAQ 100 ETF' },
    { sym: 'ONEQ', name: 'Fidelity NASDAQ Composite' },
    // Leveraged / inverse
    { sym: 'TQQQ', name: 'ProShares UltraPro QQQ' }, { sym: 'SQQQ', name: 'ProShares UltraPro Short QQQ' },
    { sym: 'QLD', name: 'ProShares Ultra QQQ' }, { sym: 'PSQ', name: 'ProShares Short QQQ' },
    // Thematic / sector
    { sym: 'ARKK', name: 'ARK Innovation ETF' }, { sym: 'ARKG', name: 'ARK Genomic Revolution ETF' },
    { sym: 'ARKW', name: 'ARK Next Generation Internet ETF' }, { sym: 'ARKF', name: 'ARK Fintech Innovation ETF' },
    { sym: 'ARKQ', name: 'ARK Autonomous Tech & Robotics ETF' },
    { sym: 'IBIT', name: 'iShares Bitcoin Trust' }, { sym: 'BITO', name: 'ProShares Bitcoin Strategy' },
    { sym: 'MSTR', name: 'MicroStrategy (Bitcoin proxy)' },
    // Semiconductor / tech
    { sym: 'SMH', name: 'VanEck Semiconductor ETF' }, { sym: 'SOXX', name: 'iShares Semiconductor ETF' },
    { sym: 'XSD', name: 'SPDR S&P Semiconductor ETF' }, { sym: 'SOXL', name: 'Direxion Daily Semiconductor Bull 3X' },
    { sym: 'SOXS', name: 'Direxion Daily Semiconductor Bear 3X' },
    // AI / robotics / cloud
    { sym: 'BOTZ', name: 'Global X Robotics & AI ETF' }, { sym: 'AIQ', name: 'Global X AI & Technology ETF' },
    { sym: 'ROBT', name: 'First Trust Nasdaq AI and Robotics ETF' }, { sym: 'WCLD', name: 'WisdomTree Cloud Computing ETF' },
    { sym: 'SKYY', name: 'First Trust Cloud Computing ETF' },
    // Clean energy / EV
    { sym: 'QCLN', name: 'First Trust NASDAQ Clean Edge Green Energy' }, { sym: 'DRIV', name: 'Global X Autonomous & Electric Vehicles ETF' },
    { sym: 'LIT', name: 'Global X Lithium & Battery Tech ETF' },
    // Biotech / healthcare
    { sym: 'IBB', name: 'iShares Biotechnology ETF' }, { sym: 'XBI', name: 'SPDR S&P Biotech ETF' },
    { sym: 'LABU', name: 'Direxion Daily S&P Biotech Bull 3X' },
    // Cybersecurity
    { sym: 'CIBR', name: 'First Trust NASDAQ Cybersecurity ETF' }, { sym: 'BUG', name: 'Global X Cybersecurity ETF' },
    // Dividend / income
    { sym: 'QYLD', name: 'Global X NASDAQ 100 Covered Call ETF' }, { sym: 'JEPQ', name: 'JPMorgan NASDAQ Equity Premium Income ETF' },
    // Growth / momentum
    { sym: 'QQQJ', name: 'Invesco NASDAQ Next Gen 100 ETF' }, { sym: 'QQEW', name: 'First Trust NASDAQ-100 Equal Weighted' },
    { sym: 'QTEC', name: 'First Trust NASDAQ-100 Technology Sector' },
    // Fixed income / alternatives
    { sym: 'TLT', name: 'iShares 20+ Year Treasury Bond ETF' }, { sym: 'SHY', name: 'iShares 1-3 Year Treasury Bond ETF' },
    { sym: 'HYG', name: 'iShares iBoxx High Yield Corp Bond ETF' },
    // Commodities
    { sym: 'GLD', name: 'SPDR Gold Shares' }, { sym: 'SLV', name: 'iShares Silver Trust' },
    { sym: 'USO', name: 'United States Oil Fund' },
  ],
};

async function fetchStockList(exchange: string, quoteType: 'EQUITY' | 'ETF' = 'EQUITY'): Promise<{ sym: string; name: string; divYield: number }[]> {
  const configs = quoteType === 'ETF' ? ETF_EXCHANGE_CONFIGS : EXCHANGE_CONFIGS;
  const config = configs[exchange];
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
          quoteType,
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
//  FOREX PAIRS (Frankfurter API — free, no auth)
// ═══════════════════════════════════════════════════

const FOREX_PAIRS = [
  // ── Majors ──
  { from: 'EUR', to: 'USD' }, { from: 'GBP', to: 'USD' }, { from: 'USD', to: 'JPY' },
  { from: 'USD', to: 'CHF' }, { from: 'USD', to: 'CAD' }, { from: 'AUD', to: 'USD' },
  { from: 'NZD', to: 'USD' },
  // ── Major crosses ──
  { from: 'EUR', to: 'GBP' }, { from: 'EUR', to: 'JPY' }, { from: 'EUR', to: 'CHF' },
  { from: 'EUR', to: 'AUD' }, { from: 'EUR', to: 'CAD' }, { from: 'EUR', to: 'NZD' },
  { from: 'GBP', to: 'JPY' }, { from: 'GBP', to: 'CHF' }, { from: 'GBP', to: 'AUD' },
  { from: 'GBP', to: 'CAD' }, { from: 'GBP', to: 'NZD' },
  { from: 'AUD', to: 'JPY' }, { from: 'AUD', to: 'NZD' }, { from: 'AUD', to: 'CAD' },
  { from: 'AUD', to: 'CHF' }, { from: 'AUD', to: 'GBP' }, { from: 'AUD', to: 'EUR' },
  { from: 'NZD', to: 'JPY' }, { from: 'NZD', to: 'CAD' }, { from: 'NZD', to: 'CHF' },
  { from: 'CAD', to: 'JPY' }, { from: 'CAD', to: 'CHF' },
  { from: 'CHF', to: 'JPY' },
  // ── Emerging / Asia-Pacific ──
  { from: 'USD', to: 'SGD' }, { from: 'USD', to: 'HKD' }, { from: 'USD', to: 'SEK' },
  { from: 'USD', to: 'NOK' }, { from: 'USD', to: 'DKK' }, { from: 'USD', to: 'PLN' },
  { from: 'USD', to: 'CZK' }, { from: 'USD', to: 'HUF' }, { from: 'USD', to: 'TRY' },
  { from: 'USD', to: 'ZAR' }, { from: 'USD', to: 'MXN' }, { from: 'USD', to: 'BRL' },
  { from: 'USD', to: 'INR' }, { from: 'USD', to: 'KRW' }, { from: 'USD', to: 'THB' },
  { from: 'USD', to: 'IDR' }, { from: 'USD', to: 'MYR' }, { from: 'USD', to: 'PHP' },
  { from: 'USD', to: 'CNY' }, { from: 'USD', to: 'ISK' }, { from: 'USD', to: 'BGN' },
  { from: 'USD', to: 'RON' }, { from: 'USD', to: 'ILS' },
  // ── Scandinavian crosses ──
  { from: 'EUR', to: 'SEK' }, { from: 'EUR', to: 'NOK' }, { from: 'EUR', to: 'DKK' },
  { from: 'NOK', to: 'SEK' },
  // ── EM crosses ──
  { from: 'EUR', to: 'TRY' }, { from: 'EUR', to: 'ZAR' }, { from: 'EUR', to: 'PLN' },
  { from: 'GBP', to: 'ZAR' }, { from: 'AUD', to: 'SGD' },
];

function fmtDate(d: Date): string { return d.toISOString().split('T')[0]; }

async function fetchForexChart(from: string, to: string, days: number): Promise<{ closes: number[] }> {
  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - days);
  const url = `https://api.frankfurter.app/${fmtDate(start)}..${fmtDate(end)}?from=${from}&to=${to}`;
  const res = await fetchWithRetry(url, { signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`Frankfurter ${res.status} for ${from}/${to}`);
  const data = await res.json();
  const rates: Record<string, Record<string, number>> = data.rates || {};
  const sortedDates = Object.keys(rates).sort();
  const closes: number[] = [];
  for (const date of sortedDates) {
    const rate = rates[date]?.[to];
    if (rate != null) closes.push(rate);
  }
  if (closes.length < 10) throw new Error(`Insufficient forex data for ${from}/${to}`);
  return { closes };
}

// ═══════════════════════════════════════════════════
//  CRYPTO LIST FETCHING (CMC primary, CoinGecko fallback)
// ═══════════════════════════════════════════════════

// CMC symbol → CoinGecko ID mapping for the skip-list & Yahoo ticker lookup
const CMC_SLUG_TO_GECKO: Record<string, string> = {
  'bitcoin': 'bitcoin', 'ethereum': 'ethereum', 'tether': 'tether',
  'xrp': 'ripple', 'bnb': 'binancecoin', 'solana': 'solana',
  'usd-coin': 'usd-coin', 'dogecoin': 'dogecoin', 'cardano': 'cardano',
  'tron': 'tron', 'chainlink': 'chainlink', 'avalanche': 'avalanche-2',
  'stellar': 'stellar', 'shiba-inu': 'shiba-inu', 'polkadot-new': 'polkadot',
  'hedera': 'hedera-hashgraph', 'toncoin': 'the-open-network',
  'sui': 'sui', 'litecoin': 'litecoin', 'bitcoin-cash': 'bitcoin-cash',
  'uniswap': 'uniswap', 'near-protocol': 'near', 'aptos': 'aptos',
  'aave': 'aave', 'internet-computer': 'internet-computer', 'cosmos': 'cosmos',
  'filecoin': 'filecoin', 'arbitrum': 'arbitrum', 'optimism-ethereum': 'optimism',
  'vechain': 'vechain', 'maker': 'maker', 'pepe': 'pepe',
  'render': 'render-token', 'kaspa': 'kaspa', 'ethereum-classic': 'ethereum-classic',
  'monero': 'monero', 'algorand': 'algorand', 'fantom': 'fantom',
  'the-graph': 'the-graph', 'lido-dao': 'lido-dao', 'injective': 'injective-protocol',
  'theta-network': 'theta-token', 'immutable-x': 'immutable-x', 'sei': 'sei-network',
  'celestia': 'celestia', 'mantle': 'mantle', 'bittensor': 'bittensor',
  'bonk1': 'bonk', 'floki-inu': 'floki', 'gala': 'gala',
  'ondo': 'ondo-finance', 'worldcoin': 'worldcoin-wld', 'pendle': 'pendle',
  'jupiter-exchange-solana': 'jupiter-exchange-solana', 'pyth-network': 'pyth-network',
  'hyperliquid': 'hyperliquid', 'pi-network': 'pi-network',
  'polygon-ecosystem-token': 'polygon-ecosystem-token', 'thorchain': 'thorchain',
  'eos': 'eos', 'flow': 'flow', 'mantra': 'mantra-dao', 'fetch': 'fetch-ai',
  'stacks': 'stacks', 'arweave': 'arweave', 'helium': 'helium',
  'official-trump': 'official-trump',
};

async function fetchCryptoListFromCMC(limit = 300): Promise<{ id: string; sym: string; name: string; price: number; change: number }[] | null> {
  const cmcKey = Deno.env.get('CMC_API_KEY');
  if (!cmcKey) return null;

  try {
    const url = `https://pro-api.coinmarketcap.com/v1/cryptocurrency/listings/latest?limit=${limit}&convert=USD`;
    const res = await fetchWithRetry(url, {
      headers: { 'X-CMC_PRO_API_KEY': cmcKey, 'Accept': 'application/json' },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) {
      console.warn(`[daily-analysis] CMC listings failed: ${res.status}`);
      return null;
    }
    const json = await res.json();
    const data = json?.data;
    if (!Array.isArray(data)) return null;

    console.log(`[daily-analysis] CMC returned ${data.length} coins (1 credit used)`);

    return data.map((c: any) => {
      const slug = c.slug || '';
      const geckoId = CMC_SLUG_TO_GECKO[slug] || slug; // fallback to slug
      return {
        id: geckoId,
        sym: c.symbol?.toUpperCase() || '',
        name: c.name || '',
        price: c.quote?.USD?.price || 0,
        change: c.quote?.USD?.percent_change_24h || 0,
      };
    });
  } catch (err: any) {
    console.warn('[daily-analysis] CMC fetch error:', err.message);
    return null;
  }
}

async function fetchCryptoListFromCoinGecko(limit = 300): Promise<{ id: string; sym: string; name: string; price: number; change: number }[]> {
  const all: any[] = [];
  const perPage = 250;
  const pages = Math.ceil(limit / perPage);

  for (let page = 1; page <= pages; page++) {
    const count = Math.min(perPage, limit - all.length);
    const url = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${count}&page=${page}&sparkline=false`;
    try {
      const res = await fetchWithRetry(url, {
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

async function fetchCryptoList(limit = 300): Promise<{ id: string; sym: string; name: string; price: number; change: number }[]> {
  // Try CMC first (1 credit, no rate-limit issues)
  const cmcResult = await fetchCryptoListFromCMC(limit);
  if (cmcResult && cmcResult.length > 0) return cmcResult;

  // Fallback to CoinGecko
  console.log('[daily-analysis] Falling back to CoinGecko for crypto list');
  return fetchCryptoListFromCoinGecko(limit);
}

// ═══════════════════════════════════════════════════
//  SKIP LIST — coins that consistently fail Yahoo lookups
// ═══════════════════════════════════════════════════

const SKIP_CRYPTO_IDS = new Set([
  // Stablecoins (pegged, no useful TA)
  'tether', 'usd-coin', 'dai', 'first-digital-usd', 'ethena-usde', 'usdd',
  'true-usd', 'pax-dollar', 'gemini-dollar', 'frax', 'usds', 'gho',
  'usual-usd', 'paypal-usd', 'eurc', 'eurs',
  // Wrapped / pegged tokens
  'wrapped-bitcoin', 'staked-ether', 'wrapped-steth', 'wrapped-eeth',
  'rocket-pool-eth', 'coinbase-wrapped-staked-eth', 'binance-peg-ethereum',
  'wrapped-bnb', 'wrapped-avax', 'wrapped-sol', 'wrapped-fantom',
  'bridged-usdc-polygon-pos-bridge', 'bridged-usdt',
  // Tokens with no Yahoo Finance data
  'hashnote-usyc', 'figure-heloc', 'ousg', 'ethena', 'jito-staked-sol',
  'mantle-staked-ether', 'susds', 'savings-dai', 'frax-ether',
  'binance-staked-sol', 'jupiter-staked-sol',
  // LP / vault / rebasing tokens
  'lido-staked-matic', 'staked-frax-ether', 'origins-steth',
]);

// ═══════════════════════════════════════════════════
//  GECKO ID → YAHOO TICKER MAP
// ═══════════════════════════════════════════════════

const GECKO_TO_YAHOO: Record<string, string> = {
  // Top 20
  'bitcoin': 'BTC-USD', 'ethereum': 'ETH-USD', 'ripple': 'XRP-USD',
  'binancecoin': 'BNB-USD', 'solana': 'SOL-USD', 'dogecoin': 'DOGE-USD',
  'cardano': 'ADA-USD', 'tron': 'TRX-USD', 'chainlink': 'LINK-USD',
  'avalanche-2': 'AVAX-USD', 'stellar': 'XLM-USD', 'shiba-inu': 'SHIB-USD',
  'polkadot': 'DOT-USD', 'hedera-hashgraph': 'HBAR-USD',
  'the-open-network': 'TON-USD', 'sui': 'SUI-USD',
  'litecoin': 'LTC-USD', 'bitcoin-cash': 'BCH-USD',
  // 21–50
  'uniswap': 'UNI-USD', 'near': 'NEAR-USD', 'aptos': 'APT-USD',
  'aave': 'AAVE-USD', 'internet-computer': 'ICP-USD', 'cosmos': 'ATOM-USD',
  'filecoin': 'FIL-USD', 'arbitrum': 'ARB-USD', 'optimism': 'OP-USD',
  'vechain': 'VET-USD', 'maker': 'MKR-USD', 'pepe': 'PEPE-USD',
  'render-token': 'RNDR-USD', 'kaspa': 'KAS-USD', 'ethereum-classic': 'ETC-USD',
  'monero': 'XMR-USD', 'algorand': 'ALGO-USD', 'fantom': 'FTM-USD',
  'the-graph': 'GRT-USD', 'lido-dao': 'LDO-USD', 'injective-protocol': 'INJ-USD',
  'theta-token': 'THETA-USD', 'immutable-x': 'IMX-USD', 'sei-network': 'SEI-USD',
  'celestia': 'TIA-USD', 'mantle': 'MNT-USD', 'bittensor': 'TAO-USD',
  // 51–100
  'bonk': 'BONK-USD', 'floki': 'FLOKI-USD', 'gala': 'GALA-USD',
  'ondo-finance': 'ONDO-USD', 'worldcoin-wld': 'WLD-USD', 'pendle': 'PENDLE-USD',
  'jupiter-exchange-solana': 'JUP-USD', 'pyth-network': 'PYTH-USD',
  'hyperliquid': 'HYPE-USD', 'pi-network': 'PI-USD',
  'polygon-ecosystem-token': 'POL-USD', 'matic-network': 'MATIC-USD',
  'thorchain': 'RUNE-USD', 'eos': 'EOS-USD', 'flow': 'FLOW-USD',
  'mantra-dao': 'OM-USD', 'fetch-ai': 'FET-USD',
  'artificial-superintelligence-alliance': 'FET-USD',
  'okb': 'OKB-USD', 'leo-token': 'LEO-USD',
  'stacks': 'STX-USD', 'arweave': 'AR-USD', 'helium': 'HNT-USD',
  'conflux-token': 'CFX-USD', 'oasis-network': 'ROSE-USD',
  'mina-protocol': 'MINA-USD', 'iotex': 'IOTX-USD',
  // Additional from screener
  '1inch': '1INCH-USD', 'dash': 'DASH-USD', 'neo': 'NEO-USD',
  'nexo': 'NEXO-USD', 'iota': 'IOTA-USD', 'sand': 'SAND-USD',
  'decentraland': 'MANA-USD', 'the-sandbox': 'SAND-USD',
  'axie-infinity': 'AXS-USD', 'quant-network': 'QNT-USD',
  'chiliz': 'CHZ-USD', 'enjincoin': 'ENJ-USD', 'curve-dao-token': 'CRV-USD',
  'compound-governance-token': 'COMP-USD', 'sushiswap': 'SUSHI-USD',
  'yearn-finance': 'YFI-USD', 'synthetix-network-token': 'SNX-USD',
  'illuvium': 'ILV-USD', 'rocket-pool': 'RPL-USD', 'ankr': 'ANKR-USD',
  'harmony': 'ONE-USD', 'zilliqa': 'ZIL-USD', 'ravencoin': 'RVN-USD',
  'zcash': 'ZEC-USD', 'basic-attention-token': 'BAT-USD', 'celo': 'CELO-USD',
  'loopring': 'LRC-USD', 'storj': 'STORJ-USD', 'skale': 'SKL-USD',
  'ocean-protocol': 'OCEAN-USD', 'mask-network': 'MASK-USD',
  'bitcoin-sv': 'BSV-USD', 'ecash': 'XEC-USD',
  // Meme & newer
  'official-trump': 'TRUMP-USD', 'fartcoin': 'FARTCOIN-USD',
  'flare-networks': 'FLR-USD', 'kaia': 'KAIA-USD', 'dexe': 'DEXE-USD',
  'amp-token': 'AMP-USD', 'sky': 'SKY-USD', 'syrup': 'SYRUP-USD',
};

function geckoToYahoo(geckoId: string, symbol?: string): string {
  if (GECKO_TO_YAHOO[geckoId]) return GECKO_TO_YAHOO[geckoId];
  // Use the symbol if it's clean (e.g. "FET" → "FET-USD")
  if (symbol && /^[A-Z0-9]{1,10}$/i.test(symbol)) {
    return `${symbol.toUpperCase()}-USD`;
  }
  // Only use geckoId if single word and short
  if (!geckoId.includes('-') && geckoId.length <= 8) {
    return `${geckoId.toUpperCase()}-USD`;
  }
  // Return empty to signal "skip this coin on Yahoo"
  return '';
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
  let bodyParams: Record<string, any> = {};
  try { bodyParams = await req.json(); } catch {}
  const assetType = url.searchParams.get('asset_type') || bodyParams.asset_type || 'stocks';
  const exchange = url.searchParams.get('exchange') || bodyParams.exchange || 'ASX';
  const offset = parseInt(url.searchParams.get('offset') || bodyParams.offset || '0');
  const batchSize = parseInt(url.searchParams.get('batch_size') || bodyParams.batch_size || String(BATCH_SIZE));
  const timeframeDays = parseInt(url.searchParams.get('timeframe') || bodyParams.timeframe || '90');
  // Queue for sequential orchestration: remaining combos to run after this one completes
  const queue: { type: string; tf: number; exchange?: string }[] = bodyParams.queue || [];

  const startTime = Date.now();
  const results = { processed: 0, succeeded: 0, failed: 0, skipped: 0 };

  console.log(`[daily-analysis] Starting: ${assetType}/${exchange} offset=${offset} batch=${batchSize} tf=${timeframeDays}d`);

  try {
    let assets: { id: string; sym: string; name: string; price?: number; change?: number; divYield?: number }[] = [];

    if (assetType === 'crypto') {
      const cryptoList = await fetchCryptoList(300);
      const before = cryptoList.length;
      const filtered = cryptoList.filter(c => !SKIP_CRYPTO_IDS.has(c.id));
      const skippedCount = before - filtered.length;
      if (skippedCount > 0) console.log(`[daily-analysis] Skipped ${skippedCount} stablecoins/wrapped tokens`);
      assets = filtered.map(c => ({ id: c.id, sym: c.sym, name: c.name, price: c.price, change: c.change, divYield: 0 }));
    } else if (assetType === 'forex') {
      assets = FOREX_PAIRS.map(p => ({ id: `${p.from}${p.to}`, sym: `${p.from}/${p.to}`, name: `${p.from}/${p.to}`, divYield: 0 }));
    } else if (assetType === 'etfs') {
      // 1. Try Yahoo screener
      let etfList = await fetchStockList(exchange, 'ETF');
      console.log(`[daily-analysis] Yahoo screener returned ${etfList.length} ETFs for ${exchange}`);

      // 2. Merge with DB-managed ETF list (additive, not fallback)
      try {
        const { data: etfConfig } = await db.from('app_config').select('value').eq('key', `etf_list_${exchange}`).maybeSingle();
        if (etfConfig?.value && Array.isArray(etfConfig.value)) {
          const dbEtfs = (etfConfig.value as any[]).map((e: any) => ({ sym: e.sym, name: e.name, divYield: 0 }));
          const existingSyms = new Set(etfList.map(e => e.sym));
          const newFromDb = dbEtfs.filter(e => !existingSyms.has(e.sym));
          etfList.push(...newFromDb);
          console.log(`[daily-analysis] Merged ${newFromDb.length} additional ETFs from DB for ${exchange}`);
        }
      } catch { /* ignore */ }

      // 3. Merge with hardcoded curated list (additive, not fallback)
      if (CURATED_ETFS[exchange]) {
        const existingSyms = new Set(etfList.map(e => e.sym));
        const newFromCurated = CURATED_ETFS[exchange].filter(e => !existingSyms.has(e.sym));
        etfList.push(...newFromCurated.map(e => ({ sym: e.sym, name: e.name, divYield: 0 })));
        console.log(`[daily-analysis] Merged ${newFromCurated.length} additional curated ETFs for ${exchange} (total: ${etfList.length})`);
      }

      assets = etfList.map(s => ({ id: s.sym, sym: s.sym, name: s.name, divYield: s.divYield }));
    } else {
      const stockList = await fetchStockList(exchange, 'EQUITY');
      assets = stockList.map(s => ({ id: s.sym, sym: s.sym, name: s.name, divYield: s.divYield }));
    }

    const totalAssets = assets.length;
    console.log(`[daily-analysis] Total assets: ${totalAssets}, processing offset ${offset}–${offset + batchSize}`);

    const batch = assets.slice(offset, offset + batchSize);

    const rangeMap: Record<number, string> = { 30: '1mo', 90: '3mo', 180: '6mo', 365: '1y' };
    const range = rangeMap[timeframeDays] || '3mo';

    for (const asset of batch) {
      results.processed++;
      try {
        let chartData: ChartData;
        if (assetType === 'forex') {
          const from = asset.id.slice(0, 3);
          const to = asset.id.slice(3, 6);
          const fxData = await fetchForexChart(from, to, timeframeDays);
          chartData = { closes: fxData.closes, volumes: [] };
        } else {
          const yahooTicker = assetType === 'crypto' ? geckoToYahoo(asset.id, asset.sym) : asset.sym;
          if (assetType === 'crypto' && !yahooTicker) { results.skipped++; continue; }
          chartData = await fetchYahooChart(yahooTicker, range);
        }

        if (chartData.closes.length < 20) {
          results.skipped++;
          continue;
        }

        let analysis = analyseCloses(chartData.closes, chartData.volumes);
        if (!analysis) {
          results.skipped++;
          continue;
        }

        // Cross-timeframe dampening
        try {
          const { data: otherTfs } = await db
            .from('daily_analysis_cache')
            .select('timeframe_days, signal_score, signal_label, confidence')
            .eq('asset_id', asset.id)
            .neq('timeframe_days', timeframeDays);
          if (otherTfs && otherTfs.length > 0) {
            analysis = applyCrossTimeframeDampening(analysis, timeframeDays, otherTfs);
          }
        } catch { /* proceed without dampening */ }

        const currentPrice = chartData.closes[chartData.closes.length - 1];
        const prevPrice = chartData.closes.length >= 2 ? chartData.closes[chartData.closes.length - 2] : currentPrice;
        const changePct = asset.change ?? ((currentPrice - prevPrice) / prevPrice) * 100;

        await db.from('daily_analysis_cache').upsert({
          asset_id: asset.id,
          symbol: asset.sym,
          name: asset.name,
          asset_type: assetType,
          exchange: (assetType === 'crypto' || assetType === 'forex') ? null : exchange,
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

      await new Promise(r => setTimeout(r, YAHOO_DELAY));
    }

    // Self-chain: if more assets remain, trigger next batch (pass queue along)
    const nextOffset = offset + batchSize;
    let chainedNext = false;

    if (nextOffset < totalAssets) {
      chainedNext = true;
      try {
        const chainRes = await fetch(`${supabaseUrl}/functions/v1/run-daily-analysis`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${serviceKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            asset_type: assetType,
            exchange,
            offset: nextOffset,
            batch_size: batchSize,
            timeframe: timeframeDays,
            queue,
          }),
        });
        console.log(`[daily-analysis] Chain → ${assetType} offset=${nextOffset} status=${chainRes.status}`);
      } catch (err: any) {
        console.warn('[daily-analysis] Chain failed:', err.message);
      }
    } else if (queue.length > 0) {
      // This asset_type+timeframe combo is COMPLETE — pick up next from queue
      const next = queue[0];
      const remaining = queue.slice(1);
      console.log(`[daily-analysis] ✓ ${assetType}/${timeframeDays}d complete → next: ${next.type}/${next.tf}d (${remaining.length} remaining in queue)`);
      try {
        const chainRes = await fetch(`${supabaseUrl}/functions/v1/run-daily-analysis`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${serviceKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            asset_type: next.type,
            exchange: next.exchange || 'ASX',
            offset: 0,
            timeframe: next.tf,
            queue: remaining,
          }),
        });
        console.log(`[daily-analysis] Queue chain → ${next.type}/${next.exchange || 'ASX'}/${next.tf}d status=${chainRes.status}`);
      } catch (err: any) {
        console.warn('[daily-analysis] Queue chain failed:', err.message);
      }
    } else {
      console.log(`[daily-analysis] ✅ ALL DONE — no more items in queue`);
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    const queueInfo = queue.length > 0 ? ` [queue: ${queue.length} remaining]` : '';
    const summary = `${assetType}/${exchange} [${offset}–${offset + batch.length}/${totalAssets}] in ${elapsed}s — OK:${results.succeeded} Fail:${results.failed} Skip:${results.skipped}${chainedNext ? ' → chaining next batch' : ' ✓ COMPLETE'}${queueInfo}`;
    console.log(`[daily-analysis] ${summary}`);

    return new Response(
      JSON.stringify({ success: true, summary, results, nextOffset: chainedNext ? nextOffset : null, has_more: chainedNext }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('[daily-analysis] Fatal error:', error);
    // If we have a queue and this failed, try to continue with the next item
    try {
      if (queue.length > 0) {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const next = queue[0];
        const remaining = queue.slice(1);
        console.warn(`[daily-analysis] Recovering from error — skipping to next queue item: ${next.type}/${next.tf}d`);
        await fetch(`${supabaseUrl}/functions/v1/run-daily-analysis`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${serviceKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ asset_type: next.type, exchange: next.exchange || 'ASX', offset: 0, timeframe: next.tf, queue: remaining }),
        }).catch(() => {});
      }
    } catch { /* ignore recovery errors */ }
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
