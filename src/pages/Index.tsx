import { useState, useCallback, useRef, useEffect } from 'react';
import Header from '@/components/layout/Header';
import WatchlistBar from '@/components/layout/WatchlistBar';
import SearchBar from '@/components/search/SearchBar';
import QuickPicks from '@/components/search/QuickPicks';
import MainChart from '@/components/charts/MainChart';
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
import { getCoinData, getCoinChart, searchCoins } from '@/services/api/coingecko';
import { getStockChart } from '@/services/api/yahoo';
import { getForexChart } from '@/services/api/frankfurter';
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

export default function Index() {
  const [assetType, setAssetType] = useState<AssetType>('crypto');
  const [activeTab, setActiveTab] = useState<ResultTab>('home');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [assetInfo, setAssetInfo] = useState<AssetInfo | null>(null);
  const [technicalData, setTechnicalData] = useState<TechnicalData | null>(null);
  const [timeframeDays, setTimeframeDays] = useState(90);
  const [forecastPercent, setForecastPercent] = useState(30);
  const [forecastMethod, setForecastMethod] = useState<ForecastMethodId>('holt');
  const [riskProfile, setRiskProfile] = useState<RiskProfile>('moderate');
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

  /* ── Crypto ── */
  const analyseCrypto = useCallback(async (coinId: string) => {
    setLoading(true);
    setError(null);
    try {
      const [coinData, chartData] = await Promise.all([
        getCoinData(coinId),
        getCoinChart(coinId, timeframeDays),
      ]);

      const info: AssetInfo = {
        id: coinId,
        symbol: coinData.symbol?.toUpperCase() || coinId,
        name: coinData.name || coinId,
        assetType: 'crypto',
        price: coinData.market_data?.current_price?.usd || 0,
        priceAud: coinData.market_data?.current_price?.aud,
        change24h: coinData.market_data?.price_change_percentage_24h,
        change7d: coinData.market_data?.price_change_percentage_7d,
        change30d: coinData.market_data?.price_change_percentage_30d,
        marketCap: coinData.market_data?.market_cap?.usd,
        volume24h: coinData.market_data?.total_volume?.usd,
        circulatingSupply: coinData.market_data?.circulating_supply,
        maxSupply: coinData.market_data?.max_supply,
        ath: coinData.market_data?.ath?.usd,
        atl: coinData.market_data?.atl?.usd,
        rank: coinData.market_cap_rank,
        image: coinData.image?.small,
        description: coinData.description?.en?.slice(0, 200),
      };

      const prices = chartData.prices || [];
      const volumes = chartData.total_volumes || [];
      const closes = prices.map((p: number[]) => p[1]);
      const timestamps = prices.map((p: number[]) => p[0]);
      const vols = volumes.map((v: number[]) => v[1]);

      const ta = processTA(closes, timestamps, vols, forecastPercent, 'crypto', forecastMethod);
      currentAssetRef.current = { id: coinId, type: 'crypto' };
      setAssetInfo(info);
      setTechnicalData(ta);
      addToWatchlist(info);
      setActiveTab('charts');
    } catch (e: any) {
      setError(e.message || 'Failed to fetch data. Try again.');
    } finally {
      setLoading(false);
    }
  }, [timeframeDays, forecastPercent, forecastMethod, addToWatchlist]);

  /* ── Stocks / ETFs ── */
  const analyseStock = useCallback(async (symbol: string, type: 'stocks' | 'etfs') => {
    setLoading(true);
    setError(null);
    try {
      const chart = await getStockChart(symbol, timeframeDays);
      const change24h = chart.closes.length >= 2
        ? ((chart.closes[chart.closes.length - 1] - chart.closes[chart.closes.length - 2]) / chart.closes[chart.closes.length - 2]) * 100
        : undefined;

      const info: AssetInfo = {
        id: symbol,
        symbol: chart.symbol || symbol,
        name: chart.name || symbol,
        assetType: type,
        price: chart.regularMarketPrice,
        change24h,
        currency: chart.currency,
        exchange: chart.exchange,
      };

      const ta = processTA(chart.closes, chart.timestamps, chart.volumes, forecastPercent, type, forecastMethod);
      currentAssetRef.current = { id: symbol, type };
      setAssetInfo(info);
      setTechnicalData(ta);
      addToWatchlist(info);
      setActiveTab('charts');
    } catch (e: any) {
      setError(e.message || `Failed to fetch ${symbol}. The CORS proxy may be temporarily unavailable — try again.`);
    } finally {
      setLoading(false);
    }
  }, [timeframeDays, forecastPercent, forecastMethod, addToWatchlist]);

  /* ── Forex ── */
  const analyseForex = useCallback(async (pairId: string) => {
    setLoading(true);
    setError(null);
    try {
      const from = pairId.slice(0, 3);
      const to = pairId.slice(3, 6);

      const chart = await getForexChart(from, to, timeframeDays);
      const change24h = chart.closes.length >= 2
        ? ((chart.closes[chart.closes.length - 1] - chart.closes[chart.closes.length - 2]) / chart.closes[chart.closes.length - 2]) * 100
        : undefined;

      const info: AssetInfo = {
        id: pairId,
        symbol: `${from}/${to}`,
        name: `${from}/${to}`,
        assetType: 'forex',
        price: chart.currentRate,
        change24h,
        currency: to,
      };

      const emptyVols = new Array(chart.closes.length).fill(0);
      const ta = processTA(chart.closes, chart.timestamps, emptyVols, forecastPercent, 'forex', forecastMethod);
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
  }, [timeframeDays, forecastPercent, forecastMethod, addToWatchlist]);

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
  }, [timeframeDays, forecastPercent, forecastMethod]);

  /* ── Unified handlers ── */
  const handleSearch = useCallback(async (query: string) => {
    if (assetType === 'crypto') {
      setLoading(true);
      try {
        const results = await searchCoins(query);
        if (results.length > 0) {
          await analyseCrypto(results[0].id);
        } else {
          setError('No results found.');
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

  const getQuickPicks = () => {
    if (assetType === 'crypto') return CRYPTO_PICKS.map(p => ({ label: p.sym, id: p.id }));
    if (assetType === 'stocks') return [...STOCK_PICKS_US, ...STOCK_PICKS_ASX].map(p => ({ label: p.sym, id: p.sym }));
    if (assetType === 'etfs') return [...ETF_PICKS_US, ...ETF_PICKS_ASX].map(p => ({ label: p.sym, id: p.sym }));
    return FOREX_PICKS.map(p => ({ label: p.name, id: `${p.from}${p.to}` }));
  };

  const timeframes = assetType === 'crypto' ? CRYPTO_TIMEFRAMES : STOCK_TIMEFRAMES;

  const resultTabs: { key: ResultTab; label: string; icon: string }[] = [
    { key: 'charts', label: 'Charts', icon: '📈' },
    { key: 'recs', label: 'Recs', icon: '📊' },
    { key: 'trade', label: 'Trade', icon: '🎯' },
    { key: 'analysis', label: 'Analysis', icon: '📝' },
    { key: 'indicators', label: 'Indicators', icon: '📊' },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header active={assetType} onSelect={(t) => { setAssetType(t); setActiveTab('home'); setTechnicalData(null); setAssetInfo(null); setError(null); currentAssetRef.current = null; }} />
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
          <QuickPicks picks={getQuickPicks()} onSelect={handleQuickPick} loading={loading} />
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
            <SignalPanel signal={technicalData.signal} price={assetInfo.price} name={assetInfo.name} symbol={assetInfo.symbol} />

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
                {/* Charts — main area */}
                <div className="flex-1 min-w-0 space-y-4">
                  <MainChart data={technicalData} />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <VolumeChart data={technicalData} />
                    <RSIChart data={technicalData} />
                  </div>
                </div>

                {/* Controls — sidebar on desktop, stacked on mobile */}
                <div className="w-full lg:w-64 xl:w-72 shrink-0">
                  <ChartControls
                    timeframes={timeframes}
                    timeframeDays={timeframeDays}
                    setTimeframeDays={setTimeframeDays}
                    forecastPercent={forecastPercent}
                    setForecastPercent={setForecastPercent}
                    forecastMethod={forecastMethod}
                    setForecastMethod={setForecastMethod}
                    riskProfile={riskProfile}
                    setRiskProfile={setRiskProfile}
                  />
                </div>
              </div>
            )}

            {activeTab === 'recs' && (
              <RecommendationPanel recommendations={technicalData.recommendations} />
            )}

            {activeTab === 'trade' && (
              <TradeSetupPanel setups={technicalData.tradeSetups} />
            )}

            {activeTab === 'analysis' && (
              <AnalysisTextPanel text={technicalData.analysisText} marketPhase={technicalData.marketPhase} />
            )}

            {activeTab === 'indicators' && (
              <IndicatorsPanel indicators={technicalData.indicators} currentPrice={assetInfo.price} />
            )}
          </>
        )}

        {/* Empty state — show Top Picks + Portfolio Builder */}
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
                <BreakoutFinder onSelect={(id) => analyseCrypto(id)} />
                <TopPicks onSelect={(id) => analyseCrypto(id)} />
              </>
            )}

            <PortfolioBuilder riskProfile={riskProfile} />

            {/* Risk profile selector for home screen */}
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
          </div>
        )}
      </main>

      <footer className="border-t border-border mt-8 sm:mt-12 py-4 sm:py-6 px-3 sm:px-4">
        <div className="max-w-7xl mx-auto text-center space-y-1.5 sm:space-y-2">
          <p className="text-xs text-muted-foreground font-mono">Signal Forge v6.0 — Multi-Asset Investment Analysis</p>
          <p className="text-[10px] text-muted-foreground">
            CoinGecko (crypto) • Yahoo Finance (stocks/ETFs) • Frankfurter (forex)
          </p>
          <p className="text-[10px] text-muted-foreground italic">
            ⚠️ Algorithmic analysis only. Not financial advice. Always do your own research.
          </p>
        </div>
      </footer>
    </div>
  );
}
