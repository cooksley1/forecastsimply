import { useState, useCallback, useRef, useEffect, memo } from 'react';
import { LineChart, RefreshCw, ArrowLeft, Bookmark, BookmarkCheck } from 'lucide-react';
import { toast } from 'sonner';
import { canRankRefresh, recordRankRefresh } from '@/utils/refreshLimit';
import { APP_VERSION } from '@/utils/version';
import { useRefreshExempt } from '@/hooks/useRefreshExempt';
import PriceAlertDialog from '@/components/alerts/PriceAlertDialog';
import type { SortCriteria, RankTimeframe } from '@/components/search/QuickPicks';
import { RANK_TIMEFRAME_DAYS } from '@/components/search/QuickPicks';
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
import TopPicksDashboard from '@/components/analysis/TopPicksDashboard';
import BestPickFinder from '@/components/analysis/BestPickFinder';
import CongressTrades from '@/components/analysis/CongressTrades';
import BreakoutFinder from '@/components/analysis/BreakoutFinder';
import ConditionScreener from '@/components/analysis/ConditionScreener';
import StrategyBacktester from '@/components/analysis/StrategyBacktester';
import IndicatorBuilder from '@/components/analysis/IndicatorBuilder';
import Glossary from '@/components/analysis/Glossary';
import { getCoinData, searchCoins } from '@/services/api/coingecko';
import { getDIACryptoPrice, geckoIdToDIASymbol } from '@/services/api/dia';
import { getStockChart } from '@/services/api/yahoo';
import { fetchCryptoHistory, fetchEquityHistory, fetchForexHistory } from '@/services/fetcher';
import { getUnsupportedCoin, loadUnsupportedCoins } from '@/utils/unsupportedCoins';
import { processTA } from '@/analysis/processTA';
import { applyCrossTimeframeAdjustment } from '@/analysis/crossTimeframe';
import type { ForecastMethodId } from '@/analysis/forecast';
import {
  CRYPTO_PICKS, STOCK_PICKS_BY_EXCHANGE, ETF_PICKS_BY_EXCHANGE, FOREX_PICKS,
  CRYPTO_TIMEFRAMES, STOCK_TIMEFRAMES,
} from '@/utils/constants';
import ExchangeSelector, { STOCK_EXCHANGES, ETF_EXCHANGES } from '@/components/search/ExchangeSelector';
import StickySubNav from '@/components/layout/StickySubNav';
import { useExchangeScreener, SCREENER_SUPPORTED, type ScreenerSubgroup } from '@/hooks/useExchangeScreener';
import { useCryptoScreener } from '@/hooks/useCryptoScreener';
import { useDailyAnalysis } from '@/hooks/useDailyAnalysis';
import SocialShare from '@/components/SocialShare';
import ReportButton from '@/components/analysis/ReportButton';
import SmartFeed from '@/components/SmartFeed';
import LiveTracker from '@/components/analysis/LiveTracker';
import NewsletterSignup from '@/components/NewsletterSignup';
import type { AssetType, AssetInfo, WatchlistItem, SimulationData } from '@/types/assets';
import type { Recommendation, TradeSetup } from '@/types/analysis';
import type { TechnicalData } from '@/types/analysis';
import { getSecondaryCurrency, convertFromUSD, getCurrencySymbol, SUPPORTED_CURRENCIES, setSecondaryCurrency } from '@/utils/currencyConversion';

const MemoMainChart = memo(MainChart);
const MemoVolumeChart = memo(VolumeChart);
const MemoRSIChart = memo(RSIChart);

const MemoTradeSetupPanel = memo(TradeSetupPanel);
const MemoIndicatorsPanel = memo(IndicatorsPanel);
const MemoTopPicks = memo(TopPicks);
const MemoBreakoutFinder = memo(BreakoutFinder);

export default function Index() {
  const { user } = useAuth();
  const { isExempt } = useRefreshExempt();
  const [assetType, setAssetType] = useState<AssetType>('crypto');
  const [overviewMode, setOverviewMode] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [assetInfo, setAssetInfo] = useState<AssetInfo | null>(null);
  const [technicalData, setTechnicalData] = useState<TechnicalData | null>(null);
  const [timeframeDays, setTimeframeDays] = useState(90);
  const [forecastPercent, setForecastPercent] = useState(30);
  const [forecastMethods, setForecastMethods] = useState<ForecastMethodId[]>(['ensemble']);
  const [riskLevel, setRiskLevel] = useState<RiskLevel>(3);
  const riskProfile = riskLevelToProfile(riskLevel);
  const [activeOverlays, setActiveOverlays] = useState<OverlayId[]>([]);
  const [fullscreenChart, setFullscreenChart] = useState(false);
  const isNewSearchRef = useRef(false);
  const [dataSource, setDataSource] = useState<string>('');
  const [dataFetchedAt, setDataFetchedAt] = useState<Date | null>(null);
  // Country-based defaults
  const savedCountry = localStorage.getItem('sf_country') || 'AU';
  const COUNTRY_EXCHANGE_MAP: Record<string, string> = { AU: 'ASX', US: 'NYSE', UK: 'LSE', HK: 'HKG', JP: 'JPX', CA: 'NYSE', NZ: 'ASX', EU: 'LSE' };
  const [stockExchange, setStockExchange] = useState(COUNTRY_EXCHANGE_MAP[savedCountry] || 'ASX');
  const [dividendOnly, setDividendOnly] = useState(false);
  const [etfExchange, setEtfExchange] = useState(COUNTRY_EXCHANGE_MAP[savedCountry] || 'ASX');
  const [ranking, setRanking] = useState(false);
  const [rankedPicks, setRankedPicks] = useState<Record<string, { label: string; score: number; confidence: number; projectedReturn?: number; peakMonths?: number; peakWarning?: string }>>({});
  const [pickSort, setPickSort] = useState<SortCriteria>('default');
  const [rankTimeframe, setRankTimeframe] = useState<RankTimeframe>('6M');
  const [secondaryCurrency, setSecCurrency] = useState<string | null>(getSecondaryCurrency());
  const [secondaryPrice, setSecondaryPrice] = useState<number | null>(null);
  const [alertDialogOpen, setAlertDialogOpen] = useState(false);
  const [alertRefreshKey, setAlertRefreshKey] = useState(0);
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>(() => {
    try { return JSON.parse(localStorage.getItem('sf_watchlist') || '[]'); } catch { return []; }
  });

  // Dynamic exchange screener — supports all major exchanges
  const [asxSubgroup, setAsxSubgroup] = useState<ScreenerSubgroup>('asx200');
  const useStockScreener = assetType === 'stocks' && SCREENER_SUPPORTED.includes(stockExchange);
  const useEtfScreener = assetType === 'etfs' && SCREENER_SUPPORTED.includes(etfExchange);
  const screenerExchange = useStockScreener ? stockExchange : useEtfScreener ? etfExchange : 'NYSE';
  const { stocks: screenerStocks, loading: screenerLoading } = useExchangeScreener(
    screenerExchange,
    useStockScreener || useEtfScreener,
    useStockScreener ? 'equity' : 'etf',
    useStockScreener && stockExchange === 'ASX' ? asxSubgroup : 'all',
  );

  // Crypto screener — top 500 coins
  const { coins: cryptoCoins, loading: cryptoScreenerLoading } = useCryptoScreener(assetType === 'crypto');

  // Daily pre-computed analysis cache — always use the user's selected timeframe for consistency
  const { data: dailyStockAnalysis, loading: dailyStockLoading } = useDailyAnalysis({
    assetType: 'stocks',
    exchange: stockExchange,
    timeframeDays: timeframeDays,
    enabled: assetType === 'stocks',
  });
  const { data: dailyCryptoAnalysis, loading: dailyCryptoLoading } = useDailyAnalysis({
    assetType: 'crypto',
    timeframeDays: timeframeDays,
    enabled: assetType === 'crypto',
  });
  const { data: dailyEtfAnalysis, loading: dailyEtfLoading } = useDailyAnalysis({
    assetType: 'etfs',
    exchange: etfExchange,
    timeframeDays: timeframeDays,
    enabled: assetType === 'etfs',
  });
  const { data: dailyForexAnalysis, loading: dailyForexLoading } = useDailyAnalysis({
    assetType: 'forex',
    timeframeDays: timeframeDays,
    enabled: assetType === 'forex',
  });
  const currentAssetRef = useRef<{ id: string; type: AssetType } | null>(null);
  const isFirstRender = useRef(true);

  const addToWatchlist = useCallback((info: AssetInfo) => {
    setWatchlist(prev => {
      // Prevent duplicates — only add if not already in watchlist
      const existing = prev.find(w => w.id === info.id);
      if (existing) {
        // Update price but don't duplicate
        const next = prev.map(w => w.id === info.id ? { ...w, price: info.price, change24h: info.change24h } : w);
        localStorage.setItem('sf_watchlist', JSON.stringify(next));
        return next;
      }
      const next: WatchlistItem[] = [{
        id: info.id, symbol: info.symbol, name: info.name, assetType: info.assetType,
        price: info.price, change24h: info.change24h,
        addedAt: Date.now(),
        addedPrice: info.price,
      }, ...prev].slice(0, 20);
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

  const updateWatchlistNote = useCallback((id: string, note: string) => {
    setWatchlist(prev => {
      const next = prev.map(w => w.id === id ? { ...w, note } : w);
      localStorage.setItem('sf_watchlist', JSON.stringify(next));
      return next;
    });
  }, []);

  // Simulate a recommendation — add to watchlist with simulation data
  const handleSimulate = useCallback((rec: Recommendation) => {
    if (!assetInfo) return;
    const simData: SimulationData = {
      horizon: rec.horizon as 'short' | 'mid' | 'long',
      entry: rec.entry,
      target: rec.target,
      stopLoss: rec.stopLoss,
      signal: rec.label,
      confidence: rec.confidence,
      startedAt: Date.now(),
      snapshots: [{ timestamp: Date.now(), price: assetInfo.price }],
    };
    setWatchlist(prev => {
      const simId = `${assetInfo.id}__sim_${rec.horizon}`;
      const filtered = prev.filter(w => w.id !== simId);
      const next: WatchlistItem[] = [{
        id: simId,
        symbol: assetInfo.symbol,
        name: assetInfo.name,
        assetType: assetInfo.assetType,
        price: assetInfo.price,
        addedAt: Date.now(),
        addedPrice: rec.entry,
        note: `📊 ${rec.horizon}-term simulation: ${rec.label} @ ${rec.entry.toFixed(2)} → ${rec.target.toFixed(2)}`,
        simulation: simData,
      }, ...filtered].slice(0, 30);
      localStorage.setItem('sf_watchlist', JSON.stringify(next));
      return next;
    });
  }, [assetInfo]);

  // Simulate a trade setup — add to watchlist with simulation data
  const handleSimulateSetup = useCallback((setup: TradeSetup) => {
    if (!assetInfo) return;
    const simData: SimulationData = {
      horizon: 'short', // trade setups are short-term by nature
      entry: setup.entry,
      target: setup.type === 'long' ? setup.tp2 : setup.tp2,
      stopLoss: setup.stop,
      signal: setup.type === 'long' ? 'Long Setup' : 'Short Setup',
      confidence: Math.min(95, Math.round(setup.riskReward * 20 + 40)),
      startedAt: Date.now(),
      snapshots: [{ timestamp: Date.now(), price: assetInfo.price }],
    };
    setWatchlist(prev => {
      const simId = `${assetInfo.id}__setup_${setup.type}`;
      const filtered = prev.filter(w => w.id !== simId);
      const next: WatchlistItem[] = [{
        id: simId,
        symbol: assetInfo.symbol,
        name: assetInfo.name,
        assetType: assetInfo.assetType,
        price: assetInfo.price,
        addedAt: Date.now(),
        addedPrice: setup.entry,
        note: `📊 ${setup.type.toUpperCase()} setup: Entry ${setup.entry.toFixed(2)} → TP1 ${setup.tp1.toFixed(2)} / TP2 ${setup.tp2.toFixed(2)} | Stop ${setup.stop.toFixed(2)}`,
        simulation: simData,
      }, ...filtered].slice(0, 30);
      localStorage.setItem('sf_watchlist', JSON.stringify(next));
      return next;
    });
  }, [assetInfo]);

  // Load unsupported coins list on mount
  useEffect(() => { loadUnsupportedCoins(); }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setWatchlist(prev => {
        let changed = false;
        const next = prev.map(item => {
          if (!item.simulation) return item;
          const sim = item.simulation;
          const lastSnapshot = sim.snapshots[sim.snapshots.length - 1];
          const now = Date.now();
          const intervalMs = sim.horizon === 'short' ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
          const lastTime = lastSnapshot?.timestamp || sim.startedAt;
          if (now - lastTime >= intervalMs) {
            changed = true;
            return {
              ...item,
              simulation: {
                ...sim,
                snapshots: [...sim.snapshots, { timestamp: now, price: item.price }],
              },
            };
          }
          return item;
        });
        if (changed) {
          localStorage.setItem('sf_watchlist', JSON.stringify(next));
          return next;
        }
        return prev;
      });
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
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
    const unsupported = getUnsupportedCoin(coinId);
    if (unsupported) {
      setError(`⚠️ ${unsupported.name} is not supported. ${unsupported.reason}`);
      return;
    }
    setLoading(true);
    setError(null);
    setOverviewMode(false);
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
      const adjustedSignal = await applyCrossTimeframeAdjustment(ta.signal, coinId, timeframeDays);
      ta.signal = adjustedSignal;
      currentAssetRef.current = { id: coinId, type: 'crypto' };
      setAssetInfo(info);
      setTechnicalData(ta);
      setDataFetchedAt(new Date());
      // Don't auto-add to watchlist — user will use explicit button
      updateSecondaryPrice(livePrice);
      saveToHistory(info, ta, result.source);
    } catch (e: any) {
      setError(e.message || 'Failed to fetch data. Try again.');
    } finally {
      setLoading(false);
    }
  }, [timeframeDays, forecastPercent, forecastMethods, riskLevel, updateSecondaryPrice, saveToHistory]);

  /* ── Stocks / ETFs ── */
  const analyseStock = useCallback(async (symbol: string, type: 'stocks' | 'etfs') => {
    setLoading(true);
    setError(null);
    setOverviewMode(false);
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
      const adjustedSignal = await applyCrossTimeframeAdjustment(ta.signal, symbol, timeframeDays);
      ta.signal = adjustedSignal;
      currentAssetRef.current = { id: symbol, type };
      setAssetInfo(info);
      setTechnicalData(ta);
      setDataFetchedAt(new Date());
      // Don't auto-add to watchlist — user will use explicit button
      updateSecondaryPrice(lastPrice);
      saveToHistory(info, ta, result.source);
    } catch (e: any) {
      setError(e.message || `Failed to fetch ${symbol}.`);
    } finally {
      setLoading(false);
    }
  }, [timeframeDays, forecastPercent, forecastMethods, riskLevel, updateSecondaryPrice, saveToHistory]);

  /* ── Forex ── */
  const analyseForex = useCallback(async (pairId: string) => {
    setLoading(true);
    setError(null);
    setOverviewMode(false);
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
      const adjustedSignal = await applyCrossTimeframeAdjustment(ta.signal, pairId, timeframeDays);
      ta.signal = adjustedSignal;
      currentAssetRef.current = { id: pairId, type: 'forex' };
      setAssetInfo(info);
      setTechnicalData(ta);
      setDataFetchedAt(new Date());
      // Don't auto-add to watchlist — user will use explicit button
      saveToHistory(info, ta, result.source);
    } catch (e: any) {
      setError(e.message || 'Failed to fetch forex data. Try again.');
    } finally {
      setLoading(false);
    }
  }, [timeframeDays, forecastPercent, forecastMethods, riskLevel, saveToHistory]);

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

  /* ── Auto-scroll to signal when analysis loads (only on fresh search, not param tweaks) ── */
  useEffect(() => {
    if (technicalData && assetInfo && !loading && isNewSearchRef.current) {
      isNewSearchRef.current = false;
      const timer = setTimeout(() => {
        const el = document.getElementById('section-signal');
        if (el) {
          const y = el.getBoundingClientRect().top + window.scrollY - 160;
          window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [technicalData, assetInfo, loading]);

  /* ── Refresh current analysis ── */
  const handleRefreshAll = useCallback(() => {
    const asset = currentAssetRef.current;
    if (!asset) return;
    if (asset.type === 'crypto') analyseCrypto(asset.id);
    else if (asset.type === 'stocks') analyseStock(asset.id, 'stocks');
    else if (asset.type === 'etfs') analyseStock(asset.id, 'etfs');
    else if (asset.type === 'forex') analyseForex(asset.id);
  }, [analyseCrypto, analyseStock, analyseForex]);

  /* ── Handlers ── */
  const EXCHANGE_SUFFIXES: Record<string, string> = {
    NYSE: '', NASDAQ: '', ASX: '.AX', LSE: '.L', HKG: '.HK', JPX: '.T',
  };

  const handleSearch = useCallback(async (query: string) => {
    isNewSearchRef.current = true;
    if (assetType === 'crypto') {
      const unsupported = getUnsupportedCoin(query);
      if (unsupported) {
        setError(`⚠️ ${unsupported.name} is not supported. ${unsupported.reason}`);
        return;
      }
      setLoading(true);
      try {
        const results = await searchCoins(query);
        if (results.length > 0) await analyseCrypto(results[0].id);
        else { setError(`Symbol '${query}' not found.`); setLoading(false); }
      } catch (e: any) { setError(e.message); setLoading(false); }
    } else if (assetType === 'stocks' || assetType === 'etfs') {
      const raw = query.toUpperCase().trim();
      const type = assetType;
      const exchange = type === 'stocks' ? stockExchange : etfExchange;
      const suffix = EXCHANGE_SUFFIXES[exchange];

      // If a specific exchange is selected and the query doesn't already have a suffix, try with suffix first
      if (exchange !== 'ALL' && suffix !== undefined && !raw.includes('.')) {
        const tickerWithSuffix = suffix ? `${raw}${suffix}` : raw;
        try {
          await analyseStock(tickerWithSuffix, type);
          return;
        } catch {
          // Try raw ticker as fallback, then suggest alternatives
        }
      }

      // Try raw ticker
      try {
        await analyseStock(raw, type);
      } catch (primaryError: any) {
        // If a specific exchange was selected and raw failed too, suggest other exchanges
        if (exchange !== 'ALL' && !raw.includes('.')) {
          const suggestions: string[] = [];
          const suffixEntries = Object.entries(EXCHANGE_SUFFIXES).filter(([k]) => k !== exchange);
          for (const [ex, suf] of suffixEntries) {
            suggestions.push(suf ? `${raw}${suf}` : raw);
          }
          setError(
            `'${raw}' not found on ${exchange}. Try searching with a full ticker like: ${suggestions.slice(0, 4).join(', ')}`
          );
        } else {
          setError(primaryError.message || `Failed to fetch ${raw}.`);
        }
      }
    } else if (assetType === 'forex') {
      const clean = query.toUpperCase().replace(/[^A-Z]/g, '');
      if (clean.length === 6) await analyseForex(clean);
      else setError('Enter a 6-character pair like AUDUSD');
    }
  }, [assetType, stockExchange, etfExchange, analyseCrypto, analyseStock, analyseForex]);

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
    let items: { label: string; id: string; name?: string; divYield?: number; signal?: { label: string; score: number; confidence: number; projectedReturn?: number; compositeScore?: number } }[] = [];

    // When a non-default filter is active and we have cached analysis, use cache as the primary source
    const cacheSource = assetType === 'stocks' ? dailyStockAnalysis : assetType === 'crypto' ? dailyCryptoAnalysis : assetType === 'etfs' ? dailyEtfAnalysis : assetType === 'forex' ? dailyForexAnalysis : [];
    const useCache = pickSort !== 'default' && cacheSource.length > 0;

    if (useCache) {
      items = cacheSource.map(c => {
        // Compute composite score for consistent ranking
        const normSignal = Math.max(0, Math.min(100, ((c.signal_score + 15) / 30) * 100));
        const normReturn = Math.max(0, Math.min(100, ((c.forecast_return_pct ?? 0) / 50) * 100));
        const normConf = Math.max(0, Math.min(100, c.confidence));
        const compositeScore = Math.round(normSignal * 0.4 + normReturn * 0.35 + normConf * 0.25);

        return {
          label: c.symbol,
          id: c.asset_id,
          name: c.name,
          divYield: c.dividend_yield ?? undefined,
          signal: {
            label: c.signal_label,
            score: c.signal_score,
            confidence: c.confidence,
            projectedReturn: c.forecast_return_pct,
            compositeScore,
          },
        };
      });
    } else if (assetType === 'crypto') {
      // Use crypto screener if available, otherwise fall back to hardcoded
      if (cryptoCoins.length > 0) {
        items = cryptoCoins.map(c => ({ label: c.sym, id: c.id, name: c.name }));
      } else {
        items = CRYPTO_PICKS.map(p => ({ label: p.sym, id: p.id }));
      }
    } else if (assetType === 'stocks') {
      if (useStockScreener && screenerStocks.length > 0) {
        let dynamicPicks = screenerStocks;
        if (dividendOnly) {
          dynamicPicks = dynamicPicks.filter(p => p.div);
        }
        items = dynamicPicks.map(p => ({ label: p.sym, id: p.sym, name: p.name, divYield: p.yield }));
      } else {
        let picks = STOCK_PICKS_BY_EXCHANGE[stockExchange] || STOCK_PICKS_BY_EXCHANGE['US'] || [];
        if (dividendOnly) {
          picks = picks.filter(p => p.div);
          picks = [...picks].sort((a, b) => b.yield - a.yield);
        }
        items = picks.map(p => ({ label: p.sym, id: p.sym, name: p.name, divYield: p.yield }));
      }
    } else if (assetType === 'etfs') {
      if (useEtfScreener && screenerStocks.length > 0) {
        items = screenerStocks.map(p => ({ label: p.sym, id: p.sym, name: p.name, divYield: p.yield }));
      } else {
        items = (ETF_PICKS_BY_EXCHANGE[etfExchange] || ETF_PICKS_BY_EXCHANGE['US'] || []).map(p => ({ label: p.sym, id: p.sym }));
      }
    } else {
      items = FOREX_PICKS.map(p => ({ label: p.name, id: `${p.from}${p.to}` }));
    }

    // Overlay ranked signals for items that don't already have signals from cache
    const withSignals = items.map(item => {
      if (item.signal) return item;
      const r = rankedPicks[item.id];
      return r ? { ...item, signal: r } : item;
    });

    if (withSignals.some(p => p.signal) && !dividendOnly) {
      // Sort by composite score when available, fallback to raw signal score
      withSignals.sort((a, b) => {
        const bScore = (b.signal as any)?.compositeScore ?? b.signal?.score ?? -999;
        const aScore = (a.signal as any)?.compositeScore ?? a.signal?.score ?? -999;
        return bScore - aScore;
      });
    }

    return withSignals;
  }, [assetType, stockExchange, etfExchange, dividendOnly, rankedPicks, useStockScreener, useEtfScreener, screenerStocks, cryptoCoins, pickSort, dailyStockAnalysis, dailyCryptoAnalysis, dailyEtfAnalysis, dailyForexAnalysis]);

  const handleRankPicks = useCallback(async (timeframeDaysForRank?: number) => {
    setRanking(true);
    const picks = getQuickPicks();
    const tfDays = timeframeDaysForRank || timeframeDays;
    const results: Record<string, { label: string; score: number; confidence: number; projectedReturn?: number; peakMonths?: number; peakWarning?: string; compositeScore?: number }> = {};

    // If picks already have signals from cache (via getQuickPicks), short-circuit
    const alreadySignalled = picks.filter(p => p.signal).length;
    if (alreadySignalled > picks.length * 0.5) {
      console.log(`[rank] Picks already have ${alreadySignalled}/${picks.length} signals from cache — skipping rank`);
      setRanking(false);
      return;
    }

    // Try to use daily analysis cache first (instant results)
    const cacheSource = assetType === 'crypto' ? dailyCryptoAnalysis : assetType === 'stocks' ? dailyStockAnalysis : assetType === 'etfs' ? dailyEtfAnalysis : assetType === 'forex' ? dailyForexAnalysis : [];
    if (cacheSource.length > 0) {
      const cacheMap = new Map(cacheSource.map(c => [c.asset_id, c]));
      let usedCache = 0;
      for (const pick of picks) {
        const cached = cacheMap.get(pick.id);
        if (cached) {
          const normSignal = Math.max(0, Math.min(100, ((cached.signal_score + 15) / 30) * 100));
          const normReturn = Math.max(0, Math.min(100, ((cached.forecast_return_pct ?? 0) / 50) * 100));
          const normConf = Math.max(0, Math.min(100, cached.confidence));
          const compositeScore = Math.round(normSignal * 0.4 + normReturn * 0.35 + normConf * 0.25);
          results[pick.id] = {
            label: cached.signal_label,
            score: cached.signal_score,
            confidence: cached.confidence,
            projectedReturn: cached.forecast_return_pct,
            compositeScore,
          };
          usedCache++;
        }
      }
      // If cache covered most picks, use it
      if (usedCache > picks.length * 0.5) {
        console.log(`[rank] Used cached analysis for ${usedCache}/${picks.length} assets`);
        setRankedPicks(results);
        setRanking(false);
        return;
      }
    }

    // Check daily refresh limit before falling back to live API calls
    if (!canRankRefresh(isExempt)) {
      toast.error('Daily live refresh limit reached. Add your own API keys in Account → API Keys for unlimited refreshes.', { duration: 6000 });
      setRanking(false);
      return;
    }
    recordRankRefresh();

    // Fallback: compute on-the-fly (for uncached assets or when cache is empty)
    const fetchOne = async (pick: { id: string }) => {
      if (results[pick.id]) return; // already from cache
      try {
        let closes: number[], timestamps: number[], volumes: number[];
        if (assetType === 'crypto') {
          const result = await fetchCryptoHistory(pick.id, tfDays);
          closes = result.priceData.closes;
          timestamps = result.priceData.timestamps;
          volumes = result.priceData.volumes || [];
        } else if (assetType === 'forex') {
          const from = pick.id.slice(0, 3);
          const to = pick.id.slice(3, 6);
          const result = await fetchForexHistory(from, to, tfDays);
          closes = result.data.closes;
          timestamps = result.data.timestamps;
          volumes = result.data.volumes || [];
        } else {
          const result = await fetchEquityHistory(pick.id, tfDays);
          closes = result.data.closes;
          timestamps = result.data.timestamps;
          volumes = result.data.volumes || [];
        }
        const ta = processTA(closes, timestamps, volumes, 30, assetType, ['holt'], 3);
        
        const lastClose = closes[closes.length - 1];
        let projectedReturn: number | undefined;
        let peakMonths: number | undefined;
        let peakWarning: string | undefined;
        
        if (ta.forecast && ta.forecast.length > 0) {
          const forecastEndPt = ta.forecast[ta.forecast.length - 1];
          const forecastEndVal = forecastEndPt.value;
          projectedReturn = ((forecastEndVal - lastClose) / lastClose) * 100;
          
          const forecastValues = ta.forecast.map(f => f.value);
          const peakVal = Math.max(...forecastValues);
          const peakIdx = forecastValues.indexOf(peakVal);
          const totalForecastDays = ta.forecast.length;
          const peakFraction = peakIdx / totalForecastDays;
          const tfMonths = tfDays / 30;
          
          if (peakIdx < totalForecastDays * 0.75 && peakVal > forecastEndVal * 1.05) {
            peakMonths = Math.max(1, Math.round(peakFraction * tfMonths));
            const dropFromPeak = ((forecastEndVal - peakVal) / peakVal) * 100;
            peakWarning = `Peak ~${peakMonths}mo, then ${dropFromPeak.toFixed(0)}% pullback`;
          }
        }
        
        const normSignal = Math.max(0, Math.min(100, ((ta.signal.score + 15) / 30) * 100));
        const normReturn = Math.max(0, Math.min(100, ((projectedReturn ?? 0) / 50) * 100));
        const normConf = Math.max(0, Math.min(100, ta.signal.confidence));
        const compositeScore = Math.round(normSignal * 0.4 + normReturn * 0.35 + normConf * 0.25);
        results[pick.id] = { label: ta.signal.label, score: ta.signal.score, confidence: ta.signal.confidence, projectedReturn, peakMonths, peakWarning, compositeScore };
      } catch {
        // skip failed ones
      }
    };

    for (let i = 0; i < picks.length; i += 4) {
      await Promise.all(picks.slice(i, i + 4).map(fetchOne));
    }

    setRankedPicks(results);
    setRanking(false);
  }, [getQuickPicks, assetType, timeframeDays, dailyStockAnalysis, dailyCryptoAnalysis, dailyEtfAnalysis, dailyForexAnalysis, isExempt]);

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
        onWatchlistNoteUpdate={updateWatchlistNote}
        onLogoClick={() => {
          setOverviewMode(true);
          setTechnicalData(null);
          setAssetInfo(null);
          setError(null);
          currentAssetRef.current = null;
          setDataSource('');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />

      <StickySubNav
        assetType={assetType}
        overviewMode={overviewMode}
        onOverviewToggle={setOverviewMode}
        onAssetChange={(t) => { setAssetType(t); setOverviewMode(false); setError(null); currentAssetRef.current = null; setDataSource(''); setRankedPicks({}); setPickSort('default'); setTechnicalData(null); setAssetInfo(null); const tf = t === 'crypto' ? '3M' : '6M'; setRankTimeframe(tf); setTimeframeDays(RANK_TIMEFRAME_DAYS[tf] || 90); }}
        showSections={!!showAnalysis}
      />

      <main className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4">
        {/* ── SEARCH BAR ── Always visible */}
        <div className="space-y-3">
          <SearchBar
            onSearch={handleSearch}
            placeholder={
              overviewMode ? 'Search any asset e.g. bitcoin, AAPL, SPY, AUD/USD' :
              assetType === 'crypto' ? 'Search coins e.g. bitcoin' :
              assetType === 'forex' ? 'Pair e.g. AUD/USD' :
              assetType === 'stocks' ? 'Ticker e.g. AAPL, BHP.AX' :
              'ETF e.g. SPY, VGS.AX'
            }
            loading={loading}
          />

          {/* Asset-specific filters — only when NOT in overview and NOT viewing analysis */}
          {!overviewMode && !showAnalysis && !loading && (
            <div className="space-y-2">
              {assetType === 'forex' && <ForexPairSelector onAnalyse={(pairId) => analyseForex(pairId)} loading={loading} />}
              {(assetType === 'stocks' || assetType === 'etfs') && (
                <div className="space-y-2">
                  <div className="flex items-center gap-1 flex-wrap">
                    {(assetType === 'stocks' ? STOCK_EXCHANGES : ETF_EXCHANGES).filter(ex => ex.id !== 'ALL').map(ex => {
                      const selected = (assetType === 'stocks' ? stockExchange : etfExchange) === ex.id;
                      return (
                        <button
                          key={ex.id}
                          onClick={() => {
                            (assetType === 'stocks' ? setStockExchange : setEtfExchange)(ex.id);
                            setRankedPicks({});
                            setPickSort('default');
                          }}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                            selected
                              ? 'bg-primary/15 text-primary border border-primary/30'
                              : 'border border-border text-muted-foreground hover:text-foreground hover:border-primary/30'
                          }`}
                        >
                          <span>{ex.flag}</span>
                          <span>{ex.label}</span>
                        </button>
                      );
                    })}
                  </div>
                  {assetType === 'stocks' && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="contents">
                        {stockExchange === 'ASX' ? (
                          <>
                            <button
                              onClick={() => { setAsxSubgroup('asx200'); setRankedPicks({}); setPickSort('default'); }}
                              className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                                asxSubgroup === 'asx200'
                                  ? 'bg-primary/15 text-primary border border-primary/30'
                                  : 'bg-secondary/50 border border-border text-muted-foreground hover:text-foreground hover:border-primary/30'
                              }`}
                            >
                              S&P/ASX 200
                            </button>
                            <button
                              onClick={() => { setAsxSubgroup('all'); setRankedPicks({}); setPickSort('default'); }}
                              className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                                asxSubgroup === 'all'
                                  ? 'bg-primary/15 text-primary border border-primary/30'
                                  : 'bg-secondary/50 border border-border text-muted-foreground hover:text-foreground hover:border-primary/30'
                              }`}
                            >
                              All ASX ({screenerStocks.length > 200 ? `${screenerStocks.length}+` : '2200+'})
                            </button>
                          </>
                        ) : null}
                      </div>
                      <button
                        onClick={() => setDividendOnly(d => !d)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                          dividendOnly
                            ? 'bg-positive/10 text-positive border border-positive/30'
                            : 'bg-secondary/50 border border-border text-muted-foreground hover:text-foreground hover:border-positive/30'
                        }`}
                      >
                        Dividends Only
                      </button>
                    </div>
                  )}
                </div>
              )}
              {screenerLoading && (useStockScreener || useEtfScreener) && (
                <p className="text-[10px] text-muted-foreground animate-pulse">
                  Loading {assetType === 'etfs' ? 'ETF' : 'stock'} list ({screenerStocks.length} loaded so far)...
                </p>
              )}
              {cryptoScreenerLoading && assetType === 'crypto' && (
                <p className="text-[10px] text-muted-foreground animate-pulse">
                  Loading top 500 coins...
                </p>
              )}
              <QuickPicks
                picks={getQuickPicks()}
                onSelect={handleQuickPick}
                loading={loading || (screenerLoading && (useStockScreener || useEtfScreener)) || (cryptoScreenerLoading && assetType === 'crypto')}
                onRank={handleRankPicks}
                ranking={ranking || ((assetType === 'stocks' ? dailyStockLoading : assetType === 'crypto' ? dailyCryptoLoading : assetType === 'etfs' ? dailyEtfLoading : assetType === 'forex' ? dailyForexLoading : false) && pickSort !== 'default')}
                showDividends={assetType === 'stocks' || assetType === 'etfs'}
                sortBy={pickSort}
                onSortChange={setPickSort}
                maxVisible={15}
                rankTimeframe={rankTimeframe}
                onRankTimeframeChange={(tf) => { setRankTimeframe(tf); setRankedPicks({}); setTimeframeDays(RANK_TIMEFRAME_DAYS[tf] || 90); }}
                watchlistIds={new Set(watchlist.filter(w => w.assetType === assetType).slice(0, 5).map(w => w.id))}
              />
              {pickSort !== 'default' && (dailyStockAnalysis.length > 0 || dailyCryptoAnalysis.length > 0 || dailyEtfAnalysis.length > 0 || dailyForexAnalysis.length > 0) && (
                <p className="text-[9px] text-muted-foreground/70 italic text-center">
                  ⏱ Results from pre-computed daily analysis (runs 3am AEST). Select any asset for a live re-verification.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Wrap all mutually exclusive view sections in a single keyed container
            to prevent React insertBefore crashes during view transitions */}
        {(() => {
          const viewMode = showAnalysis ? 'analysis' : overviewMode ? 'overview' : loading ? 'loading' : error ? 'error' : 'dashboard';
          return (
            <div key={viewMode}>
              {/* Smart Feed — only show in per-asset mode */}
              {!overviewMode && (
                <SmartFeed
                  watchlist={watchlist}
                  assetType={assetType}
                  exchange={assetType === 'stocks' ? stockExchange : assetType === 'etfs' ? etfExchange : undefined}
                  onSelectAsset={(id, type) => {
                    if (type === 'crypto') analyseCrypto(id);
                    else if (type === 'stocks') analyseStock(id, 'stocks');
                    else if (type === 'etfs') analyseStock(id, 'etfs');
                    else if (type === 'forex') analyseForex(id);
                  }}
                />
              )}


        {loading && (
          <div className="text-center py-12">
            <div className="text-primary font-mono animate-pulse-glow text-sm">Fetching data and running analysis...</div>
          </div>
        )}

        {error && (
          <div className="border border-destructive/30 bg-card rounded-xl p-6 text-center space-y-3 max-w-lg mx-auto">
            <div className="flex items-center justify-center gap-2 text-destructive">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              <span className="font-semibold text-sm">Data Unavailable</span>
            </div>
            <p className="text-muted-foreground text-sm leading-relaxed">{error}</p>
            <div className="pt-2 flex flex-wrap justify-center gap-2">
              <button
                onClick={() => { setError(null); setOverviewMode(true); }}
                className="px-4 py-1.5 rounded-lg bg-muted text-muted-foreground hover:bg-muted/80 text-xs font-medium transition-colors"
              >
                ← Back to Overview
              </button>
              <button
                onClick={() => setError(null)}
                className="px-4 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-medium transition-colors"
              >
                Try Another Search
              </button>
            </div>
          </div>
        )}

        {/* ── ANALYSIS RESULTS — Card Grid Layout ── */}
        {showAnalysis && (
          <div className="space-y-4">
            {/* Back button */}
            <button
              onClick={() => {
                setTechnicalData(null);
                setAssetInfo(null);
                setError(null);
                setDataSource('');
              }}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors group"
            >
              <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
              Back to {overviewMode ? 'overview' : assetType}
            </button>

            {/* Signal + metadata bar */}
            <div id="section-signal" className="flex flex-col sm:flex-row sm:items-center gap-3 scroll-mt-36">
              <SignalPanel signal={technicalData.signal} price={assetInfo.price} name={assetInfo.name} symbol={assetInfo.symbol} />
              <div className="flex items-center gap-2 flex-wrap ml-auto">
                {/* Add to Watchlist button */}
                {(() => {
                  const isInWatchlist = watchlist.some(w => w.id === assetInfo.id);
                  return (
                    <button
                      onClick={() => {
                        if (isInWatchlist) {
                          removeFromWatchlist(assetInfo.id);
                          toast.success(`${assetInfo.symbol} removed from watchlist`);
                        } else {
                          addToWatchlist(assetInfo);
                          toast.success(`${assetInfo.symbol} added to watchlist`);
                        }
                      }}
                      className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] sm:text-xs font-medium border transition-all ${
                        isInWatchlist
                          ? 'border-primary/30 bg-primary/10 text-primary hover:bg-primary/20'
                          : 'border-border text-muted-foreground hover:text-foreground hover:border-primary/50'
                      }`}
                      title={isInWatchlist ? 'Remove from watchlist' : 'Add to watchlist'}
                    >
                      {isInWatchlist ? <BookmarkCheck className="w-3 h-3" /> : <Bookmark className="w-3 h-3" />}
                      {isInWatchlist ? 'Watchlisted' : 'Watchlist'}
                    </button>
                  );
                })()}
                {dataSource && (
                  <span className="text-[10px] sm:text-xs font-mono text-muted-foreground bg-card px-2 py-1 rounded-lg border border-border">
                    {dataSource}
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
                <button
                  onClick={() => setAlertDialogOpen(true)}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] sm:text-xs font-medium border border-border text-muted-foreground hover:text-foreground hover:border-primary/50 transition-all"
                  title="Set price alert">
                  Alert
                </button>
                <SocialShare assetInfo={assetInfo} technicalData={technicalData} />
                <ReportButton assetInfo={assetInfo} technicalData={technicalData} timeframeDays={timeframeDays} riskLevel={riskLevel} dataSource={dataSource} />
              </div>
            </div>

            {/* Refresh bar */}
            <div className="flex items-center justify-between bg-card border border-border rounded-xl px-3 py-2">
              <span className="text-[10px] text-muted-foreground">
                Last updated: {dataFetchedAt
                  ? dataFetchedAt.toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' }) + ' ' +
                    dataFetchedAt.toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit', hour12: true })
                  : '—'}
              </span>
              <button
                onClick={handleRefreshAll}
                disabled={loading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 disabled:opacity-50 transition-all"
              >
                <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                {loading ? 'Refreshing...' : 'Refresh All Data'}
              </button>
            </div>

            {/* Timeframe bar */}
            <div className="bg-card border border-border rounded-xl p-3 space-y-2">
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
              {/* Forecast slider row */}
              <div className="flex items-center gap-2 border-t border-border/40 pt-2">
                <div className="group relative">
                  <span className="text-[10px] text-muted-foreground font-mono cursor-help">FC</span>
                  <div className="absolute bottom-full left-0 mb-1.5 hidden group-hover:block z-50 w-56 p-2 rounded-lg bg-popover border border-border shadow-lg">
                    <p className="text-[10px] text-popover-foreground leading-relaxed">
                      <span className="font-semibold">Forecast Length</span> — controls how far ahead to project prices. Higher values give broader estimates but wider confidence bands.
                    </p>
                  </div>
                </div>
                <input type="range" min={10} max={80} value={forecastPercent} onChange={e => setForecastPercent(Number(e.target.value))} className="flex-1 accent-primary" />
                <span className="text-[10px] font-mono text-muted-foreground shrink-0 w-8 text-right">{forecastPercent}%</span>
              </div>
            </div>

            <ForecastMethodBar selectedMethods={forecastMethods} setSelectedMethods={setForecastMethods} />
            <AnalysisOverlayBar selected={activeOverlays} setSelected={(ids) => {
              setActiveOverlays(ids);
              // Scroll to chart when an overlay is toggled
              setTimeout(() => {
                const el = document.getElementById('section-chart');
                if (el) {
                  const y = el.getBoundingClientRect().top + window.scrollY - 160;
                  window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
                }
              }, 50);
            }} />

            {/* Card Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Price Chart — full width */}
              <div id="section-chart" className="lg:col-span-2 relative scroll-mt-36">
                <FullscreenChartButton onClick={() => setFullscreenChart(true)} />
                <MemoMainChart data={technicalData} timeframeDays={timeframeDays} activeOverlays={activeOverlays} />
              </div>

              {/* RSI (volume is now overlaid on price chart) */}
              <MemoRSIChart data={technicalData} />

              {/* Risk Profile + Recommendations + Trade Setups */}
              <div id="section-recs" className="lg:col-span-2 space-y-4 scroll-mt-36">
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
                <RecommendationPanel
                  recommendations={technicalData.recommendations}
                  onSimulate={handleSimulate}
                  activeSimulations={new Set(watchlist.filter(w => w.simulation && w.id.startsWith(assetInfo.id)).map(w => w.simulation!.horizon))}
                  assetInfo={assetInfo}
                  signal={technicalData.signal}
                />
              </div>

              {/* Trade Setups */}
              <div id="section-setups" className="scroll-mt-36">
                <MemoTradeSetupPanel
                  setups={technicalData.tradeSetups}
                  onSimulateSetup={handleSimulateSetup}
                  activeSetupSimulations={new Set(watchlist.filter(w => w.simulation && w.id.includes('__setup_')).map(w => w.id.includes('_long') ? 'long' : 'short'))}
                />
              </div>

              {/* Indicators */}
              <div id="section-indicators" className="scroll-mt-36"><MemoIndicatorsPanel indicators={technicalData.indicators} currentPrice={assetInfo.price} /></div>

              {/* Glossary */}
              <div className="lg:col-span-2 scroll-mt-36"><Glossary /></div>

              {/* Analysis Text — full width */}
              <div id="section-analysis" className="lg:col-span-2 scroll-mt-36">
                <AnalysisTextPanel text={technicalData.analysisText} marketPhase={technicalData.marketPhase} />
              </div>

              {/* Strategy Backtester — full width */}
              <div className="lg:col-span-2">
                <StrategyBacktester
                  assetId={assetInfo.id}
                  assetType={assetInfo.assetType}
                  assetName={assetInfo.name}
                  technicalData={technicalData}
                  onViewChart={(overlayId) => {
                    // If it's a section scroll target, just scroll
                    if (overlayId.startsWith('section-')) {
                      const el = document.getElementById(overlayId);
                      if (el) {
                        const y = el.getBoundingClientRect().top + window.scrollY - 160;
                        window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
                      }
                    } else {
                      // Toggle the overlay on and scroll to chart
                      setActiveOverlays(prev => prev.includes(overlayId as any) ? prev : [...prev, overlayId as any]);
                      setTimeout(() => {
                        const el = document.getElementById('section-chart');
                        if (el) {
                          const y = el.getBoundingClientRect().top + window.scrollY - 160;
                          window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
                        }
                      }, 100);
                    }
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* ── OVERVIEW MODE (All tab) ── */}
        {overviewMode && !technicalData && !loading && !error && (
          <div key="overview-mode" className="space-y-6">
            <LiveTracker />

            <BestPickFinder onViewAsset={(id, type) => {
              setOverviewMode(false);
              setAssetType(type);
              if (type === 'crypto') analyseCrypto(id);
              else if (type === 'stocks') analyseStock(id, 'stocks');
              else if (type === 'etfs') analyseStock(id, 'etfs');
            }} />

            <TopPicksDashboard onSelect={(id, type) => {
              setOverviewMode(false);
              setAssetType(type);
              if (type === 'crypto') analyseCrypto(id);
              else if (type === 'stocks') analyseStock(id, 'stocks');
              else if (type === 'etfs') analyseStock(id, 'etfs');
            }} />

            {/* Portfolio Builder accessible from overview */}
            <PortfolioBuilder riskProfile={riskProfile} riskLevel={riskLevel} onRiskLevelChange={setRiskLevel} />
          </div>
        )}

        {/* ── DASHBOARD — per-asset empty state ── */}
        {!overviewMode && !technicalData && !loading && !error && (
          <div key="asset-dashboard" className="space-y-6">
            <GuidedDiscovery assetType={assetType} onSelect={handleQuickPick} loading={loading} />

            {assetType === 'crypto' && (
              <>
                <MemoBreakoutFinder onSelect={(id) => analyseCrypto(id)} watchlistCoinIds={watchlist.filter(w => w.assetType === 'crypto').map(w => w.id)} />
                <MemoTopPicks onSelect={(id) => analyseCrypto(id)} />
              </>
            )}

            {/* Congress Trades — only show when US stocks exchange is active */}
            {(assetType === 'stocks' && (stockExchange === 'NYSE' || stockExchange === 'NASDAQ')) && (
              <CongressTrades onAnalyse={(symbol) => analyseStock(symbol, 'stocks')} />
            )}

            {/* Multi-Condition Screener */}
            <ConditionScreener
              assetType={assetType}
              picks={getQuickPicks()}
              onSelect={handleQuickPick}
            />

            <IndicatorBuilder />
            <StrategyBacktester assetId={null} assetType={assetType} assetName={null} technicalData={null} />
            <PortfolioBuilder riskProfile={riskProfile} riskLevel={riskLevel} onRiskLevelChange={setRiskLevel} />
          </div>
            )}
            </div>
          );
        })()}
      </main>

      <footer className="border-t border-border mt-8 py-6 px-3">
        <div className="max-w-7xl mx-auto space-y-4">
          {/* Newsletter signup */}
          <div className="flex flex-col items-center gap-1">
            <span className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider">Weekly Market Insights</span>
            <NewsletterSignup variant="footer" />
          </div>

          <div className="flex flex-wrap justify-center gap-3 sm:gap-4">
            <Link to="/how-it-works" className="text-[10px] sm:text-xs text-muted-foreground hover:text-foreground transition-colors">How It Works</Link>
            <Link to="/blog" className="text-[10px] sm:text-xs text-muted-foreground hover:text-foreground transition-colors">Blog</Link>
            <Link to="/scorecard" className="text-[10px] sm:text-xs text-muted-foreground hover:text-foreground transition-colors">Scorecard</Link>
            <Link to="/changelog" className="text-[10px] sm:text-xs text-muted-foreground hover:text-foreground transition-colors">Changelog</Link>
            <Link to="/about" className="text-[10px] sm:text-xs text-muted-foreground hover:text-foreground transition-colors">About</Link>
            <Link to="/faq" className="text-[10px] sm:text-xs text-muted-foreground hover:text-foreground transition-colors">FAQ</Link>
            <Link to="/contact" className="text-[10px] sm:text-xs text-muted-foreground hover:text-foreground transition-colors">Contact</Link>
            <Link to="/privacy" className="text-[10px] sm:text-xs text-muted-foreground hover:text-foreground transition-colors">Privacy</Link>
            <Link to="/terms" className="text-[10px] sm:text-xs text-muted-foreground hover:text-foreground transition-colors">Terms</Link>
            <Link to="/disclaimer" className="text-[10px] sm:text-xs text-muted-foreground hover:text-foreground transition-colors">Disclaimer</Link>
          </div>
          <div className="text-center space-y-1">
            <p className="text-[10px] text-muted-foreground font-mono tracking-wider uppercase">Analyse · Forecast · Decide</p>
            <p className="text-[10px] text-muted-foreground italic">Not financial advice. Always do your own research.</p>
            <p className="text-[9px] text-muted-foreground/40 font-mono">ver. {APP_VERSION}</p>
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

      <PriceAlertDialog
        open={alertDialogOpen}
        onClose={() => setAlertDialogOpen(false)}
        asset={assetInfo}
        onCreated={() => setAlertRefreshKey(k => k + 1)}
      />
    </div>
  );
}
