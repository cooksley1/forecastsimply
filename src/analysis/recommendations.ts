import type { Recommendation, Signal } from '@/types/analysis';
import type { AssetType } from '@/types/assets';

// Risk multipliers: level 1 (conservative) → 5 (aggressive)
// Conservative = tighter stops, lower targets, higher confidence thresholds
// Aggressive = wider stops, higher targets, lower confidence thresholds
function riskMultipliers(riskLevel: number) {
  // riskLevel 1-5 mapped to multipliers
  const stopMultiplier = [0.6, 0.8, 1.0, 1.3, 1.6][riskLevel - 1] ?? 1.0;   // stop distance
  const targetMultiplier = [0.7, 0.85, 1.0, 1.2, 1.5][riskLevel - 1] ?? 1.0; // target distance
  const confidenceBoost = [10, 5, 0, -3, -5][riskLevel - 1] ?? 0;            // confidence adjustment
  return { stopMultiplier, targetMultiplier, confidenceBoost };
}

function getLabel(signal: Signal, horizon: string, assetType: AssetType): string {
  const isBuy = signal.score >= 2;
  const isStrongBuy = signal.score >= 6;
  const isSell = signal.score <= -2;
  const isStrongSell = signal.score <= -6;

  if (assetType === 'etfs') {
    if (isStrongBuy) return 'Strong Add';
    if (isBuy) return 'Add to Position';
    if (isStrongSell) return 'Pause DCA';
    if (isSell) return 'Reduce';
    return 'Hold/DCA';
  }
  if (assetType === 'forex') {
    if (isStrongBuy) return 'Strong Long';
    if (isBuy) return 'Go Long';
    if (isStrongSell) return 'Strong Short';
    if (isSell) return 'Go Short';
    return 'Flat/Neutral';
  }
  return signal.label;
}

function genDCARecommendation(
  currentPrice: number,
  currentRsi: number,
  bbPosition: number,
  distFromSMA50: number,
  sma20AboveSma50: boolean,
  riskLevel: number,
): Recommendation {
  let action: string;
  let confidence: number;
  let reasoning: string;
  let color: 'green' | 'amber' | 'red';
  const { confidenceBoost } = riskMultipliers(riskLevel);

  // Conservative profiles are more cautious about accelerating DCA
  const oversoldThreshold = riskLevel <= 2 ? 30 : 35;
  const overboughtThreshold = riskLevel <= 2 ? 70 : 75;

  if (currentRsi < oversoldThreshold && bbPosition < 0.2) {
    action = riskLevel >= 4 ? 'Aggressive DCA Increase' : 'Accelerate DCA';
    confidence = Math.min(90, 55 + Math.abs(30 - currentRsi) + confidenceBoost);
    reasoning = `RSI at ${currentRsi.toFixed(0)} (oversold) with price in the bottom ${(bbPosition * 100).toFixed(0)}% of Bollinger Bands. ${riskLevel >= 4 ? 'With your growth-focused profile, consider a larger increase.' : 'Consider increasing your regular contribution amount.'}`;
    color = 'green';
  } else if (currentRsi > overboughtThreshold && bbPosition > 0.8) {
    action = riskLevel <= 2 ? 'Pause & Protect' : 'Pause DCA';
    confidence = Math.min(85, 50 + Math.abs(currentRsi - 70) + confidenceBoost);
    reasoning = `RSI at ${currentRsi.toFixed(0)} (overbought) with price near the upper Bollinger Band. ${riskLevel <= 2 ? 'Your conservative profile suggests pausing and protecting gains.' : 'Consider pausing contributions temporarily.'}`;
    color = 'red';
  } else if (currentRsi < 30 && distFromSMA50 < -8 && sma20AboveSma50) {
    action = riskLevel >= 3 ? 'Lump Sum Entry' : 'Small Extra Buy';
    confidence = Math.min(80, 50 + Math.abs(distFromSMA50) + confidenceBoost);
    reasoning = `Price is ${Math.abs(distFromSMA50).toFixed(1)}% below the 50-day average with deeply oversold RSI. ${riskLevel >= 4 ? 'Consider a significant lump-sum entry.' : riskLevel <= 2 ? 'A small additional buy may be appropriate.' : 'This dip may represent a lump-sum opportunity.'}`;
    color = 'green';
  } else {
    action = 'Continue DCA';
    confidence = 60 + confidenceBoost;
    reasoning = `Conditions are neutral. Continue your regular investment schedule. ${riskLevel <= 2 ? 'Steady approach aligns with your conservative goals.' : ''}`;
    color = 'amber';
  }

  return {
    horizon: 'dca',
    label: action,
    action,
    confidence: Math.max(30, Math.min(95, confidence)),
    color,
    entry: currentPrice,
    target: currentPrice * 1.1,
    stopLoss: currentPrice * 0.9,
    reasoning,
  };
}

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
): Recommendation[] {
  const recs: Recommendation[] = [];
  const range = resistance - support;
  const { stopMultiplier, targetMultiplier, confidenceBoost } = riskMultipliers(riskLevel);

  // Risk-profile labels
  const riskLabels = ['conservative', 'mod-conservative', 'moderate', 'mod-aggressive', 'aggressive'];
  const riskLabel = riskLabels[riskLevel - 1] || 'moderate';

  // SMA200 reasoning addon
  const sma200Note = sma200Last
    ? currentPrice > sma200Last
      ? ' Price above 200-day SMA — long-term bullish structure.'
      : ' Price below 200-day SMA — long-term bearish structure.'
    : '';

  // Short-term
  const stConf = Math.max(30, Math.min(95, 50 + Math.abs(signal.score) * 8 + confidenceBoost));
  const stStopDist = range * 0.1 * stopMultiplier;
  recs.push({
    horizon: 'short',
    label: getLabel(signal, 'short', assetType),
    action: signal.label,
    confidence: stConf,
    color: signal.color,
    entry: currentPrice,
    target: signal.score >= 0
      ? currentPrice + (resistance - currentPrice) * targetMultiplier
      : currentPrice - (currentPrice - support) * targetMultiplier,
    stopLoss: signal.score >= 0 ? support + stStopDist : resistance - stStopDist,
    reasoning: `RSI at ${currentRsi.toFixed(0)} with ${signal.score >= 0 ? 'bullish' : 'bearish'} momentum. ${signal.score >= 2 ? 'Favorable entry conditions.' : signal.score <= -2 ? 'Caution advised.' : 'Neutral positioning.'} [${riskLabel} stops]`,
  });

  // Mid-term
  const mtConf = Math.max(30, Math.min(90, 45 + Math.abs(signal.score) * 7 + confidenceBoost));
  const mtTarget = currentPrice + (forecastTarget - currentPrice) * targetMultiplier;
  recs.push({
    horizon: 'mid',
    label: getLabel(signal, 'mid', assetType),
    action: signal.label,
    confidence: mtConf,
    color: signal.color,
    entry: currentPrice,
    target: mtTarget,
    stopLoss: Math.min(support, currentPrice * (1 - 0.1 * stopMultiplier)),
    reasoning: `Forecast projects ${((mtTarget - currentPrice) / currentPrice * 100).toFixed(1)}% move (${riskLabel}-adjusted). ${signal.score >= 2 ? 'Trend supports accumulation.' : signal.score <= -2 ? 'Consider reducing exposure.' : 'Monitor for breakout.'}`,
  });

  // Long-term
  const ltConf = Math.max(30, Math.min(85, 40 + Math.abs(signal.score) * 7 + confidenceBoost));
  recs.push({
    horizon: 'long',
    label: getLabel(signal, 'long', assetType),
    action: signal.label,
    confidence: ltConf,
    color: signal.color,
    entry: currentPrice,
    target: Math.max(forecastTarget, resistance * (1 + 0.1 * targetMultiplier)),
    stopLoss: Math.min(support, currentPrice * (1 - 0.15 * stopMultiplier)),
    reasoning: `Long-term outlook based on trend direction and market structure.${sma200Note} [${riskLabel} risk tolerance]`,
  });

  // DCA Timing (ETFs only)
  if (assetType === 'etfs') {
    const bbPos = bbPosition ?? 0.5;
    const distFromSMA50 = lastSma50 && lastSma50 > 0
      ? ((currentPrice - lastSma50) / lastSma50) * 100
      : 0;
    const sma20Above = (lastSma20 ?? 0) > (lastSma50 ?? 0);
    recs.push(genDCARecommendation(currentPrice, currentRsi, bbPos, distFromSMA50, sma20Above, riskLevel));
  }

  return recs;
}
