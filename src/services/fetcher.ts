import { getCoinChart, getCoinData } from './api/coingecko';
import { geckoIdToCoinPaprikaId, cpHistorical } from './api/coinpaprika';
import { getStockChart } from './api/yahoo';
import { avDailyHistory } from './api/alphavantage';
import { fmpDailyHistory } from './api/fmp';
import { getFMPApiKey } from './api/fmp';
import { getForexChart } from './api/frankfurter';
import { avForexDaily } from './api/alphavantage';

export interface PriceData {
  timestamps: number[];
  closes: number[];
  volumes: number[];
}

export interface FetchResult<T> {
  data: T;
  source: string;
  cached: boolean;
}

export interface CryptoFetchResult {
  priceData: PriceData;
  coinData: any;
  source: string;
}

/** Crypto: CoinGecko → CoinPaprika */
export async function fetchCryptoHistory(coinId: string, days: number): Promise<CryptoFetchResult> {
  // Try CoinGecko first
  try {
    const [coinData, chartData] = await Promise.all([
      getCoinData(coinId),
      getCoinChart(coinId, days),
    ]);
    const prices = chartData.prices || [];
    const volumes = chartData.total_volumes || [];
    return {
      priceData: {
        timestamps: prices.map((p: number[]) => p[0]),
        closes: prices.map((p: number[]) => p[1]),
        volumes: volumes.map((v: number[]) => v[1]),
      },
      coinData,
      source: 'CoinGecko',
    };
  } catch (cgError) {
    console.warn('CoinGecko failed, trying CoinPaprika:', cgError);
  }

  // Fallback: CoinPaprika
  try {
    const cpId = geckoIdToCoinPaprikaId(coinId);
    const hist = await cpHistorical(cpId, days);
    return {
      priceData: hist,
      coinData: null,
      source: 'CoinPaprika',
    };
  } catch (cpError) {
    console.warn('CoinPaprika failed:', cpError);
  }

  throw new Error('Crypto data sources are rate limited. Please wait 30 seconds and try again.');
}

/** Stocks & ETFs: Yahoo → Alpha Vantage → FMP */
export async function fetchEquityHistory(symbol: string, days: number): Promise<FetchResult<PriceData>> {
  // Try Yahoo Finance first
  try {
    const chart = await getStockChart(symbol, days);
    return {
      data: {
        timestamps: chart.timestamps,
        closes: chart.closes,
        volumes: chart.volumes,
      },
      source: 'Yahoo Finance',
      cached: false,
    };
  } catch (yahooError) {
    console.warn('Yahoo Finance failed, trying Alpha Vantage:', yahooError);
  }

  // Fallback: Alpha Vantage
  try {
    const avData = await avDailyHistory(symbol);
    // Trim to requested days
    const cutoff = Date.now() - days * 86400000;
    const startIdx = avData.timestamps.findIndex(t => t >= cutoff);
    const idx = startIdx >= 0 ? startIdx : 0;
    return {
      data: {
        timestamps: avData.timestamps.slice(idx),
        closes: avData.closes.slice(idx),
        volumes: avData.volumes.slice(idx),
      },
      source: 'Alpha Vantage',
      cached: false,
    };
  } catch (avError) {
    console.warn('Alpha Vantage failed, trying FMP:', avError);
  }

  // Fallback: FMP (only if key is set)
  if (getFMPApiKey()) {
    try {
      const fmpData = await fmpDailyHistory(symbol);
      const cutoff = Date.now() - days * 86400000;
      const startIdx = fmpData.timestamps.findIndex(t => t >= cutoff);
      const idx = startIdx >= 0 ? startIdx : 0;
      return {
        data: {
          timestamps: fmpData.timestamps.slice(idx),
          closes: fmpData.closes.slice(idx),
          volumes: fmpData.volumes.slice(idx),
        },
        source: 'FMP',
        cached: false,
      };
    } catch (fmpError) {
      console.warn('FMP failed:', fmpError);
    }
  }

  throw new Error(`Unable to fetch data for ${symbol}. Yahoo Finance, Alpha Vantage, and FMP all failed. Check your internet connection or try again in 60 seconds.`);
}

/** Forex: Frankfurter → Alpha Vantage → Yahoo */
export async function fetchForexHistory(from: string, to: string, days: number): Promise<FetchResult<PriceData>> {
  // Try Frankfurter first
  try {
    const chart = await getForexChart(from, to, days);
    return {
      data: {
        timestamps: chart.timestamps,
        closes: chart.closes,
        volumes: new Array(chart.closes.length).fill(0),
      },
      source: 'Frankfurter',
      cached: false,
    };
  } catch (fxError) {
    console.warn('Frankfurter failed, trying Alpha Vantage:', fxError);
  }

  // Fallback: Alpha Vantage forex
  try {
    const avData = await avForexDaily(from, to);
    const cutoff = Date.now() - days * 86400000;
    const startIdx = avData.timestamps.findIndex(t => t >= cutoff);
    const idx = startIdx >= 0 ? startIdx : 0;
    return {
      data: {
        timestamps: avData.timestamps.slice(idx),
        closes: avData.closes.slice(idx),
        volumes: avData.volumes.slice(idx),
      },
      source: 'Alpha Vantage',
      cached: false,
    };
  } catch (avError) {
    console.warn('Alpha Vantage forex failed, trying Yahoo:', avError);
  }

  // Fallback: Yahoo Finance for forex
  try {
    const pair = `${from}${to}=X`;
    const chart = await getStockChart(pair, days);
    return {
      data: {
        timestamps: chart.timestamps,
        closes: chart.closes,
        volumes: chart.volumes,
      },
      source: 'Yahoo Finance',
      cached: false,
    };
  } catch (yahooError) {
    console.warn('Yahoo forex failed:', yahooError);
  }

  throw new Error(`Unable to fetch forex data for ${from}/${to}. All sources failed. Check your internet connection.`);
}
