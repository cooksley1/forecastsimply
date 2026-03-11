/**
 * Advanced market-structure utilities for short-term signal accuracy.
 *
 * 1. Swing-high / swing-low detection
 * 2. Break of Structure (BOS) & Change of Character (CHoCH)
 * 3. Supply / Demand zone mapping
 * 4. Fibonacci retracement scoring
 * 5. Volume-profile analysis
 */

// ─── Swing Point Detection ───────────────────────────────────

export interface SwingPoint {
  index: number;
  price: number;
  type: 'high' | 'low';
}

/**
 * Detect swing highs and lows using a configurable look-back/look-ahead window.
 * A swing high requires `order` lower candles on each side.
 */
export function detectSwingPoints(closes: number[], order = 3): SwingPoint[] {
  const points: SwingPoint[] = [];
  if (closes.length < order * 2 + 1) return points;

  for (let i = order; i < closes.length - order; i++) {
    let isHigh = true;
    let isLow = true;
    for (let j = 1; j <= order; j++) {
      if (closes[i] <= closes[i - j] || closes[i] <= closes[i + j]) isHigh = false;
      if (closes[i] >= closes[i - j] || closes[i] >= closes[i + j]) isLow = false;
    }
    if (isHigh) points.push({ index: i, price: closes[i], type: 'high' });
    if (isLow) points.push({ index: i, price: closes[i], type: 'low' });
  }
  return points;
}

// ─── Break of Structure (BOS) & Change of Character (CHoCH) ─

export interface StructureBreak {
  type: 'bos' | 'choch';
  direction: 'bullish' | 'bearish';
  index: number;
  level: number;
  description: string;
}

/**
 * BOS: price breaks the most recent swing high (bullish) or swing low (bearish)
 *      in the SAME trend direction → trend continuation.
 * CHoCH: price breaks a swing point AGAINST the prevailing trend → potential reversal.
 */
export function detectStructureBreaks(closes: number[], swings: SwingPoint[]): StructureBreak[] {
  const breaks: StructureBreak[] = [];
  if (swings.length < 3) return breaks;

  // Determine prevailing trend from last 3 swing highs/lows
  const recentHighs = swings.filter(s => s.type === 'high').slice(-3);
  const recentLows = swings.filter(s => s.type === 'low').slice(-3);

  const isUptrend = recentHighs.length >= 2 &&
    recentHighs[recentHighs.length - 1].price > recentHighs[recentHighs.length - 2].price;
  const isDowntrend = recentLows.length >= 2 &&
    recentLows[recentLows.length - 1].price < recentLows[recentLows.length - 2].price;

  const currentPrice = closes[closes.length - 1];
  const lookback = 10; // only check recent breaks

  // Check if current price broke the most recent swing high
  const lastSwingHigh = recentHighs[recentHighs.length - 1];
  const lastSwingLow = recentLows[recentLows.length - 1];

  if (lastSwingHigh && closes.length - lastSwingHigh.index < lookback * 3) {
    if (currentPrice > lastSwingHigh.price) {
      // Price broke above last swing high
      if (isUptrend) {
        breaks.push({
          type: 'bos',
          direction: 'bullish',
          index: closes.length - 1,
          level: lastSwingHigh.price,
          description: `Bullish BOS — price broke above swing high at ${lastSwingHigh.price.toFixed(2)}, confirming uptrend continuation.`,
        });
      } else if (isDowntrend) {
        breaks.push({
          type: 'choch',
          direction: 'bullish',
          index: closes.length - 1,
          level: lastSwingHigh.price,
          description: `Bullish CHoCH — price broke above swing high at ${lastSwingHigh.price.toFixed(2)} against prevailing downtrend. Potential reversal.`,
        });
      }
    }
  }

  if (lastSwingLow && closes.length - lastSwingLow.index < lookback * 3) {
    if (currentPrice < lastSwingLow.price) {
      // Price broke below last swing low
      if (isDowntrend) {
        breaks.push({
          type: 'bos',
          direction: 'bearish',
          index: closes.length - 1,
          level: lastSwingLow.price,
          description: `Bearish BOS — price broke below swing low at ${lastSwingLow.price.toFixed(2)}, confirming downtrend continuation.`,
        });
      } else if (isUptrend) {
        breaks.push({
          type: 'choch',
          direction: 'bearish',
          index: closes.length - 1,
          level: lastSwingLow.price,
          description: `Bearish CHoCH — price broke below swing low at ${lastSwingLow.price.toFixed(2)} against prevailing uptrend. Potential reversal.`,
        });
      }
    }
  }

  return breaks;
}

// ─── Supply / Demand Zones ───────────────────────────────────

export interface Zone {
  type: 'supply' | 'demand';
  upper: number;
  lower: number;
  strength: number; // 1-3 based on how many times tested
  description: string;
}

/**
 * Identify supply (resistance) and demand (support) zones by clustering
 * swing points and measuring how many times price reversed at similar levels.
 */
export function detectSupplyDemandZones(
  closes: number[],
  swings: SwingPoint[],
  atrValue: number,
): Zone[] {
  const zones: Zone[] = [];
  if (swings.length < 2 || atrValue <= 0) return zones;

  const clusterThreshold = atrValue * 0.5; // points within 0.5 ATR are in the same zone

  // Cluster swing highs into supply zones
  const highs = swings.filter(s => s.type === 'high').map(s => s.price);
  const highClusters = clusterLevels(highs, clusterThreshold);

  for (const cluster of highClusters) {
    const avg = cluster.reduce((a, b) => a + b, 0) / cluster.length;
    zones.push({
      type: 'supply',
      upper: avg + atrValue * 0.3,
      lower: avg - atrValue * 0.3,
      strength: Math.min(3, cluster.length),
      description: `Supply zone at ~${avg.toFixed(2)} (tested ${cluster.length}×). Price reversed down from this level.`,
    });
  }

  // Cluster swing lows into demand zones
  const lows = swings.filter(s => s.type === 'low').map(s => s.price);
  const lowClusters = clusterLevels(lows, clusterThreshold);

  for (const cluster of lowClusters) {
    const avg = cluster.reduce((a, b) => a + b, 0) / cluster.length;
    zones.push({
      type: 'demand',
      upper: avg + atrValue * 0.3,
      lower: avg - atrValue * 0.3,
      strength: Math.min(3, cluster.length),
      description: `Demand zone at ~${avg.toFixed(2)} (tested ${cluster.length}×). Price bounced up from this level.`,
    });
  }

  return zones;
}

function clusterLevels(levels: number[], threshold: number): number[][] {
  if (levels.length === 0) return [];
  const sorted = [...levels].sort((a, b) => a - b);
  const clusters: number[][] = [[sorted[0]]];

  for (let i = 1; i < sorted.length; i++) {
    const lastCluster = clusters[clusters.length - 1];
    const clusterAvg = lastCluster.reduce((a, b) => a + b, 0) / lastCluster.length;
    if (Math.abs(sorted[i] - clusterAvg) <= threshold) {
      lastCluster.push(sorted[i]);
    } else {
      clusters.push([sorted[i]]);
    }
  }

  // Only return clusters with 2+ touches (meaningful zones)
  return clusters.filter(c => c.length >= 2);
}

// ─── Supply/Demand Zone Scoring ──────────────────────────────

/**
 * Score current price position relative to supply/demand zones.
 * Returns negative score if near a supply zone (bearish), positive if near demand (bullish).
 */
export function scoreZoneProximity(
  currentPrice: number,
  zones: Zone[],
  atrValue: number,
): { score: number; nearestZone: Zone | null; explanation: string } {
  if (zones.length === 0 || atrValue <= 0) {
    return { score: 0, nearestZone: null, explanation: 'No supply/demand zones detected.' };
  }

  const proximityThreshold = atrValue * 1.0; // within 1 ATR of zone
  let bestScore = 0;
  let nearestZone: Zone | null = null;

  for (const zone of zones) {
    const zoneMid = (zone.upper + zone.lower) / 2;
    const distance = Math.abs(currentPrice - zoneMid);

    if (distance > proximityThreshold) continue;

    const proximityFactor = 1 - (distance / proximityThreshold); // 0-1, 1 = at zone

    if (zone.type === 'supply' && currentPrice >= zone.lower - atrValue * 0.2) {
      // Near or in supply zone → bearish
      const zoneScore = -proximityFactor * zone.strength;
      if (Math.abs(zoneScore) > Math.abs(bestScore)) {
        bestScore = zoneScore;
        nearestZone = zone;
      }
    } else if (zone.type === 'demand' && currentPrice <= zone.upper + atrValue * 0.2) {
      // Near or in demand zone → bullish
      const zoneScore = proximityFactor * zone.strength;
      if (Math.abs(zoneScore) > Math.abs(bestScore)) {
        bestScore = zoneScore;
        nearestZone = zone;
      }
    }
  }

  const explanation = nearestZone
    ? nearestZone.type === 'supply'
      ? `Price approaching supply zone (${nearestZone.lower.toFixed(2)}-${nearestZone.upper.toFixed(2)}). Rejection risk elevated.`
      : `Price near demand zone (${nearestZone.lower.toFixed(2)}-${nearestZone.upper.toFixed(2)}). Bounce potential.`
    : 'Not near any significant supply/demand zones.';

  return { score: Math.max(-3, Math.min(3, Math.round(bestScore))), nearestZone, explanation };
}

// ─── Fibonacci Retracement Scoring ───────────────────────────

export interface FibLevel {
  ratio: number;
  label: string;
  price: number;
}

export function computeFibLevels(closes: number[], lookback = 60): FibLevel[] {
  const segment = closes.slice(-Math.min(lookback, closes.length));
  const high = Math.max(...segment);
  const low = Math.min(...segment);
  const diff = high - low;

  if (diff <= 0) return [];

  // Determine trend direction to orient fib correctly
  const highIdx = segment.indexOf(high);
  const lowIdx = segment.indexOf(low);
  const isUpswing = lowIdx < highIdx; // low came first → measuring retracement of upswing

  const ratios = [
    { ratio: 0, label: '0%' },
    { ratio: 0.236, label: '23.6%' },
    { ratio: 0.382, label: '38.2%' },
    { ratio: 0.5, label: '50%' },
    { ratio: 0.618, label: '61.8%' },
    { ratio: 0.786, label: '78.6%' },
    { ratio: 1, label: '100%' },
  ];

  return ratios.map(r => ({
    ...r,
    price: isUpswing
      ? high - diff * r.ratio // retracement from top
      : low + diff * r.ratio, // retracement from bottom
  }));
}

/**
 * Score based on proximity to key fib levels (0.382, 0.5, 0.618).
 * Price near these levels in the direction of support → bullish bounce likely.
 * Price near these levels as resistance → bearish rejection likely.
 */
export function scoreFibProximity(
  currentPrice: number,
  fibLevels: FibLevel[],
  atrValue: number,
): { score: number; nearestFib: FibLevel | null; explanation: string } {
  if (fibLevels.length === 0 || atrValue <= 0) {
    return { score: 0, nearestFib: null, explanation: 'Insufficient data for Fibonacci analysis.' };
  }

  const keyRatios = [0.382, 0.5, 0.618];
  const keyLevels = fibLevels.filter(f => keyRatios.includes(f.ratio));

  let nearestFib: FibLevel | null = null;
  let minDist = Infinity;

  for (const level of keyLevels) {
    const dist = Math.abs(currentPrice - level.price);
    if (dist < minDist) {
      minDist = dist;
      nearestFib = level;
    }
  }

  if (!nearestFib || minDist > atrValue * 1.5) {
    return { score: 0, nearestFib: null, explanation: 'Price not near any key Fibonacci level.' };
  }

  // If price is near a fib level, it acts as support/resistance
  const proximityFactor = 1 - (minDist / (atrValue * 1.5));
  const isBelow = currentPrice < nearestFib.price;

  // Fib levels act as support when approached from above, resistance from below
  // The 0.618 level is strongest
  const levelStrength = nearestFib.ratio === 0.618 ? 1.5 : nearestFib.ratio === 0.5 ? 1.2 : 1.0;
  const score = Math.round(
    (isBelow ? -1 : 1) * proximityFactor * levelStrength
  );

  const explanation = `Price near Fibonacci ${nearestFib.label} level ($${nearestFib.price.toFixed(2)}). ` +
    (isBelow
      ? `This level may act as resistance — rejection possible.`
      : `This level may act as support — bounce potential.`);

  return { score: Math.max(-2, Math.min(2, score)), nearestFib, explanation };
}

// ─── Volume Profile Analysis ─────────────────────────────────

/**
 * Enhanced volume scoring that detects:
 * - Volume declining on rallies (distribution / bearish)
 * - Volume increasing on selloffs (capitulation → bullish reversal)
 * - Above-average volume confirming breakouts
 */
export function scoreVolumeProfile(
  closes: number[],
  volumes: number[],
  lookback = 20,
): { score: number; explanation: string } {
  if (!volumes || volumes.length < lookback || !volumes.some(v => v > 0)) {
    return { score: 0, explanation: 'Volume data insufficient.' };
  }

  const recentCloses = closes.slice(-lookback);
  const recentVols = volumes.slice(-lookback);

  // Split into up-days and down-days
  let upVol = 0, downVol = 0, upCount = 0, downCount = 0;
  for (let i = 1; i < recentCloses.length; i++) {
    if (recentCloses[i] > recentCloses[i - 1]) {
      upVol += recentVols[i];
      upCount++;
    } else if (recentCloses[i] < recentCloses[i - 1]) {
      downVol += recentVols[i];
      downCount++;
    }
  }

  const avgUpVol = upCount > 0 ? upVol / upCount : 0;
  const avgDownVol = downCount > 0 ? downVol / downCount : 0;

  // Volume trend (are recent volumes higher or lower than average?)
  const avgVol = recentVols.reduce((a, b) => a + b, 0) / recentVols.length;
  const recentAvgVol = recentVols.slice(-5).reduce((a, b) => a + b, 0) / 5;
  const volTrend = avgVol > 0 ? (recentAvgVol - avgVol) / avgVol : 0;

  let score = 0;
  let explanation = '';

  if (avgUpVol > 0 && avgDownVol > 0) {
    const ratio = avgUpVol / avgDownVol;

    if (ratio > 1.5) {
      // Significantly more volume on up-days → bullish
      score = 2;
      explanation = `Buying pressure dominant — average up-day volume ${ratio.toFixed(1)}× down-day volume. Smart money accumulating.`;
    } else if (ratio < 0.67) {
      // Significantly more volume on down-days → bearish
      score = -2;
      explanation = `Selling pressure dominant — average down-day volume ${(1/ratio).toFixed(1)}× up-day volume. Distribution pattern.`;
    } else if (volTrend > 0.3) {
      // Volume increasing overall
      const priceUp = recentCloses[recentCloses.length - 1] > recentCloses[0];
      score = priceUp ? 1 : -1;
      explanation = priceUp
        ? 'Volume rising with price — trend confirmation.'
        : 'Volume rising on decline — selling pressure intensifying.';
    } else if (volTrend < -0.3) {
      // Volume decreasing
      const priceUp = recentCloses[recentCloses.length - 1] > recentCloses[0];
      score = priceUp ? -1 : 1;
      explanation = priceUp
        ? 'Price rising on declining volume — rally losing conviction. Bearish divergence.'
        : 'Price falling on declining volume — selling exhaustion possible.';
    } else {
      explanation = 'Volume profile neutral — no strong conviction from either side.';
    }
  } else {
    explanation = 'Insufficient up/down day data for volume profile analysis.';
  }

  return { score: Math.max(-3, Math.min(3, score)), explanation };
}
