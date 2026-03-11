/**
 * Cross-Timeframe Signal Consistency
 *
 * Dampens short-term bullish signals when longer timeframes show
 * low confidence or bearish bias, and vice-versa.
 *
 * Uses cached daily_analysis_cache data so no extra API calls needed.
 */
import { supabase } from '@/integrations/supabase/client';
import type { Signal, SignalLabel, SignalColor } from '@/types/analysis';

interface TimeframeRow {
  timeframe_days: number;
  signal_score: number | null;
  signal_label: string | null;
  confidence: number | null;
}

/**
 * Fetch all cached timeframe rows for an asset.
 */
async function fetchTimeframeData(assetId: string): Promise<TimeframeRow[]> {
  try {
    const { data, error } = await supabase
      .from('daily_analysis_cache')
      .select('timeframe_days, signal_score, signal_label, confidence')
      .eq('asset_id', assetId);

    if (error || !data) return [];
    return data as TimeframeRow[];
  } catch {
    return [];
  }
}

const LABEL_SCORE: Record<string, number> = {
  'Strong Buy': 2,
  'Buy': 1,
  'Hold': 0,
  'Sell': -1,
  'Strong Sell': -2,
};

function labelToScore(label: string | null): number {
  return LABEL_SCORE[label ?? ''] ?? 0;
}

/**
 * Compute a dampening factor (0 = full dampen, 1 = no change)
 * based on how longer timeframes agree/disagree with the short-term signal.
 */
function computeDampening(
  currentTfDays: number,
  currentScore: number,
  rows: TimeframeRow[],
): { factor: number; reason: string | null } {
  // Only consider timeframes longer than the current one
  const longerTfs = rows
    .filter(r => r.timeframe_days > currentTfDays && r.signal_score !== null)
    .sort((a, b) => a.timeframe_days - b.timeframe_days);

  if (longerTfs.length === 0) return { factor: 1, reason: null };

  const isBullish = currentScore > 0;
  const isBearish = currentScore < 0;

  // Check for contradiction: short bullish but longer bearish (or vice versa)
  let contradictions = 0;
  let lowConfidenceCount = 0;
  let totalLonger = longerTfs.length;

  for (const tf of longerTfs) {
    const tfLabelScore = labelToScore(tf.signal_label);
    const tfConf = tf.confidence ?? 50;

    // Contradiction: opposite direction
    if (isBullish && tfLabelScore < 0) contradictions++;
    if (isBearish && tfLabelScore > 0) contradictions++;

    // Low confidence on longer timeframe
    if (tfConf < 50) lowConfidenceCount++;
  }

  // Calculate dampening
  let factor = 1;
  const reasons: string[] = [];

  // Strong contradiction: majority of longer timeframes disagree
  if (contradictions > 0) {
    const contradictionRatio = contradictions / totalLonger;
    if (contradictionRatio >= 0.5) {
      factor *= 0.5; // Halve the signal strength
      reasons.push(
        `${contradictions}/${totalLonger} longer timeframe(s) show opposite bias`
      );
    } else {
      factor *= 0.75;
      reasons.push(
        `${contradictions}/${totalLonger} longer timeframe(s) show opposite bias (minor)`
      );
    }
  }

  // Low confidence on longer timeframes reduces conviction
  if (lowConfidenceCount > 0 && contradictions === 0) {
    const lowConfRatio = lowConfidenceCount / totalLonger;
    if (lowConfRatio >= 0.5) {
      factor *= 0.8;
      reasons.push('longer timeframes show low confidence');
    }
  }

  return {
    factor,
    reason: reasons.length > 0 ? reasons.join('; ') : null,
  };
}

function scoreToLabel(score: number): SignalLabel {
  if (score >= 8) return 'Strong Buy';
  if (score >= 4) return 'Buy';
  if (score <= -8) return 'Strong Sell';
  if (score <= -4) return 'Sell';
  return 'Hold';
}

function labelToColor(label: SignalLabel): SignalColor {
  if (label === 'Strong Buy' || label === 'Buy') return 'green';
  if (label === 'Strong Sell' || label === 'Sell') return 'red';
  return 'amber';
}

/**
 * Apply cross-timeframe consistency adjustment to a signal.
 * Call this AFTER computeSignal() with the asset ID and current timeframe.
 *
 * Returns the original signal if no adjustment needed, or an adjusted copy.
 */
export async function applyCrossTimeframeAdjustment(
  signal: Signal,
  assetId: string,
  currentTimeframeDays: number,
): Promise<Signal & { crossTimeframeNote?: string }> {
  const rows = await fetchTimeframeData(assetId);
  if (rows.length <= 1) return signal; // Only one timeframe cached, nothing to compare

  const { factor, reason } = computeDampening(
    currentTimeframeDays,
    signal.score,
    rows,
  );

  if (factor >= 1 || !reason) return signal;

  // Apply dampening to score
  const adjustedScore = Math.round(signal.score * factor);
  const clampedScore = Math.max(-15, Math.min(15, adjustedScore));
  const newLabel = scoreToLabel(clampedScore);
  const newColor = labelToColor(newLabel);
  const newConfidence = Math.min(95, 40 + Math.abs(clampedScore) * 4);

  return {
    ...signal,
    score: clampedScore,
    label: newLabel,
    color: newColor,
    confidence: newConfidence,
    crossTimeframeNote: `⚠️ Signal dampened: ${reason}.`,
    breakdown: signal.breakdown
      ? [
          ...signal.breakdown,
          {
            name: 'Cross-Timeframe',
            value: `${(factor * 100).toFixed(0)}% weight`,
            signal: factor < 0.6 ? 'bearish' : 'neutral',
            contribution: clampedScore - signal.score,
            weight: 10,
            explanation: `Longer-timeframe analysis ${reason}. Short-term signal strength reduced by ${((1 - factor) * 100).toFixed(0)}% to avoid false signals.`,
          },
        ]
      : undefined,
  };
}
