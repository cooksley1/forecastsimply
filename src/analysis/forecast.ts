import type { ForecastPoint } from '@/types/analysis';

function linearRegression(data: number[]): { slope: number; intercept: number } {
  const n = data.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  for (let i = 0; i < n; i++) {
    sumX += i; sumY += data[i];
    sumXY += i * data[i]; sumX2 += i * i;
  }
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  return { slope, intercept };
}

export function generateForecast(
  closes: number[],
  timestamps: number[],
  forecastPercent: number
): { forecast: ForecastPoint[]; target: number } {
  const lookback = Math.max(Math.floor(closes.length * 0.4), 10);
  const recentPrices = closes.slice(-lookback);
  const { slope, intercept } = linearRegression(recentPrices);

  // Daily volatility
  const returns: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    returns.push((closes[i] - closes[i - 1]) / closes[i - 1]);
  }
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((a, b) => a + (b - mean) ** 2, 0) / returns.length;
  const dailyVol = Math.sqrt(variance);

  const projLen = Math.max(5, Math.floor(closes.length * forecastPercent / 100));
  const lastTimestamp = timestamps[timestamps.length - 1];
  const avgGap = timestamps.length > 1
    ? (timestamps[timestamps.length - 1] - timestamps[0]) / (timestamps.length - 1)
    : 86400000;

  const currentPrice = closes[closes.length - 1];
  const rangeLow = Math.min(...closes);
  const rangeHigh = Math.max(...closes);

  const points: ForecastPoint[] = [];
  for (let i = 1; i <= projLen; i++) {
    const trendValue = intercept + slope * (lookback + i);
    // Add wave pattern
    const wave = Math.sin((i / projLen) * Math.PI * 2) * currentPrice * dailyVol * 0.5;
    let value = trendValue + wave;

    // Clamp
    value = Math.max(rangeLow * 0.85, Math.min(rangeHigh * 1.15, value));

    const bandWidth = currentPrice * dailyVol * Math.sqrt(i) * 1.5;

    points.push({
      timestamp: lastTimestamp + avgGap * i,
      value,
      upper: value + bandWidth,
      lower: Math.max(0, value - bandWidth),
    });
  }

  let target = intercept + slope * (lookback + projLen);
  target = Math.max(rangeLow * 0.85, Math.min(rangeHigh * 1.15, target));

  return { forecast: points, target };
}
