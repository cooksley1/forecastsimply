import { useState, useCallback, useRef, useEffect, memo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/layout/Header';
import SearchBar from '@/components/search/SearchBar';

import QuickPicks from '@/components/search/QuickPicks';
import ForexPairSelector from '@/components/search/ForexPairSelector';
import GuidedDiscovery from '@/components/search/GuidedDiscovery';
import MainChart from '@/components/charts/MainChart';
import ForecastMethodBar from '@/components/charts/ForecastMethodBar';
import AnalysisOverlayBar from '@/components/charts/AnalysisOverlayBar';
import type { OverlayId } from '@/components/charts/AnalysisOverlayBar';
import { FullscreenChartButton, FullscreenChartModal } from '@/components/charts/FullscreenChart';
import VolumeChart from '@/components/charts/VolumeChart';
import RSIChart from '@/components/charts/RSIChart';
import ChartControls from '@/components/charts/ChartControls';
import type { RiskProfile, RiskLevel } from '@/components/charts/ChartControls';
import { riskLevelToProfile, getRiskMeta } from '@/components/charts/ChartControls';
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
  CRYPTO_PICKS, STOCK_PICKS_BY_EXCHANGE, ETF_PICKS_BY_EXCHANGE, FOREX_PICKS,
  CRYPTO_TIMEFRAMES, STOCK_TIMEFRAMES,
} from '@/utils/constants';
import ExchangeSelector, { STOCK_EXCHANGES, ETF_EXCHANGES } from '@/components/search/ExchangeSelector';
import type { AssetType, AssetInfo, WatchlistItem } from '@/types/assets';
import type { TechnicalData } from '@/types/analysis';
import { getSecondaryCurrency, convertFromUSD, getCurrencySymbol, SUPPORTED_CURRENCIES, setSecondaryCurrency } from '@/utils/currencyConversion';

const MemoMainChart = memo(MainChart);
const MemoVolumeChart = memo(VolumeChart);
const MemoRSIChart = memo(RSIChart);
const MemoRecommendationPanel = memo(RecommendationPanel);
const MemoTradeSetupPanel = memo(TradeSetupPanel);
const MemoIndicatorsPanel = memo(IndicatorsPanel);
const MemoTopPicks = memo(TopPicks);
const MemoBreakoutFinder = memo(BreakoutFinder);

export default function Index() {
  const { user } = useAuth();
  const [assetType, setAssetType] = useState<AssetType>('crypto');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [assetInfo, setAssetInfo] = useState<AssetInfo | null>(null);
  const [technicalData, setTechnicalData] = useState<TechnicalData | null>(null);
  const [timeframeDays, setTimeframeDays] = useState(90);
  const [forecastPercent, setForecastPercent] = useState(30);
  const [forecastMethods, setForecastMethods] = useState<ForecastMethodId[]>(['holt']);
  const [riskLevel, setRiskLevel] = useState<RiskLevel>(3);
  const riskProfile = riskLevelToProfile(riskLevel);
  const [activeOverlays, setActiveOverlays] = useState<OverlayId[]>([]);
  const [fullscreenChart, setFullscreenChart] = useState(false);
  const [dataSource, setDataSource] = useState<string>('');
  const [stockExchange, setStockExchange] = useState('ALL');
  const [etfExchange, setEtfExchange] = useState('ALL');
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
      const next = [{ id: info.id, symbol: info.symbol, name: info.name, assetType: info.assetType, price: info.price, change24h: info.change24h, addedAt: Date.now() }, ...filtered].slice(0, 20);
      localStorage.setItem('sf_watchlist', JSON.stringify(next));
      return next;
    });
  }, []);

  const removeFromWatchlist = useCallback((id: string) => {
    setWatchlist(prev => {
      const next = prev.filter(w => w.id !== id);
      localStorage.setItem('sf_watchlist', JSON.stringify(next));
      return next;
    });
  }, []);

  const updateSecondaryPrice = useCallback(async (usdPrice: number) => {
    const curr = getSecondaryCurrency();
    if (curr && usdPrice > 0) {
      const converted = await convertFromUSD(usdPrice, curr);
      setSecondaryPrice(converted);
    } else {
      setSecondaryPrice(null);
    }
  }, []);

  const saveToHistory = useCallback(async (info: AssetInfo, ta: TechnicalData, source: string) => {
    if (!user) return;
    try {
      await supabase.from('analysis_history').insert({
        user_id: user.id,
        asset_id: info.id,
        asset_type: info.assetType,
        symbol: info.symbol,
        name: info.name,
        price: info.price,
        signal_label: ta.signal.label,
        signal_score: ta.signal.score,
        data_source: source,
        market_phase: ta.marketPhase,
      });
    } catch { /* silent */ }
  }, [user]);


  const analyseCrypto = useCallback(async (coinId: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchCryptoHistory(coinId, timeframeDays);
      setDataSource(result.source);
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

      const ta = processTA(result.priceData.closes, result.priceData.timestamps, result.priceData.volumes, forecastPercent, 'crypto', forecastMethods, riskLevel);
      currentAssetRef.current = { id: coinId, type: 'crypto' };
      setAssetInfo(info);
      setTechnicalData(ta);
      addToWatchlist(info);
      updateSecondaryPrice(livePrice);
      saveToHistory(info, ta, result.source);
    } catch (e: any) {
      setError(e.message || 'Failed to fetch data. Try again.');
    } finally {
      setLoading(false);
    }
  }, [timeframeDays, forecastPercent, forecastMethods, riskLevel, addToWatchlist, updateSecondaryPrice, saveToHistory]);

  /* ── Stocks / ETFs ── */
  const analyseStock = useCallback(async (symbol: string, type: 'stocks' | 'etfs') => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchEquityHistory(symbol, timeframeDays);
      setDataSource(result.source);
      const { closes, timestamps, volumes } = result.data;
      const lastPrice = closes[closes.length - 1];
      const change24h = closes.length >= 2 ? ((closes[closes.length - 1] - closes[closes.length - 2]) / closes[closes.length - 2]) * 100 : undefined;

      const info: AssetInfo = { id: symbol, symbol, name: symbol, assetType: type, price: lastPrice, change24h };

      if (result.source === 'Yahoo Finance') {
        try {
          const chart = await getStockChart(symbol, timeframeDays);
          info.name = chart.name || symbol;
          info.currency = chart.currency;
          info.exchange = chart.exchange;
          info.price = chart.regularMarketPrice;
        } catch { /* use defaults */ }
      }

      const ta = processTA(closes, timestamps, volumes, forecastPercent, type, forecastMethods, riskLevel);
      currentAssetRef.current = { id: symbol, type };
      setAssetInfo(info);
      setTechnicalData(ta);
      addToWatchlist(info);
      updateSecondaryPrice(lastPrice);
      saveToHistory(info, ta, result.source);
    } catch (e: any) {
      setError(e.message || `Failed to fetch ${symbol}.`);
    } finally {
      setLoading(false);
    }
  }, [timeframeDays, forecastPercent, forecastMethods, riskLevel, addToWatchlist, updateSecondaryPrice, saveToHistory]);

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
      const change24h = closes.length >= 2 ? ((closes[closes.length - 1] - closes[closes.length - 2]) / closes[closes.length - 2]) * 100 : undefined;

      const info: AssetInfo = { id: pairId, symbol: `${from}/${to}`, name: `${from}/${to}`, assetType: 'forex', price: lastPrice, change24h, currency: to };

      const ta = processTA(closes, timestamps, volumes, forecastPercent, 'forex', forecastMethods, riskLevel);
      currentAssetRef.current = { id: pairId, type: 'forex' };
      setAssetInfo(info);
      setTechnicalData(ta);
      addToWatchlist(info);
      saveToHistory(info, ta, result.source);
    } catch (e: any) {
      setError(e.message || 'Failed to fetch forex data. Try again.');
    } finally {
      setLoading(false);
    }
  }, [timeframeDays, forecastPercent, forecastMethods, riskLevel, addToWatchlist, saveToHistory]);

  /* ── Auto-reanalyse ── */
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    const asset = currentAssetRef.current;
    if (!asset) return;
    const timer = setTimeout(() => {
      if (asset.type === 'crypto') analyseCrypto(asset.id);
      else if (asset.type === 'stocks') analyseStock(asset.id, 'stocks');
      else if (asset.type === 'etfs') analyseStock(asset.id, 'etfs');
      else if (asset.type === 'forex') analyseForex(asset.id);
    }, 500);
    return () => clearTimeout(timer);
  }, [timeframeDays, forecastPercent, forecastMethods, riskLevel]);

  /* ── Handlers ── */
  const handleSearch = useCallback(async (query: string) => {
    if (assetType === 'crypto') {
      setLoading(true);
      try {
        const results = await searchCoins(query);
        if (results.length > 0) await analyseCrypto(results[0].id);
        else { setError(`Symbol '${query}' not found.`); setLoading(false); }
      } catch (e: any) { setError(e.message); setLoading(false); }
    } else if (assetType === 'stocks') await analyseStock(query.toUpperCase().trim(), 'stocks');
    else if (assetType === 'etfs') await analyseStock(query.toUpperCase().trim(), 'etfs');
    else if (assetType === 'forex') {
      const clean = query.toUpperCase().replace(/[^A-Z]/g, '');
      if (clean.length === 6) await analyseForex(clean);
      else setError('Enter a 6-character pair like AUDUSD');
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
    if (assetType === 'stocks') return (STOCK_PICKS_BY_EXCHANGE[stockExchange] || []).map(p => ({ label: p.sym, id: p.sym }));
    if (assetType === 'etfs') return (ETF_PICKS_BY_EXCHANGE[etfExchange] || []).map(p => ({ label: p.sym, id: p.sym }));
    return FOREX_PICKS.map(p => ({ label: p.name, id: `${p.from}${p.to}` }));
  }, [assetType, stockExchange, etfExchange]);

  const handleCurrencyChange = useCallback((code: string) => {
    const newVal = code === 'none' ? null : code;
    setSecCurrency(newVal);
    setSecondaryCurrency(newVal);
    if (newVal && assetInfo?.price) convertFromUSD(assetInfo.price, newVal).then(p => setSecondaryPrice(p));
    else setSecondaryPrice(null);
  }, [assetInfo]);

  const timeframes = assetType === 'crypto' ? CRYPTO_TIMEFRAMES : STOCK_TIMEFRAMES;
  const showAnalysis = technicalData && assetInfo && !loading;

  return (
    <div className="min-h-screen bg-background">
      <Header
        watchlist={watchlist}
        onWatchlistSelect={handleWatchlistSelect}
        onWatchlistRemove={removeFromWatchlist}
        onWatchlistClear={() => { setWatchlist([]); localStorage.removeItem('sf_watchlist'); }}
      />

      <main className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4">
        {/* ── SEARCH BAR + ASSET TABS ── Always visible */}
        <div className="space-y-3">
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
          {/* Asset type tabs */}
          <nav className="flex gap-1 overflow-x-auto">
            {([
              { key: 'crypto' as const, label: 'Crypto', icon: '🪙' },
              { key: 'stocks' as const, label: 'Stocks', icon: '📈' },
              { key: 'etfs' as const, label: 'ETFs', icon: '📊' },
              { key: 'forex' as const, label: 'Forex', icon: '💱' },
            ]).map(t => (
              <button
                key={t.key}
                onClick={() => { setAssetType(t.key); setError(null); currentAssetRef.current = null; setDataSource(''); }}
                className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
                  assetType === t.key
                    ? 'bg-primary/15 text-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                }`}
              >
                <span className="mr-1">{t.icon}</span>
                {t.label}
              </button>
            ))}
          </nav>
          {assetType === 'forex' && <ForexPairSelector onAnalyse={(pairId) => analyseForex(pairId)} loading={loading} />}
          {(assetType === 'stocks' || assetType === 'etfs') && (
            <ExchangeSelector
              exchanges={assetType === 'stocks' ? STOCK_EXCHANGES : ETF_EXCHANGES}
              selected={assetType === 'stocks' ? stockExchange : etfExchange}
              onSelect={assetType === 'stocks' ? setStockExchange : setEtfExchange}
            />
          )}
          <QuickPicks picks={getQuickPicks()} onSelect={handleQuickPick} loading={loading} />
        </div>

        {loading && (
          <div className="text-center py-12">
            <div className="text-primary font-mono animate-pulse-glow text-sm">Fetching data & running analysis...</div>
          </div>
        )}

        {error && (
          <div className="border border-destructive/50 bg-destructive/5 rounded-xl p-4">
            <p className="text-destructive text-sm font-mono">{error}</p>
          </div>
        )}

        {/* ── ANALYSIS RESULTS — Card Grid Layout ── */}
        {showAnalysis && (
          <div className="space-y-4">
            {/* Signal + metadata bar */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <SignalPanel signal={technicalData.signal} price={assetInfo.price} name={assetInfo.name} symbol={assetInfo.symbol} />
              <div className="flex items-center gap-2 flex-wrap ml-auto">
                {dataSource && (
                  <span className="text-[10px] sm:text-xs font-mono text-muted-foreground bg-card px-2 py-1 rounded-lg border border-border">
                    📡 {dataSource}
                  </span>
                )}
                {secondaryCurrency && secondaryPrice !== null && assetInfo.assetType !== 'forex' && (
                  <span className="text-xs font-mono text-neutral-signal bg-neutral-signal/10 px-2 py-1 rounded-lg border border-neutral-signal/20">
                    {getCurrencySymbol(secondaryCurrency)}{secondaryPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {secondaryCurrency}
                  </span>
                )}
                <select
                  value={secondaryCurrency || 'none'}
                  onChange={e => handleCurrencyChange(e.target.value)}
                  className="text-[10px] sm:text-xs bg-card border border-border rounded-lg px-2 py-1 text-muted-foreground font-mono focus:outline-none focus:border-primary"
                >
                  <option value="none">No 2nd currency</option>
                  {SUPPORTED_CURRENCIES.map(c => (
                    <option key={c.code} value={c.code}>{c.symbol} {c.code}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Timeframe bar */}
            <div className="bg-card border border-border rounded-xl p-3">
              <div className="flex items-center gap-1 overflow-x-auto">
                <span className="text-[10px] text-muted-foreground font-mono uppercase shrink-0">TF:</span>
                {timeframes.map(tf => (
                  <button
                    key={tf.days}
                    onClick={() => setTimeframeDays(tf.days)}
                    className={`px-2 py-1 rounded text-[10px] font-mono transition-all ${
                      timeframeDays === tf.days ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {tf.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Forecast bar */}
            <div className="bg-card border border-border rounded-xl p-3">
              <div className="flex items-center gap-2 flex-wrap">
                {/* Forecast slider */}
                <div className="flex items-center gap-1 shrink-0 group relative">
                  <span className="text-[10px] text-muted-foreground font-mono cursor-help" title="How far ahead to project prices">FC</span>
                  <input type="range" min={10} max={80} value={forecastPercent} onChange={e => setForecastPercent(Number(e.target.value))} className="w-16 sm:w-20 accent-primary" />
                  <span className="text-[10px] font-mono text-muted-foreground">{forecastPercent}%</span>
                </div>
              </div>
            </div>

            <ForecastMethodBar selectedMethods={forecastMethods} setSelectedMethods={setForecastMethods} />
            <AnalysisOverlayBar selected={activeOverlays} setSelected={setActiveOverlays} />

            {/* Card Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Price Chart — full width */}
              <div className="lg:col-span-2 relative">
                <FullscreenChartButton onClick={() => setFullscreenChart(true)} />
                <MemoMainChart data={technicalData} timeframeDays={timeframeDays} activeOverlays={activeOverlays} />
              </div>

              {/* Volume & RSI */}
              <MemoVolumeChart data={technicalData} />
              <MemoRSIChart data={technicalData} />

              {/* Risk Profile + Recommendations + Trade Setups */}
              <div className="lg:col-span-2 space-y-4">
                {/* Risk slider inline */}
                <div className="bg-card border border-border rounded-xl p-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-[10px] text-muted-foreground font-mono uppercase cursor-help" title="Adjusts trade setup stop-loss/take-profit levels and recommendations">Risk</span>
                      <input type="range" min={1} max={5} step={1} value={riskLevel} onChange={e => setRiskLevel(Number(e.target.value) as RiskLevel)} className="w-16 sm:w-20 accent-primary" />
                      <span className="text-[10px] font-mono text-primary whitespace-nowrap">{getRiskMeta(riskLevel).icon} {getRiskMeta(riskLevel).label}</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground font-mono hidden sm:inline">— Adjusts trade setups & recommendations</span>
                  </div>
                </div>
                <MemoRecommendationPanel recommendations={technicalData.recommendations} />
              </div>

              {/* Trade Setups */}
              <MemoTradeSetupPanel setups={technicalData.tradeSetups} />

              {/* Indicators */}
              <MemoIndicatorsPanel indicators={technicalData.indicators} currentPrice={assetInfo.price} />

              {/* Analysis Text — full width */}
              <div className="lg:col-span-2">
                <AnalysisTextPanel text={technicalData.analysisText} marketPhase={technicalData.marketPhase} />
              </div>
            </div>
          </div>
        )}

        {/* ── DASHBOARD — empty state ── */}
        {!technicalData && !loading && !error && (
          <div className="space-y-6">

            <GuidedDiscovery assetType={assetType} onSelect={handleQuickPick} loading={loading} />

            {assetType === 'crypto' && (
              <>
                <MemoBreakoutFinder onSelect={(id) => analyseCrypto(id)} />
                <MemoTopPicks onSelect={(id) => analyseCrypto(id)} />
              </>
            )}

            <PortfolioBuilder riskProfile={riskProfile} riskLevel={riskLevel} onRiskLevelChange={setRiskLevel} />
          </div>
        )}
      </main>

      <footer className="border-t border-border mt-8 py-6 px-3">
        <div className="max-w-7xl mx-auto space-y-3">
          <div className="flex flex-wrap justify-center gap-3 sm:gap-4">
            <Link to="/about" className="text-[10px] sm:text-xs text-muted-foreground hover:text-foreground transition-colors">About</Link>
            <Link to="/faq" className="text-[10px] sm:text-xs text-muted-foreground hover:text-foreground transition-colors">FAQ</Link>
            <Link to="/contact" className="text-[10px] sm:text-xs text-muted-foreground hover:text-foreground transition-colors">Contact</Link>
            <Link to="/privacy" className="text-[10px] sm:text-xs text-muted-foreground hover:text-foreground transition-colors">Privacy</Link>
            <Link to="/terms" className="text-[10px] sm:text-xs text-muted-foreground hover:text-foreground transition-colors">Terms</Link>
            <Link to="/disclaimer" className="text-[10px] sm:text-xs text-muted-foreground hover:text-foreground transition-colors">Disclaimer</Link>
          </div>
          <div className="text-center space-y-1">
            <p className="text-[10px] text-muted-foreground font-mono tracking-wider">ANALYSE · FORECAST · DECIDE</p>
            <p className="text-[10px] text-muted-foreground italic">⚠️ Not financial advice. Always DYOR.</p>
          </div>
        </div>
      </footer>

      {fullscreenChart && technicalData && (
        <FullscreenChartModal
          data={technicalData}
          timeframeDays={timeframeDays}
          activeOverlays={activeOverlays}
          setActiveOverlays={setActiveOverlays}
          forecastMethods={forecastMethods}
          setForecastMethods={setForecastMethods}
          onClose={() => setFullscreenChart(false)}
        />
      )}
    </div>
  );
}
