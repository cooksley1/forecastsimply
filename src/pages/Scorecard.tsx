import { useState, useMemo } from 'react';
import { useAllPicks, useAllSnapshots, type TrackedPick, type PickSnapshot } from '@/hooks/useTrackedPicks';
import ForecastReplayChart from '@/components/analysis/ForecastReplayChart';
import {
  Trophy, TrendingUp, TrendingDown, Target, BarChart3, Calendar, Clock,
  ChevronDown, ChevronUp, Sparkles, Loader2, RefreshCw, ArrowRight, Play,
} from 'lucide-react';
import SEO from '@/components/SEO';
import BackToHome from '@/components/BackToHome';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';

type FilterAsset = 'all' | 'crypto' | 'stocks' | 'etfs';
type FilterOutcome = 'all' | 'active' | 'profitable' | 'unprofitable';

const TIMEFRAME_META: Record<number, { label: string; sublabel: string; icon: any; color: string }> = {
  30:  { label: '1 Month',   sublabel: '30 days',   icon: Clock,      color: 'text-warning' },
  90:  { label: '3 Months',  sublabel: '90 days',   icon: TrendingUp,  color: 'text-primary' },
  180: { label: '6 Months',  sublabel: '180 days',  icon: Calendar,    color: 'text-positive' },
  365: { label: '1 Year',    sublabel: '365 days',  icon: Trophy,      color: 'text-primary' },
};

const TIMEFRAMES = [30, 90, 180, 365];

function StatCard({ label, value, sub, icon: Icon, color }: { label: string; value: string; sub?: string; icon: any; color: string }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-1">
      <div className="flex items-center gap-2">
        <Icon className={`w-4 h-4 ${color}`} />
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <p className={`text-2xl font-mono font-bold ${color}`}>{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

/** Mini sparkline for a pick */
function MiniSparkline({ snapshots, entryPrice }: { snapshots: PickSnapshot[]; entryPrice: number }) {
  if (snapshots.length < 2) {
    return <div className="h-12 flex items-center justify-center text-[9px] text-muted-foreground">Awaiting data…</div>;
  }

  const data = snapshots.map(s => ({
    date: new Date(s.snapshot_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    price: s.price,
  }));

  const prices = data.map(d => d.price);
  const min = Math.min(...prices, entryPrice) * 0.998;
  const max = Math.max(...prices, entryPrice) * 1.002;
  const lastPrice = prices[prices.length - 1];
  const isUp = lastPrice >= entryPrice;

  return (
    <div className="h-14 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
          <YAxis domain={[min, max]} hide />
          <Tooltip
            contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 10 }}
            labelStyle={{ color: 'hsl(var(--muted-foreground))', fontSize: 9 }}
            formatter={(v: number) => [`$${v.toFixed(2)}`, 'Price']}
          />
          <ReferenceLine y={entryPrice} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" strokeWidth={0.5} />
          <Line type="monotone" dataKey="price" stroke={isUp ? 'hsl(var(--positive))' : 'hsl(var(--negative))'} strokeWidth={1.5} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Individual pick card with mini chart and details */
function PickCard({
  pick,
  snapshots,
  onGenerateCaseStudy,
  generatingId,
}: {
  pick: TrackedPick;
  snapshots: PickSnapshot[];
  onGenerateCaseStudy: (id: string) => void;
  generatingId: string | null;
}) {
  const [expanded, setExpanded] = useState(false);
  const [showReplay, setShowReplay] = useState(false);

  const latestSnap = snapshots[snapshots.length - 1];
  const currentPrice = pick.final_price ?? latestSnap?.price ?? pick.entry_price;
  const returnPct = pick.final_return_pct ?? ((currentPrice - pick.entry_price) / pick.entry_price) * 100;
  const isPositive = returnPct > 0;

  const startDate = new Date(pick.month_start + 'T00:00:00');
  const elapsedDays = Math.floor((Date.now() - startDate.getTime()) / (1000 * 60 * 60 * 24));

  const targetProgress = pick.target_price
    ? Math.min(100, Math.max(0, ((currentPrice - pick.entry_price) / (pick.target_price - pick.entry_price)) * 100))
    : null;

  const replayData = useMemo(() => {
    if (snapshots.length < 2) return [];
    return snapshots.map(s => ({
      date: new Date(s.snapshot_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      actual: s.price,
      ensemble: s.forecast_ensemble_price,
      linear: s.forecast_linear_price,
      holt: s.forecast_holt_price,
      ema: s.forecast_ema_price,
      monteCarlo: s.forecast_monte_carlo_price,
    }));
  }, [snapshots]);

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      {/* Summary */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full text-left p-3 hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs font-mono text-muted-foreground w-4">#{pick.rank}</span>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-foreground">{pick.symbol}</span>
                <span className="text-[10px] text-muted-foreground truncate max-w-[80px]">{pick.name}</span>
              </div>
              <p className="text-[9px] text-muted-foreground">
                {startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                {' · '}{pick.signal_label} · {pick.confidence}%
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
              pick.status === 'active' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
            }`}>
              {pick.status === 'active' ? '● Live' : 'Done'}
            </span>
            <div className="text-right">
              <p className={`text-xs font-mono font-semibold ${isPositive ? 'text-positive' : 'text-destructive'}`}>
                {isPositive ? '+' : ''}{returnPct.toFixed(2)}%
              </p>
              <p className="text-[9px] text-muted-foreground font-mono">
                ${pick.entry_price >= 1 ? pick.entry_price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : pick.entry_price.toFixed(4)}
              </p>
            </div>
            {expanded ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
          </div>
        </div>

        {/* Mini sparkline */}
        <MiniSparkline snapshots={snapshots} entryPrice={pick.entry_price} />

        {/* Target progress */}
        {targetProgress !== null && (
          <div className="mt-1.5 space-y-0.5">
            <div className="flex justify-between text-[9px] text-muted-foreground">
              <span>Target</span>
              <span>{Math.round(targetProgress)}%</span>
            </div>
            <div className="h-1 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${targetProgress >= 100 ? 'bg-positive' : 'bg-primary'}`}
                style={{ width: `${Math.min(100, Math.max(0, targetProgress))}%` }}
              />
            </div>
          </div>
        )}
      </button>

      {/* Expanded details */}
      {expanded && (
        <div className="border-t border-border p-3 space-y-3">
          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px]">
            <div className="text-muted-foreground">Entry Price</div>
            <div className="text-foreground font-mono">${pick.entry_price >= 1 ? pick.entry_price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : pick.entry_price.toFixed(4)}</div>
            <div className="text-muted-foreground">Current Price</div>
            <div className={`font-mono font-medium ${isPositive ? 'text-positive' : 'text-destructive'}`}>
              ${currentPrice >= 1 ? currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : currentPrice.toFixed(4)}
            </div>
            {pick.target_price && (
              <>
                <div className="text-muted-foreground">Target</div>
                <div className="text-foreground font-mono">${pick.target_price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              </>
            )}
            {pick.stop_loss && (
              <>
                <div className="text-muted-foreground">Stop Loss</div>
                <div className="text-destructive/80 font-mono">${pick.stop_loss.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              </>
            )}
            <div className="text-muted-foreground">Days Tracked</div>
            <div className="text-foreground">{snapshots.length} / {pick.timeframe_days}d horizon</div>
            <div className="text-muted-foreground">Signal</div>
            <div className="text-foreground">{pick.signal_label} (score: {pick.signal_score})</div>
          </div>

          {/* Reasoning */}
          {pick.reasoning && (
            <div className="bg-muted/30 rounded-lg p-2.5">
              <p className="text-[9px] font-semibold text-muted-foreground mb-0.5">Entry Reasoning</p>
              <p className="text-[10px] text-foreground leading-relaxed">{pick.reasoning}</p>
            </div>
          )}

          {/* Forecast Replay */}
          {replayData.length > 1 && (
            <>
              <button
                onClick={() => setShowReplay(r => !r)}
                className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium transition-colors ${
                  showReplay ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:text-primary'
                }`}
              >
                <Play className="w-3 h-3" />
                {showReplay ? 'Hide' : 'Show'} Forecast Replay
              </button>
              {showReplay && (
                <ForecastReplayChart
                  data={replayData}
                  entryPrice={pick.entry_price}
                  targetPrice={pick.target_price}
                  stopLoss={pick.stop_loss}
                  symbol={pick.symbol}
                />
              )}
            </>
          )}

          {/* Case study */}
          {pick.status === 'completed' && !pick.case_study_text && (
            <button
              onClick={() => onGenerateCaseStudy(pick.id)}
              disabled={generatingId === pick.id}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-all text-[10px] font-medium disabled:opacity-50"
            >
              {generatingId === pick.id ? (
                <><Loader2 className="w-3 h-3 animate-spin" /> Generating…</>
              ) : (
                <><Sparkles className="w-3 h-3" /> Generate AI Case Study</>
              )}
            </button>
          )}

          {pick.case_study_text && (
            <CaseStudyBlock text={pick.case_study_text} pickId={pick.id} canRegenerate={pick.status === 'completed'} onRegenerate={onGenerateCaseStudy} generatingId={generatingId} />
          )}
        </div>
      )}
    </div>
  );
}

function CaseStudyBlock({ text, pickId, canRegenerate, onRegenerate, generatingId }: {
  text: string; pickId: string; canRegenerate: boolean; onRegenerate: (id: string) => void; generatingId: string | null;
}) {
  const [expanded, setExpanded] = useState(false);
  const lines = text.split('\n');
  const firstSectionEnd = lines.findIndex((l, i) => i > 2 && l.startsWith('### '));
  const previewLines = firstSectionEnd > 0 ? lines.slice(0, firstSectionEnd) : lines.slice(0, 8);
  const restLines = firstSectionEnd > 0 ? lines.slice(firstSectionEnd) : lines.slice(8);

  const renderLine = (line: string, i: number) => {
    if (line.startsWith('## ')) return <h2 key={i} className="text-sm font-bold text-foreground mt-3 mb-1">{line.replace('## ', '')}</h2>;
    if (line.startsWith('### ')) return <h3 key={i} className="text-xs font-semibold text-foreground mt-2 mb-0.5">{line.replace('### ', '')}</h3>;
    if (line.startsWith('**') && line.endsWith('**')) return <p key={i} className="text-xs font-semibold text-foreground">{line.replace(/\*\*/g, '')}</p>;
    if (line.trim() === '') return <br key={i} />;
    return <p key={i} className="text-xs text-muted-foreground">{line}</p>;
  };

  return (
    <div className="bg-muted/30 rounded-lg p-3 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-semibold text-muted-foreground flex items-center gap-1.5">
          <Sparkles className="w-3 h-3 text-primary" /> AI Case Study
        </p>
        {canRegenerate && (
          <button
            onClick={() => onRegenerate(pickId)}
            disabled={generatingId === pickId}
            className="flex items-center gap-1 text-[9px] text-muted-foreground hover:text-primary transition-colors disabled:opacity-50"
          >
            {generatingId === pickId ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
            Regenerate
          </button>
        )}
      </div>
      <div className="prose prose-sm prose-invert max-w-none">
        {previewLines.map(renderLine)}
      </div>
      {restLines.length > 0 && (
        <>
          {expanded && <div className="prose prose-sm prose-invert max-w-none">{restLines.map(renderLine)}</div>}
          <button
            onClick={() => setExpanded(e => !e)}
            className="flex items-center gap-1 text-[10px] text-primary hover:underline font-medium mt-1"
          >
            {expanded ? <><ChevronUp className="w-3 h-3" /> Show less</> : <><ChevronDown className="w-3 h-3" /> Read full analysis</>}
          </button>
        </>
      )}
    </div>
  );
}

export default function Scorecard() {
  const { data: allPicks = [], isLoading } = useAllPicks();
  const pickIds = allPicks.map(p => p.id);
  const { data: allSnapshots = [] } = useAllSnapshots(pickIds);
  const [filterAsset, setFilterAsset] = useState<FilterAsset>('all');
  const [filterOutcome, setFilterOutcome] = useState<FilterOutcome>('all');
  const [activeTimeframe, setActiveTimeframe] = useState<number | 'all'>('all');
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const generateCaseStudy = async (pickId: string) => {
    setGeneratingId(pickId);
    try {
      const { data, error } = await supabase.functions.invoke('generate-case-study', {
        body: { pick_id: pickId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success('Case study generated!');
      queryClient.invalidateQueries({ queryKey: ['tracked-picks'] });
    } catch (e: any) {
      toast.error(e.message || 'Failed to generate case study');
    } finally {
      setGeneratingId(null);
    }
  };

  const filteredPicks = useMemo(() => {
    return allPicks.filter(p => {
      if (filterAsset !== 'all' && p.asset_type !== filterAsset) return false;
      if (activeTimeframe !== 'all' && p.timeframe_days !== activeTimeframe) return false;
      if (filterOutcome === 'active' && p.status !== 'active') return false;
      if (filterOutcome === 'profitable' && (p.final_return_pct === null || p.final_return_pct <= 0)) return false;
      if (filterOutcome === 'unprofitable' && (p.final_return_pct === null || p.final_return_pct >= 0)) return false;
      return true;
    });
  }, [allPicks, filterAsset, filterOutcome, activeTimeframe]);

  const completedPicks = allPicks.filter(p => p.status === 'completed');

  const stats = useMemo(() => {
    if (!completedPicks.length) return { winRate: 0, avgReturn: 0, totalPicks: 0, wins: 0, losses: 0, bestReturn: 0, worstReturn: 0 };
    const wins = completedPicks.filter(p => (p.final_return_pct ?? 0) > 0);
    const returns = completedPicks.map(p => p.final_return_pct ?? 0);
    return {
      winRate: (wins.length / completedPicks.length) * 100,
      avgReturn: returns.reduce((a, b) => a + b, 0) / returns.length,
      totalPicks: completedPicks.length,
      wins: wins.length,
      losses: completedPicks.length - wins.length,
      bestReturn: Math.max(...returns),
      worstReturn: Math.min(...returns),
    };
  }, [completedPicks]);

  // Group picks by timeframe for display
  const picksByTimeframe = useMemo(() => {
    const grouped: Record<number, Record<string, TrackedPick[]>> = {};
    for (const tf of TIMEFRAMES) {
      grouped[tf] = { crypto: [], stocks: [], etfs: [] };
    }
    for (const pick of filteredPicks) {
      const tf = pick.timeframe_days || 30;
      if (!grouped[tf]) grouped[tf] = { crypto: [], stocks: [], etfs: [] };
      if (!grouped[tf][pick.asset_type]) grouped[tf][pick.asset_type] = [];
      grouped[tf][pick.asset_type].push(pick);
    }
    return grouped;
  }, [filteredPicks]);

  const activePicks = allPicks.filter(p => p.status === 'active');
  const activeCount = activePicks.length;

  return (
    <div className="min-h-screen bg-background">
      <SEO title="Performance Scorecard — ForecastSimply" description="Transparent, evidence-based track record. Top 3 picks across 4 timeframes, tracked daily with mini charts and forecast accuracy." />

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <BackToHome />

        {/* Header */}
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <Trophy className="w-7 h-7 text-primary" />
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Performance Scorecard</h1>
          </div>
          <p className="text-sm text-muted-foreground max-w-2xl">
            Every month we lock the top 3 picks per asset class across 4 timeframes and track them daily against our forecast models.
            No cherry-picking, no hindsight — full transparency.
          </p>
          {activeCount > 0 && (
            <p className="text-xs text-primary font-medium">● {activeCount} active picks being tracked daily</p>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-24 bg-muted rounded-xl animate-pulse" />)}
          </div>
        ) : allPicks.length === 0 ? (
          <div className="border border-border rounded-xl bg-card p-8 text-center space-y-3">
            <Trophy className="w-10 h-10 text-muted-foreground mx-auto" />
            <h2 className="text-lg font-semibold text-foreground">No tracked picks yet</h2>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Picks are locked on the 1st of each month — top 3 per asset class across 1M, 3M, 6M, and 1Y horizons.
              Each is tracked daily to build an evidence-based performance record.
            </p>
          </div>
        ) : (
          <>
            {/* Stats Grid */}
            {completedPicks.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatCard label="Win Rate" value={`${stats.winRate.toFixed(0)}%`} sub={`${stats.wins}W / ${stats.losses}L`} icon={Target} color="text-primary" />
                <StatCard label="Avg Return" value={`${stats.avgReturn > 0 ? '+' : ''}${stats.avgReturn.toFixed(1)}%`} icon={BarChart3} color={stats.avgReturn >= 0 ? 'text-positive' : 'text-destructive'} />
                <StatCard label="Best Pick" value={`+${stats.bestReturn.toFixed(1)}%`} icon={TrendingUp} color="text-positive" />
                <StatCard label="Worst Pick" value={`${stats.worstReturn.toFixed(1)}%`} icon={TrendingDown} color="text-destructive" />
              </div>
            )}

            {/* Filters: Asset + Timeframe + Outcome */}
            <div className="space-y-2">
              {/* Asset filter */}
              <div className="flex flex-wrap gap-1.5">
                {(['all', 'crypto', 'stocks', 'etfs'] as FilterAsset[]).map(f => (
                  <button
                    key={f}
                    onClick={() => setFilterAsset(f)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      filterAsset === f
                        ? 'bg-primary/15 text-primary border border-primary/30'
                        : 'bg-muted border border-border text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {f === 'all' ? 'All Assets' : f === 'etfs' ? 'ETFs' : f.charAt(0).toUpperCase() + f.slice(1)}
                  </button>
                ))}
              </div>

              {/* Timeframe filter */}
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => setActiveTimeframe('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    activeTimeframe === 'all'
                      ? 'bg-primary/15 text-primary border border-primary/30'
                      : 'bg-muted border border-border text-muted-foreground hover:text-foreground'
                  }`}
                >
                  All Horizons
                </button>
                {TIMEFRAMES.map(tf => (
                  <button
                    key={tf}
                    onClick={() => setActiveTimeframe(tf)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      activeTimeframe === tf
                        ? 'bg-primary/15 text-primary border border-primary/30'
                        : 'bg-muted border border-border text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {TIMEFRAME_META[tf].label}
                  </button>
                ))}
              </div>

              {/* Outcome filter */}
              <div className="flex flex-wrap gap-1.5">
                {(['all', 'active', 'profitable', 'unprofitable'] as FilterOutcome[]).map(f => (
                  <button
                    key={f}
                    onClick={() => setFilterOutcome(f)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      filterOutcome === f
                        ? 'bg-primary/15 text-primary border border-primary/30'
                        : 'bg-muted border border-border text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {f === 'all' ? 'All Outcomes' : f === 'active' ? '● Active' : f.charAt(0).toUpperCase() + f.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Picks grouped by timeframe */}
            {TIMEFRAMES.filter(tf => activeTimeframe === 'all' || activeTimeframe === tf).map(tf => {
              const tfMeta = TIMEFRAME_META[tf];
              const Icon = tfMeta.icon;
              const assetTypes = filterAsset === 'all' ? ['crypto', 'stocks', 'etfs'] : [filterAsset];
              const hasPicks = assetTypes.some(at => (picksByTimeframe[tf]?.[at]?.length ?? 0) > 0);
              if (!hasPicks) return null;

              return (
                <div key={tf} className="space-y-3">
                  {/* Timeframe header */}
                  <div className="flex items-center gap-2 pt-2">
                    <Icon className={`w-4 h-4 ${tfMeta.color}`} />
                    <h2 className="text-sm font-semibold text-foreground">{tfMeta.label}</h2>
                    <span className="text-[10px] text-muted-foreground">{tfMeta.sublabel}</span>
                  </div>

                  {/* Asset class sections */}
                  {assetTypes.map(at => {
                    const picks = picksByTimeframe[tf]?.[at] ?? [];
                    if (picks.length === 0) return null;

                    return (
                      <div key={at} className="space-y-2">
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider pl-1">
                          {at === 'crypto' ? '₿ Crypto' : at === 'stocks' ? '📈 Stocks' : '📊 ETFs'}
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          {picks.sort((a, b) => a.rank - b.rank).map(pick => (
                            <PickCard
                              key={pick.id}
                              pick={pick}
                              snapshots={allSnapshots.filter(s => s.pick_id === pick.id)}
                              onGenerateCaseStudy={generateCaseStudy}
                              generatingId={generatingId}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}

            {filteredPicks.length === 0 && (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground">No picks match the current filters.</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
