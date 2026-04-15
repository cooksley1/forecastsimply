import { useState, useEffect, useCallback } from 'react';
import { TrendingUp, Clock, Calendar, ChevronDown, ChevronUp, ArrowRight, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { computeCompositeScore, type RiskProfile } from './best-pick/types';
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
  compositeScore: number;
}

interface HorizonPicks {
  short: Pick[];
  mid: Pick[];
  long: Pick[];
}

interface Props {
  onSelect: (id: string, type: AssetType) => void;
}

const HORIZON_META = {
  short: { label: 'Short-Term', sublabel: '1 month', icon: Clock, color: 'text-warning', days: 30 },
  mid: { label: 'Mid-Term', sublabel: '3 months', icon: TrendingUp, color: 'text-primary', days: 90 },
  long: { label: 'Long-Term', sublabel: '6–12 months', icon: Calendar, color: 'text-positive', days: 180 },
};

function buildReasoning(row: any): string {
  const parts: string[] = [];
  const score = row.signal_score ?? 0;
  const fc = row.forecast_return_pct ?? 0;
  const conf = row.confidence ?? 50;
  const phase = row.market_phase;

  if (score >= 8) parts.push('Very strong buy signal across indicators');
  else if (score >= 4) parts.push('Positive buy signal with technical confirmation');
  else parts.push('Moderate technical outlook');

  if (fc > 15) parts.push(`high forecast upside (${fc.toFixed(1)}%)`);
  else if (fc > 5) parts.push(`healthy forecast return (${fc.toFixed(1)}%)`);

  if (conf >= 70) parts.push(`${conf}% confidence`);

  if (phase === 'accumulation') parts.push('accumulation phase detected');
  else if (phase === 'markup') parts.push('in markup/uptrend phase');

  return parts.join(' · ') + '.';
}

function mapRow(row: any, assetType: AssetType, riskProfile: RiskProfile): Pick {
  return {
    id: row.asset_id,
    name: row.name,
    symbol: row.symbol,
    price: Number(row.price) || 0,
    change: Number(row.change_pct) || 0,
    score: row.signal_score ?? 0,
    signal: row.signal_label || 'Hold',
    confidence: row.confidence ?? 50,
    target: Number(row.target_price) || 0,
    reasoning: buildReasoning(row),
    assetType,
    compositeScore: computeCompositeScore(
      { signal_score: row.signal_score ?? 0, forecast_return_pct: Number(row.forecast_return_pct) || 0, confidence: row.confidence ?? 50 },
      riskProfile,
    ),
  };
}

export default function TopPicksDashboard({ onSelect }: Props) {
  const [cryptoPicks, setCryptoPicks] = useState<HorizonPicks>({ short: [], mid: [], long: [] });
  const [stockPicks, setStockPicks] = useState<HorizonPicks>({ short: [], mid: [], long: [] });
  const [etfPicks, setEtfPicks] = useState<HorizonPicks>({ short: [], mid: [], long: [] });
  const [forexPicks, setForexPicks] = useState<HorizonPicks>({ short: [], mid: [], long: [] });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'crypto' | 'stocks' | 'etfs' | 'forex'>('all');
  const [expanded, setExpanded] = useState(false);

  const riskProfile: RiskProfile = 'moderate';

  const fetchPicksForType = useCallback(async (
    assetType: AssetType,
    horizonDays: number,
  ): Promise<Pick[]> => {
    // Fetch top candidates by signal_score — get a large pool to score properly
    const { data, error } = await supabase
      .from('daily_analysis_cache')
      .select('asset_id, symbol, name, price, change_pct, signal_score, signal_label, confidence, market_phase, target_price, stop_loss, forecast_return_pct')
      .eq('asset_type', assetType)
      .eq('timeframe_days', horizonDays)
      .gte('signal_score', 1)
      .order('signal_score', { ascending: false })
      .limit(200);

    if (error || !data) return [];

    // Compute composite score and sort by it
    return data
      .map(row => mapRow(row, assetType, riskProfile))
      .sort((a, b) => b.compositeScore - a.compositeScore);
  }, [riskProfile]);

  const analyseAndRank = useCallback(async () => {
    setLoading(true);

    try {
      // Fetch all asset types × all horizons in parallel
      const [
        cryptoShort, cryptoMid, cryptoLong,
        stocksShort, stocksMid, stocksLong,
        etfsShort, etfsMid, etfsLong,
        forexShort, forexMid, forexLong,
      ] = await Promise.all([
        fetchPicksForType('crypto', 30),
        fetchPicksForType('crypto', 90),
        fetchPicksForType('crypto', 180),
        fetchPicksForType('stocks', 30),
        fetchPicksForType('stocks', 90),
        fetchPicksForType('stocks', 180),
        fetchPicksForType('etfs', 30),
        fetchPicksForType('etfs', 90),
        fetchPicksForType('etfs', 180),
        fetchPicksForType('forex', 30),
        fetchPicksForType('forex', 90),
        fetchPicksForType('forex', 180),
      ]);

      setCryptoPicks({ short: cryptoShort.slice(0, 3), mid: cryptoMid.slice(0, 3), long: cryptoLong.slice(0, 3) });
      setStockPicks({ short: stocksShort.slice(0, 3), mid: stocksMid.slice(0, 3), long: stocksLong.slice(0, 3) });
      setEtfPicks({ short: etfsShort.slice(0, 3), mid: etfsMid.slice(0, 3), long: etfsLong.slice(0, 3) });
      setForexPicks({ short: forexShort.slice(0, 3), mid: forexMid.slice(0, 3), long: forexLong.slice(0, 3) });
    } catch {
      // silent
    }

    setLoading(false);
  }, [fetchPicksForType]);

  useEffect(() => {
    analyseAndRank();
  }, [analyseAndRank]);

  // Merge all picks across asset classes for the "All" tab
  const allPicks: HorizonPicks = {
    short: [...cryptoPicks.short, ...stockPicks.short, ...etfPicks.short, ...forexPicks.short]
      .sort((a, b) => b.compositeScore - a.compositeScore).slice(0, 3),
    mid: [...cryptoPicks.mid, ...stockPicks.mid, ...etfPicks.mid, ...forexPicks.mid]
      .sort((a, b) => b.compositeScore - a.compositeScore).slice(0, 3),
    long: [...cryptoPicks.long, ...stockPicks.long, ...etfPicks.long, ...forexPicks.long]
      .sort((a, b) => b.compositeScore - a.compositeScore).slice(0, 3),
  };

  const activePicks = activeTab === 'all' ? allPicks : activeTab === 'crypto' ? cryptoPicks : activeTab === 'stocks' ? stockPicks : activeTab === 'forex' ? forexPicks : etfPicks;
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
          <span className="text-[10px] text-muted-foreground font-mono">FULL SCAN</span>
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
            <div className="py-8 text-center space-y-2">
              <RefreshCw className="w-5 h-5 text-primary animate-spin mx-auto" />
              <p className="text-xs text-muted-foreground animate-pulse font-mono">Scanning all cached assets and ranking…</p>
            </div>
          ) : !hasAnyPicks ? (
            <div className="py-6 text-center">
              <p className="text-xs text-muted-foreground">No strong signals found right now. The daily analysis cache may still be populating — check back later.</p>
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
                          key={`${pick.id}-${horizon}`}
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
                            <div className="flex flex-col items-end gap-0.5">
                              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                                pick.signal === 'Strong Buy' || pick.signal === 'Buy'
                                  ? 'bg-positive/15 text-positive'
                                  : pick.signal === 'Strong Sell' || pick.signal === 'Sell'
                                  ? 'bg-negative/15 text-negative'
                                  : 'bg-warning/15 text-warning'
                              }`}>
                                {pick.signal}
                              </span>
                              <span className="text-[8px] font-mono text-muted-foreground">
                                CS: {pick.compositeScore}
                              </span>
                            </div>
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
            Rankings based on composite scoring of all cached assets (signal strength + forecast return + confidence). Not financial advice.
          </p>
        </div>
      )}
    </div>
  );
}
