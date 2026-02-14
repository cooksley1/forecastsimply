import { useState, useCallback } from 'react';
import Header from '@/components/layout/Header';
import WatchlistBar from '@/components/layout/WatchlistBar';
import SearchBar from '@/components/search/SearchBar';
import QuickPicks from '@/components/search/QuickPicks';
import MainChart from '@/components/charts/MainChart';
import VolumeChart from '@/components/charts/VolumeChart';
import RSIChart from '@/components/charts/RSIChart';
import SignalPanel from '@/components/analysis/SignalPanel';
import RecommendationPanel from '@/components/analysis/RecommendationPanel';
import TradeSetupPanel from '@/components/analysis/TradeSetupPanel';
import AnalysisTextPanel from '@/components/analysis/AnalysisTextPanel';
import IndicatorsPanel from '@/components/analysis/IndicatorsPanel';
import { getCoinData, getCoinChart, searchCoins } from '@/services/api/coingecko';
import { processTA } from '@/analysis/processTA';
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
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>(() => {
    try { return JSON.parse(localStorage.getItem('sf_watchlist') || '[]'); } catch { return []; }
  });

  const addToWatchlist = useCallback((info: AssetInfo) => {
    setWatchlist(prev => {
      const filtered = prev.filter(w => w.id !== info.id);
      const next = [{ id: info.id, symbol: info.symbol, name: info.name, assetType: info.assetType, price: info.price, change24h: info.change24h, addedAt: Date.now() }, ...filtered].slice(0, 12);
      localStorage.setItem('sf_watchlist', JSON.stringify(next));
      return next;
    });
  }, []);

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

      const ta = processTA(closes, timestamps, vols, forecastPercent, 'crypto');

      setAssetInfo(info);
      setTechnicalData(ta);
      addToWatchlist(info);
      setActiveTab('charts');
    } catch (e: any) {
      setError(e.message || 'Failed to fetch data. Try again.');
    } finally {
      setLoading(false);
    }
  }, [timeframeDays, forecastPercent, addToWatchlist]);

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
    }
  }, [assetType, analyseCrypto]);

  const handleQuickPick = useCallback((id: string) => {
    if (assetType === 'crypto') analyseCrypto(id);
  }, [assetType, analyseCrypto]);

  const handleWatchlistSelect = useCallback((item: WatchlistItem) => {
    if (item.assetType === 'crypto') analyseCrypto(item.id);
  }, [analyseCrypto]);

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
      <Header active={assetType} onSelect={(t) => { setAssetType(t); setActiveTab('home'); setTechnicalData(null); setAssetInfo(null); setError(null); }} />
      <WatchlistBar items={watchlist} onSelect={handleWatchlistSelect} onClear={() => { setWatchlist([]); localStorage.removeItem('sf_watchlist'); }} />

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Search section */}
        <div className="space-y-4">
          <SearchBar
            onSearch={handleSearch}
            placeholder={assetType === 'crypto' ? 'Search coins (e.g., bitcoin, ethereum)...' : assetType === 'forex' ? 'Search currency pairs...' : 'Search by ticker or name...'}
            loading={loading}
          />
          <QuickPicks picks={getQuickPicks()} onSelect={handleQuickPick} loading={loading} />

          {/* Timeframe selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground font-mono">TIMEFRAME</span>
            {timeframes.map(tf => (
              <button
                key={tf.days}
                onClick={() => setTimeframeDays(tf.days)}
                className={`px-3 py-1 rounded text-xs font-mono transition-all ${
                  timeframeDays === tf.days
                    ? 'bg-primary/15 text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {tf.label}
              </button>
            ))}

            <div className="ml-4 flex items-center gap-2">
              <span className="text-xs text-muted-foreground font-mono">FORECAST</span>
              <input
                type="range"
                min={10}
                max={80}
                value={forecastPercent}
                onChange={e => setForecastPercent(Number(e.target.value))}
                className="w-24 accent-primary"
              />
              <span className="text-xs font-mono text-foreground">{forecastPercent}%</span>
            </div>
          </div>
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
            {/* Signal banner */}
            <SignalPanel signal={technicalData.signal} price={assetInfo.price} name={assetInfo.name} symbol={assetInfo.symbol} />

            {/* Result tabs */}
            <div className="flex gap-1 overflow-x-auto border-b border-border pb-0">
              {resultTabs.map(t => (
                <button
                  key={t.key}
                  onClick={() => setActiveTab(t.key)}
                  className={`px-4 py-2.5 text-xs font-medium whitespace-nowrap border-b-2 transition-all ${
                    activeTab === t.key
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {t.icon} {t.label}
                </button>
              ))}
            </div>

            {/* Tab content */}
            {activeTab === 'charts' && (
              <div className="space-y-4">
                <MainChart data={technicalData} />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <VolumeChart data={technicalData} />
                  <RSIChart data={technicalData} />
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

        {/* Empty state */}
        {!technicalData && !loading && !error && (
          <div className="text-center py-20 space-y-4">
            <div className="text-4xl">🔍</div>
            <h2 className="text-foreground text-xl font-semibold">Select an asset to analyse</h2>
            <p className="text-muted-foreground text-sm max-w-md mx-auto">
              Search or click a quick pick above to get real-time technical analysis, signals, forecasts, and trade setups.
            </p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border mt-12 py-6 px-4">
        <div className="max-w-7xl mx-auto text-center space-y-2">
          <p className="text-xs text-muted-foreground font-mono">Signal Forge v6.0 — Multi-Asset Investment Analysis</p>
          <p className="text-[10px] text-muted-foreground">
            CoinGecko (crypto) • Yahoo Finance (stocks/ETFs) • Frankfurter (forex) • Alpha Vantage (fallback)
          </p>
          <p className="text-[10px] text-muted-foreground italic">
            ⚠️ Algorithmic analysis only. Not financial advice. Always do your own research.
          </p>
        </div>
      </footer>
    </div>
  );
}
