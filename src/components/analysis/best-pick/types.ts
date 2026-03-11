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
  /** Whether the pick was flagged by a filter (kept but warned) */
  filter_warnings?: string[];
}

/* ── Risk-profile weight presets ── */

export type RiskProfile = 'conservative' | 'moderate-conservative' | 'moderate' | 'moderate-aggressive' | 'aggressive';

interface WeightPreset {
  signal: number;
  forecast: number;
  confidence: number;
}

const WEIGHT_PRESETS: Record<RiskProfile, WeightPreset> = {
  conservative:           { signal: 0.50, forecast: 0.20, confidence: 0.30 },
  'moderate-conservative': { signal: 0.45, forecast: 0.25, confidence: 0.30 },
  moderate:               { signal: 0.40, forecast: 0.35, confidence: 0.25 },
  'moderate-aggressive':   { signal: 0.30, forecast: 0.45, confidence: 0.25 },
  aggressive:             { signal: 0.25, forecast: 0.50, confidence: 0.25 },
};

/**
 * Composite score blending signal strength, forecast return, and confidence.
 *
 * Weights adapt to the user's risk profile:
 *   - Conservative  → heavier on signal confirmation (50/20/30)
 *   - Moderate      → balanced                      (40/35/25)  [default]
 *   - Aggressive    → heavier on forecast return     (25/50/25)
 *
 * The result is 0–100 where 100 = strongest confirmed upside.
 */
export function computeCompositeScore(
  pick: { signal_score: number; forecast_return_pct: number; confidence: number },
  riskProfile: RiskProfile = 'moderate',
): number {
  const w = WEIGHT_PRESETS[riskProfile] ?? WEIGHT_PRESETS.moderate;

  // Normalise signal_score from range [-15, 15] → [0, 100]
  const normSignal = Math.max(0, Math.min(100, ((pick.signal_score + 15) / 30) * 100));

  // Normalise forecast return: cap at 50% upside for scoring purposes
  const normReturn = Math.max(0, Math.min(100, (pick.forecast_return_pct / 50) * 100));

  // Confidence is already 0–100
  const normConf = Math.max(0, Math.min(100, pick.confidence));

  return Math.round(normSignal * w.signal + normReturn * w.forecast + normConf * w.confidence);
}

/* ── Filter helpers ── */

/** Compute Risk/Reward ratio from cache row */
export function computeRiskReward(pick: { price: number; target_price: number | null; stop_loss: number | null }): number {
  const target = pick.target_price ?? 0;
  const stop = pick.stop_loss ?? 0;
  if (!target || !stop || !pick.price) return 0;
  const gain = Math.abs(target - pick.price);
  const loss = Math.abs(pick.price - stop);
  return loss > 0 ? gain / loss : 0;
}

/** Stop-loss distance as a percentage of price */
export function stopLossDistancePct(pick: { price: number; stop_loss: number | null }): number {
  if (!pick.stop_loss || !pick.price) return 0;
  return Math.abs(pick.price - pick.stop_loss) / pick.price * 100;
}

/** Apply quality filters; returns items that pass + warnings for borderline cases */
export function applyQualityFilters(
  picks: BestPick[],
  opts: { minRR?: number; maxStopPct?: number } = {},
): BestPick[] {
  const minRR = opts.minRR ?? 1.5;
  const maxStopPct = opts.maxStopPct ?? 10;

  return picks.map(pick => {
    const warnings: string[] = [];
    const rr = computeRiskReward(pick);
    const slDist = stopLossDistancePct(pick);

    if (rr > 0 && rr < minRR) warnings.push(`R:R ${rr.toFixed(1)} < ${minRR}`);
    if (slDist > maxStopPct) warnings.push(`Stop-loss ${slDist.toFixed(1)}% > ${maxStopPct}%`);

    return { ...pick, filter_warnings: warnings };
  }).sort((a, b) => {
    // Picks with no warnings first, then by composite score
    const aw = (a.filter_warnings?.length ?? 0) > 0 ? 1 : 0;
    const bw = (b.filter_warnings?.length ?? 0) > 0 ? 1 : 0;
    if (aw !== bw) return aw - bw;
    return (b.composite_score ?? 0) - (a.composite_score ?? 0);
  });
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

/** Market benchmark asset IDs for context check */
export const MARKET_BENCHMARKS: Record<string, { assetId: string; label: string }> = {
  crypto: { assetId: 'bitcoin', label: 'BTC' },
  stocks: { assetId: 'SPY', label: 'SPY' },
  etfs:   { assetId: 'SPY', label: 'SPY' },
};

export const APP_URL = 'https://forecastsimply.lovable.app';
