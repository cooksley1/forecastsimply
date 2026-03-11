import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Crosshair, Loader2, Sparkles, LayoutGrid, Target as TargetIcon, AlertTriangle,
} from 'lucide-react';
import {
  BestPick, AssetClass, Timeframe, ASSET_OPTIONS, TIMEFRAME_OPTIONS,
  computeCompositeScore, applyQualityFilters, MARKET_BENCHMARKS,
  type RiskProfile,
} from './best-pick/types';
import PickDetailCard from './best-pick/PickDetailCard';
import PickCompareCard from './best-pick/PickCompareCard';
import { useAuth } from '@/contexts/AuthContext';

type ViewMode = 'single' | 'compare';

interface MarketContext {
  label: string;
  signalScore: number;
  signalLabel: string;
  isBearish: boolean;
}

interface Props {
  onViewAsset?: (assetId: string, assetType: AssetClass) => void;
}

export default function BestPickFinder({ onViewAsset }: Props) {
  const { user } = useAuth();
  const [assetClass, setAssetClass] = useState<AssetClass>('crypto');
  const [timeframe, setTimeframe] = useState<Timeframe>('3M');
  const [viewMode, setViewMode] = useState<ViewMode>('single');
  const [results, setResults] = useState<BestPick[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [riskProfile, setRiskProfile] = useState<RiskProfile>('moderate');
  const [marketCtx, setMarketCtx] = useState<MarketContext | null>(null);
  const [overrideProfile, setOverrideProfile] = useState<RiskProfile | null>(null);
  const activeProfile = overrideProfile ?? riskProfile;
  const isOverridden = overrideProfile !== null;
  const profileLabel = activeProfile.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  // Load user's risk profile
  useEffect(() => {
    if (!user) return;
    supabase
      .from('user_preferences')
      .select('risk_profile')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.risk_profile) {
          setRiskProfile(data.risk_profile as RiskProfile);
        }
      });
  }, [user]);

  const findBest = useCallback(async () => {
    setLoading(true);
    setError(null);
    setResults([]);
    setMarketCtx(null);
    setHasSearched(true);

    const days = TIMEFRAME_OPTIONS.find(t => t.id === timeframe)!.days;
    const limit = viewMode === 'compare' ? 3 : 1;

    try {
      // ── 1. Fetch market benchmark for context ──
      const benchmark = MARKET_BENCHMARKS[assetClass];
      if (benchmark) {
        const { data: bmData } = await supabase
          .from('daily_analysis_cache')
          .select('signal_score, signal_label')
          .eq('asset_id', benchmark.assetId)
          .eq('timeframe_days', days)
          .maybeSingle();

        if (bmData) {
          setMarketCtx({
            label: benchmark.label,
            signalScore: bmData.signal_score ?? 0,
            signalLabel: bmData.signal_label ?? 'Hold',
            isBearish: (bmData.signal_score ?? 0) < 0,
          });
        }
      }

      // ── 2. Fetch candidate pool ──
      const { data, error: dbError } = await supabase
        .from('daily_analysis_cache')
        .select('*')
        .eq('asset_type', assetClass === 'etfs' ? 'stocks' : assetClass)
        .eq('timeframe_days', days)
        .gte('signal_score', 1)
        .order('signal_score', { ascending: false })
        .limit(30);

      if (dbError) throw dbError;

      if (!data || data.length === 0) {
        setError('No strong picks found for this combination. Try a different timeframe or asset class.');
        return;
      }

      // ── 3. Compute composite score with risk-profile weights ──
      const scored: BestPick[] = data.map(row => ({
        ...row,
        composite_score: computeCompositeScore(row as any, activeProfile),
      })) as BestPick[];

      scored.sort((a, b) => (b.composite_score ?? 0) - (a.composite_score ?? 0));

      // ── 4. Apply quality filters (R:R ≥ 1.5, stop-loss ≤ 10%) ──
      const filtered = applyQualityFilters(scored);

      setResults(filtered.slice(0, limit));
    } catch (e: any) {
      setError(e.message || 'Failed to find the best pick');
    } finally {
      setLoading(false);
    }
  }, [assetClass, timeframe, viewMode, activeProfile]);

  const tf = TIMEFRAME_OPTIONS.find(t => t.id === timeframe)!;
  const resetState = () => { setResults([]); setHasSearched(false); setMarketCtx(null); };


  return (
    <div className="border border-primary/20 rounded-xl bg-card overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-primary/5 border-b border-primary/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Crosshair className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Best Pick Finder</h3>
          </div>
          <div className="flex rounded-lg border border-border overflow-hidden">
            <button
              onClick={() => { setViewMode('single'); resetState(); }}
              className={`flex items-center gap-1 px-2 py-1 text-[10px] font-medium transition-all ${
                viewMode === 'single'
                  ? 'bg-primary/15 text-primary'
                  : 'bg-muted/30 text-muted-foreground hover:text-foreground'
              }`}
              title="Best single pick"
            >
              <TargetIcon className="w-3 h-3" />
              Best
            </button>
            <button
              onClick={() => { setViewMode('compare'); resetState(); }}
              className={`flex items-center gap-1 px-2 py-1 text-[10px] font-medium transition-all border-l border-border ${
                viewMode === 'compare'
                  ? 'bg-primary/15 text-primary'
                  : 'bg-muted/30 text-muted-foreground hover:text-foreground'
              }`}
              title="Compare top 3"
            >
              <LayoutGrid className="w-3 h-3" />
              Top 3
            </button>
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground mt-0.5">
          {viewMode === 'single'
            ? 'One click to find the highest-potential asset for your chosen class and timeframe.'
            : 'Compare the top 3 picks side-by-side to find the best opportunity.'}
        </p>
        {/* Risk profile selector */}
        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
          <span className="text-[9px] text-muted-foreground/70">Weights:</span>
          {(['conservative', 'moderate-conservative', 'moderate', 'moderate-aggressive', 'aggressive'] as RiskProfile[]).map(p => {
            const label = p === 'moderate-conservative' ? 'Mod-Con' : p === 'moderate-aggressive' ? 'Mod-Agg' : p.charAt(0).toUpperCase() + p.slice(1);
            const isActive = activeProfile === p;
            return (
              <button
                key={p}
                onClick={() => { setOverrideProfile(p === riskProfile ? null : p); resetState(); }}
                className={`px-1.5 py-0.5 rounded text-[9px] font-medium transition-all ${
                  isActive
                    ? 'bg-primary/15 text-primary border border-primary/30'
                    : 'bg-muted/40 text-muted-foreground/70 border border-transparent hover:text-foreground hover:border-border'
                }`}
                title={`${p.replace(/-/g, ' ')} profile`}
              >
                {label}
              </button>
            );
          })}
          {isOverridden && (
            <span className="text-[8px] text-muted-foreground/50 italic ml-1">temporary override</span>
          )}
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Selection row */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 space-y-1.5">
            <label className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Asset Class</label>
            <div className="flex gap-1">
              {ASSET_OPTIONS.map(opt => (
                <button
                  key={opt.id}
                  onClick={() => { setAssetClass(opt.id); resetState(); }}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg text-xs font-medium transition-all ${
                    assetClass === opt.id
                      ? 'bg-primary/15 text-primary border border-primary/30'
                      : 'bg-muted/50 border border-border text-muted-foreground hover:text-foreground hover:border-border/80'
                  }`}
                >
                  <span>{opt.icon}</span>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 space-y-1.5">
            <label className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Timeframe</label>
            <div className="flex gap-1">
              {TIMEFRAME_OPTIONS.map(opt => (
                <button
                  key={opt.id}
                  onClick={() => { setTimeframe(opt.id); resetState(); }}
                  className={`flex-1 px-2 py-2 rounded-lg text-xs font-medium transition-all ${
                    timeframe === opt.id
                      ? 'bg-primary/15 text-primary border border-primary/30'
                      : 'bg-muted/50 border border-border text-muted-foreground hover:text-foreground hover:border-border/80'
                  }`}
                >
                  {opt.id}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Find button */}
        <button
          onClick={findBest}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Analysing…
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              {viewMode === 'single'
                ? `Find Best ${ASSET_OPTIONS.find(a => a.id === assetClass)!.label} Pick — ${tf.label}`
                : `Compare Top 3 ${ASSET_OPTIONS.find(a => a.id === assetClass)!.label} — ${tf.label}`}
            </>
          )}
        </button>

        {/* Market context warning */}
        {marketCtx && marketCtx.isBearish && (
          <div className="flex items-start gap-2 bg-warning/10 border border-warning/20 rounded-lg p-3 animate-fade-in">
            <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
            <div>
              <p className="text-[11px] font-semibold text-warning">
                Broad market headwind detected
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {marketCtx.label} is showing a <span className="font-medium text-warning">{marketCtx.signalLabel}</span> signal
                (score {marketCtx.signalScore}/15). Individual picks may face downward pressure regardless of their own score.
                Consider reduced position size or waiting for a trend reversal.
              </p>
            </div>
          </div>
        )}

        {/* Market context positive note */}
        {marketCtx && !marketCtx.isBearish && hasSearched && results.length > 0 && (
          <div className="flex items-center gap-2 bg-positive/5 border border-positive/15 rounded-lg px-3 py-2 animate-fade-in">
            <span className="text-[10px] text-positive">
              ✅ {marketCtx.label} trend is supportive ({marketCtx.signalLabel}, score {marketCtx.signalScore}/15)
            </span>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-muted/30 border border-border rounded-lg p-3 text-center space-y-1">
            <p className="text-xs text-muted-foreground">{error}</p>
            {error.includes('No strong picks') && (
              <p className="text-[10px] text-muted-foreground/60">
                Analysis data may still be generating. Check back in a few hours.
              </p>
            )}
          </div>
        )}

        {/* Single result */}
        {viewMode === 'single' && results.length === 1 && (
          <PickDetailCard result={results[0]} assetClass={assetClass} onViewAsset={onViewAsset} riskProfile={activeProfile} />
        )}

        {/* Compare results */}
        {viewMode === 'compare' && results.length > 0 && (
          <div className="animate-fade-in space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {results.map((pick, i) => (
                <PickCompareCard
                  key={pick.asset_id}
                  pick={pick}
                  rank={i + 1}
                  assetClass={assetClass}
                  onViewAsset={onViewAsset}
                />
              ))}
            </div>
            <p className="text-[8px] text-muted-foreground/60 leading-relaxed text-center">
              This is a data-driven suggestion based on technical analysis, not financial advice.
              Always do your own research and consider your risk tolerance before investing.
            </p>
          </div>
        )}

        {/* Empty state */}
        {hasSearched && results.length === 0 && !loading && !error && (
          <div className="bg-muted/20 rounded-lg p-4 text-center">
            <p className="text-xs text-muted-foreground">No qualifying picks found. Adjust your filters and try again.</p>
          </div>
        )}
      </div>
    </div>
  );
}
