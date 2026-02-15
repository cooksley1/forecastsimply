import type { Recommendation, Signal } from '@/types/analysis';
import type { AssetType } from '@/types/assets';

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
): Recommendation {
  let action: string;
  let confidence: number;
  let reasoning: string;
  let color: 'green' | 'amber' | 'red';

  if (currentRsi < 35 && bbPosition < 0.2) {
    action = 'Accelerate DCA';
    confidence = Math.min(85, 55 + Math.abs(30 - currentRsi));
    reasoning = `RSI at ${currentRsi.toFixed(0)} (oversold) with price in the bottom ${(bbPosition * 100).toFixed(0)}% of Bollinger Bands. This is a historically strong entry point for long-term accumulation — consider increasing your regular contribution amount.`;
    color = 'green';
  } else if (currentRsi > 75 && bbPosition > 0.8) {
    action = 'Pause DCA';
    confidence = Math.min(80, 50 + Math.abs(currentRsi - 70));
    reasoning = `RSI at ${currentRsi.toFixed(0)} (overbought) with price near the upper Bollinger Band. Consider pausing contributions temporarily and waiting for a pullback to resume at better prices.`;
    color = 'red';
  } else if (currentRsi < 30 && distFromSMA50 < -8 && sma20AboveSma50) {
    action = 'Lump Sum Entry';
    confidence = Math.min(80, 50 + Math.abs(distFromSMA50));
    reasoning = `Price is ${Math.abs(distFromSMA50).toFixed(1)}% below the 50-day average with deeply oversold RSI and intact bullish structure. This dip may represent a strong lump-sum opportunity in addition to regular DCA.`;
    color = 'green';
  } else {
    action = 'Continue DCA';
    confidence = 60;
    reasoning = `Conditions are neutral — no extreme overbought or oversold readings. Continue your regular investment schedule as planned. Time in market beats timing the market.`;
    color = 'amber';
  }

  return {
    horizon: 'dca',
    label: action,
    action,
    confidence,
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
): Recommendation[] {
  const recs: Recommendation[] = [];
  const range = resistance - support;

  // SMA200 reasoning addon
  const sma200Note = sma200Last
    ? currentPrice > sma200Last
      ? ' Price above 200-day SMA — long-term bullish structure.'
      : ' Price below 200-day SMA — long-term bearish structure.'
    : '';

  // Short-term
  const stConf = Math.min(90, 50 + Math.abs(signal.score) * 8);
  recs.push({
    horizon: 'short',
    label: getLabel(signal, 'short', assetType),
    action: signal.label,
    confidence: stConf,
    color: signal.color,
    entry: currentPrice,
    target: signal.score >= 0 ? resistance : support,
    stopLoss: signal.score >= 0 ? support + range * 0.1 : resistance - range * 0.1,
    reasoning: `RSI at ${currentRsi.toFixed(0)} with ${signal.score >= 0 ? 'bullish' : 'bearish'} momentum. ${signal.score >= 2 ? 'Favorable entry conditions.' : signal.score <= -2 ? 'Caution advised.' : 'Neutral positioning.'}`,
  });

  // Mid-term
  const mtConf = Math.min(85, 45 + Math.abs(signal.score) * 7);
  recs.push({
    horizon: 'mid',
    label: getLabel(signal, 'mid', assetType),
    action: signal.label,
    confidence: mtConf,
    color: signal.color,
    entry: currentPrice,
    target: forecastTarget,
    stopLoss: Math.min(support, currentPrice * 0.9),
    reasoning: `Forecast projects ${((forecastTarget - currentPrice) / currentPrice * 100).toFixed(1)}% move. ${signal.score >= 2 ? 'Trend supports accumulation.' : signal.score <= -2 ? 'Consider reducing exposure.' : 'Monitor for breakout.'}`,
  });

  // Long-term
  const ltConf = Math.min(80, 40 + Math.abs(signal.score) * 7);
  recs.push({
    horizon: 'long',
    label: getLabel(signal, 'long', assetType),
    action: signal.label,
    confidence: ltConf,
    color: signal.color,
    entry: currentPrice,
    target: Math.max(forecastTarget, resistance * 1.1),
    stopLoss: Math.min(support, currentPrice * 0.85),
    reasoning: `Long-term outlook based on trend direction and market structure.${sma200Note}`,
  });

  // DCA Timing (ETFs only)
  if (assetType === 'etfs') {
    const bbPos = bbPosition ?? 0.5;
    const distFromSMA50 = lastSma50 && lastSma50 > 0
      ? ((currentPrice - lastSma50) / lastSma50) * 100
      : 0;
    const sma20Above = (lastSma20 ?? 0) > (lastSma50 ?? 0);
    recs.push(genDCARecommendation(currentPrice, currentRsi, bbPos, distFromSMA50, sma20Above));
  }

  return recs;
}
