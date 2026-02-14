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

export function generateRecommendations(
  signal: Signal,
  currentPrice: number,
  support: number,
  resistance: number,
  forecastTarget: number,
  assetType: AssetType,
  currentRsi: number
): Recommendation[] {
  const recs: Recommendation[] = [];
  const range = resistance - support;

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
    reasoning: `Long-term outlook based on trend direction and market structure.`,
  });

  return recs;
}
