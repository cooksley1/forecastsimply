import { useState, useMemo } from 'react';
import { useAllPicks, useAllSnapshots, type TrackedPick } from '@/hooks/useTrackedPicks';
import ForecastReplayChart from '@/components/analysis/ForecastReplayChart';
import { Trophy, TrendingUp, TrendingDown, Target, BarChart3, Calendar, ChevronDown, ChevronUp, ArrowLeft, Sparkles, Loader2, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import SEO from '@/components/SEO';
import BackToHome from '@/components/BackToHome';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine,
} from 'recharts';

type FilterAsset = 'all' | 'crypto' | 'stocks' | 'etfs';
type FilterOutcome = 'all' | 'profitable' | 'unprofitable';

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

export default function Scorecard() {
  const { data: allPicks = [], isLoading } = useAllPicks();
  const pickIds = allPicks.map(p => p.id);
  const { data: allSnapshots = [] } = useAllSnapshots(pickIds);
  const [filterAsset, setFilterAsset] = useState<FilterAsset>('all');
  const [filterOutcome, setFilterOutcome] = useState<FilterOutcome>('all');
  const [expandedPick, setExpandedPick] = useState<string | null>(null);
  const [expandedCaseStudy, setExpandedCaseStudy] = useState<string | null>(null);
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
      if (filterOutcome === 'profitable' && (p.final_return_pct === null || p.final_return_pct <= 0)) return false;
      if (filterOutcome === 'unprofitable' && (p.final_return_pct === null || p.final_return_pct >= 0)) return false;
      return true;
    });
  }, [allPicks, filterAsset, filterOutcome]);

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

  // Forecast accuracy per method
  const forecastAccuracy = useMemo(() => {
    const methods = ['ensemble', 'linear', 'holt', 'ema', 'monte_carlo'] as const;
    const results: Record<string, { mape: number; directional: number; count: number }> = {};

    for (const method of methods) {
      let totalError = 0;
      let correctDir = 0;
      let count = 0;

      for (const pick of completedPicks) {
        const snapshots = allSnapshots.filter(s => s.pick_id === pick.id);
        if (!snapshots.length) continue;

        const lastSnap = snapshots[snapshots.length - 1];
        const forecastKey = `forecast_${method}_price` as keyof typeof lastSnap;
        const forecastPrice = lastSnap[forecastKey] as number | null;
        if (forecastPrice === null || forecastPrice === undefined) continue;

        const actual = lastSnap.price;
        const error = Math.abs((actual - forecastPrice) / actual) * 100;
        totalError += error;

        // Directional accuracy: did the forecast correctly predict up/down from entry?
        const actualDir = actual > pick.entry_price ? 1 : -1;
        const forecastDir = forecastPrice > pick.entry_price ? 1 : -1;
        if (actualDir === forecastDir) correctDir++;
        count++;
      }

      results[method] = {
        mape: count > 0 ? totalError / count : 0,
        directional: count > 0 ? (correctDir / count) * 100 : 0,
        count,
      };
    }

    return results;
  }, [completedPicks, allSnapshots]);

  const methodLabels: Record<string, string> = {
    ensemble: 'Ensemble ★',
    linear: 'Linear Reg',
    holt: 'Holt DES',
    ema: 'EMA Momentum',
    monte_carlo: 'Monte Carlo',
  };

  const methodColors: Record<string, string> = {
    ensemble: 'hsl(173, 58%, 49%)',
    linear: 'hsl(36, 80%, 52%)',
    holt: 'hsl(152, 60%, 42%)',
    ema: 'hsl(260, 60%, 60%)',
    monte_carlo: 'hsl(0, 72%, 55%)',
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO title="Performance Scorecard — ForecastSimply" description="Transparent, evidence-based track record of our monthly top picks. See win rates, returns, and forecast accuracy." />

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        <BackToHome />

        {/* Header */}
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <Trophy className="w-7 h-7 text-primary" />
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Performance Scorecard</h1>
          </div>
          <p className="text-sm text-muted-foreground max-w-2xl">
            Every month we lock one top pick per asset class and track it daily against our forecast models. 
            No cherry-picking, no hindsight — full transparency on what works and what doesn't.
          </p>
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
              The first set of picks will be locked on the 1st of the month. Each pick is tracked daily to build an evidence-based performance record.
            </p>
          </div>
        ) : (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard label="Win Rate" value={`${stats.winRate.toFixed(0)}%`} sub={`${stats.wins}W / ${stats.losses}L`} icon={Target} color="text-primary" />
              <StatCard label="Avg Return" value={`${stats.avgReturn > 0 ? '+' : ''}${stats.avgReturn.toFixed(1)}%`} icon={BarChart3} color={stats.avgReturn >= 0 ? 'text-positive' : 'text-destructive'} />
              <StatCard label="Best Pick" value={`+${stats.bestReturn.toFixed(1)}%`} icon={TrendingUp} color="text-positive" />
              <StatCard label="Worst Pick" value={`${stats.worstReturn.toFixed(1)}%`} icon={TrendingDown} color="text-destructive" />
            </div>

            {/* Forecast Method Comparison */}
            {completedPicks.length > 0 && (
              <div className="bg-card border border-border rounded-xl p-5 space-y-4">
                <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-primary" />
                  Forecast Method Accuracy
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                  {Object.entries(forecastAccuracy).map(([method, acc]) => (
                    <div key={method} className="bg-muted/50 rounded-lg p-3 space-y-1.5 border border-border/50">
                      <p className="text-[10px] font-semibold text-foreground">{methodLabels[method]}</p>
                      <div className="space-y-1">
                        <div className="flex justify-between text-[9px]">
                          <span className="text-muted-foreground">Direction</span>
                          <span className={acc.directional >= 60 ? 'text-positive font-semibold' : 'text-foreground'}>{acc.directional.toFixed(0)}%</span>
                        </div>
                        <div className="flex justify-between text-[9px]">
                          <span className="text-muted-foreground">Avg Error</span>
                          <span className={acc.mape <= 10 ? 'text-positive' : acc.mape <= 20 ? 'text-warning' : 'text-destructive'}>{acc.mape.toFixed(1)}%</span>
                        </div>
                        <div className="flex justify-between text-[9px]">
                          <span className="text-muted-foreground">Picks</span>
                          <span className="text-foreground">{acc.count}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Filters */}
            <div className="flex flex-wrap gap-2">
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
              <div className="w-px bg-border mx-1" />
              {(['all', 'profitable', 'unprofitable'] as FilterOutcome[]).map(f => (
                <button
                  key={f}
                  onClick={() => setFilterOutcome(f)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    filterOutcome === f
                      ? 'bg-primary/15 text-primary border border-primary/30'
                      : 'bg-muted border border-border text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {f === 'all' ? 'All Outcomes' : f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>

            {/* Pick Cards */}
            <div className="space-y-3">
              {filteredPicks.map(pick => {
                const snapshots = allSnapshots.filter(s => s.pick_id === pick.id);
                const latestSnap = snapshots[snapshots.length - 1];
                const currentPrice = pick.final_price ?? latestSnap?.price ?? pick.entry_price;
                const returnPct = pick.final_return_pct ?? ((currentPrice - pick.entry_price) / pick.entry_price) * 100;
                const isPositive = returnPct > 0;
                const isExpanded = expandedPick === pick.id;

                // Chart data
                const chartData = snapshots.map(s => ({
                  date: new Date(s.snapshot_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                  actual: s.price,
                  ensemble: s.forecast_ensemble_price,
                  linear: s.forecast_linear_price,
                  holt: s.forecast_holt_price,
                  ema: s.forecast_ema_price,
                  monteCarlo: s.forecast_monte_carlo_price,
                }));

                return (
                  <div key={pick.id} className="bg-card border border-border rounded-xl overflow-hidden">
                    {/* Summary row */}
                    <button
                      onClick={() => setExpandedPick(isExpanded ? null : pick.id)}
                      className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors text-left"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg ${
                          pick.status === 'active' ? 'bg-primary/10' : isPositive ? 'bg-positive/10' : 'bg-destructive/10'
                        }`}>
                          {pick.asset_type === 'crypto' ? '₿' : pick.asset_type === 'etfs' ? '📊' : '📈'}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-foreground">{pick.symbol}</span>
                            <span className="text-[10px] text-muted-foreground">{pick.name}</span>
                            <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${
                              pick.status === 'active' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                            }`}>
                              {pick.status === 'active' ? '● Live' : 'Completed'}
                            </span>
                          </div>
                          <p className="text-[10px] text-muted-foreground">
                            {new Date(pick.month_start + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                            {' · '}{pick.signal_label} · {pick.confidence}% conf
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className={`text-sm font-mono font-semibold ${isPositive ? 'text-positive' : 'text-destructive'}`}>
                            {isPositive ? '+' : ''}{returnPct.toFixed(2)}%
                          </p>
                          <p className="text-[10px] text-muted-foreground font-mono">
                            ${pick.entry_price.toFixed(2)} → ${currentPrice.toFixed(2)}
                          </p>
                        </div>
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                      </div>
                    </button>

                    {/* Expanded detail */}
                    {isExpanded && (
                      <div className="border-t border-border p-4 space-y-4">
                        {/* Price chart */}
                        {chartData.length > 1 && (
                          <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                              <LineChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                                <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                                <YAxis domain={['auto', 'auto']} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                                <Tooltip
                                  contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '11px' }}
                                  labelStyle={{ color: 'hsl(var(--foreground))' }}
                                />
                                <Legend wrapperStyle={{ fontSize: '10px' }} />
                                <ReferenceLine y={pick.entry_price} stroke="hsl(var(--muted-foreground))" strokeDasharray="4 4" label={{ value: 'Entry', fill: 'hsl(var(--muted-foreground))', fontSize: 9 }} />
                                {pick.target_price && (
                                  <ReferenceLine y={pick.target_price} stroke="hsl(var(--positive))" strokeDasharray="4 4" label={{ value: 'Target', fill: 'hsl(var(--positive))', fontSize: 9 }} />
                                )}
                                <Line type="monotone" dataKey="actual" stroke="hsl(var(--foreground))" strokeWidth={2} dot={false} name="Actual" />
                                <Line type="monotone" dataKey="ensemble" stroke={methodColors.ensemble} strokeWidth={1} strokeDasharray="4 2" dot={false} name="Ensemble" />
                                <Line type="monotone" dataKey="linear" stroke={methodColors.linear} strokeWidth={1} strokeDasharray="4 2" dot={false} name="Linear" />
                                <Line type="monotone" dataKey="holt" stroke={methodColors.holt} strokeWidth={1} strokeDasharray="4 2" dot={false} name="Holt" />
                                <Line type="monotone" dataKey="ema" stroke={methodColors.ema} strokeWidth={1} strokeDasharray="4 2" dot={false} name="EMA Mom" />
                                <Line type="monotone" dataKey="monteCarlo" stroke={methodColors.monte_carlo} strokeWidth={1} strokeDasharray="4 2" dot={false} name="Monte Carlo" />
                              </LineChart>
                            </ResponsiveContainer>
                          </div>
                        )}

                        {/* Reasoning */}
                        {pick.reasoning && (
                          <div className="bg-muted/30 rounded-lg p-3">
                            <p className="text-[10px] font-semibold text-muted-foreground mb-1">Entry Reasoning</p>
                            <p className="text-xs text-foreground">{pick.reasoning}</p>
                          </div>
                        )}

                        {/* Case study generate / display */}
                        {pick.status === 'completed' && !pick.case_study_text && (
                          <button
                            onClick={() => generateCaseStudy(pick.id)}
                            disabled={generatingId === pick.id}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-all text-xs font-medium disabled:opacity-50"
                          >
                            {generatingId === pick.id ? (
                              <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating AI Case Study…</>
                            ) : (
                              <><Sparkles className="w-3.5 h-3.5" /> Generate AI Case Study</>
                            )}
                          </button>
                        )}

                        {pick.case_study_text && (() => {
                          const lines = pick.case_study_text.split('\n');
                          // Extract first section (Performance Summary) as preview
                          const firstSectionEnd = lines.findIndex((l, i) => i > 2 && l.startsWith('### '));
                          const previewLines = firstSectionEnd > 0 ? lines.slice(0, firstSectionEnd) : lines.slice(0, 8);
                          const restLines = firstSectionEnd > 0 ? lines.slice(firstSectionEnd) : lines.slice(8);
                          const isCaseExpanded = expandedCaseStudy === pick.id;

                          const renderLine = (line: string, i: number) => {
                            if (line.startsWith('## ')) return <h2 key={i} className="text-sm font-bold text-foreground mt-3 mb-1">{line.replace('## ', '')}</h2>;
                            if (line.startsWith('### ')) return <h3 key={i} className="text-xs font-semibold text-foreground mt-2 mb-0.5">{line.replace('### ', '')}</h3>;
                            if (line.startsWith('**') && line.endsWith('**')) return <p key={i} className="text-xs font-semibold text-foreground">{line.replace(/\*\*/g, '')}</p>;
                            if (line.trim() === '') return <br key={i} />;
                            return <p key={i} className="text-xs text-muted-foreground">{line}</p>;
                          };

                          return (
                            <div className="bg-muted/30 rounded-lg p-4 space-y-2">
                              <div className="flex items-center justify-between">
                                <p className="text-[10px] font-semibold text-muted-foreground flex items-center gap-1.5">
                                  <Sparkles className="w-3 h-3 text-primary" /> AI Case Study
                                </p>
                                <div className="flex items-center gap-2">
                                  {pick.status === 'completed' && (
                                    <button
                                      onClick={() => generateCaseStudy(pick.id)}
                                      disabled={generatingId === pick.id}
                                      className="flex items-center gap-1 text-[9px] text-muted-foreground hover:text-primary transition-colors disabled:opacity-50"
                                    >
                                      {generatingId === pick.id ? (
                                        <Loader2 className="w-3 h-3 animate-spin" />
                                      ) : (
                                        <RefreshCw className="w-3 h-3" />
                                      )}
                                      Regenerate
                                    </button>
                                  )}
                                </div>
                              </div>
                              <div className="prose prose-sm prose-invert max-w-none">
                                {previewLines.map(renderLine)}
                              </div>
                              {restLines.length > 0 && (
                                <>
                                  {isCaseExpanded && (
                                    <div className="prose prose-sm prose-invert max-w-none">
                                      {restLines.map(renderLine)}
                                    </div>
                                  )}
                                  <button
                                    onClick={() => setExpandedCaseStudy(isCaseExpanded ? null : pick.id)}
                                    className="flex items-center gap-1 text-[10px] text-primary hover:underline font-medium mt-1"
                                  >
                                    {isCaseExpanded ? (
                                      <><ChevronUp className="w-3 h-3" /> Show less</>
                                    ) : (
                                      <><ChevronDown className="w-3 h-3" /> Read full analysis</>
                                    )}
                                  </button>
                                </>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

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
