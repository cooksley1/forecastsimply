import { useState, useEffect, useCallback } from 'react';
import { TrendingUp, Clock, Calendar, ChevronDown, ChevronUp, ArrowRight } from 'lucide-react';
import { getTopTickers, coinloreSymbolToGeckoId } from '@/services/api/coinlore';
import type { CoinLoreTicker } from '@/services/api/coinlore';
import { fetchEquityHistory } from '@/services/fetcher';
import { processTA } from '@/analysis/processTA';
import type { AssetType } from '@/types/assets';

interface Pick {
  id: string;
  name: string;
  symbol: string;
  price: number;
  change: number;
  score: number;
  signal: string;
  confidence: number;
  target: number;
  reasoning: string;
  assetType: AssetType;
}

interface HorizonPicks {
  short: Pick[];
  mid: Pick[];
  long: Pick[];
}

interface Props {
  onSelect: (id: string, type: AssetType) => void;
}

const STOCK_UNIVERSE = [
  { sym: 'AAPL', name: 'Apple' },
  { sym: 'MSFT', name: 'Microsoft' },
  { sym: 'NVDA', name: 'NVIDIA' },
  { sym: 'GOOGL', name: 'Alphabet' },
  { sym: 'AMZN', name: 'Amazon' },
  { sym: 'TSLA', name: 'Tesla' },
  { sym: 'META', name: 'Meta' },
  { sym: 'JPM', name: 'JPMorgan' },
];

const ETF_UNIVERSE = [
  { sym: 'SPY', name: 'S&P 500' },
  { sym: 'QQQ', name: 'Nasdaq 100' },
  { sym: 'VTI', name: 'Total Market' },
  { sym: 'ARKK', name: 'ARK Innovation' },
  { sym: 'VOO', name: 'Vanguard S&P' },
  { sym: 'IWM', name: 'Russell 2000' },
];

function scorePick(ta: ReturnType<typeof processTA>, horizon: 'short' | 'mid' | 'long'): number {
  const { signal, recommendations } = ta;
  const rec = recommendations.find(r => r.horizon === horizon);
  if (!rec) return signal.score;
  // Blend signal score with recommendation confidence
  const directionBonus = rec.color === 'green' ? 2 : rec.color === 'red' ? -2 : 0;
  return signal.score + directionBonus + (rec.confidence - 50) / 25;
}

function getHorizonReasoning(ta: ReturnType<typeof processTA>, horizon: 'short' | 'mid' | 'long'): string {
  const rec = ta.recommendations.find(r => r.horizon === horizon);
  if (rec) return rec.reasoning;
  return `${ta.signal.label} signal with ${ta.signal.confidence}% confidence.`;
}

const HORIZON_META = {
  short: { label: 'Short-Term', sublabel: '1–7 days', icon: Clock, color: 'text-warning' },
  mid: { label: 'Mid-Term', sublabel: '1–3 months', icon: TrendingUp, color: 'text-primary' },
  long: { label: 'Long-Term', sublabel: '6–12+ months', icon: Calendar, color: 'text-positive' },
};

export default function TopPicksDashboard({ onSelect }: Props) {
  const [cryptoPicks, setCryptoPicks] = useState<HorizonPicks>({ short: [], mid: [], long: [] });
  const [stockPicks, setStockPicks] = useState<HorizonPicks>({ short: [], mid: [], long: [] });
  const [etfPicks, setEtfPicks] = useState<HorizonPicks>({ short: [], mid: [], long: [] });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'crypto' | 'stocks' | 'etfs'>('all');
  const [expanded, setExpanded] = useState(false);

  const analyseAndRank = useCallback(async () => {
    setLoading(true);

    // Crypto — use CoinLore with Breakout Finder's pre-screen scoring for consistency
    try {
      const tickers = await getTopTickers(20);
      const cryptoResults: Pick[] = tickers.slice(0, 12).map((t: CoinLoreTicker) => {
        const c24 = parseFloat(t.percent_change_24h) || 0;
        const c7d = parseFloat(t.percent_change_7d) || 0;
        const c1h = parseFloat(t.percent_change_1h) || 0;

        // Same pre-screen scoring as Breakout Finder & TopPicks
        let preScore = 0;
        if (c24 > 0 && c24 < 8) preScore += 20;
        if (c7d > 0 && c7d < 15) preScore += 15;
        if (c1h > 0 && c1h < 3) preScore += 10;
        if (c24 > -2) preScore += 5;
        if (c7d > -5) preScore += 5;
        if (t.volume24 > 50_000_000) preScore += 10;

        // Derive signal from score (aligned with TopPicks verdicts)
        const signal = preScore >= 45 ? 'Buy' : (c7d < -10 || c24 < -5) ? 'Sell' : preScore >= 25 ? 'Hold' : 'Sell';
        const confidence = Math.min(85, 30 + preScore);
        return {
          id: coinloreSymbolToGeckoId(t.symbol, t.name),
          name: t.name,
          symbol: t.symbol.toUpperCase(),
          price: parseFloat(t.price_usd) || 0,
          change: c24,
          score: preScore,
          signal,
          confidence: Math.round(confidence),
          target: parseFloat(t.price_usd) * (1 + preScore / 200),
          reasoning: preScore >= 45
            ? 'Strong setup — positive momentum across timeframes with healthy volume.'
            : (c7d < -10 || c24 < -5)
            ? 'Heavy selling pressure. Wait for stabilisation.'
            : preScore >= 25
            ? 'Consolidating — some positive signals but not full conviction yet.'
            : 'Weak metrics — momentum or volume lacking.',
          assetType: 'crypto' as AssetType,
        };
      });

      // Sort and pick top 3 per horizon
      const shortSorted = [...cryptoResults].sort((a, b) => Math.abs(b.change) - Math.abs(a.change));
      const midSorted = [...cryptoResults].sort((a, b) => b.score - a.score);
      const longSorted = [...cryptoResults].sort((a, b) => {
        const aScore = (parseFloat(tickers.find(t => t.symbol === a.symbol.toUpperCase())?.percent_change_7d || '0'));
        const bScore = (parseFloat(tickers.find(t => t.symbol === b.symbol.toUpperCase())?.percent_change_7d || '0'));
        return bScore - aScore;
      });

      setCryptoPicks({
        short: shortSorted.filter(p => p.change > 0).slice(0, 3),
        mid: midSorted.filter(p => p.score > 0).slice(0, 3),
        long: longSorted.filter(p => p.score > 0).slice(0, 3),
      });
    } catch { /* silent */ }

    // Stocks — batch analyse top picks
    try {
      const stockResults: Pick[] = [];
      for (let i = 0; i < STOCK_UNIVERSE.length; i += 3) {
        const batch = STOCK_UNIVERSE.slice(i, i + 3);
        const results = await Promise.all(batch.map(async (s) => {
          try {
            const result = await fetchEquityHistory(s.sym, 90);
            const ta = processTA(result.data.closes, result.data.timestamps, result.data.volumes, 30, 'stocks', ['ensemble'], 3);
            const lastPrice = result.data.closes[result.data.closes.length - 1];
            const prevPrice = result.data.closes[result.data.closes.length - 2] || lastPrice;
            return {
              id: s.sym,
              name: s.name,
              symbol: s.sym,
              price: lastPrice,
              change: ((lastPrice - prevPrice) / prevPrice) * 100,
              score: ta.signal.score,
              signal: ta.signal.label,
              confidence: ta.signal.confidence,
              target: ta.forecastTarget,
              reasoning: getHorizonReasoning(ta, 'short'),
              assetType: 'stocks' as AssetType,
              _ta: ta,
            };
          } catch { return null; }
        }));
        stockResults.push(...results.filter((r): r is NonNullable<typeof r> => r !== null));
      }

      const stocksWithTA = stockResults as any[];
      setStockPicks({
        short: [...stocksWithTA].sort((a, b) => {
          const aS = a._ta ? scorePick(a._ta, 'short') : a.score;
          const bS = b._ta ? scorePick(b._ta, 'short') : b.score;
          return bS - aS;
        }).slice(0, 3).map(({ _ta, ...rest }: any) => rest as Pick),
        mid: [...stocksWithTA].sort((a, b) => {
          const aS = a._ta ? scorePick(a._ta, 'mid') : a.score;
          const bS = b._ta ? scorePick(b._ta, 'mid') : b.score;
          return bS - aS;
        }).slice(0, 3).map(({ _ta, ...rest }: any) => rest as Pick),
        long: [...stocksWithTA].sort((a, b) => {
          const aS = a._ta ? scorePick(a._ta, 'long') : a.score;
          const bS = b._ta ? scorePick(b._ta, 'long') : b.score;
          return bS - aS;
        }).slice(0, 3).map(({ _ta, ...rest }: any) => rest as Pick),
      });
    } catch { /* silent */ }

    // ETFs
    try {
      const etfResults: Pick[] = [];
      for (let i = 0; i < ETF_UNIVERSE.length; i += 3) {
        const batch = ETF_UNIVERSE.slice(i, i + 3);
        const results = await Promise.all(batch.map(async (s) => {
          try {
            const result = await fetchEquityHistory(s.sym, 90);
            const ta = processTA(result.data.closes, result.data.timestamps, result.data.volumes, 30, 'etfs', ['ensemble'], 3);
            const lastPrice = result.data.closes[result.data.closes.length - 1];
            const prevPrice = result.data.closes[result.data.closes.length - 2] || lastPrice;
            return {
              id: s.sym,
              name: s.name,
              symbol: s.sym,
              price: lastPrice,
              change: ((lastPrice - prevPrice) / prevPrice) * 100,
              score: ta.signal.score,
              signal: ta.signal.label,
              confidence: ta.signal.confidence,
              target: ta.forecastTarget,
              reasoning: getHorizonReasoning(ta, 'mid'),
              assetType: 'etfs' as AssetType,
            };
          } catch { return null; }
        }));
        etfResults.push(...results.filter((r): r is NonNullable<typeof r> => r !== null));
      }

      setEtfPicks({
        short: [...etfResults].sort((a, b) => b.score - a.score).slice(0, 3),
        mid: [...etfResults].sort((a, b) => b.score - a.score).slice(0, 3),
        long: [...etfResults].sort((a, b) => b.confidence - a.confidence).slice(0, 3),
      });
    } catch { /* silent */ }

    setLoading(false);
  }, []);

  useEffect(() => {
    analyseAndRank();
  }, [analyseAndRank]);

  // Merge all picks across asset classes for the "All" tab
  const allPicks: HorizonPicks = {
    short: [...cryptoPicks.short, ...stockPicks.short, ...etfPicks.short]
      .sort((a, b) => b.score - a.score).slice(0, 3),
    mid: [...cryptoPicks.mid, ...stockPicks.mid, ...etfPicks.mid]
      .sort((a, b) => b.score - a.score).slice(0, 3),
    long: [...cryptoPicks.long, ...stockPicks.long, ...etfPicks.long]
      .sort((a, b) => b.score - a.score).slice(0, 3),
  };

  const activePicks = activeTab === 'all' ? allPicks : activeTab === 'crypto' ? cryptoPicks : activeTab === 'stocks' ? stockPicks : etfPicks;
  const hasAnyPicks = activePicks.short.length > 0 || activePicks.mid.length > 0 || activePicks.long.length > 0;

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between p-3 sm:p-4 hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Top Picks by Horizon</h3>
          <span className="text-[10px] text-muted-foreground font-mono">LIVE</span>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>

      {expanded && (
        <div className="px-3 sm:px-4 pb-3 sm:pb-4 space-y-3">
          {/* Category tabs */}
          <div className="flex gap-1 bg-muted/50 rounded-lg p-0.5">
            {(['all', 'crypto', 'stocks', 'etfs'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-all ${
                  activeTab === tab
                    ? 'bg-card text-primary shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab === 'all' ? 'All' : tab === 'crypto' ? 'Crypto' : tab === 'stocks' ? 'Stocks' : 'ETFs'}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="py-8 text-center">
              <p className="text-xs text-muted-foreground animate-pulse font-mono">Scanning markets and ranking opportunities...</p>
            </div>
          ) : !hasAnyPicks ? (
            <div className="py-6 text-center">
              <p className="text-xs text-muted-foreground">No strong signals found right now. Check back later.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {(['short', 'mid', 'long'] as const).map(horizon => {
                const meta = HORIZON_META[horizon];
                const Icon = meta.icon;
                const picks = activePicks[horizon];
                if (picks.length === 0) return null;

                return (
                  <div key={horizon}>
                    <div className="flex items-center gap-2 mb-2">
                      <Icon className={`w-3.5 h-3.5 ${meta.color}`} />
                      <span className="text-xs font-semibold text-foreground">{meta.label}</span>
                      <span className="text-[10px] text-muted-foreground">{meta.sublabel}</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {picks.map((pick, i) => (
                        <button
                          key={pick.id}
                          onClick={() => onSelect(pick.id, pick.assetType)}
                          className="group text-left p-3 rounded-lg border border-border bg-background/50 hover:border-primary/40 transition-all space-y-1.5"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-[10px] font-mono text-muted-foreground w-4">{i + 1}.</span>
                              <div className="min-w-0">
                                <span className="text-xs font-medium text-foreground block truncate">{pick.name}</span>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[10px] text-muted-foreground font-mono">{pick.symbol}</span>
                                  {activeTab === 'all' && (
                                    <span className="text-[8px] font-mono uppercase px-1 py-px rounded bg-muted text-muted-foreground">
                                      {pick.assetType === 'crypto' ? 'Crypto' : pick.assetType === 'stocks' ? 'Stock' : 'ETF'}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                              pick.signal === 'Strong Buy' || pick.signal === 'Buy'
                                ? 'bg-positive/15 text-positive'
                                : pick.signal === 'Strong Sell' || pick.signal === 'Sell'
                                ? 'bg-negative/15 text-negative'
                                : 'bg-warning/15 text-warning'
                            }`}>
                              {pick.signal}
                            </span>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-xs font-mono text-foreground">
                              ${pick.price >= 1 ? pick.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : pick.price.toFixed(4)}
                            </span>
                            <span className={`text-[10px] font-mono ${pick.change >= 0 ? 'text-positive' : 'text-negative'}`}>
                              {pick.change >= 0 ? '+' : ''}{pick.change.toFixed(1)}%
                            </span>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-muted-foreground">Confidence</span>
                            <span className="text-[10px] font-mono text-foreground">{pick.confidence}%</span>
                          </div>

                          <p className="text-[10px] text-muted-foreground leading-relaxed line-clamp-2">{pick.reasoning}</p>

                          <div className="flex items-center gap-1 text-[10px] text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                            Full analysis <ArrowRight className="w-3 h-3" />
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <p className="text-[9px] text-muted-foreground/60 italic text-center pt-1">
            Rankings based on live market data and technical analysis. Not financial advice.
          </p>
        </div>
      )}
    </div>
  );
}
