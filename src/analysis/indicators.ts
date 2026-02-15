export function sma(data: number[], period: number): number[] {
  const result: number[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) { result.push(NaN); continue; }
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) sum += data[j];
    result.push(sum / period);
  }
  return result;
}

export function ema(data: number[], period: number): number[] {
  const k = 2 / (period + 1);
  const result: number[] = [data[0]];
  for (let i = 1; i < data.length; i++) {
    result.push(data[i] * k + result[i - 1] * (1 - k));
  }
  return result;
}

export function rsi(closes: number[], period = 14): number[] {
  const result: number[] = new Array(closes.length).fill(NaN);
  if (closes.length < period + 1) return result;

  let avgGain = 0, avgLoss = 0;
  for (let i = 1; i <= period; i++) {
    const change = closes[i] - closes[i - 1];
    if (change > 0) avgGain += change;
    else avgLoss += Math.abs(change);
  }
  avgGain /= period;
  avgLoss /= period;

  result[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);

  for (let i = period + 1; i < closes.length; i++) {
    const change = closes[i] - closes[i - 1];
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? Math.abs(change) : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    result[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  }
  return result;
}

export function bollingerBands(closes: number[], period = 20, mult = 2) {
  const mid = sma(closes, period);
  const upper: number[] = [];
  const lower: number[] = [];

  for (let i = 0; i < closes.length; i++) {
    if (i < period - 1) { upper.push(NaN); lower.push(NaN); continue; }
    let sumSq = 0;
    for (let j = i - period + 1; j <= i; j++) sumSq += (closes[j] - mid[i]) ** 2;
    const std = Math.sqrt(sumSq / period);
    upper.push(mid[i] + mult * std);
    lower.push(mid[i] - mult * std);
  }
  return { upper, middle: mid, lower };
}

export function macd(closes: number[]) {
  const ema12 = ema(closes, 12);
  const ema26 = ema(closes, 26);
  const line = ema12.map((v, i) => v - ema26[i]);
  const signal = ema(line, 9);
  const histogram = line.map((v, i) => v - signal[i]);
  return { line, signal, histogram };
}

export function stochastic(closes: number[], highs?: number[], lows?: number[], kPeriod = 14, dPeriod = 3) {
  const h = highs || closes;
  const l = lows || closes;
  const kValues: number[] = new Array(closes.length).fill(NaN);

  for (let i = kPeriod - 1; i < closes.length; i++) {
    let hh = -Infinity, ll = Infinity;
    for (let j = i - kPeriod + 1; j <= i; j++) {
      if (h[j] > hh) hh = h[j];
      if (l[j] < ll) ll = l[j];
    }
    kValues[i] = hh === ll ? 50 : ((closes[i] - ll) / (hh - ll)) * 100;
  }
  const dValues = sma(kValues.map(v => isNaN(v) ? 50 : v), dPeriod);
  return { k: kValues, d: dValues };
}

export function findSupportResistance(closes: number[]) {
  const localMins: number[] = [];
  const localMaxs: number[] = [];

  for (let i = 2; i < closes.length - 2; i++) {
    if (closes[i] < closes[i - 1] && closes[i] < closes[i - 2] && closes[i] < closes[i + 1] && closes[i] < closes[i + 2]) {
      localMins.push(closes[i]);
    }
    if (closes[i] > closes[i - 1] && closes[i] > closes[i - 2] && closes[i] > closes[i + 1] && closes[i] > closes[i + 2]) {
      localMaxs.push(closes[i]);
    }
  }

  const sorted = [...closes].sort((a, b) => a - b);
  const support = localMins.length >= 2
    ? localMins.reduce((a, b) => a + b, 0) / localMins.length
    : sorted[Math.floor(sorted.length * 0.1)];
  const resistance = localMaxs.length >= 2
    ? localMaxs.reduce((a, b) => a + b, 0) / localMaxs.length
    : sorted[Math.floor(sorted.length * 0.9)];

  return { support, resistance };
}

/** ATR approximation from close prices (when OHLC not available) */
export function calcATR(closes: number[], period = 14): number[] {
  const tr: number[] = [0];
  for (let i = 1; i < closes.length; i++) {
    tr.push(Math.abs(closes[i] - closes[i - 1]));
  }
  const atr: number[] = [];
  for (let i = 0; i < tr.length; i++) {
    if (i < period) { atr.push(NaN); continue; }
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) sum += tr[j];
    atr.push(sum / period);
  }
  return atr;
}

/** On-Balance Volume */
export function calcOBV(closes: number[], volumes: number[]): number[] {
  const obv: number[] = [0];
  for (let i = 1; i < closes.length; i++) {
    if (closes[i] > closes[i - 1]) obv.push(obv[i - 1] + (volumes[i] || 0));
    else if (closes[i] < closes[i - 1]) obv.push(obv[i - 1] - (volumes[i] || 0));
    else obv.push(obv[i - 1]);
  }
  return obv;
}

/** Volume Weighted Average Price */
export function calcVWAP(closes: number[], volumes: number[]): number[] {
  const vwap: number[] = [];
  let cumPV = 0;
  let cumVol = 0;
  for (let i = 0; i < closes.length; i++) {
    cumPV += closes[i] * (volumes[i] || 0);
    cumVol += (volumes[i] || 0);
    vwap.push(cumVol > 0 ? cumPV / cumVol : closes[i]);
  }
  return vwap;
}

/** Ichimoku Cloud */
export function ichimoku(closes: number[], tenkanPeriod = 9, kijunPeriod = 26, senkouBPeriod = 52) {
  const highLow = (arr: number[], start: number, end: number) => {
    let hi = -Infinity, lo = Infinity;
    for (let j = start; j <= end; j++) {
      if (arr[j] > hi) hi = arr[j];
      if (arr[j] < lo) lo = arr[j];
    }
    return (hi + lo) / 2;
  };

  const tenkan: number[] = [];
  const kijun: number[] = [];
  const senkouA: number[] = [];
  const senkouB: number[] = [];

  for (let i = 0; i < closes.length; i++) {
    tenkan.push(i >= tenkanPeriod - 1 ? highLow(closes, i - tenkanPeriod + 1, i) : NaN);
    kijun.push(i >= kijunPeriod - 1 ? highLow(closes, i - kijunPeriod + 1, i) : NaN);
    
    const t = tenkan[i];
    const k = kijun[i];
    senkouA.push(!isNaN(t) && !isNaN(k) ? (t + k) / 2 : NaN);
    senkouB.push(i >= senkouBPeriod - 1 ? highLow(closes, i - senkouBPeriod + 1, i) : NaN);
  }

  return { tenkan, kijun, senkouA, senkouB };
}

/** Fibonacci Retracement levels from high/low of given data */
export function fibonacciLevels(closes: number[]) {
  const high = Math.max(...closes);
  const low = Math.min(...closes);
  const diff = high - low;
  return {
    level0: high,
    level236: high - diff * 0.236,
    level382: high - diff * 0.382,
    level500: high - diff * 0.5,
    level618: high - diff * 0.618,
    level786: high - diff * 0.786,
    level100: low,
  };
}

/** EMA pair for chart overlay (12 & 26 period) */
export function emaPair(closes: number[]): { ema12: number[]; ema26: number[] } {
  return { ema12: ema(closes, 12), ema26: ema(closes, 26) };
}
