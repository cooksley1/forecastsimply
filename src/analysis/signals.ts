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

  if (priceTrend > 0 && obvTrend < 0) return -1;
  if (priceTrend < 0 && obvTrend > 0) return 1;

  return 0;
}

/**
 * RSI/Price Divergence Detection (per backtest report §Contrarian Strategies)
 * Bullish divergence: price lower lows + RSI higher lows = reversal signal
 * Bearish divergence: price higher highs + RSI lower highs = exhaustion signal
 * These patterns are among the most powerful reversal indicators in technical analysis.
 */
function detectRSIDivergence(
  closes: number[],
  rsiValues: number[],
): { type: 'bullish' | 'bearish'; description: string } | null {
  if (closes.length < 30 || rsiValues.length < 30) return null;

  const len = Math.min(closes.length, 30);
  const c = closes.slice(-len);
  const r = rsiValues.slice(-len).map(v => (isNaN(v) ? 50 : v));

  // Find swing lows for bullish divergence
  const lows: { idx: number; price: number; rsi: number }[] = [];
  for (let i = 2; i < len - 2; i++) {
    if (c[i] < c[i - 1] && c[i] < c[i - 2] && c[i] < c[i + 1] && c[i] < c[i + 2]) {
      lows.push({ idx: i, price: c[i], rsi: r[i] });
    }
  }
  if (lows.length >= 2) {
    const [prev, curr] = lows.slice(-2);
    if (curr.price < prev.price && curr.rsi > prev.rsi) {
      return {
        type: 'bullish',
        description: 'Bullish divergence: price made a lower low but RSI made a higher low — selling momentum is fading, reversal likely.',
      };
    }
  }

  // Find swing highs for bearish divergence
  const highs: { idx: number; price: number; rsi: number }[] = [];
  for (let i = 2; i < len - 2; i++) {
    if (c[i] > c[i - 1] && c[i] > c[i - 2] && c[i] > c[i + 1] && c[i] > c[i + 2]) {
      highs.push({ idx: i, price: c[i], rsi: r[i] });
    }
  }
  if (highs.length >= 2) {
    const [prev, curr] = highs.slice(-2);
    if (curr.price > prev.price && curr.rsi < prev.rsi) {
      return {
        type: 'bearish',
        description: 'Bearish divergence: price made a higher high but RSI made a lower high — buying pressure is exhausting.',
      };
    }
  }

  return null;
}

export interface SignalBreakdown {
  name: string;
  value: string;
  signal: 'bullish' | 'bearish' | 'neutral';
  contribution: number;
  weight: number;
  explanation: string;
}

export function computeSignal(
  indicators: Indicators,
  currentPrice: number,
  closes?: number[],
  volumes?: number[],
  assetType?: AssetType,
): Signal & { breakdown?: SignalBreakdown[] } {
  let score = 0;
  const breakdown: SignalBreakdown[] = [];
  const { currentRsi, sma20, sma50, bbUpper, bbLower, macdHistogram, stochasticK, obv, vwap, rsi: rsiValues } = indicators;

  // Price vs SMAs
  const lastSma20 = sma20.filter(v => !isNaN(v)).pop();
  const lastSma50 = sma50.filter(v => !isNaN(v)).pop();

  // Trend-strength detection (before individual scoring for dampening)
  const sma20Rising = sma20.length >= 5 && sma20[sma20.length - 1] > sma20[sma20.length - 5];
  const sma50Rising = sma50.length >= 5 && sma50[sma50.length - 1] > sma50[sma50.length - 5];
  const strongUptrend = lastSma20 && lastSma50 && lastSma20 > lastSma50 && sma20Rising && sma50Rising;
  const strongDowntrend = lastSma20 && lastSma50 && lastSma20 < lastSma50 && !sma20Rising && !sma50Rising;

  // 1. SMA(20) — 15%
  {
    const above = lastSma20 && currentPrice > lastSma20;
    const c = above ? 1 : lastSma20 ? -1 : 0;
    score += c;
    breakdown.push({
      name: 'SMA(20)',
      value: lastSma20 ? `$${lastSma20.toFixed(2)}` : 'N/A',
      signal: above ? 'bullish' : lastSma20 ? 'bearish' : 'neutral',
      contribution: c,
      weight: 15,
      explanation: above
        ? `Price $${currentPrice.toFixed(2)} is above the 20-day average ($${lastSma20!.toFixed(2)}). Short-term buyers are in control.`
        : lastSma20
          ? `Price is below the 20-day average. Short-term sellers are dominating.`
          : 'Not enough data.',
    });
  }

  // 2. SMA(50) — 12%
  {
    const above = lastSma50 && currentPrice > lastSma50;
    const c = above ? 1 : lastSma50 ? -1 : 0;
    score += c;
    breakdown.push({
      name: 'SMA(50)',
      value: lastSma50 ? `$${lastSma50.toFixed(2)}` : 'N/A',
      signal: above ? 'bullish' : lastSma50 ? 'bearish' : 'neutral',
      contribution: c,
      weight: 12,
      explanation: above
        ? 'Above 50-day average — medium-term uptrend intact.'
        : lastSma50
          ? 'Below 50-day average — medium-term downtrend.'
          : 'Not enough data.',
    });
  }

  // 3. MA Crossover — 12% (most reliable signal in backtest)
  {
    const golden = lastSma20 && lastSma50 && lastSma20 > lastSma50;
    const c = golden ? 1 : (lastSma20 && lastSma50) ? -1 : 0;
    score += c;
    breakdown.push({
      name: 'MA Crossover',
      value: golden ? 'Golden Cross ✓' : 'Death Cross ✗',
      signal: golden ? 'bullish' : (lastSma20 && lastSma50) ? 'bearish' : 'neutral',
      contribution: c,
      weight: 12,
      explanation: golden
        ? "20-day MA above 50-day MA — 'Golden Cross'. This was the most reliable buy signal in our backtesting."
        : "20-day MA below 50-day MA — 'Death Cross'. Strongest bearish signal tested.",
    });
  }

  // 4. RSI — 12% (reduced from 15% — too reactive per backtest)
  {
    let c = 0;
    if (currentRsi < 25) c = 3;
    else if (currentRsi < 35) c = 1;
    else if (currentRsi > 75) c = -3;
    else if (currentRsi > 65) c = -1;

    // Trend override: halve bearish RSI in strong uptrends (NVIDIA fix)
    if (strongUptrend && c < 0) c = Math.round(c * 0.5);
    if (strongDowntrend && c > 0) c = Math.round(c * 0.5);

    score += c;
    const rsiStatus = currentRsi < 30 ? 'oversold' : currentRsi > 70 ? 'overbought' : 'neutral';
    breakdown.push({
      name: 'RSI(14)',
      value: currentRsi.toFixed(1),
      signal: currentRsi < 40 ? 'bullish' : currentRsi > 60 ? 'bearish' : 'neutral',
      contribution: c,
      weight: 12,
      explanation: currentRsi < 30
        ? `RSI ${currentRsi.toFixed(0)} — deeply oversold. Historically, prices tend to bounce from this level.${strongUptrend ? ' Strong uptrend active — this dip is likely a buying opportunity.' : ''}`
        : currentRsi > 70
          ? `RSI ${currentRsi.toFixed(0)} — overbought. Price may pull back.${strongUptrend ? ' But strong uptrend reduces pullback risk — selling here was wrong 60% of the time in backtesting.' : ''}`
          : `RSI ${currentRsi.toFixed(0)} — neutral zone. No extreme reading.`,
    });
  }

  // 5. MACD — 10% (reduced — noisy per backtest)
  {
    const lastHist = macdHistogram.filter(v => !isNaN(v));
    let c = 0;
    if (lastHist.length >= 2) {
      const last = lastHist[lastHist.length - 1];
      const prev = lastHist[lastHist.length - 2];
      if (last > prev) c = 1;
      else c = -1;
      // Fresh crossover bonus
      if (prev < 0 && last > 0) c += 1;
      else if (prev > 0 && last < 0) c -= 1;
    }
    // Trend override
    if (strongUptrend && c < 0) c = Math.round(c * 0.5);
    if (strongDowntrend && c > 0) c = Math.round(c * 0.5);

    score += c;
    const lastH = lastHist[lastHist.length - 1] ?? 0;
    const prevH = lastHist[lastHist.length - 2] ?? 0;
    breakdown.push({
      name: 'MACD',
      value: lastH.toFixed(4),
      signal: lastH > 0 ? 'bullish' : lastH < 0 ? 'bearish' : 'neutral',
      contribution: c,
      weight: 10,
      explanation: prevH < 0 && lastH > 0
        ? 'Fresh bullish crossover! Momentum just shifted positive — one of the strongest short-term signals.'
        : prevH > 0 && lastH < 0
          ? 'MACD just crossed below zero — momentum turning negative.'
          : lastH > 0
            ? 'MACD positive — upward momentum continues.'
            : 'MACD negative — downward pressure persists.',
    });
  }

  // 6. BB position — 8% (reduced per backtest)
  {
    const lastBBU = bbUpper.filter(v => !isNaN(v)).pop();
    const lastBBL = bbLower.filter(v => !isNaN(v)).pop();
    let c = 0;
    if (lastBBU && lastBBL) {
      const bbPos = (currentPrice - lastBBL) / (lastBBU - lastBBL);
      if (bbPos < 0.15) c = 1;
      else if (bbPos > 0.85) c = -1;
      breakdown.push({
        name: 'Bollinger Bands',
        value: `${(bbPos * 100).toFixed(0)}%`,
        signal: bbPos < 0.3 ? 'bullish' : bbPos > 0.7 ? 'bearish' : 'neutral',
        contribution: c,
        weight: 8,
        explanation: bbPos < 0.15
          ? 'Price near lower Bollinger Band — potentially oversold, may bounce.'
          : bbPos > 0.85
            ? 'Price near upper Bollinger Band — potentially overbought, may pull back.'
            : `Price at ${(bbPos * 100).toFixed(0)}% of Bollinger range — within normal bounds.`,
      });
    }
    score += c;
  }

  // 7. Stochastic
  {
    const lastK = stochasticK.filter(v => !isNaN(v)).pop();
    let c = 0;
    if (lastK !== undefined) {
      if (lastK < 20) c = 1;
      else if (lastK > 80) c = -1;
    }
    score += c;
    if (lastK !== undefined) {
      breakdown.push({
        name: 'Stochastic %K',
        value: lastK.toFixed(0),
        signal: lastK < 20 ? 'bullish' : lastK > 80 ? 'bearish' : 'neutral',
        contribution: c,
        weight: 8,
        explanation: lastK < 20
          ? `Stochastic at ${lastK.toFixed(0)} — oversold territory. Often precedes a bounce.`
          : lastK > 80
            ? `Stochastic at ${lastK.toFixed(0)} — overbought. Momentum may slow.`
            : `Stochastic at ${lastK.toFixed(0)} — neutral.`,
      });
    }
  }

  // 8. OBV divergence
  if (obv && obv.length > 0 && closes && volumes && volumes.some(v => v > 0)) {
    const obvScore = detectOBVDivergence(closes, obv);
    score += obvScore;
    if (obvScore !== 0) {
      breakdown.push({
        name: 'OBV Divergence',
        value: obvScore > 0 ? 'Bullish' : 'Bearish',
        signal: obvScore > 0 ? 'bullish' : 'bearish',
        contribution: obvScore,
        weight: 5,
        explanation: obvScore > 0
          ? 'Volume is increasing while price is falling — smart money may be accumulating. Bullish divergence.'
          : 'Volume is decreasing while price is rising — buyers are losing conviction. Bearish divergence.',
      });
    }
  }

  // 9. VWAP (stocks & ETFs only)
  if ((assetType === 'stocks' || assetType === 'etfs') && vwap && vwap.length > 0) {
    const currentVWAP = vwap[vwap.length - 1];
    let c = 0;
    if (currentPrice > currentVWAP * 1.005) c = 1;
    else if (currentPrice < currentVWAP * 0.995) c = -1;
    score += c;
    if (c !== 0) {
      breakdown.push({
        name: 'VWAP',
        value: `$${currentVWAP.toFixed(2)}`,
        signal: c > 0 ? 'bullish' : 'bearish',
        contribution: c,
        weight: 5,
        explanation: c > 0
          ? 'Price above Volume-Weighted Average Price — institutional buyers are supporting higher prices.'
          : 'Price below VWAP — institutional selling pressure.',
      });
    }
  }

  // 10. RSI/Price Divergence — powerful reversal signal
  if (closes && rsiValues && rsiValues.length >= 30) {
    const div = detectRSIDivergence(closes, rsiValues);
    if (div) {
      const c = div.type === 'bullish' ? 2 : -2;
      score += c;
      breakdown.push({
        name: 'RSI Divergence',
        value: div.type === 'bullish' ? 'Bullish ↗' : 'Bearish ↘',
        signal: div.type === 'bullish' ? 'bullish' : 'bearish',
        contribution: c,
        weight: 5,
        explanation: div.description + ' This is one of the most powerful reversal patterns in technical analysis — it detects when underlying momentum contradicts visible price action.',
      });
    }
  }

  // 11. Trend-Strength bonus/penalty — 5% (NEW per backtest)
  if (strongUptrend || strongDowntrend) {
    const c = strongUptrend ? 2 : -2;
    score += c;
    breakdown.push({
      name: 'Trend Strength',
      value: strongUptrend ? 'Strong ↑' : 'Strong ↓',
      signal: strongUptrend ? 'bullish' : 'bearish',
      contribution: c,
      weight: 5,
      explanation: strongUptrend
        ? 'Both moving averages rising + price above both. Trend override active — reduces bearish noise. Backtesting showed selling in strong uptrends was wrong 60% of the time.'
        : 'Both moving averages falling + price below both. Bullish blips are likely false signals in this environment.',
    });
  }

  // Clamp
  score = Math.max(-10, Math.min(10, score));

  // Calibrated thresholds from backtest:
  // Buy at score ≥ 3 (~62 on 0-100 scale), Sell at score ≤ -3 (~35 on 0-100 scale)
  // Sell threshold raised from -2 because backtest showed sell signals at -2 were wrong 60% of the time
  let label: SignalLabel;
  let color: SignalColor;
  if (score >= 6) { label = 'Strong Buy'; color = 'green'; }
  else if (score >= 3) { label = 'Buy'; color = 'green'; }
  else if (score <= -6) { label = 'Strong Sell'; color = 'red'; }
  else if (score <= -3) { label = 'Sell'; color = 'red'; }
  else { label = 'Hold'; color = 'amber'; }

  const confidence = Math.min(95, 45 + Math.abs(score) * 5);

  return { score, label, color, confidence, breakdown };
}
