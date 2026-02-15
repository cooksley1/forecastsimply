import { sma, rsi, bollingerBands, macd, stochastic, findSupportResistance } from './indicators';
import { computeSignal } from './signals';
import { generateForecast, FORECAST_METHODS } from './forecast';
import type { ForecastMethodId } from './forecast';
import { generateRecommendations } from './recommendations';
import { generateTradeSetups } from './tradeSetup';
import type { TechnicalData, Indicators } from '@/types/analysis';
import type { AssetType } from '@/types/assets';

function downsample<T>(arr: T[], target: number): T[] {
  if (arr.length <= target) return arr;
  const step = arr.length / target;
  const result: T[] = [];
  for (let i = 0; i < target; i++) result.push(arr[Math.floor(i * step)]);
  // Always include last
  result[result.length - 1] = arr[arr.length - 1];
  return result;
}

function detectMarketPhase(closes: number[], sma20Arr: number[], sma50Arr: number[]): string {
  const lastPrice = closes[closes.length - 1];
  const lastSma20 = sma20Arr.filter(v => !isNaN(v)).pop() || lastPrice;
  const lastSma50 = sma50Arr.filter(v => !isNaN(v)).pop() || lastPrice;

  // Compute slope from last 20 data points
  const recent = closes.slice(-20);
  const n = recent.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  for (let i = 0; i < n; i++) { sumX += i; sumY += recent[i]; sumXY += i * recent[i]; sumX2 += i * i; }
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const normSlope = slope / lastPrice;

  if (lastPrice > lastSma20 && lastSma20 > lastSma50 && normSlope > 0.001) return 'Markup / Uptrend';
  if (lastPrice < lastSma20 && lastSma20 < lastSma50 && normSlope < -0.001) return 'Markdown / Downtrend';
  if (lastPrice < lastSma20 && lastSma20 > lastSma50) return 'Distribution';
  if (lastPrice > lastSma20 && lastSma20 < lastSma50) return 'Accumulation';

  // Check consolidation: 20d range < 3x daily vol
  const range20 = Math.max(...closes.slice(-20)) - Math.min(...closes.slice(-20));
  const returns = [];
  for (let i = 1; i < closes.length; i++) returns.push(Math.abs(closes[i] - closes[i-1]));
  const avgDailyMove = returns.reduce((a,b)=>a+b,0)/returns.length;
  if (range20 < avgDailyMove * 3) return 'Consolidation';

  if (normSlope > 0) return 'Recovery';
  return 'Decline';
}

const FORECAST_COLORS: Record<ForecastMethodId, string> = {
  holt: 'hsl(142 71% 45%)',
  ema_momentum: 'hsl(263 91% 66%)',
  monte_carlo: 'hsl(38 92% 50%)',
};

export function processTA(
  rawCloses: number[],
  rawTimestamps: number[],
  rawVolumes: number[],
  forecastPercent: number,
  assetType: AssetType,
  forecastMethods: ForecastMethodId[] = ['holt']
): TechnicalData {
  // Downsample
  const maxPoints = 200;
  const closes = downsample(rawCloses, maxPoints);
  const timestamps = downsample(rawTimestamps, maxPoints);
  const volumes = downsample(rawVolumes, maxPoints);

  // Indicators
  const sma20 = sma(closes, 20);
  const sma50 = sma(closes, Math.min(50, Math.floor(closes.length * 0.4)));
  const rsiValues = rsi(closes);
  const bb = bollingerBands(closes);
  const macdResult = macd(closes);
  const stoch = stochastic(closes);
  const { support, resistance } = findSupportResistance(closes);

  const currentRsi = rsiValues.filter(v => !isNaN(v)).pop() || 50;

  const indicators: Indicators = {
    sma20,
    sma50,
    rsi: rsiValues,
    currentRsi,
    bbUpper: bb.upper,
    bbMiddle: bb.middle,
    bbLower: bb.lower,
    macdLine: macdResult.line,
    macdSignal: macdResult.signal,
    macdHistogram: macdResult.histogram,
    stochasticK: stoch.k,
    stochasticD: stoch.d,
    support,
    resistance,
  };

  const currentPrice = closes[closes.length - 1];
  const signal = computeSignal(indicators, currentPrice);
  const primaryMethod = forecastMethods[0] || 'holt';
  const { forecast, target } = generateForecast(closes, timestamps, forecastPercent, assetType, primaryMethod);

  // Generate all selected forecasts
  const forecasts: import('@/types/analysis').NamedForecast[] = forecastMethods.map(methodId => {
    const info = FORECAST_METHODS.find(m => m.id === methodId);
    const { forecast: pts, target: t } = generateForecast(closes, timestamps, forecastPercent, assetType, methodId);
    return {
      methodId,
      label: info?.shortName || methodId,
      points: pts,
      target: t,
      color: FORECAST_COLORS[methodId] || 'hsl(142 71% 45%)',
    };
  });
  const recommendations = generateRecommendations(signal, currentPrice, support, resistance, target, assetType, currentRsi);
  const tradeSetups = generateTradeSetups(support, resistance, signal);
  const marketPhase = detectMarketPhase(closes, sma20, sma50);

  // Analysis text
  const dailyVol = (() => {
    const rets = [];
    for (let i = 1; i < closes.length; i++) rets.push((closes[i]-closes[i-1])/closes[i-1]);
    const m = rets.reduce((a,b)=>a+b,0)/rets.length;
    return Math.sqrt(rets.reduce((a,b)=>a+(b-m)**2,0)/rets.length) * 100;
  })();

  const lastSma20 = sma20.filter(v=>!isNaN(v)).pop();
  const lastSma50 = sma50.filter(v=>!isNaN(v)).pop();
  const smaRelation = lastSma20 && lastSma50 && lastSma20 > lastSma50 ? 'above' : 'below';
  const crossType = smaRelation === 'above' ? 'golden cross — bullish' : 'death cross — bearish';
  const targetChange = ((target - currentPrice) / currentPrice * 100).toFixed(2);

  const analysisText = `The asset is currently in a **${marketPhase}** phase at **$${currentPrice.toLocaleString(undefined, {minimumFractionDigits: 2})}**. RSI at **${currentRsi.toFixed(0)}** (${currentRsi < 30 ? 'oversold' : currentRsi > 70 ? 'overbought' : 'neutral zone'}). SMA20 is **${smaRelation}** SMA50 (${crossType} structure). Daily volatility is **${dailyVol.toFixed(2)}%**. Projected target: **$${target.toLocaleString(undefined, {minimumFractionDigits: 2})}** (${Number(targetChange) >= 0 ? '+' : ''}${targetChange}%).`;

  return {
    prices: closes.map((close, i) => ({ timestamp: timestamps[i], close, volume: volumes[i] })),
    indicators,
    signal,
    recommendations,
    tradeSetups,
    forecast,
    forecastTarget: target,
    forecasts,
    marketPhase,
    analysisText,
  };
}
