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

  // ── Validation ──
  return [validateSetup(longSetup), validateSetup(shortSetup)];
}

function validateSetup(setup: TradeSetup): TradeSetup {
  const minDist = setup.entry * 0.005; // 0.5% minimum distance

  if (setup.type === 'long') {
    // Long: TP1 > TP2 is wrong (TP2 should be higher), Stop < Entry
    if (setup.stop >= setup.entry) setup.stop = setup.entry * 0.95;
    if (setup.tp1 <= setup.entry) setup.tp1 = setup.entry * 1.03;
    if (setup.tp2 <= setup.tp1) setup.tp2 = setup.tp1 * 1.05;
    if (setup.entry - setup.stop < minDist) setup.stop = setup.entry - minDist;
  } else {
    // Short: Stop > Entry, TP1 < Entry, TP2 < TP1
    if (setup.stop <= setup.entry) setup.stop = setup.entry * 1.05;
    if (setup.tp1 >= setup.entry) setup.tp1 = setup.entry * 0.97;
    if (setup.tp2 >= setup.tp1) setup.tp2 = setup.tp1 * 0.95;
    if (setup.stop - setup.entry < minDist) setup.stop = setup.entry + minDist;
  }

  // Recalculate R:R after validation
  if (setup.type === 'long') {
    setup.riskReward = (setup.tp2 - setup.entry) / Math.max(0.01, setup.entry - setup.stop);
  } else {
    setup.riskReward = (setup.entry - setup.tp2) / Math.max(0.01, setup.stop - setup.entry);
  }

  // Ensure R:R is positive and reasonable
  setup.riskReward = Math.max(0.1, Math.min(20, setup.riskReward));

  return setup;
}
