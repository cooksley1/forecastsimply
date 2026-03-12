import { getCoinChart, getCoinData } from './api/coingecko';
import { geckoIdToCoinPaprikaId, cpHistorical } from './api/coinpaprika';
import { getStockChart } from './api/yahoo';
import { avDailyHistory } from './api/alphavantage';
import { fmpDailyHistory } from './api/fmp';
import { getFMPApiKey } from './api/fmp';
import { getForexChart } from './api/frankfurter';
import { avForexDaily } from './api/alphavantage';
import { coinloreSymbolToGeckoId, getTopTickers } from './api/coinlore';
import { getDIACryptoPrice, geckoIdToDIASymbol } from './api/dia';

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

// Track per-source failures to skip temporarily broken sources
const sourceFailures: Record<string, number> = {};
const SOURCE_COOLDOWN = 45_000; // skip a source for 45s after failure

function isSourceCoolingDown(source: string): boolean {
  const failedAt = sourceFailures[source];
  if (!failedAt) return false;
  if (Date.now() - failedAt > SOURCE_COOLDOWN) {
    delete sourceFailures[source];
    return false;
  }
  return true;
}

function markSourceFailed(source: string) {
  sourceFailures[source] = Date.now();
}

/** Sleep helper */
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

/** Map CoinGecko IDs to Yahoo Finance crypto tickers */
const GECKO_TO_YAHOO: Record<string, string> = {
  'bitcoin': 'BTC-USD', 'ethereum': 'ETH-USD', 'solana': 'SOL-USD',
  'binancecoin': 'BNB-USD', 'ripple': 'XRP-USD', 'cardano': 'ADA-USD',
  'dogecoin': 'DOGE-USD', 'avalanche-2': 'AVAX-USD', 'polkadot': 'DOT-USD',
  'chainlink': 'LINK-USD', 'litecoin': 'LTC-USD', 'bitcoin-cash': 'BCH-USD',
  'uniswap': 'UNI-USD', 'cosmos': 'ATOM-USD', 'near': 'NEAR-USD',
  'tron': 'TRX-USD', 'shiba-inu': 'SHIB-USD', 'aave': 'AAVE-USD',
  'maker': 'MKR-USD', 'pepe': 'PEPE-USD', 'sui': 'SUI-USD',
  'the-open-network': 'TON-USD', 'filecoin': 'FIL-USD', 'arbitrum': 'ARB-USD',
  'optimism': 'OP-USD', 'aptos': 'APT-USD', 'vechain': 'VET-USD',
  'stellar': 'XLM-USD', 'hedera-hashgraph': 'HBAR-USD',
  'internet-computer': 'ICP-USD',
  // Stablecoins & wrapped
  'tether': 'USDT-USD', 'usd-coin': 'USDC-USD', 'dai': 'DAI-USD',
  'wrapped-bitcoin': 'WBTC-USD', 'staked-ether': 'STETH-USD',
  // Additional top coins
  'monero': 'XMR-USD', 'okb': 'OKB-USD', 'leo-token': 'LEO-USD',
  'ethereum-classic': 'ETC-USD', 'render-token': 'RNDR-USD',
  'kaspa': 'KAS-USD', 'mantra-dao': 'OM-USD', 'injective-protocol': 'INJ-USD',
  'fetch-ai': 'FET-USD', 'algorand': 'ALGO-USD', 'fantom': 'FTM-USD',
  'theta-token': 'THETA-USD', 'eos': 'EOS-USD', 'flow': 'FLOW-USD',
  'the-graph': 'GRT-USD', 'lido-dao': 'LDO-USD', 'immutable-x': 'IMX-USD',
  'sei-network': 'SEI-USD', 'celestia': 'TIA-USD', 'mantle': 'MNT-USD',
  'bonk': 'BONK-USD', 'floki': 'FLOKI-USD', 'gala': 'GALA-USD',
  'ondo-finance': 'ONDO-USD', 'worldcoin-wld': 'WLD-USD',
  'jupiter-exchange-solana': 'JUP-USD', 'pyth-network': 'PYTH-USD',
  'bittensor': 'TAO-USD', 'pendle': 'PENDLE-USD',
  'hyperliquid': 'HYPE-USD', 'ethena-usde': 'USDE-USD',
  'first-digital-usd': 'FDUSD-USD', 'usual-usd': 'USD0-USD',
  'whitebit': 'WBT-USD', 'pi-network': 'PI-USD',
  'polygon-ecosystem-token': 'POL-USD', 'matic-network': 'MATIC-USD',
  'thorchain': 'RUNE-USD', 'kaia': 'KAIA-USD',
  'dexe': 'DEXE-USD', 'usds': 'USDS-USD', 'usdd': 'USDD-USD',
  // More top coins
  '1inch': '1INCH-USD', 'dash': 'DASH-USD', 'neo': 'NEO-USD',
  'nexo': 'NEXO-USD', 'iota': 'IOTA-USD', 'gho': 'GHO-USD',
  'frax': 'FRAX-USD', 'sky': 'SKY-USD', 'fartcoin': 'FARTCOIN-USD',
  'artificial-superintelligence-alliance': 'FET-USD',
};

/**
 * Build a Yahoo-style ticker from a CoinGecko symbol.
 * Only used when GECKO_TO_YAHOO has no entry.
 * Returns null if we can't build a sensible ticker (avoids junk like FETCH-AI-USD).
 */
function guessYahooTicker(coinId: string, symbol?: string): string | null {
  // If a symbol is available (e.g. "FET"), use it directly
  if (symbol && /^[A-Z0-9]{1,10}$/i.test(symbol)) {
    return `${symbol.toUpperCase()}-USD`;
  }
  // Only use the coinId if it's a single word (no hyphens) and short
  if (!coinId.includes('-') && coinId.length <= 8) {
    return `${coinId.toUpperCase()}-USD`;
  }
  return null; // skip Yahoo for complex IDs
}

/** Crypto: CoinGecko → CoinPaprika → Yahoo Finance (for ALL) → CoinLore+DIA fallback */
export async function fetchCryptoHistory(coinId: string, days: number): Promise<CryptoFetchResult> {
  const errors: string[] = [];
  const isAllTime = days >= 9999;

  // For ALL time, try Yahoo Finance first since it has full history for free
  if (isAllTime) {
    const yahooTicker = GECKO_TO_YAHOO[coinId] || guessYahooTicker(coinId);
    if (!yahooTicker) {
      errors.push('Yahoo: no valid ticker mapping');
    } else {
    try {
      const chart = await getStockChart(yahooTicker, days);
      // Get coin metadata from CoinGecko or DIA
      let coinData: any = null;
      try { coinData = await getCoinData(coinId); } catch { /* skip */ }
      return {
        priceData: {
          timestamps: chart.timestamps,
          closes: chart.closes,
          volumes: chart.volumes,
        },
        coinData,
        source: 'Yahoo Finance (full history)',
      };
    } catch (yahooError: any) {
      console.warn('Yahoo Finance crypto failed:', yahooError.message);
      errors.push(`Yahoo: ${yahooError.message}`);
    }
  }

  // Source 1: CoinGecko (skip if cooling down)
  if (!isSourceCoolingDown('coingecko')) {
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
    } catch (cgError: any) {
      console.warn('CoinGecko failed:', cgError.message);
      if (cgError.message?.includes('429')) markSourceFailed('coingecko');
      errors.push(`CoinGecko: ${cgError.message}`);
    }
  } else {
    console.log('CoinGecko cooling down, skipping');
  }

  // Source 2: CoinPaprika (skip if cooling down)
  if (!isSourceCoolingDown('coinpaprika')) {
    try {
      const cpId = geckoIdToCoinPaprikaId(coinId);
      const hist = await cpHistorical(cpId, days);
      return {
        priceData: hist,
        coinData: null,
        source: 'CoinPaprika',
      };
    } catch (cpError: any) {
      console.warn('CoinPaprika failed:', cpError.message);
      if (cpError.message?.includes('429')) markSourceFailed('coinpaprika');
      errors.push(`CoinPaprika: ${cpError.message}`);
    }
  } else {
    console.log('CoinPaprika cooling down, skipping');
  }

  // Source 3: Yahoo Finance (non-ALL time fallback too)
  if (!isAllTime) {
    const yahooTicker = GECKO_TO_YAHOO[coinId] || `${coinId.toUpperCase()}-USD`;
    try {
      const chart = await getStockChart(yahooTicker, days);
      let coinData: any = null;
      try { coinData = await getCoinData(coinId); } catch { /* skip */ }
      return {
        priceData: {
          timestamps: chart.timestamps,
          closes: chart.closes,
          volumes: chart.volumes,
        },
        coinData,
        source: 'Yahoo Finance',
      };
    } catch (yahooError: any) {
      console.warn('Yahoo Finance crypto fallback failed:', yahooError.message);
      errors.push(`Yahoo: ${yahooError.message}`);
    }
  }

  // Source 4: CoinLore (live data, no rate limits) + DIA price — generate synthetic chart
  try {
    const result = await buildFallbackCryptoData(coinId, days);
    if (result) return result;
  } catch (fallbackError: any) {
    console.warn('CoinLore/DIA fallback failed:', fallbackError.message);
    errors.push(`Fallback: ${fallbackError.message}`);
  }

  // Silent retry: wait briefly and try CoinPaprika once more
  try {
    console.log('All sources failed, retrying CoinPaprika after brief wait...');
    await sleep(3000);
    const cpId = geckoIdToCoinPaprikaId(coinId);
    const hist = await cpHistorical(cpId, days);
    return { priceData: hist, coinData: null, source: 'CoinPaprika (retry)' };
  } catch {
    // Final fallback
  }

  throw new Error(
    'All crypto data sources are temporarily busy. This usually resolves in a few seconds — please try again shortly.'
  );
}

/**
 * Build minimal chart data from CoinLore + DIA when main sources are rate-limited.
 * CoinLore provides current price and % changes; DIA provides live price.
 * We construct a synthetic price history from the available change percentages.
 */
async function buildFallbackCryptoData(coinId: string, days: number): Promise<CryptoFetchResult | null> {
  // Try to find the coin in CoinLore's top tickers
  const tickers = await getTopTickers(100);
  const diaSymbol = geckoIdToDIASymbol(coinId);

  // Try DIA for live price
  let livePrice: number | null = null;
  let change24h: number | null = null;
  if (diaSymbol) {
    try {
      const diaData = await getDIACryptoPrice(diaSymbol);
      livePrice = diaData.price;
      change24h = diaData.change24h;
    } catch { /* skip */ }
  }

  // Try CoinLore for additional data
  const ticker = tickers.find(t => {
    const geckoId = coinloreSymbolToGeckoId(t.symbol, t.name);
    return geckoId === coinId;
  });

  if (!livePrice && ticker) {
    livePrice = parseFloat(ticker.price_usd);
    change24h = parseFloat(ticker.percent_change_24h);
  }

  if (!livePrice) return null;

  // Build a synthetic price series from change percentages
  const pct24h = change24h || 0;
  const pct7d = ticker ? parseFloat(ticker.percent_change_7d) : pct24h * 3;

  const now = Date.now();
  const points = Math.min(days, 30); // Don't fabricate too many points
  const timestamps: number[] = [];
  const closes: number[] = [];
  const volumes: number[] = [];

  // Linear interpolation from estimated starting price
  const dailyChange = (pct7d / 7) / 100;
  const startPrice = livePrice / (1 + dailyChange * points);

  for (let i = 0; i <= points; i++) {
    const t = now - (points - i) * 86400000;
    const progress = i / points;
    const price = startPrice * (1 + dailyChange * i) + (Math.sin(progress * Math.PI * 4) * startPrice * 0.005);
    timestamps.push(t);
    closes.push(price);
    volumes.push(ticker ? ticker.volume24 * (0.8 + Math.random() * 0.4) : 0);
  }

  // Ensure last price matches live price
  closes[closes.length - 1] = livePrice;

  return {
    priceData: { timestamps, closes, volumes },
    coinData: ticker ? {
      name: ticker.name,
      symbol: ticker.symbol,
      market_data: {
        current_price: { usd: livePrice },
        price_change_percentage_24h: pct24h,
        price_change_percentage_7d: pct7d,
        market_cap: { usd: parseFloat(ticker.market_cap_usd) },
        total_volume: { usd: ticker.volume24 },
        circulating_supply: parseFloat(ticker.csupply),
        max_supply: ticker.msupply ? parseFloat(ticker.msupply) : null,
      },
      market_cap_rank: ticker.rank,
    } : null,
    source: 'CoinLore/DIA (estimated)',
  };
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
