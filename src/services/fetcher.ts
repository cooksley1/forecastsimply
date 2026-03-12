import { getCoinChart, getCoinData } from './api/coingecko';
import { getCMCCoinData } from './api/coinmarketcap';
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
  // Top 20
  'bitcoin': 'BTC-USD', 'ethereum': 'ETH-USD', 'tether': 'USDT-USD',
  'ripple': 'XRP-USD', 'binancecoin': 'BNB-USD', 'solana': 'SOL-USD',
  'usd-coin': 'USDC-USD', 'dogecoin': 'DOGE-USD', 'cardano': 'ADA-USD',
  'tron': 'TRX-USD', 'chainlink': 'LINK-USD', 'avalanche-2': 'AVAX-USD',
  'stellar': 'XLM-USD', 'shiba-inu': 'SHIB-USD', 'polkadot': 'DOT-USD',
  'hedera-hashgraph': 'HBAR-USD', 'the-open-network': 'TON-USD',
  'sui': 'SUI-USD', 'litecoin': 'LTC-USD', 'bitcoin-cash': 'BCH-USD',
  // 21–50
  'uniswap': 'UNI-USD', 'near': 'NEAR-USD', 'aptos': 'APT-USD',
  'aave': 'AAVE-USD', 'internet-computer': 'ICP-USD', 'cosmos': 'ATOM-USD',
  'filecoin': 'FIL-USD', 'arbitrum': 'ARB-USD', 'optimism': 'OP-USD',
  'vechain': 'VET-USD', 'maker': 'MKR-USD', 'pepe': 'PEPE-USD',
  'render-token': 'RNDR-USD', 'kaspa': 'KAS-USD', 'ethereum-classic': 'ETC-USD',
  'monero': 'XMR-USD', 'algorand': 'ALGO-USD', 'fantom': 'FTM-USD',
  'the-graph': 'GRT-USD', 'lido-dao': 'LDO-USD', 'injective-protocol': 'INJ-USD',
  'theta-token': 'THETA-USD', 'immutable-x': 'IMX-USD', 'sei-network': 'SEI-USD',
  'celestia': 'TIA-USD', 'mantle': 'MNT-USD', 'bittensor': 'TAO-USD',
  // 51–100
  'bonk': 'BONK-USD', 'floki': 'FLOKI-USD', 'gala': 'GALA-USD',
  'ondo-finance': 'ONDO-USD', 'worldcoin-wld': 'WLD-USD', 'pendle': 'PENDLE-USD',
  'jupiter-exchange-solana': 'JUP-USD', 'pyth-network': 'PYTH-USD',
  'hyperliquid': 'HYPE-USD', 'pi-network': 'PI-USD',
  'polygon-ecosystem-token': 'POL-USD', 'matic-network': 'MATIC-USD',
  'thorchain': 'RUNE-USD', 'eos': 'EOS-USD', 'flow': 'FLOW-USD',
  'mantra-dao': 'OM-USD', 'fetch-ai': 'FET-USD',
  'artificial-superintelligence-alliance': 'FET-USD',
  'okb': 'OKB-USD', 'leo-token': 'LEO-USD',
  'wrapped-bitcoin': 'WBTC-USD', 'staked-ether': 'STETH-USD',
  'dai': 'DAI-USD', 'ethena-usde': 'USDE-USD', 'first-digital-usd': 'FDUSD-USD',
  'whitebit': 'WBT-USD', 'kaia': 'KAIA-USD', 'dexe': 'DEXE-USD',
  // Stablecoins & niche
  'usds': 'USDS-USD', 'usdd': 'USDD-USD', 'frax': 'FRAX-USD',
  'gho': 'GHO-USD', 'gusd': 'GUSD-USD', 'usual-usd': 'USD0-USD',
  // Additional coins from screener
  '1inch': '1INCH-USD', 'dash': 'DASH-USD', 'neo': 'NEO-USD',
  'nexo': 'NEXO-USD', 'iota': 'IOTA-USD', 'sky': 'SKY-USD',
  'fartcoin': 'FARTCOIN-USD', 'syrup': 'SYRUP-USD',
  'sand': 'SAND-USD', 'mana': 'MANA-USD', 'axie-infinity': 'AXS-USD',
  'quant-network': 'QNT-USD', 'chiliz': 'CHZ-USD', 'enjincoin': 'ENJ-USD',
  'curve-dao-token': 'CRV-USD', 'compound-governance-token': 'COMP-USD',
  'sushiswap': 'SUSHI-USD', 'yearn-finance': 'YFI-USD',
  'synthetix-network-token': 'SNX-USD', 'decentraland': 'MANA-USD',
  'the-sandbox': 'SAND-USD', 'illuvium': 'ILV-USD',
  'rocket-pool': 'RPL-USD', 'ankr': 'ANKR-USD', 'harmony': 'ONE-USD',
  'zilliqa': 'ZIL-USD', 'ravencoin': 'RVN-USD', 'zcash': 'ZEC-USD',
  'basic-attention-token': 'BAT-USD', 'celo': 'CELO-USD',
  'loopring': 'LRC-USD', 'storj': 'STORJ-USD', 'skale': 'SKL-USD',
  'ocean-protocol': 'OCEAN-USD', 'mask-network': 'MASK-USD',
  'bitcoin-sv': 'BSV-USD', 'ecash': 'XEC-USD',
  'stacks': 'STX-USD', 'arweave': 'AR-USD', 'helium': 'HNT-USD',
  'conflux-token': 'CFX-USD', 'oasis-network': 'ROSE-USD',
  'mina-protocol': 'MINA-USD', 'iotex': 'IOTX-USD',
  // Meme & newer
  'official-trump': 'TRUMP-USD', 'amp-token': 'AMP-USD',
  'flare-networks': 'FLR-USD',
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

/** Try CoinGecko for metadata, fall back to CMC */
async function getCoinMetadata(coinId: string, symbol?: string): Promise<any> {
  try { return await getCoinData(coinId); } catch { /* skip */ }
  // Try CMC as fallback
  if (symbol) {
    const cmc = await getCMCCoinData(symbol);
    if (cmc) {
      return {
        name: cmc.name,
        symbol: cmc.symbol,
        market_data: {
          current_price: { usd: cmc.price },
          price_change_percentage_24h: cmc.change24h,
          price_change_percentage_7d: cmc.change7d,
          market_cap: { usd: cmc.marketCap },
          total_volume: { usd: cmc.volume24h },
          circulating_supply: cmc.circulatingSupply,
          max_supply: cmc.maxSupply,
        },
        market_cap_rank: cmc.rank,
      };
    }
  }
  return null;
}

/** Crypto: CoinGecko → CoinPaprika → Yahoo Finance (for ALL) → CMC → CoinLore+DIA fallback */
export async function fetchCryptoHistory(coinId: string, days: number, knownSymbol?: string): Promise<CryptoFetchResult> {
  const errors: string[] = [];
  const isAllTime = days >= 9999;
  // Derive symbol from GECKO_TO_YAHOO map (e.g. 'BTC-USD' → 'BTC') or use provided symbol
  const yahooEntry = GECKO_TO_YAHOO[coinId];
  const coinSymbol = knownSymbol || (yahooEntry ? yahooEntry.replace('-USD', '') : undefined);

  // For ALL time, try Yahoo Finance first since it has full history for free
  if (isAllTime) {
    const yahooTicker = GECKO_TO_YAHOO[coinId] || guessYahooTicker(coinId);
    if (yahooTicker) {
      try {
        const chart = await getStockChart(yahooTicker, days);
        let coinData: any = null;
        coinData = await getCoinMetadata(coinId, coinSymbol);
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
    const yahooTicker = GECKO_TO_YAHOO[coinId] || guessYahooTicker(coinId, coinSymbol);
    if (yahooTicker) {
      try {
        const chart = await getStockChart(yahooTicker, days);
        let coinData: any = null;
        coinData = await getCoinMetadata(coinId, coinSymbol);
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
  }

  // Source 4: CMC synthetic chart (uses CMC proxy for current price + % changes)
  if (coinSymbol) {
    try {
      const result = await buildCMCFallbackData(coinId, coinSymbol, days);
      if (result) return result;
    } catch (cmcError: any) {
      console.warn('CMC fallback failed:', cmcError.message);
      errors.push(`CMC: ${cmcError.message}`);
    }
  }

  // Source 5: CoinLore (live data, no rate limits) + DIA price — generate synthetic chart
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
 * Build synthetic chart data from CMC when all primary sources fail.
 * Uses the CMC proxy to get current price + 24h/7d changes.
 */
async function buildCMCFallbackData(coinId: string, symbol: string, days: number): Promise<CryptoFetchResult | null> {
  const cmcData = await getCMCCoinData(symbol);
  if (!cmcData || !cmcData.price) return null;

  const livePrice = cmcData.price;
  const pct24h = cmcData.change24h || 0;
  const pct7d = cmcData.change7d || pct24h * 3;

  const now = Date.now();
  const points = Math.min(days, 30);
  const timestamps: number[] = [];
  const closes: number[] = [];
  const volumes: number[] = [];

  const dailyChange = (pct7d / 7) / 100;
  const startPrice = livePrice / (1 + dailyChange * points);

  for (let i = 0; i <= points; i++) {
    const t = now - (points - i) * 86400000;
    const progress = i / points;
    const price = startPrice * (1 + dailyChange * i) + (Math.sin(progress * Math.PI * 4) * startPrice * 0.005);
    timestamps.push(t);
    closes.push(price);
    volumes.push(cmcData.volume24h ? cmcData.volume24h * (0.8 + Math.random() * 0.4) : 0);
  }

  closes[closes.length - 1] = livePrice;

  return {
    priceData: { timestamps, closes, volumes },
    coinData: {
      name: cmcData.name,
      symbol: cmcData.symbol,
      market_data: {
        current_price: { usd: livePrice },
        price_change_percentage_24h: pct24h,
        price_change_percentage_7d: pct7d,
        market_cap: { usd: cmcData.marketCap },
        total_volume: { usd: cmcData.volume24h },
        circulating_supply: cmcData.circulatingSupply,
        max_supply: cmcData.maxSupply,
      },
      market_cap_rank: cmcData.rank,
    },
    source: 'CoinMarketCap (synthetic chart)',
  };
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
