import type { TradeSetup, Signal } from '@/types/analysis';

export function generateTradeSetups(
  support: number,
  resistance: number,
  signal: Signal
): TradeSetup[] {
  const range = resistance - support;
  const margin = range * 0.03;
  const isBullish = signal.score > 0;

  const longSetup: TradeSetup = {
    type: 'long',
    entry: support + margin,
    stop: support - margin * 2,
    tp1: support + range * 0.5,
    tp2: resistance - margin,
    riskReward: 0,
    bias: isBullish,
  };
  longSetup.riskReward = (longSetup.tp2 - longSetup.entry) / Math.max(0.01, longSetup.entry - longSetup.stop);

  const shortSetup: TradeSetup = {
    type: 'short',
    entry: resistance - margin,
    stop: resistance + margin * 2,
    tp1: resistance - range * 0.5,
    tp2: support + margin,
    riskReward: 0,
    bias: !isBullish,
  };
  shortSetup.riskReward = (shortSetup.entry - shortSetup.tp2) / Math.max(0.01, shortSetup.stop - shortSetup.entry);

  return [longSetup, shortSetup];
}
