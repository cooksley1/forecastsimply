import type { TradeSetup, Signal } from '@/types/analysis';

export function generateTradeSetups(
  support: number,
  resistance: number,
  signal: Signal,
  atrValues?: number[],
  riskLevel: number = 3,
): TradeSetup[] {
  const range = resistance - support;
  const margin = range * 0.03;
  const isBullish = signal.score > 0;

  // Risk-adjusted stop multiplier: conservative = tighter, aggressive = wider
  const atrStopMultiplier = [1.5, 1.75, 2.0, 2.5, 3.0][riskLevel - 1] ?? 2.0;
  const fallbackStopMultiplier = [1.5, 1.75, 2.0, 2.5, 3.0][riskLevel - 1] ?? 2.0;

  // TP scaling: conservative = closer targets, aggressive = further
  const tp1Scale = [0.4, 0.45, 0.5, 0.55, 0.6][riskLevel - 1] ?? 0.5;
  const tp2Scale = [0.85, 0.9, 1.0, 1.1, 1.2][riskLevel - 1] ?? 1.0;

  // Get current ATR value
  const currentATR = atrValues
    ? atrValues.filter(v => !isNaN(v)).pop()
    : undefined;

  const longEntry = support + margin;
  const longStop = currentATR && currentATR > 0
    ? longEntry - (atrStopMultiplier * currentATR)
    : support - margin * fallbackStopMultiplier;

  const longSetup: TradeSetup = {
    type: 'long',
    entry: longEntry,
    stop: longStop,
    tp1: support + range * tp1Scale,
    tp2: support + range * tp2Scale,
    riskReward: 0,
    bias: isBullish,
  };
  longSetup.riskReward = (longSetup.tp2 - longSetup.entry) / Math.max(0.01, longSetup.entry - longSetup.stop);

  const shortEntry = resistance - margin;
  const shortStop = currentATR && currentATR > 0
    ? shortEntry + (atrStopMultiplier * currentATR)
    : resistance + margin * fallbackStopMultiplier;

  const shortSetup: TradeSetup = {
    type: 'short',
    entry: shortEntry,
    stop: shortStop,
    tp1: resistance - range * tp1Scale,
    tp2: resistance - range * tp2Scale,
    riskReward: 0,
    bias: !isBullish,
  };
  shortSetup.riskReward = (shortSetup.entry - shortSetup.tp2) / Math.max(0.01, shortSetup.stop - shortSetup.entry);

  return [longSetup, shortSetup];
}
