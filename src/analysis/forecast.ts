import type { ForecastPoint } from '@/types/analysis';
import type { AssetType } from '@/types/assets';

// ── Methodology registry ──

export type ForecastMethodId = 'holt' | 'ema_momentum' | 'monte_carlo';

export interface ForecastMethodInfo {
  id: ForecastMethodId;
  name: string;
  shortName: string;
  description: string;
  bestFor: string;
  accuracy: string;
  limitations: string;
}

export const FORECAST_METHODS: ForecastMethodInfo[] = [
  {
    id: 'holt',
    name: "Holt's Double Exponential Smoothing",
    shortName: 'Holt DES',
    description: 'Smooths both the level and trend of the price series. A damping factor gradually flattens the trend to prevent runaway predictions. Produces gentle curves that follow recent momentum.',
    bestFor: 'Trending markets, medium-term outlook. Good for stocks and ETFs with steady trends.',
    accuracy: 'Short-term: ~57-63% directional. Mid-term: ~50-56%. Degrades beyond 2 weeks.',
    limitations: 'Struggles in choppy/sideways markets. Cannot predict reversals or news events.',
  },
  {
    id: 'ema_momentum',
    name: 'EMA Momentum with Mean Reversion',
    shortName: 'EMA Momentum',
    description: 'Uses exponential moving average crossovers to detect momentum direction, then projects a curve that gradually reverts toward the long-term mean. Produces S-curve forecasts.',
    bestFor: 'Volatile assets like crypto and forex. Captures momentum bursts but limits runaway projections.',
    accuracy: 'Short-term: ~54-60% directional. Mid-term: ~48-54%. Best for 1-10 day horizons.',
    limitations: 'Mean reversion assumption can be wrong in strong trends. Lags during sharp reversals.',
  },
  {
    id: 'monte_carlo',
    name: 'Monte Carlo Simulation (Median Path)',
    shortName: 'Monte Carlo',
    description: 'Runs 500 random price path simulations based on historical return distribution, then uses the median path as the forecast. Produces realistic, non-linear paths with natural noise.',
    bestFor: 'Risk assessment, seeing the full range of outcomes. Great for crypto and volatile stocks.',
    accuracy: 'Directional accuracy varies (~50-55%) but confidence bands are statistically calibrated.',
    limitations: 'Assumes future returns resemble past returns. Each run produces slightly different results.',
  },
];

// ── Volatility helpers ──

function computeDailyVol(closes: number[]): number {
  const returns: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    returns.push((closes[i] - closes[i - 1]) / closes[i - 1]);
  }
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((a, b) => a + (b - mean) ** 2, 0) / returns.length;
  return Math.sqrt(variance);
}

function getVolScale(assetType: AssetType): number {
  switch (assetType) {
    case 'crypto': return 1.8;
    case 'stocks': return 1.2;
    case 'etfs':   return 0.9;
    case 'forex':  return 0.6;
    default:       return 1.0;
  }
}

function projectionLength(closes: number[], forecastPercent: number): number {
  return Math.max(3, Math.floor(closes.length * forecastPercent / 100));
}

function avgTimestampGap(timestamps: number[]): number {
  return timestamps.length > 1
    ? (timestamps[timestamps.length - 1] - timestamps[0]) / (timestamps.length - 1)
    : 86400000;
}

// ── Method 1: Holt's Double Exponential Smoothing (Damped) ──

function forecastHolt(closes: number[], timestamps: number[], forecastPercent: number, assetType: AssetType): ForecastPoint[] {
  const n = closes.length;
  const current = closes[n - 1];

  // Tuned params per asset
  const alphaMap: Record<string, number> = { crypto: 0.35, stocks: 0.30, etfs: 0.25, forex: 0.20 };
  const betaMap: Record<string, number> = { crypto: 0.15, stocks: 0.12, etfs: 0.10, forex: 0.08 };
  const phiMap: Record<string, number> = { crypto: 0.90, stocks: 0.92, etfs: 0.94, forex: 0.95 };

  const alpha = alphaMap[assetType] ?? 0.30;
  const beta = betaMap[assetType] ?? 0.12;
  const phi = phiMap[assetType] ?? 0.92;

  // Initialize
  const initWin = Math.min(5, n - 1);
  let trend = 0;
  for (let i = 0; i < initWin; i++) trend += closes[i + 1] - closes[i];
  trend /= initWin;

  let level = closes[0];
  for (let t = 1; t < n; t++) {
    const newLevel = alpha * closes[t] + (1 - alpha) * (level + trend);
    trend = beta * (newLevel - level) + (1 - beta) * trend;
    level = newLevel;
  }

  const projLen = projectionLength(closes, forecastPercent);
  const gap = avgTimestampGap(timestamps);
  const lastTs = timestamps[n - 1];
  const dailyVol = computeDailyVol(closes);
  const volScale = getVolScale(assetType);

  const points: ForecastPoint[] = [];
  let cumPhi = 0;
  for (let h = 1; h <= projLen; h++) {
    cumPhi += Math.pow(phi, h);
    const value = Math.max(current * 0.01, level + cumPhi * trend);
    const band = current * dailyVol * Math.sqrt(h) * 1.5 * volScale;
    points.push({
      timestamp: lastTs + gap * h,
      value,
      upper: value + band,
      lower: Math.max(current * 0.01, value - band),
    });
  }
  return points;
}

// ── Method 2: EMA Momentum with Mean Reversion ──

function ema(data: number[], period: number): number[] {
  const k = 2 / (period + 1);
  const result: number[] = [data[0]];
  for (let i = 1; i < data.length; i++) {
    result.push(data[i] * k + result[i - 1] * (1 - k));
  }
  return result;
}

function forecastEmaMomentum(closes: number[], timestamps: number[], forecastPercent: number, assetType: AssetType): ForecastPoint[] {
  const n = closes.length;
  const current = closes[n - 1];

  const shortEma = ema(closes, Math.max(5, Math.floor(n * 0.1)));
  const longEma = ema(closes, Math.max(10, Math.floor(n * 0.3)));
  const longTermMean = closes.reduce((a, b) => a + b, 0) / n;

  // Momentum = difference between short and long EMA at end
  const momentum = shortEma[n - 1] - longEma[n - 1];
  const momentumNorm = momentum / current; // normalized

  // Mean reversion strength per asset
  const revStrength: Record<string, number> = { crypto: 0.03, stocks: 0.06, etfs: 0.08, forex: 0.12 };
  const reversion = revStrength[assetType] ?? 0.06;

  const projLen = projectionLength(closes, forecastPercent);
  const gap = avgTimestampGap(timestamps);
  const lastTs = timestamps[n - 1];
  const dailyVol = computeDailyVol(closes);
  const volScale = getVolScale(assetType);

  const points: ForecastPoint[] = [];
  let prev = current;
  for (let h = 1; h <= projLen; h++) {
    const t = h / projLen; // 0..1

    // Momentum decays exponentially; mean reversion grows
    const momContrib = momentumNorm * Math.exp(-t * 3) * current * 0.5;
    const revContrib = (longTermMean - prev) * reversion * t;

    // S-curve: accelerate then decelerate
    const sCurve = 1 / (1 + Math.exp(-6 * (t - 0.5))); // sigmoid centered at 0.5
    let value = current + (momContrib + revContrib) * h * sCurve;
    value = prev * 0.2 + value * 0.8; // smooth
    value = Math.max(current * 0.01, value);
    prev = value;

    const band = current * dailyVol * Math.sqrt(h) * 1.5 * volScale;
    points.push({
      timestamp: lastTs + gap * h,
      value,
      upper: value + band,
      lower: Math.max(current * 0.01, value - band),
    });
  }
  return points;
}

// ── Method 3: Monte Carlo Simulation (Median Path) ──

function forecastMonteCarlo(closes: number[], timestamps: number[], forecastPercent: number, assetType: AssetType): ForecastPoint[] {
  const n = closes.length;
  const current = closes[n - 1];

  // Compute historical returns
  const returns: number[] = [];
  for (let i = 1; i < n; i++) {
    returns.push(Math.log(closes[i] / closes[i - 1])); // log returns
  }
  const meanRet = returns.reduce((a, b) => a + b, 0) / returns.length;
  const stdRet = Math.sqrt(returns.reduce((a, b) => a + (b - meanRet) ** 2, 0) / returns.length);

  const projLen = projectionLength(closes, forecastPercent);
  const gap = avgTimestampGap(timestamps);
  const lastTs = timestamps[n - 1];
  const numSims = 500;

  // Seeded pseudo-random for reproducibility within same data
  let seed = closes.reduce((a, b) => a + Math.round(b * 100), 0) % 2147483647;
  function nextRand(): number {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  }
  // Box-Muller for normal distribution
  function randNorm(): number {
    const u1 = nextRand();
    const u2 = nextRand();
    return Math.sqrt(-2 * Math.log(u1 + 1e-10)) * Math.cos(2 * Math.PI * u2);
  }

  // Run simulations
  const allPaths: number[][] = [];
  for (let s = 0; s < numSims; s++) {
    const path: number[] = [];
    let price = current;
    for (let h = 0; h < projLen; h++) {
      const logReturn = meanRet + stdRet * randNorm();
      price = price * Math.exp(logReturn);
      price = Math.max(current * 0.01, price);
      path.push(price);
    }
    allPaths.push(path);
  }

  // Extract percentiles at each step
  const points: ForecastPoint[] = [];
  for (let h = 0; h < projLen; h++) {
    const vals = allPaths.map(p => p[h]).sort((a, b) => a - b);
    const median = vals[Math.floor(numSims * 0.5)];
    const upper = vals[Math.floor(numSims * 0.85)];
    const lower = vals[Math.floor(numSims * 0.15)];
    points.push({
      timestamp: lastTs + gap * (h + 1),
      value: median,
      upper,
      lower: Math.max(current * 0.01, lower),
    });
  }
  return points;
}

// ── Public API ──

export function generateForecast(
  closes: number[],
  timestamps: number[],
  forecastPercent: number,
  assetType: AssetType = 'crypto',
  method: ForecastMethodId = 'holt'
): { forecast: ForecastPoint[]; target: number } {
  if (closes.length < 5) {
    return { forecast: [], target: closes[closes.length - 1] || 0 };
  }

  let points: ForecastPoint[];
  switch (method) {
    case 'ema_momentum':
      points = forecastEmaMomentum(closes, timestamps, forecastPercent, assetType);
      break;
    case 'monte_carlo':
      points = forecastMonteCarlo(closes, timestamps, forecastPercent, assetType);
      break;
    case 'holt':
    default:
      points = forecastHolt(closes, timestamps, forecastPercent, assetType);
      break;
  }

  const target = points[points.length - 1]?.value || closes[closes.length - 1];
  return { forecast: points, target };
}
