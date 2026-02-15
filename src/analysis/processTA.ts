import { sma, rsi, bollingerBands, macd, stochastic, findSupportResistance, calcATR, calcOBV, calcVWAP } from './indicators';
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
  result[result.length - 1] = arr[arr.length - 1];
  return result;
}

function detectMarketPhase(closes: number[], sma20Arr: number[], sma50Arr: number[]): string {
  const lastPrice = closes[closes.length - 1];
  const lastSma20 = sma20Arr.filter(v => !isNaN(v)).pop() || lastPrice;
  const lastSma50 = sma50Arr.filter(v => !isNaN(v)).pop() || lastPrice;

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

function generateAnalysisText(
  currentPrice: number,
  marketPhase: string,
  currentRsi: number,
  sma20Arr: number[],
  sma50Arr: number[],
  sma200Arr: number[] | undefined,
  closes: number[],
  target: number,
  stochK: number[],
  bbUpper: number[],
  bbLower: number[],
  macdLine: number[],
  macdSignal: number[],
  macdHist: number[],
  obv: number[] | undefined,
  volumes: number[],
  support: number,
  resistance: number,
  signalLabel: string,
  signalConfidence: number,
  signalScore: number,
): string {
  const lastSma20 = sma20Arr.filter(v => !isNaN(v)).pop();
  const lastSma50 = sma50Arr.filter(v => !isNaN(v)).pop();
  const smaRelation = lastSma20 && lastSma50 && lastSma20 > lastSma50 ? 'above' : 'below';
  const crossType = smaRelation === 'above' ? 'golden cross — bullish' : 'death cross — bearish';

  // Volatility
  const rets = [];
  for (let i = 1; i < closes.length; i++) rets.push((closes[i]-closes[i-1])/closes[i-1]);
  const m = rets.reduce((a,b)=>a+b,0)/rets.length;
  const dailyVol = Math.sqrt(rets.reduce((a,b)=>a+(b-m)**2,0)/rets.length) * 100;

  // BB width
  const lastBBU = bbUpper.filter(v => !isNaN(v)).pop();
  const lastBBL = bbLower.filter(v => !isNaN(v)).pop();
  const bbWidth = lastBBU && lastBBL && currentPrice > 0 ? ((lastBBU - lastBBL) / currentPrice * 100).toFixed(2) : 'N/A';
  const bbSqueezeComment = lastBBU && lastBBL
    ? (lastBBU - lastBBL) / currentPrice < 0.03 ? 'Bands are tight — potential breakout imminent.' : 'Bands are expanded — elevated volatility.'
    : '';

  // Stochastic
  const lastK = stochK.filter(v => !isNaN(v)).pop() || 50;
  const stochInterp = lastK < 20 ? 'oversold' : lastK > 80 ? 'overbought' : 'neutral';

  // MACD
  const lastMacdLine = macdLine.filter(v => !isNaN(v)).pop() || 0;
  const lastMacdSignal = macdSignal.filter(v => !isNaN(v)).pop() || 0;
  const lastMacdHist = macdHist.filter(v => !isNaN(v));
  const macdAssessment = lastMacdLine > lastMacdSignal
    ? 'bullish — MACD above signal line'
    : lastMacdLine < lastMacdSignal
    ? 'bearish — MACD below signal line'
    : 'neutral';
  const macdMomentum = lastMacdHist.length >= 2
    ? lastMacdHist[lastMacdHist.length - 1] > lastMacdHist[lastMacdHist.length - 2] ? ' with increasing momentum' : ' with decreasing momentum'
    : '';

  // OBV
  const obvText = obv && obv.length > 20 && volumes.some(v => v > 0)
    ? (() => {
        const half = Math.floor(obv.length / 2);
        const obvFirstHalf = obv.slice(half - 10, half).reduce((a,b)=>a+b,0) / 10;
        const obvSecondHalf = obv.slice(-10).reduce((a,b)=>a+b,0) / 10;
        return obvSecondHalf > obvFirstHalf ? 'OBV trending upward — buying volume domination.' : 'OBV trending downward — selling volume domination.';
      })()
    : 'Volume data limited.';

  // Levels
  const supportDist = ((currentPrice - support) / currentPrice * 100).toFixed(1);
  const resistDist = ((resistance - currentPrice) / currentPrice * 100).toFixed(1);

  // SMA200
  const lastSma200 = sma200Arr?.filter(v => !isNaN(v)).pop();
  const sma200Text = lastSma200
    ? currentPrice > lastSma200
      ? ' SMA200 at ' + fmtNum(lastSma200) + ' — price above, long-term bullish.'
      : ' SMA200 at ' + fmtNum(lastSma200) + ' — price below, long-term bearish.'
    : '';

  // Phase commentary
  const phaseComment: Record<string, string> = {
    'Markup / Uptrend': 'Trend likely to continue unless volume weakens.',
    'Markdown / Downtrend': 'Watch for reversal signals at support.',
    'Distribution': 'Smart money may be distributing — caution advised.',
    'Accumulation': 'Potential bottom forming — watch for breakout above SMA20.',
    'Consolidation': 'Low volatility period — expect a directional move soon.',
    'Recovery': 'Early signs of recovery — confirm with volume.',
    'Decline': 'Downside momentum — avoid catching falling knives.',
  };

  const targetChange = ((target - currentPrice) / currentPrice * 100).toFixed(2);
  const nextWatch = signalScore >= 2 ? 'Watch for breakout above resistance.' : signalScore <= -2 ? 'Watch for breakdown below support.' : 'Watch for directional catalyst.';

  return [
    `📈 **TREND:** SMA20 is **${smaRelation}** SMA50 (${crossType} structure).${sma200Text}`,
    `⚡ **MOMENTUM:** RSI at **${currentRsi.toFixed(0)}** — ${currentRsi < 30 ? 'oversold' : currentRsi > 70 ? 'overbought' : 'neutral zone'}. Stochastic %K at **${lastK.toFixed(0)}** — ${stochInterp}.`,
    `📊 **VOLATILITY:** Daily volatility is **${dailyVol.toFixed(2)}%**. Bollinger Band width is **${bbWidth}%**. ${bbSqueezeComment}`,
    `🔄 **MACD:** ${macdAssessment}${macdMomentum}.`,
    `📦 **VOLUME:** ${obvText}`,
    `🎯 **LEVELS:** Support at **${fmtNum(support)}** (${supportDist}% below). Resistance at **${fmtNum(resistance)}** (${resistDist}% above).`,
    `🔮 **PHASE:** Currently in **${marketPhase}**. ${phaseComment[marketPhase] || ''}`,
    `📋 **SUMMARY:** **${signalLabel}** with **${signalConfidence}%** confidence (score ${signalScore}/10). Projected target: **${fmtNum(target)}** (${Number(targetChange) >= 0 ? '+' : ''}${targetChange}%). ${nextWatch}`,
  ].join('\n\n');
}

function fmtNum(v: number): string {
  return '$' + v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function processTA(
  rawCloses: number[],
  rawTimestamps: number[],
  rawVolumes: number[],
  forecastPercent: number,
  assetType: AssetType,
  forecastMethods: ForecastMethodId[] = ['holt']
): TechnicalData {
  const maxPoints = 200;
  const closes = downsample(rawCloses, maxPoints);
  const timestamps = downsample(rawTimestamps, maxPoints);
  const volumes = downsample(rawVolumes, maxPoints);

  // Core indicators
  const sma20 = sma(closes, 20);
  const sma50 = sma(closes, Math.min(50, Math.floor(closes.length * 0.4)));
  const rsiValues = rsi(closes);
  const bb = bollingerBands(closes);
  const macdResult = macd(closes);
  const stoch = stochastic(closes);
  const { support, resistance } = findSupportResistance(closes);

  // New indicators
  const atrValues = calcATR(closes);
  const hasVolume = volumes.some(v => v > 0);
  const obvValues = hasVolume ? calcOBV(closes, volumes) : undefined;
  const vwapValues = (assetType === 'stocks' || assetType === 'etfs') && hasVolume
    ? calcVWAP(closes, volumes)
    : undefined;

  // SMA200 (if enough data)
  const sma200Values = closes.length >= 200
    ? sma(closes, 200)
    : (assetType === 'stocks' || assetType === 'etfs') && closes.length >= 100
    ? sma(closes, closes.length)
    : undefined;

  const currentRsi = rsiValues.filter(v => !isNaN(v)).pop() || 50;

  const indicators: Indicators = {
    sma20,
    sma50,
    sma200: sma200Values,
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
    obv: obvValues,
    atr: atrValues,
    vwap: vwapValues,
    support,
    resistance,
  };

  const currentPrice = closes[closes.length - 1];
  const signal = computeSignal(indicators, currentPrice, closes, volumes, assetType);
  const primaryMethod = forecastMethods[0] || 'holt';
  const { forecast, target } = generateForecast(closes, timestamps, forecastPercent, assetType, primaryMethod);

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

  // BB position for DCA
  const lastBBU = bb.upper.filter(v => !isNaN(v)).pop();
  const lastBBL = bb.lower.filter(v => !isNaN(v)).pop();
  const bbPosition = lastBBU && lastBBL && lastBBU !== lastBBL
    ? (currentPrice - lastBBL) / (lastBBU - lastBBL)
    : 0.5;
  const lastSma20 = sma20.filter(v => !isNaN(v)).pop();
  const lastSma50 = sma50.filter(v => !isNaN(v)).pop();
  const sma200Last = sma200Values?.filter(v => !isNaN(v)).pop();

  const recommendations = generateRecommendations(
    signal, currentPrice, support, resistance, target, assetType, currentRsi,
    bbPosition, lastSma20, lastSma50, sma200Last,
  );
  const tradeSetups = generateTradeSetups(support, resistance, signal, atrValues);
  const marketPhase = detectMarketPhase(closes, sma20, sma50);

  const analysisText = generateAnalysisText(
    currentPrice, marketPhase, currentRsi, sma20, sma50, sma200Values,
    closes, target, stoch.k, bb.upper, bb.lower,
    macdResult.line, macdResult.signal, macdResult.histogram,
    obvValues, volumes, support, resistance,
    signal.label, signal.confidence, signal.score,
  );

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
