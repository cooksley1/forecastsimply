import { useState, useCallback, useRef, useEffect, useMemo, memo } from 'react';
import Header from '@/components/layout/Header';
import WatchlistBar from '@/components/layout/WatchlistBar';
import SearchBar from '@/components/search/SearchBar';
import QuickPicks from '@/components/search/QuickPicks';
import ForexPairSelector from '@/components/search/ForexPairSelector';
import GuidedDiscovery from '@/components/search/GuidedDiscovery';
import MainChart from '@/components/charts/MainChart';
import ForecastMethodBar from '@/components/charts/ForecastMethodBar';
import VolumeChart from '@/components/charts/VolumeChart';
import RSIChart from '@/components/charts/RSIChart';
import ChartControls from '@/components/charts/ChartControls';
import type { RiskProfile } from '@/components/charts/ChartControls';
import SignalPanel from '@/components/analysis/SignalPanel';
import RecommendationPanel from '@/components/analysis/RecommendationPanel';
import TradeSetupPanel from '@/components/analysis/TradeSetupPanel';
import AnalysisTextPanel from '@/components/analysis/AnalysisTextPanel';
import IndicatorsPanel from '@/components/analysis/IndicatorsPanel';
import PortfolioBuilder from '@/components/analysis/PortfolioBuilder';
import TopPicks from '@/components/analysis/TopPicks';
import BreakoutFinder from '@/components/analysis/BreakoutFinder';
import { getCoinData, searchCoins } from '@/services/api/coingecko';
import { getDIACryptoPrice, geckoIdToDIASymbol } from '@/services/api/dia';
import { getStockChart } from '@/services/api/yahoo';
import { fetchCryptoHistory, fetchEquityHistory, fetchForexHistory } from '@/services/fetcher';
import { processTA } from '@/analysis/processTA';
import type { ForecastMethodId } from '@/analysis/forecast';
import {
  CRYPTO_PICKS, STOCK_PICKS_US, STOCK_PICKS_ASX,
  ETF_PICKS_US, ETF_PICKS_ASX, FOREX_PICKS,
  CRYPTO_TIMEFRAMES, STOCK_TIMEFRAMES,
} from '@/utils/constants';
import type { AssetType, AssetInfo, WatchlistItem } from '@/types/assets';
import type { TechnicalData } from '@/types/analysis';
import type { ResultTab } from '@/types/assets';
import { getSecondaryCurrency, convertFromUSD, getCurrencySymbol, SUPPORTED_CURRENCIES, setSecondaryCurrency } from '@/utils/currencyConversion';

// Memoized heavy components
const MemoMainChart = memo(MainChart);
const MemoVolumeChart = memo(VolumeChart);
const MemoRSIChart = memo(RSIChart);
const MemoRecommendationPanel = memo(RecommendationPanel);
const MemoTradeSetupPanel = memo(TradeSetupPanel);
const MemoIndicatorsPanel = memo(IndicatorsPanel);
const MemoTopPicks = memo(TopPicks);
const MemoBreakoutFinder = memo(BreakoutFinder);

export default function Index() {
  const [assetType, setAssetType] = useState<AssetType>('crypto');
  const [activeTab, setActiveTab] = useState<ResultTab>('home');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [assetInfo, setAssetInfo] = useState<AssetInfo | null>(null);
  const [technicalData, setTechnicalData] = useState<TechnicalData | null>(null);
  const [timeframeDays, setTimeframeDays] = useState(90);
  const [forecastPercent, setForecastPercent] = useState(30);
  const [forecastMethods, setForecastMethods] = useState<ForecastMethodId[]>(['holt']);
  const [riskProfile, setRiskProfile] = useState<RiskProfile>('moderate');
  const [dataSource, setDataSource] = useState<string>('');
  const [secondaryCurrency, setSecCurrency] = useState<string | null>(getSecondaryCurrency());
  const [secondaryPrice, setSecondaryPrice] = useState<number | null>(null);
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>(() => {
    try { return JSON.parse(localStorage.getItem('sf_watchlist') || '[]'); } catch { return []; }
  });

  const currentAssetRef = useRef<{ id: string; type: AssetType } | null>(null);
  const isFirstRender = useRef(true);

  const addToWatchlist = useCallback((info: AssetInfo) => {
    setWatchlist(prev => {
      const filtered = prev.filter(w => w.id !== info.id);
      const next = [{ id: info.id, symbol: info.symbol, name: info.name, assetType: info.assetType, price: info.price, change24h: info.change24h, addedAt: Date.now() }, ...filtered].slice(0, 12);
      localStorage.setItem('sf_watchlist', JSON.stringify(next));
      return next;
    });
  }, []);

  // Update secondary price when currency or asset changes
  const updateSecondaryPrice = useCallback(async (usdPrice: number) => {
    const curr = getSecondaryCurrency();
    if (curr && usdPrice > 0) {
      const converted = await convertFromUSD(usdPrice, curr);
      setSecondaryPrice(converted);
    } else {
      setSecondaryPrice(null);
    }
  }, []);

  /* ── Crypto ── */
  const analyseCrypto = useCallback(async (coinId: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchCryptoHistory(coinId, timeframeDays);
      setDataSource(result.source);

      // Get metadata from CoinGecko data or DIA
      const diaSymbol = geckoIdToDIASymbol(coinId);
      let coinData = result.coinData;
      let livePrice: number;
      let change24h: number | undefined;

      if (coinData) {
        const diaPrice = diaSymbol ? await getDIACryptoPrice(diaSymbol).catch(() => null) : null;
        livePrice = diaPrice?.price || coinData.market_data?.current_price?.usd || result.priceData.closes[result.priceData.closes.length - 1];
        change24h = diaPrice?.change24h ?? coinData.market_data?.price_change_percentage_24h;
      } else {
        livePrice = result.priceData.closes[result.priceData.closes.length - 1];
        // Try to get metadata from CoinGecko even if chart came from CoinPaprika
        try { coinData = await getCoinData(coinId); } catch { coinData = null; }
        change24h = coinData?.market_data?.price_change_percentage_24h;
      }

      const info: AssetInfo = {
        id: coinId,
        symbol: coinData?.symbol?.toUpperCase() || coinId.toUpperCase(),
        name: coinData?.name || coinId,
        assetType: 'crypto',
        price: livePrice,
        priceAud: coinData?.market_data?.current_price?.aud,
        change24h,
        change7d: coinData?.market_data?.price_change_percentage_7d,
        change30d: coinData?.market_data?.price_change_percentage_30d,
        marketCap: coinData?.market_data?.market_cap?.usd,
        volume24h: coinData?.market_data?.total_volume?.usd,
        circulatingSupply: coinData?.market_data?.circulating_supply,
        maxSupply: coinData?.market_data?.max_supply,
        ath: coinData?.market_data?.ath?.usd,
        atl: coinData?.market_data?.atl?.usd,
        rank: coinData?.market_cap_rank,
        image: coinData?.image?.small,
        description: coinData?.description?.en?.slice(0, 200),
      };

      const ta = processTA(result.priceData.closes, result.priceData.timestamps, result.priceData.volumes, forecastPercent, 'crypto', forecastMethods);
      currentAssetRef.current = { id: coinId, type: 'crypto' };
      setAssetInfo(info);
      setTechnicalData(ta);
      addToWatchlist(info);
      setActiveTab('charts');
      updateSecondaryPrice(livePrice);
    } catch (e: any) {
      setError(e.message || 'Failed to fetch data. Try again.');
    } finally {
      setLoading(false);
    }
  }, [timeframeDays, forecastPercent, forecastMethods, addToWatchlist, updateSecondaryPrice]);

  /* ── Stocks / ETFs ── */
  const analyseStock = useCallback(async (symbol: string, type: 'stocks' | 'etfs') => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchEquityHistory(symbol, timeframeDays);
      setDataSource(result.source);

      const { closes, timestamps, volumes } = result.data;
      const lastPrice = closes[closes.length - 1];
      const change24h = closes.length >= 2
        ? ((closes[closes.length - 1] - closes[closes.length - 2]) / closes[closes.length - 2]) * 100
        : undefined;

      const info: AssetInfo = {
        id: symbol,
        symbol: symbol,
        name: symbol,
        assetType: type,
        price: lastPrice,
        change24h,
      };

      // Try to get name from Yahoo (if that was the source)
      if (result.source === 'Yahoo Finance') {
        try {
          const chart = await getStockChart(symbol, timeframeDays);
          info.name = chart.name || symbol;
          info.currency = chart.currency;
          info.exchange = chart.exchange;
          info.price = chart.regularMarketPrice;
        } catch { /* use defaults */ }
      }

      const ta = processTA(closes, timestamps, volumes, forecastPercent, type, forecastMethods);
      currentAssetRef.current = { id: symbol, type };
      setAssetInfo(info);
      setTechnicalData(ta);
      addToWatchlist(info);
      setActiveTab('charts');
      updateSecondaryPrice(lastPrice);
    } catch (e: any) {
      setError(e.message || `Failed to fetch ${symbol}.`);
    } finally {
      setLoading(false);
    }
  }, [timeframeDays, forecastPercent, forecastMethods, addToWatchlist, updateSecondaryPrice]);

  /* ── Forex ── */
  const analyseForex = useCallback(async (pairId: string) => {
    setLoading(true);
    setError(null);
    try {
      const from = pairId.slice(0, 3);
      const to = pairId.slice(3, 6);

      const result = await fetchForexHistory(from, to, timeframeDays);
      setDataSource(result.source);

      const { closes, timestamps, volumes } = result.data;
      const lastPrice = closes[closes.length - 1];
      const change24h = closes.length >= 2
        ? ((closes[closes.length - 1] - closes[closes.length - 2]) / closes[closes.length - 2]) * 100
        : undefined;

      const info: AssetInfo = {
        id: pairId,
        symbol: `${from}/${to}`,
        name: `${from}/${to}`,
        assetType: 'forex',
        price: lastPrice,
        change24h,
        currency: to,
      };

      const ta = processTA(closes, timestamps, volumes, forecastPercent, 'forex', forecastMethods);
      currentAssetRef.current = { id: pairId, type: 'forex' };
      setAssetInfo(info);
      setTechnicalData(ta);
      addToWatchlist(info);
      setActiveTab('charts');
    } catch (e: any) {
      setError(e.message || 'Failed to fetch forex data. Try again.');
    } finally {
      setLoading(false);
    }
  }, [timeframeDays, forecastPercent, forecastMethods, addToWatchlist]);

  /* ── Auto-reanalyse when settings change ── */
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const asset = currentAssetRef.current;
    if (!asset) return;

    const timer = setTimeout(() => {
      if (asset.type === 'crypto') analyseCrypto(asset.id);
      else if (asset.type === 'stocks') analyseStock(asset.id, 'stocks');
      else if (asset.type === 'etfs') analyseStock(asset.id, 'etfs');
      else if (asset.type === 'forex') analyseForex(asset.id);
    }, 500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeframeDays, forecastPercent, forecastMethods]);

  /* ── Unified handlers ── */
  const handleSearch = useCallback(async (query: string) => {
    if (assetType === 'crypto') {
      setLoading(true);
      try {
        const results = await searchCoins(query);
        if (results.length > 0) {
          await analyseCrypto(results[0].id);
        } else {
          setError(`Symbol '${query}' not found. Check the ticker and try again, or use the search bar to find the correct symbol.`);
          setLoading(false);
        }
      } catch (e: any) {
        setError(e.message);
        setLoading(false);
      }
    } else if (assetType === 'stocks') {
      await analyseStock(query.toUpperCase().trim(), 'stocks');
    } else if (assetType === 'etfs') {
      await analyseStock(query.toUpperCase().trim(), 'etfs');
    } else if (assetType === 'forex') {
      const clean = query.toUpperCase().replace(/[^A-Z]/g, '');
      if (clean.length === 6) {
        await analyseForex(clean);
      } else {
        setError('Enter a 6-character pair like AUDUSD or AUD/USD');
      }
    }
  }, [assetType, analyseCrypto, analyseStock, analyseForex]);

  const handleQuickPick = useCallback((id: string) => {
    if (assetType === 'crypto') analyseCrypto(id);
    else if (assetType === 'stocks') analyseStock(id, 'stocks');
    else if (assetType === 'etfs') analyseStock(id, 'etfs');
    else if (assetType === 'forex') analyseForex(id);
  }, [assetType, analyseCrypto, analyseStock, analyseForex]);

  const handleWatchlistSelect = useCallback((item: WatchlistItem) => {
    if (item.assetType === 'crypto') analyseCrypto(item.id);
    else if (item.assetType === 'stocks') analyseStock(item.id, 'stocks');
    else if (item.assetType === 'etfs') analyseStock(item.id, 'etfs');
    else if (item.assetType === 'forex') analyseForex(item.id);
  }, [analyseCrypto, analyseStock, analyseForex]);

  const getQuickPicks = useCallback(() => {
    if (assetType === 'crypto') return CRYPTO_PICKS.map(p => ({ label: p.sym, id: p.id }));
    if (assetType === 'stocks') return [...STOCK_PICKS_US, ...STOCK_PICKS_ASX].map(p => ({ label: p.sym, id: p.sym }));
    if (assetType === 'etfs') return [...ETF_PICKS_US, ...ETF_PICKS_ASX].map(p => ({ label: p.sym, id: p.sym }));
    return FOREX_PICKS.map(p => ({ label: p.name, id: `${p.from}${p.to}` }));
  }, [assetType]);

  const timeframes = assetType === 'crypto' ? CRYPTO_TIMEFRAMES : STOCK_TIMEFRAMES;

  const resultTabs: { key: ResultTab; label: string; icon: string }[] = [
    { key: 'charts', label: 'Charts', icon: '📈' },
    { key: 'recs', label: 'Recs', icon: '📊' },
    { key: 'trade', label: 'Trade', icon: '🎯' },
    { key: 'analysis', label: 'Analysis', icon: '📝' },
    { key: 'indicators', label: 'Indicators', icon: '📊' },
  ];

  const handleCurrencyChange = useCallback((code: string) => {
    const newVal = code === 'none' ? null : code;
    setSecCurrency(newVal);
    setSecondaryCurrency(newVal);
    if (newVal && assetInfo?.price) {
      convertFromUSD(assetInfo.price, newVal).then(p => setSecondaryPrice(p));
    } else {
      setSecondaryPrice(null);
    }
  }, [assetInfo]);

  return (
    <div className="min-h-screen bg-background">
      <Header active={assetType} onSelect={(t) => { setAssetType(t); setActiveTab('home'); setTechnicalData(null); setAssetInfo(null); setError(null); currentAssetRef.current = null; setDataSource(''); }} />
      <WatchlistBar items={watchlist} onSelect={handleWatchlistSelect} onClear={() => { setWatchlist([]); localStorage.removeItem('sf_watchlist'); }} />

      <main className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">
        {/* Search section */}
        <div className="space-y-3 sm:space-y-4">
          <SearchBar
            onSearch={handleSearch}
            placeholder={
              assetType === 'crypto' ? 'Search coins (e.g., bitcoin)...' :
              assetType === 'forex' ? 'Enter pair (e.g., AUD/USD)...' :
              assetType === 'stocks' ? 'Enter ticker (e.g., AAPL, BHP.AX)...' :
              'Enter ETF ticker (e.g., SPY, VGS.AX)...'
            }
            loading={loading}
          />
          {assetType === 'forex' && (
            <ForexPairSelector onAnalyse={(pairId) => analyseForex(pairId)} loading={loading} />
          )}
          <QuickPicks picks={getQuickPicks()} onSelect={handleQuickPick} loading={loading} />
          <GuidedDiscovery assetType={assetType} onSelect={handleQuickPick} loading={loading} />
        </div>

        {/* Loading */}
        {loading && (
          <div className="text-center py-16">
            <div className="text-primary font-mono animate-pulse-glow text-sm">Fetching data & running analysis...</div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="border border-destructive/50 bg-destructive/5 rounded-xl p-4">
            <p className="text-destructive text-sm font-mono">{error}</p>
          </div>
        )}

        {/* Results */}
        {technicalData && assetInfo && !loading && (
          <>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="flex items-center gap-3">
                <SignalPanel signal={technicalData.signal} price={assetInfo.price} name={assetInfo.name} symbol={assetInfo.symbol} />
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                {/* Data source badge */}
                {dataSource && (
                  <span className="flex items-center gap-1 text-[10px] sm:text-xs font-mono text-muted-foreground bg-sf-inset px-2 py-1 rounded-lg border border-border">
                    <span>📡</span> Data: {dataSource}
                  </span>
                )}
                {/* Secondary currency */}
                {secondaryCurrency && secondaryPrice !== null && assetInfo.assetType !== 'forex' && (
                  <span className="text-xs font-mono text-neutral-signal bg-neutral-signal/10 px-2 py-1 rounded-lg border border-neutral-signal/20">
                    {getCurrencySymbol(secondaryCurrency)}{secondaryPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {secondaryCurrency}
                  </span>
                )}
                {/* Currency selector */}
                <select
                  value={secondaryCurrency || 'none'}
                  onChange={e => handleCurrencyChange(e.target.value)}
                  className="text-[10px] sm:text-xs bg-sf-inset border border-border rounded-lg px-2 py-1 text-muted-foreground font-mono focus:outline-none focus:border-primary"
                >
                  <option value="none">No 2nd currency</option>
                  {SUPPORTED_CURRENCIES.map(c => (
                    <option key={c.code} value={c.code}>{c.symbol} {c.code}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-0.5 sm:gap-1 overflow-x-auto border-b border-border pb-0 -mx-3 px-3 sm:mx-0 sm:px-0">
              {resultTabs.map(t => (
                <button
                  key={t.key}
                  onClick={() => setActiveTab(t.key)}
                  className={`px-2.5 sm:px-4 py-2 sm:py-2.5 text-[11px] sm:text-xs font-medium whitespace-nowrap border-b-2 transition-all ${
                    activeTab === t.key
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {t.icon} {t.label}
                </button>
              ))}
            </div>

            {activeTab === 'charts' && (
              <div className="flex flex-col lg:flex-row gap-4">
                <div className="flex-1 min-w-0 space-y-4">
                  <ForecastMethodBar
                    selectedMethods={forecastMethods}
                    setSelectedMethods={setForecastMethods}
                  />
                  <MemoMainChart data={technicalData} />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <MemoVolumeChart data={technicalData} />
                    <MemoRSIChart data={technicalData} />
                  </div>
                </div>
                <div className="w-full lg:w-64 xl:w-72 shrink-0">
                  <ChartControls
                    timeframes={timeframes}
                    timeframeDays={timeframeDays}
                    setTimeframeDays={setTimeframeDays}
                    forecastPercent={forecastPercent}
                    setForecastPercent={setForecastPercent}
                    riskProfile={riskProfile}
                    setRiskProfile={setRiskProfile}
                  />
                </div>
              </div>
            )}

            {activeTab === 'recs' && (
              <MemoRecommendationPanel recommendations={technicalData.recommendations} />
            )}

            {activeTab === 'trade' && (
              <MemoTradeSetupPanel setups={technicalData.tradeSetups} />
            )}

            {activeTab === 'analysis' && (
              <AnalysisTextPanel text={technicalData.analysisText} marketPhase={technicalData.marketPhase} />
            )}

            {activeTab === 'indicators' && (
              <MemoIndicatorsPanel indicators={technicalData.indicators} currentPrice={assetInfo.price} />
            )}
          </>
        )}

        {/* Empty state */}
        {!technicalData && !loading && !error && (
          <div className="space-y-6">
            <div className="text-center py-6 sm:py-10 space-y-3">
              <div className="text-3xl sm:text-4xl">🔍</div>
              <h2 className="text-foreground text-lg sm:text-xl font-semibold">Select an asset to analyse</h2>
              <p className="text-muted-foreground text-xs sm:text-sm max-w-md mx-auto px-4">
                Search or tap a quick pick above, or explore the top picks and portfolio suggestions below.
              </p>
            </div>

            {assetType === 'crypto' && (
              <>
                <MemoBreakoutFinder onSelect={(id) => analyseCrypto(id)} />
                <MemoTopPicks onSelect={(id) => analyseCrypto(id)} />
              </>
            )}

            <div className="flex items-center justify-center gap-2">
              <span className="text-[10px] text-muted-foreground font-mono">RISK:</span>
              {(['conservative', 'moderate', 'aggressive'] as RiskProfile[]).map(r => (
                <button
                  key={r}
                  onClick={() => setRiskProfile(r)}
                  className={`px-3 py-1 rounded-lg text-[10px] sm:text-xs font-medium transition-all ${
                    riskProfile === r
                      ? 'bg-primary/15 text-primary border border-primary/30'
                      : 'text-muted-foreground hover:text-foreground border border-transparent'
                  }`}
                >
                  {r === 'conservative' ? '🛡️' : r === 'moderate' ? '⚖️' : '🔥'} {r.charAt(0).toUpperCase() + r.slice(1)}
                </button>
              ))}
            </div>
            <PortfolioBuilder riskProfile={riskProfile} />
          </div>
        )}
      </main>

      <footer className="border-t border-border mt-8 sm:mt-12 py-4 sm:py-6 px-3 sm:px-4">
        <div className="max-w-7xl mx-auto text-center space-y-1.5 sm:space-y-2">
          <p className="text-xs text-muted-foreground font-mono">Signal Forge v6.1 — Multi-Asset Investment Analysis</p>
          <p className="text-[10px] text-muted-foreground">
            CoinGecko • CoinPaprika (crypto) • Yahoo Finance • Alpha Vantage • FMP (stocks/ETFs) • Frankfurter (forex)
          </p>
          <p className="text-[10px] text-muted-foreground italic">
            ⚠️ Algorithmic analysis only. Not financial advice. Always do your own research.
          </p>
        </div>
      </footer>
    </div>
  );
}
