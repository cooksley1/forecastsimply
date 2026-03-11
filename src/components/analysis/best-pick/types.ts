export interface BestPick {
  asset_id: string;
  symbol: string;
  name: string;
  asset_type: string;
  price: number;
  change_pct: number;
  signal_score: number;
  signal_label: string;
  confidence: number;
  market_phase: string | null;
  target_price: number | null;
  stop_loss: number | null;
  forecast_return_pct: number;
  rsi: number | null;
  sma20: number | null;
  sma50: number | null;
  bb_position: number | null;
  macd_histogram: number | null;
  stochastic_k: number | null;
  analyzed_at: string;
  /** Client-computed composite rank score (0–100). Higher = better overall pick. */
  composite_score?: number;
}

/**
 * Composite score blending signal strength, forecast return, and confidence.
 *
 * Weights (tuned for profit-maximising with confirmation):
 *   - Signal score  : 40% — technical conviction (normalised from ±15 to 0–100)
 *   - Forecast return: 35% — projected upside (capped at 50% for normalisation)
 *   - Confidence     : 25% — model confidence (already 0–100)
 *
 * The result is 0–100 where 100 = strongest confirmed upside.
 */
export function computeCompositeScore(pick: {
  signal_score: number;
  forecast_return_pct: number;
  confidence: number;
}): number {
  // Normalise signal_score from range [-15, 15] → [0, 100]
  const normSignal = Math.max(0, Math.min(100, ((pick.signal_score + 15) / 30) * 100));

  // Normalise forecast return: cap at 50% upside for scoring purposes
  const normReturn = Math.max(0, Math.min(100, (pick.forecast_return_pct / 50) * 100));

  // Confidence is already 0–100
  const normConf = Math.max(0, Math.min(100, pick.confidence));

  return Math.round(normSignal * 0.4 + normReturn * 0.35 + normConf * 0.25);
}

export type AssetClass = 'crypto' | 'stocks' | 'etfs';
export type Timeframe = '1M' | '3M' | '6M' | '1Y';

export const ASSET_OPTIONS: { id: AssetClass; label: string; icon: string }[] = [
  { id: 'crypto', label: 'Crypto', icon: '₿' },
  { id: 'stocks', label: 'Stocks', icon: '📈' },
  { id: 'etfs', label: 'ETFs', icon: '📊' },
];

export const TIMEFRAME_OPTIONS: { id: Timeframe; label: string; days: number }[] = [
  { id: '1M', label: '1 Month', days: 30 },
  { id: '3M', label: '3 Months', days: 90 },
  { id: '6M', label: '6 Months', days: 180 },
  { id: '1Y', label: '1 Year', days: 365 },
];

export const APP_URL = 'https://forecastsimply.lovable.app';
