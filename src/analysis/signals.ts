import type { Signal, SignalLabel, SignalColor } from '@/types/analysis';
import type { Indicators } from '@/types/analysis';
import type { AssetType } from '@/types/assets';

function avg(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function detectOBVDivergence(closes: number[], obv: number[], lookback = 20): number {
  if (closes.length < lookback || obv.length < lookback) return 0;

  const recentCloses = closes.slice(-lookback);
  const recentOBV = obv.slice(-lookback);
  const halfLen = Math.floor(lookback / 2);

  const priceFirst = avg(recentCloses.slice(0, halfLen));
  const priceSecond = avg(recentCloses.slice(halfLen));
  const obvFirst = avg(recentOBV.slice(0, halfLen));
  const obvSecond = avg(recentOBV.slice(halfLen));

  const priceTrend = priceSecond > priceFirst ? 1 : -1;
  const obvTrend = obvSecond > obvFirst ? 1 : -1;

  // Bearish divergence: price rising but OBV falling
  if (priceTrend > 0 && obvTrend < 0) return -1;
  // Bullish divergence: price falling but OBV rising
  if (priceTrend < 0 && obvTrend > 0) return 1;

  return 0;
}

export function computeSignal(
  indicators: Indicators,
  currentPrice: number,
  closes?: number[],
  volumes?: number[],
  assetType?: AssetType,
): Signal {
  let score = 0;
  const { currentRsi, sma20, sma50, bbUpper, bbLower, macdHistogram, stochasticK, obv, vwap, sma200 } = indicators;

  // RSI
  if (currentRsi < 25) score += 3;
  else if (currentRsi < 35) score += 1;
  else if (currentRsi > 75) score -= 3;
  else if (currentRsi > 65) score -= 1;

  // Price vs SMAs
  const lastSma20 = sma20.filter(v => !isNaN(v)).pop();
  const lastSma50 = sma50.filter(v => !isNaN(v)).pop();

  if (lastSma20 && currentPrice > lastSma20) score += 1;
  else if (lastSma20 && currentPrice < lastSma20) score -= 1;

  if (lastSma50 && currentPrice > lastSma50) score += 1;
  else if (lastSma50 && currentPrice < lastSma50) score -= 1;

  // Golden/Death cross
  if (lastSma20 && lastSma50 && lastSma20 > lastSma50) score += 1;
  else if (lastSma20 && lastSma50 && lastSma20 < lastSma50) score -= 1;

  // BB position
  const lastBBU = bbUpper.filter(v => !isNaN(v)).pop();
  const lastBBL = bbLower.filter(v => !isNaN(v)).pop();
  if (lastBBU && lastBBL) {
    const bbPos = (currentPrice - lastBBL) / (lastBBU - lastBBL);
    if (bbPos < 0.15) score += 1;
    else if (bbPos > 0.85) score -= 1;
  }

  // MACD
  const lastHist = macdHistogram.filter(v => !isNaN(v));
  if (lastHist.length >= 2) {
    if (lastHist[lastHist.length - 1] > lastHist[lastHist.length - 2]) score += 1;
    else score -= 1;
  }

  // Stochastic
  const lastK = stochasticK.filter(v => !isNaN(v)).pop();
  if (lastK !== undefined) {
    if (lastK < 20) score += 1;
    else if (lastK > 80) score -= 1;
  }

  // OBV divergence (if volumes available)
  if (obv && obv.length > 0 && closes && volumes && volumes.some(v => v > 0)) {
    const obvScore = detectOBVDivergence(closes, obv);
    score += obvScore;
  }

  // VWAP (stocks & ETFs only)
  if ((assetType === 'stocks' || assetType === 'etfs') && vwap && vwap.length > 0) {
    const currentVWAP = vwap[vwap.length - 1];
    if (currentPrice > currentVWAP * 1.005) score += 1;
    else if (currentPrice < currentVWAP * 0.995) score -= 1;
  }

  // Trend-Strength Override: dampen bearish signals during strong uptrends
  // and boost during strong downtrends (per ensemble weighting recommendations)
  if (lastSma20 && lastSma50 && closes && closes.length >= 20) {
    const sma20Rising = sma20.length >= 5 && sma20[sma20.length - 1] > sma20[sma20.length - 5];
    const sma50Rising = sma50.length >= 5 && sma50[sma50.length - 1] > sma50[sma50.length - 5];
    const strongUptrend = lastSma20 > lastSma50 && sma20Rising && sma50Rising;
    const strongDowntrend = lastSma20 < lastSma50 && !sma20Rising && !sma50Rising;

    if (strongUptrend && score < 0) {
      // Halve bearish influence and add trend bonus during strong uptrends
      score = Math.round(score * 0.5) + 2;
    } else if (strongDowntrend && score > 0) {
      // Halve bullish influence during strong downtrends
      score = Math.round(score * 0.5) - 2;
    }
  }

  // Clamp
  score = Math.max(-10, Math.min(10, score));

  let label: SignalLabel;
  let color: SignalColor;
  if (score >= 6) { label = 'Strong Buy'; color = 'green'; }
  else if (score >= 2) { label = 'Buy'; color = 'green'; }
  else if (score <= -6) { label = 'Strong Sell'; color = 'red'; }
  else if (score <= -2) { label = 'Sell'; color = 'red'; }
  else { label = 'Hold'; color = 'amber'; }

  const confidence = Math.min(95, 45 + Math.abs(score) * 5);

  return { score, label, color, confidence };
}
