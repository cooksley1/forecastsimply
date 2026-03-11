import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
const BATCH_SIZE = 40;
const YAHOO_DELAY = 150;

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
  const res = await fetch(url, {
    headers: { 'User-Agent': UA },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`Yahoo ${res.status} for ${symbol}`);
  const data = await res.json();
  const result = data?.chart?.result?.[0];
  if (!result?.indicators?.quote?.[0]?.close) throw new Error(`No data for ${symbol}`);
  
  const rawCloses: (number | null)[] = result.indicators.quote[0].close;
  const rawVolumes: (number | null)[] = result.indicators.quote[0].volume || [];
  
  // Filter out nulls, keeping closes and volumes aligned
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
  let bodyParams: Record<string, any> = {};
  try { bodyParams = await req.json(); } catch {}
  const assetType = url.searchParams.get('asset_type') || bodyParams.asset_type || 'stocks';
  const exchange = url.searchParams.get('exchange') || bodyParams.exchange || 'ASX';
  const offset = parseInt(url.searchParams.get('offset') || bodyParams.offset || '0');
  const batchSize = parseInt(url.searchParams.get('batch_size') || bodyParams.batch_size || String(BATCH_SIZE));
  const timeframeDays = parseInt(url.searchParams.get('timeframe') || bodyParams.timeframe || '90');

  const startTime = Date.now();
  const results = { processed: 0, succeeded: 0, failed: 0, skipped: 0 };

  console.log(`[daily-analysis] Starting: ${assetType}/${exchange} offset=${offset} batch=${batchSize} tf=${timeframeDays}d`);

  try {
    let assets: { id: string; sym: string; name: string; price?: number; change?: number; divYield?: number }[] = [];

    if (assetType === 'crypto') {
      const cryptoList = await fetchCryptoList(300);
      assets = cryptoList.map(c => ({ id: c.id, sym: c.sym, name: c.name, price: c.price, change: c.change, divYield: 0 }));
    } else {
      const stockList = await fetchStockList(exchange);
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
        const yahooTicker = assetType === 'crypto' ? geckoToYahoo(asset.id) : asset.sym;
        const chartData = await fetchYahooChart(yahooTicker, range);

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

      await new Promise(r => setTimeout(r, YAHOO_DELAY));
    }

    // Self-chain: if more assets remain, trigger next batch
    const nextOffset = offset + batchSize;
    let chainedNext = false;

    if (nextOffset < totalAssets) {
      chainedNext = true;
      const nextUrl = `${supabaseUrl}/functions/v1/run-daily-analysis?asset_type=${assetType}&exchange=${exchange}&offset=${nextOffset}&batch_size=${batchSize}&timeframe=${timeframeDays}`;
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
