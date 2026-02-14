import type { ForecastPoint } from '@/types/analysis';
import type { AssetType } from '@/types/assets';

/**
 * Weighted linear regression — recent data points weighted more heavily
 */
function weightedLinearRegression(data: number[], decayFactor = 0.97): { slope: number; intercept: number } {
  const n = data.length;
  let sumW = 0, sumWX = 0, sumWY = 0, sumWXY = 0, sumWX2 = 0;
  for (let i = 0; i < n; i++) {
    const w = Math.pow(decayFactor, n - 1 - i); // more weight on recent
    sumW += w;
    sumWX += w * i;
    sumWY += w * data[i];
    sumWXY += w * i * data[i];
    sumWX2 += w * i * i;
  }
  const denom = sumW * sumWX2 - sumWX * sumWX;
  if (Math.abs(denom) < 1e-12) return { slope: 0, intercept: data[data.length - 1] };
  const slope = (sumW * sumWXY - sumWX * sumWY) / denom;
  const intercept = (sumWY - slope * sumWX) / sumW;
  return { slope, intercept };
}

/**
 * Compute momentum: acceleration of price change (second derivative)
 */
function computeMomentum(closes: number[]): number {
  if (closes.length < 10) return 0;
  const recent = closes.slice(-10);
  const mid = Math.floor(recent.length / 2);
  const firstHalfReturn = (recent[mid] - recent[0]) / recent[0];
  const secondHalfReturn = (recent[recent.length - 1] - recent[mid]) / recent[mid];
  return secondHalfReturn - firstHalfReturn; // positive = accelerating, negative = decelerating
}

/**
 * Volatility multipliers by asset type
 */
function getVolatilityScale(assetType: AssetType): number {
  switch (assetType) {
    case 'crypto': return 1.8;
    case 'stocks': return 1.2;
    case 'etfs': return 0.9;
    case 'forex': return 0.6;
    default: return 1.0;
  }
}

/**
 * Mean reversion strength by asset type (forex reverts more, crypto less)
 */
function getMeanReversionStrength(assetType: AssetType): number {
  switch (assetType) {
    case 'forex': return 0.15;
    case 'etfs': return 0.08;
    case 'stocks': return 0.05;
    case 'crypto': return 0.02;
    default: return 0.05;
  }
}

export function generateForecast(
  closes: number[],
  timestamps: number[],
  forecastPercent: number,
  assetType: AssetType = 'crypto'
): { forecast: ForecastPoint[]; target: number } {
  if (closes.length < 5) {
    return { forecast: [], target: closes[closes.length - 1] || 0 };
  }

  const currentPrice = closes[closes.length - 1];

  // Use different lookback windows for short vs long term trend
  const shortLookback = Math.max(Math.floor(closes.length * 0.2), 5);
  const longLookback = Math.max(Math.floor(closes.length * 0.5), 10);

  const shortPrices = closes.slice(-shortLookback);
  const longPrices = closes.slice(-longLookback);

  const shortReg = weightedLinearRegression(shortPrices, 0.95);
  const longReg = weightedLinearRegression(longPrices, 0.98);

  // Blend short and long term trends (60/40 favoring short-term)
  const blendedSlope = shortReg.slope * 0.6 + longReg.slope * 0.4;

  // Momentum adjustment
  const momentum = computeMomentum(closes);
  const momentumAdjustment = momentum * currentPrice * 0.3;

  // Daily volatility from returns
  const returns: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    returns.push((closes[i] - closes[i - 1]) / closes[i - 1]);
  }
  const meanReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((a, b) => a + (b - meanReturn) ** 2, 0) / returns.length;
  const dailyVol = Math.sqrt(variance);

  const volScale = getVolatilityScale(assetType);
  const meanReversion = getMeanReversionStrength(assetType);

  // Compute long-term mean for mean reversion
  const longTermMean = closes.reduce((a, b) => a + b, 0) / closes.length;

  // Projection length based on forecast percent
  const projLen = Math.max(5, Math.floor(closes.length * forecastPercent / 100));
  const lastTimestamp = timestamps[timestamps.length - 1];
  const avgGap = timestamps.length > 1
    ? (timestamps[timestamps.length - 1] - timestamps[0]) / (timestamps.length - 1)
    : 86400000;

  const points: ForecastPoint[] = [];
  let prevValue = currentPrice;

  for (let i = 1; i <= projLen; i++) {
    const t = i / projLen; // 0 to 1

    // Base trend from blended regression
    let trendDelta = blendedSlope * i;

    // Add decaying momentum
    trendDelta += momentumAdjustment * Math.exp(-t * 2);

    // Mean reversion pull (increases over time)
    const reversionPull = (longTermMean - currentPrice) * meanReversion * t;

    let value = currentPrice + trendDelta + reversionPull;

    // Smooth transition: blend with previous value to prevent sharp jumps
    value = prevValue * 0.15 + value * 0.85;

    // Ensure no negative prices (except forex which can go very low but not negative)
    value = Math.max(value, currentPrice * 0.01);

    prevValue = value;

    // Confidence bands widen over time, scaled by asset volatility
    const bandWidth = currentPrice * dailyVol * Math.sqrt(i) * 1.2 * volScale;

    points.push({
      timestamp: lastTimestamp + avgGap * i,
      value,
      upper: value + bandWidth,
      lower: Math.max(assetType === 'forex' ? 0 : currentPrice * 0.01, value - bandWidth),
    });
  }

  const target = points[points.length - 1]?.value || currentPrice;

  return { forecast: points, target };
}
