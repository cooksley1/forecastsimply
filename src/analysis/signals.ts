import type { Signal, SignalLabel, SignalColor } from '@/types/analysis';
import type { Indicators } from '@/types/analysis';

export function computeSignal(indicators: Indicators, currentPrice: number): Signal {
  let score = 0;
  const { currentRsi, sma20, sma50, bbUpper, bbLower, macdHistogram, stochasticK } = indicators;

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
