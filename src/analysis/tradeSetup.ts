import type { TradeSetup, Signal } from '@/types/analysis';

export function generateTradeSetups(
  support: number,
  resistance: number,
  signal: Signal,
  atrValues?: number[],
): TradeSetup[] {
  const range = resistance - support;
  const margin = range * 0.03;
  const isBullish = signal.score > 0;

  // Get current ATR value
  const currentATR = atrValues
    ? atrValues.filter(v => !isNaN(v)).pop()
    : undefined;

  const longEntry = support + margin;
  const longStop = currentATR && currentATR > 0
    ? longEntry - (2 * currentATR)
    : support - margin * 2;

  const longSetup: TradeSetup = {
    type: 'long',
    entry: longEntry,
    stop: longStop,
    tp1: support + range * 0.5,
    tp2: resistance - margin,
    riskReward: 0,
    bias: isBullish,
  };
  longSetup.riskReward = (longSetup.tp2 - longSetup.entry) / Math.max(0.01, longSetup.entry - longSetup.stop);

  const shortEntry = resistance - margin;
  const shortStop = currentATR && currentATR > 0
    ? shortEntry + (2 * currentATR)
    : resistance + margin * 2;

  const shortSetup: TradeSetup = {
    type: 'short',
    entry: shortEntry,
    stop: shortStop,
    tp1: resistance - range * 0.5,
    tp2: support + margin,
    riskReward: 0,
    bias: !isBullish,
  };
  shortSetup.riskReward = (shortSetup.entry - shortSetup.tp2) / Math.max(0.01, shortSetup.stop - shortSetup.entry);

  return [longSetup, shortSetup];
}
