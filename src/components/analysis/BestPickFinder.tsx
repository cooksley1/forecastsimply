import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Crosshair, Loader2, Sparkles, LayoutGrid, Target as TargetIcon,
} from 'lucide-react';
import { BestPick, AssetClass, Timeframe, ASSET_OPTIONS, TIMEFRAME_OPTIONS } from './best-pick/types';
import PickDetailCard from './best-pick/PickDetailCard';
import PickCompareCard from './best-pick/PickCompareCard';

type ViewMode = 'single' | 'compare';

interface Props {
  onViewAsset?: (assetId: string, assetType: AssetClass) => void;
}

export default function BestPickFinder({ onViewAsset }: Props) {
  const [assetClass, setAssetClass] = useState<AssetClass>('crypto');
  const [timeframe, setTimeframe] = useState<Timeframe>('3M');
  const [viewMode, setViewMode] = useState<ViewMode>('single');
  const [results, setResults] = useState<BestPick[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const findBest = useCallback(async () => {
    setLoading(true);
    setError(null);
    setResults([]);
    setHasSearched(true);

    const days = TIMEFRAME_OPTIONS.find(t => t.id === timeframe)!.days;
    const limit = viewMode === 'compare' ? 3 : 1;

    try {
      const { data, error: dbError } = await supabase
        .from('daily_analysis_cache')
        .select('*')
        .eq('asset_type', assetClass === 'etfs' ? 'stocks' : assetClass)
        .eq('timeframe_days', days)
        .gte('signal_score', 1)
        .order('forecast_return_pct', { ascending: false })
        .limit(limit);

      if (dbError) throw dbError;

      if (!data || data.length === 0) {
        setError('No strong picks found for this combination. Try a different timeframe or asset class.');
        return;
      }

      setResults(data as BestPick[]);
    } catch (e: any) {
      setError(e.message || 'Failed to find the best pick');
    } finally {
      setLoading(false);
    }
  }, [assetClass, timeframe, viewMode]);

  const tf = TIMEFRAME_OPTIONS.find(t => t.id === timeframe)!;

  const resetState = () => { setResults([]); setHasSearched(false); };

  return (
    <div className="border border-primary/20 rounded-xl bg-card overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-primary/5 border-b border-primary/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Crosshair className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Best Pick Finder</h3>
          </div>
          {/* Mode toggle */}
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

        {/* Error */}
        {error && (
          <div className="bg-muted/30 border border-border rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground">{error}</p>
          </div>
        )}

        {/* Single result */}
        {viewMode === 'single' && results.length === 1 && (
          <PickDetailCard result={results[0]} assetClass={assetClass} onViewAsset={onViewAsset} />
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
