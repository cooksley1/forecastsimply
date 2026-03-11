import type { Recommendation, Signal, Indicators, NamedForecast, SignalColor } from '@/types/analysis';
import type { AssetType } from '@/types/assets';

// ════════════════════════════════════════════════════════════════
// 1. INDICATOR SIGNAL EXTRACTION  (+1 / 0 / -1 per indicator)
// ════════════════════════════════════════════════════════════════

interface IndicatorSignals {
  rsi: number;
  macd: number;
  emaCross: number;
  volume: number;
  volatility: number;
}

function extractSignals(ind: Indicators, currentPrice: number): IndicatorSignals {
  // RSI
  let rsiSig = 0;
  if (ind.currentRsi < 30) rsiSig = 1;
  else if (ind.currentRsi > 70) rsiSig = -1;

  // MACD histogram direction
  const macdHist = ind.macdHistogram.filter(v => !isNaN(v));
  let macdSig = 0;
  if (macdHist.length >= 2) {
    const last = macdHist[macdHist.length - 1];
    const prev = macdHist[macdHist.length - 2];
    if (last > 0 && last > prev) macdSig = 1;
    else if (last < 0 && last < prev) macdSig = -1;
  }

  // EMA / SMA cross
  const lastSma20 = ind.sma20.filter(v => !isNaN(v)).pop();
  const lastSma50 = ind.sma50.filter(v => !isNaN(v)).pop();
  let emaSig = 0;
  if (lastSma20 && lastSma50) {
    if (lastSma20 > lastSma50 && currentPrice > lastSma20) emaSig = 1;
    else if (lastSma20 < lastSma50 && currentPrice < lastSma20) emaSig = -1;
  }

  // Volume (OBV trend)
  let volSig = 0;
  if (ind.obv && ind.obv.length > 20) {
    const half = Math.floor(ind.obv.length / 2);
    const start = Math.max(0, half - 10);
    const firstAvg = ind.obv.slice(start, half).reduce((a, b) => a + b, 0) / Math.max(1, half - start);
    const secondAvg = ind.obv.slice(-10).reduce((a, b) => a + b, 0) / 10;
    if (secondAvg > firstAvg * 1.05) volSig = 1;
    else if (secondAvg < firstAvg * 0.95) volSig = -1;
  }

  // Volatility (ATR-based — low vol = stable = slight bullish, high vol = bearish bias)
  let volaSig = 0;
  if (ind.atr && ind.atr.length > 0) {
    const lastAtr = ind.atr.filter(v => !isNaN(v)).pop();
    if (lastAtr && currentPrice > 0) {
      const atrPct = lastAtr / currentPrice;
      if (atrPct < 0.015) volaSig = 1;
      else if (atrPct > 0.04) volaSig = -1;
    }
  }

  return { rsi: rsiSig, macd: macdSig, emaCross: emaSig, volume: volSig, volatility: volaSig };
}

// ════════════════════════════════════════════════════════════════
// 2. WEIGHTED TREND SCORE  (-100 → +100)
// ════════════════════════════════════════════════════════════════

const WEIGHTS: Record<string, { rsi: number; macd: number; ema: number; volume: number; volatility: number }> = {
  short: { rsi: 0.30, macd: 0.30, ema: 0.20, volume: 0.10, volatility: 0.10 },
  mid:   { rsi: 0.25, macd: 0.25, ema: 0.25, volume: 0.15, volatility: 0.10 },
  long:  { rsi: 0.20, macd: 0.20, ema: 0.30, volume: 0.15, volatility: 0.15 },
};

function computeTrendScore(signals: IndicatorSignals, horizon: string): number {
  const w = WEIGHTS[horizon] || WEIGHTS.mid;
  const raw =
    w.rsi * signals.rsi +
    w.macd * signals.macd +
    w.ema * signals.emaCross +
    w.volume * signals.volume +
    w.volatility * signals.volatility;
  // raw ∈ [-1, +1] → scale to [-100, +100]
  return Math.round(raw * 100);
}

// ════════════════════════════════════════════════════════════════
// 3. SIGNAL MAPPING (trend score → label)
// ════════════════════════════════════════════════════════════════

function scoreToLabel(score: number): { label: string; color: SignalColor } {
  if (score >= 60)  return { label: 'Strong Buy', color: 'green' };
  if (score >= 25)  return { label: 'Buy', color: 'green' };
  if (score > -25)  return { label: 'Hold', color: 'amber' };
  if (score > -60)  return { label: 'Sell', color: 'red' };
  return { label: 'Strong Sell', color: 'red' };
}

// ════════════════════════════════════════════════════════════════
// 4. MARKET REGIME (from aggregate forecast)
// ════════════════════════════════════════════════════════════════

type Regime = 'bullish' | 'neutral' | 'bearish';

function classifyRegime(forecastReturnPct: number): Regime {
  if (forecastReturnPct > 15) return 'bullish';
  if (forecastReturnPct < -15) return 'bearish';
  return 'neutral';
}

const ALLOWED_BY_REGIME: Record<Regime, string[]> = {
  bullish: ['Strong Buy', 'Buy', 'Hold'],
  neutral: ['Hold'],
  bearish: ['Sell', 'Strong Sell'],
};

// ════════════════════════════════════════════════════════════════
// 5. SOFT FORECAST NUDGE  (±1 level max from main signal)
// ════════════════════════════════════════════════════════════════

const SIGNAL_ORDER = ['Strong Sell', 'Sell', 'Hold', 'Buy', 'Strong Buy'];

/**
 * Nudge the main signal label by at most ±1 level based on forecast direction.
 * This keeps recommendations consistent with the main signal panel while
 * allowing slight adjustment for strong forecast disagreement.
 */
function softForecastNudge(label: string, forecastReturnPct: number): { label: string; color: SignalColor } {
  const idx = SIGNAL_ORDER.indexOf(label);
  if (idx === -1) return scoreToLabel(signalToScore(label));

  let nudge = 0;
  // Only nudge if forecast strongly disagrees (>10% projected move against signal)
  if (forecastReturnPct > 10 && idx < 3) nudge = 1;       // forecast bullish, signal bearish/neutral → nudge up
  else if (forecastReturnPct < -10 && idx > 1) nudge = -1; // forecast bearish, signal bullish/neutral → nudge down

  const newIdx = Math.max(0, Math.min(SIGNAL_ORDER.length - 1, idx + nudge));
  const newLabel = SIGNAL_ORDER[newIdx];
  return scoreToLabel(signalToScore(newLabel));
}

function signalToScore(label: string): number {
  switch (label) {
    case 'Strong Buy': return 80;
    case 'Buy': return 40;
    case 'Hold': return 0;
    case 'Sell': return -40;
    case 'Strong Sell': return -80;
    default: return 0;
  }
}

// ════════════════════════════════════════════════════════════════
// 6. OVERRIDE RULES  (forecast ↔ signal contradiction)
// ════════════════════════════════════════════════════════════════

function applyOverrides(label: string, forecastReturnPct: number): string {
  if (forecastReturnPct < -20 && label === 'Hold') return 'Sell';
  if (forecastReturnPct > 20 && label === 'Sell') return 'Hold';
  return label;
}

// ════════════════════════════════════════════════════════════════
// 7. RISK PARAMETERS  (per-timeframe target% / risk%)
// ════════════════════════════════════════════════════════════════

function getRiskParams(horizon: string, riskLevel: number) {
  const base: Record<string, { riskRange: [number, number]; targetRange: [number, number] }> = {
    short: { riskRange: [0.05, 0.10], targetRange: [0.10, 0.25] },
    mid:   { riskRange: [0.08, 0.15], targetRange: [0.15, 0.35] },
    long:  { riskRange: [0.12, 0.25], targetRange: [0.25, 0.60] },
  };
  const params = base[horizon] || base.mid;
  const t = (riskLevel - 1) / 4; // 0→1 for riskLevel 1→5
  return {
    riskPct: params.riskRange[0] + t * (params.riskRange[1] - params.riskRange[0]),
    targetPct: params.targetRange[0] + t * (params.targetRange[1] - params.targetRange[0]),
  };
}

// ════════════════════════════════════════════════════════════════
// 8. ENTRY / TARGET / STOP-LOSS GENERATION + VALIDATION
// ════════════════════════════════════════════════════════════════

function computeLevels(
  currentPrice: number,
  label: string,
  horizon: string,
  riskLevel: number,
  forecastReturnPct: number,
): { entry: number; target: number; stopLoss: number } {
  const { riskPct, targetPct } = getRiskParams(horizon, riskLevel);
  const entry = currentPrice;

  const isBullish = !['Sell', 'Strong Sell'].includes(label);

  let target: number;
  let stopLoss: number;

  if (isBullish) {
    // Long position: Target > Entry, Stop < Entry
    const upside = Math.max(targetPct, Math.abs(forecastReturnPct) / 100 * 0.8);
    target = entry * (1 + Math.max(0.02, upside));
    stopLoss = entry * (1 - riskPct);
  } else {
    // Bearish: Target < Entry, Stop > Entry
    const downside = Math.max(targetPct, Math.abs(forecastReturnPct) / 100 * 0.8);
    target = entry * (1 - Math.max(0.02, downside));
    stopLoss = entry * (1 + riskPct);
  }

  // ── Validation / auto-correction ──
  return validateLevels(entry, target, stopLoss, isBullish);
}

function validateLevels(
  entry: number,
  target: number,
  stopLoss: number,
  isBullish: boolean,
): { entry: number; target: number; stopLoss: number } {
  const minDist = entry * 0.01; // 1% minimum distance

  if (isBullish) {
    if (target <= entry) target = entry * 1.05;
    if (stopLoss >= entry) stopLoss = entry * 0.95;
    if (target - entry < minDist) target = entry + minDist;
    if (entry - stopLoss < minDist) stopLoss = entry - minDist;
  } else {
    if (target >= entry) target = entry * 0.95;
    if (stopLoss <= entry) stopLoss = entry * 1.05;
    if (entry - target < minDist) target = entry - minDist;
    if (stopLoss - entry < minDist) stopLoss = entry + minDist;
  }

  return { entry, target, stopLoss };
}

// ════════════════════════════════════════════════════════════════
// 9. CONFIDENCE CALCULATION
// ════════════════════════════════════════════════════════════════

function computeConfidence(
  signals: IndicatorSignals,
  trendScore: number,
  forecastReturnPct: number,
): number {
  // Indicator alignment: how many agree on direction
  const sigValues = [signals.rsi, signals.macd, signals.emaCross, signals.volume, signals.volatility];
  const nonZero = sigValues.filter(v => v !== 0);
  const alignment = nonZero.length > 0
    ? (Math.abs(nonZero.reduce((a, b) => a + b, 0)) / nonZero.length) * 100
    : 50;

  // Forecast agreement: does forecast match trend score direction?
  const sameDir = (forecastReturnPct > 0 && trendScore > 0)
    || (forecastReturnPct < 0 && trendScore < 0)
    || (Math.abs(forecastReturnPct) < 5 && Math.abs(trendScore) < 25);
  const forecastAgreement = sameDir ? 80 : 30;

  // Volatility penalty
  const volPenalty = Math.max(20, 100 - Math.abs(forecastReturnPct) * 1.5);

  const confidence = 0.35 * alignment + 0.35 * forecastAgreement + 0.30 * volPenalty;
  return Math.max(20, Math.min(95, Math.round(confidence)));
}

// ════════════════════════════════════════════════════════════════
// 10. AGGREGATE FORECAST RETURN
// ════════════════════════════════════════════════════════════════

function computeForecastReturn(
  currentPrice: number,
  primaryTarget: number,
  forecasts?: NamedForecast[],
): number {
  if (forecasts && forecasts.length > 1) {
    const methodWeights: Record<string, number> = {
      holt: 0.35,
      ema_momentum: 0.30,
      monte_carlo: 0.35,
    };
    let weightedTarget = 0;
    let totalWeight = 0;
    for (const f of forecasts) {
      const w = methodWeights[f.methodId] || (1 / forecasts.length);
      weightedTarget += w * f.target;
      totalWeight += w;
    }
    if (totalWeight > 0) {
      const aggTarget = weightedTarget / totalWeight;
      return ((aggTarget - currentPrice) / currentPrice) * 100;
    }
  }
  return ((primaryTarget - currentPrice) / currentPrice) * 100;
}

// ════════════════════════════════════════════════════════════════
// 11. REASONING / EXPLANATION ENGINE
// ════════════════════════════════════════════════════════════════

const horizonDurations: Record<string, string> = {
  short: '1–7 days',
  mid: '1–3 months',
  long: '6–24 months',
};

function buildReasoning(
  horizon: string,
  signals: IndicatorSignals,
  trendScore: number,
  forecastReturnPct: number,
  regime: Regime,
  label: string,
  riskLevel: number,
  currentRsi: number,
): string {
  const riskLabels = ['conservative', 'moderately conservative', 'moderate', 'moderately aggressive', 'aggressive'];
  const riskLabel = riskLabels[riskLevel - 1] || 'moderate';

  // Indicator summary
  const rsiText = currentRsi < 30 ? `oversold (${currentRsi.toFixed(0)})` : currentRsi > 70 ? `overbought (${currentRsi.toFixed(0)})` : `neutral (${currentRsi.toFixed(0)})`;
  const macdText = signals.macd > 0 ? 'bullish' : signals.macd < 0 ? 'bearish' : 'neutral';
  const emaText = signals.emaCross > 0 ? 'above key averages' : signals.emaCross < 0 ? 'below key averages' : 'at key averages';
  const volText = signals.volume > 0 ? 'rising' : signals.volume < 0 ? 'declining' : 'stable';

  // Outlook
  const outlookMap: Record<Regime, string> = {
    bullish: 'Momentum improving. Break above resistance may trigger further upside.',
    neutral: 'Consolidating. Wait for directional catalyst before committing.',
    bearish: 'Downtrend intact. Further downside risk remains elevated.',
  };

  return `RSI ${rsiText}. MACD ${macdText}. Price ${emaText}. Volume ${volText}. ` +
    `Forecast: ${forecastReturnPct >= 0 ? '+' : ''}${forecastReturnPct.toFixed(1)}% (${regime}). ` +
    `${outlookMap[regime]} [${riskLabel}, ${horizonDurations[horizon] || horizon}]`;
}

// ════════════════════════════════════════════════════════════════
// 12. DCA RECOMMENDATION (ETFs)
// ════════════════════════════════════════════════════════════════

function genDCARecommendation(
  currentPrice: number,
  currentRsi: number,
  bbPosition: number,
  distFromSMA50: number,
  sma20AboveSma50: boolean,
  riskLevel: number,
  forecastReturnPct: number,
): Recommendation {
  let action: string;
  let confidence: number;
  let reasoning: string;
  let color: SignalColor;

  const oversoldThreshold = riskLevel <= 2 ? 30 : 35;
  const overboughtThreshold = riskLevel <= 2 ? 70 : 75;

  if (currentRsi < oversoldThreshold && bbPosition < 0.2) {
    action = riskLevel >= 4 ? 'Aggressive DCA Increase' : 'Accelerate DCA';
    confidence = Math.min(90, 55 + Math.abs(30 - currentRsi));
    reasoning = `RSI at ${currentRsi.toFixed(0)} (oversold) with price in the bottom ${(bbPosition * 100).toFixed(0)}% of Bollinger Bands. Consider increasing your regular contribution.`;
    color = 'green';
  } else if (currentRsi > overboughtThreshold && bbPosition > 0.8) {
    action = riskLevel <= 2 ? 'Pause & Protect' : 'Pause DCA';
    confidence = Math.min(85, 50 + Math.abs(currentRsi - 70));
    reasoning = `RSI at ${currentRsi.toFixed(0)} (overbought) near upper Bollinger Band. Consider pausing contributions temporarily.`;
    color = 'red';
  } else if (currentRsi < 30 && distFromSMA50 < -8 && sma20AboveSma50) {
    action = riskLevel >= 3 ? 'Lump Sum Entry' : 'Small Extra Buy';
    confidence = Math.min(80, 50 + Math.abs(distFromSMA50));
    reasoning = `Price ${Math.abs(distFromSMA50).toFixed(1)}% below 50-day average with deeply oversold RSI. Potential lump-sum opportunity.`;
    color = 'green';
  } else {
    action = 'Continue DCA';
    confidence = 60;
    reasoning = `Conditions are neutral. Continue your regular investment schedule.`;
    color = 'amber';
  }

  // DCA always has simple levels
  const entry = currentPrice;
  const isBullish = forecastReturnPct >= 0;
  const target = isBullish ? currentPrice * 1.10 : currentPrice * 0.90;
  const stopLoss = isBullish ? currentPrice * 0.90 : currentPrice * 1.10;

  return validateAndFixRec({
    horizon: 'dca' as any,
    label: action,
    action,
    confidence: Math.max(20, Math.min(95, confidence)),
    color,
    entry,
    target,
    stopLoss,
    reasoning,
  });
}

// ════════════════════════════════════════════════════════════════
// 13. FINAL VALIDATION WRAPPER
// ════════════════════════════════════════════════════════════════

function validateAndFixRec(rec: Recommendation): Recommendation {
  const isBullish = !['Sell', 'Strong Sell', 'Pause DCA', 'Pause & Protect'].includes(rec.label);
  const { entry, target, stopLoss } = validateLevels(rec.entry, rec.target, rec.stopLoss, isBullish);
  return { ...rec, entry, target, stopLoss };
}

// ════════════════════════════════════════════════════════════════
// 14. ASSET-TYPE LABEL OVERRIDES
// ════════════════════════════════════════════════════════════════

function getAssetLabel(label: string, assetType: AssetType): string {
  if (assetType === 'etfs') {
    switch (label) {
      case 'Strong Buy': return 'Strong Add';
      case 'Buy': return 'Add to Position';
      case 'Strong Sell': return 'Pause DCA';
      case 'Sell': return 'Sell';
      default: return 'Hold/DCA';
    }
  }
  if (assetType === 'forex') {
    switch (label) {
      case 'Strong Buy': return 'Strong Long';
      case 'Buy': return 'Go Long';
      case 'Strong Sell': return 'Strong Short';
      case 'Sell': return 'Go Short';
      default: return 'Flat/Neutral';
    }
  }
  return label;
}

// ════════════════════════════════════════════════════════════════
// PUBLIC API
// ════════════════════════════════════════════════════════════════

export function generateRecommendations(
  signal: Signal,
  currentPrice: number,
  support: number,
  resistance: number,
  forecastTarget: number,
  assetType: AssetType,
  currentRsi: number,
  bbPosition?: number,
  lastSma20?: number,
  lastSma50?: number,
  sma200Last?: number,
  riskLevel: number = 3,
  indicators?: Indicators,
  forecasts?: NamedForecast[],
): Recommendation[] {
  const recs: Recommendation[] = [];

  // Compute aggregate forecast return
  const forecastReturnPct = computeForecastReturn(currentPrice, forecastTarget, forecasts);
  const regime = classifyRegime(forecastReturnPct);

  // Extract indicator signals (use provided indicators or build minimal set)
  const indSignals: IndicatorSignals = indicators
    ? extractSignals(indicators, currentPrice)
    : { rsi: 0, macd: 0, emaCross: 0, volume: 0, volatility: 0 };

  // Generate per-timeframe recommendations
  for (const horizon of ['short', 'mid', 'long'] as const) {
    // Step 1: Weighted trend score
    const trendScore = computeTrendScore(indSignals, horizon);

    // Step 2: Map score to label
    let { label, color } = scoreToLabel(trendScore);

    // Step 3: Apply override rules (forecast contradiction)
    label = applyOverrides(label, forecastReturnPct);

    // Step 4: Align to market regime
    ({ label, color } = alignToRegime(label, regime));

    // Step 5: Re-apply overrides after alignment
    label = applyOverrides(label, forecastReturnPct);
    color = ['Strong Buy', 'Buy', 'Hold'].includes(label)
      ? (label === 'Hold' ? 'amber' : 'green')
      : 'red';

    // Step 6: Asset-specific label
    const displayLabel = getAssetLabel(label, assetType);

    // Step 7: Compute entry / target / stop-loss with validation
    const { entry, target, stopLoss } = computeLevels(
      currentPrice, label, horizon, riskLevel, forecastReturnPct,
    );

    // Step 8: Confidence
    const confidence = computeConfidence(indSignals, trendScore, forecastReturnPct);

    // Step 9: Reasoning
    const reasoning = buildReasoning(
      horizon, indSignals, trendScore, forecastReturnPct,
      regime, label, riskLevel, currentRsi,
    );

    recs.push(validateAndFixRec({
      horizon,
      label: displayLabel,
      action: label,
      confidence,
      color,
      entry,
      target,
      stopLoss,
      reasoning,
    }));
  }

  // DCA for ETFs
  if (assetType === 'etfs') {
    const bbPos = bbPosition ?? 0.5;
    const distFromSMA50 = lastSma50 && lastSma50 > 0
      ? ((currentPrice - lastSma50) / lastSma50) * 100
      : 0;
    const sma20Above = (lastSma20 ?? 0) > (lastSma50 ?? 0);
    recs.push(genDCARecommendation(currentPrice, currentRsi, bbPos, distFromSMA50, sma20Above, riskLevel, forecastReturnPct));
  }

  return recs;
}
