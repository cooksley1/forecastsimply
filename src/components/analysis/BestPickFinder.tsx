import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Crosshair, TrendingUp, Shield, Target, Zap, ChevronRight,
  BarChart3, Clock, ArrowUpRight, Loader2, Sparkles, Share2,
} from 'lucide-react';
import { fmtPrice, fmtPercent } from '@/utils/format';

interface BestPick {
  asset_id: string;
  symbol: string;
  name: string;
  asset_type: string;
  price: number;
  change_pct: number;
  signal_score: number;
  signal_label: string;
  confidence: number;
  market_phase: string | null;
  target_price: number | null;
  stop_loss: number | null;
  forecast_return_pct: number;
  rsi: number | null;
  sma20: number | null;
  sma50: number | null;
  bb_position: number | null;
  macd_histogram: number | null;
  stochastic_k: number | null;
  analyzed_at: string;
}

type AssetClass = 'crypto' | 'stocks' | 'etfs';
type Timeframe = '1M' | '3M' | '6M' | '1Y';

const ASSET_OPTIONS: { id: AssetClass; label: string; icon: string }[] = [
  { id: 'crypto', label: 'Crypto', icon: '₿' },
  { id: 'stocks', label: 'Stocks', icon: '📈' },
  { id: 'etfs', label: 'ETFs', icon: '📊' },
];

const TIMEFRAME_OPTIONS: { id: Timeframe; label: string; days: number }[] = [
  { id: '1M', label: '1 Month', days: 30 },
  { id: '3M', label: '3 Months', days: 90 },
  { id: '6M', label: '6 Months', days: 180 },
  { id: '1Y', label: '1 Year', days: 365 },
];

interface Props {
  onViewAsset?: (assetId: string, assetType: AssetClass) => void;
}

export default function BestPickFinder({ onViewAsset }: Props) {
  const [assetClass, setAssetClass] = useState<AssetClass>('crypto');
  const [timeframe, setTimeframe] = useState<Timeframe>('3M');
  const [result, setResult] = useState<BestPick | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const findBest = useCallback(async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    setHasSearched(true);

    const days = TIMEFRAME_OPTIONS.find(t => t.id === timeframe)!.days;

    try {
      // Query for the asset type, filtering for buy signals with best forecast return
      const { data, error: dbError } = await supabase
        .from('daily_analysis_cache')
        .select('*')
        .eq('asset_type', assetClass === 'etfs' ? 'stocks' : assetClass)
        .eq('timeframe_days', days)
        .gte('signal_score', 1) // Positive signals only
        .order('forecast_return_pct', { ascending: false })
        .limit(1);

      if (dbError) throw dbError;

      if (!data || data.length === 0) {
        setError('No strong picks found for this combination. Try a different timeframe or asset class.');
        return;
      }

      setResult(data[0] as BestPick);
    } catch (e: any) {
      setError(e.message || 'Failed to find the best pick');
    } finally {
      setLoading(false);
    }
  }, [assetClass, timeframe]);

  const tf = TIMEFRAME_OPTIONS.find(t => t.id === timeframe)!;

  // Derived values from result
  const entryPrice = result?.price ?? 0;
  const targetPrice = result?.target_price ?? 0;
  const stopLoss = result?.stop_loss ?? 0;
  const potentialGain = targetPrice && entryPrice ? ((targetPrice - entryPrice) / entryPrice) * 100 : 0;
  const potentialLoss = stopLoss && entryPrice ? ((entryPrice - stopLoss) / entryPrice) * 100 : 0;
  const riskReward = potentialLoss > 0 ? potentialGain / potentialLoss : 0;

  const confidenceColor = (result?.confidence ?? 0) >= 80
    ? 'text-positive' : (result?.confidence ?? 0) >= 65
    ? 'text-primary' : 'text-warning';

  const signalColor = (result?.signal_label ?? '').includes('Buy')
    ? 'bg-positive/10 text-positive border-positive/20'
    : (result?.signal_label ?? '') === 'Hold'
    ? 'bg-warning/10 text-warning border-warning/20'
    : 'bg-negative/10 text-negative border-negative/20';

  return (
    <div className="border border-primary/20 rounded-xl bg-card overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-primary/5 border-b border-primary/10">
        <div className="flex items-center gap-2">
          <Crosshair className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Best Pick Finder</h3>
        </div>
        <p className="text-[10px] text-muted-foreground mt-0.5">
          One click to find the highest-potential asset for your chosen class and timeframe.
        </p>
      </div>

      <div className="p-4 space-y-4">
        {/* Selection row */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Asset class */}
          <div className="flex-1 space-y-1.5">
            <label className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Asset Class</label>
            <div className="flex gap-1">
              {ASSET_OPTIONS.map(opt => (
                <button
                  key={opt.id}
                  onClick={() => { setAssetClass(opt.id); setResult(null); setHasSearched(false); }}
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

          {/* Timeframe */}
          <div className="flex-1 space-y-1.5">
            <label className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Timeframe</label>
            <div className="flex gap-1">
              {TIMEFRAME_OPTIONS.map(opt => (
                <button
                  key={opt.id}
                  onClick={() => { setTimeframe(opt.id); setResult(null); setHasSearched(false); }}
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
              Find Best {ASSET_OPTIONS.find(a => a.id === assetClass)!.label} Pick — {tf.label}
            </>
          )}
        </button>

        {/* Error */}
        {error && (
          <div className="bg-muted/30 border border-border rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground">{error}</p>
          </div>
        )}

        {/* Result */}
        {result && (
          <div className="animate-fade-in space-y-4">
            {/* Top banner */}
            <div className="flex items-start justify-between gap-3 bg-muted/30 rounded-xl p-4 border border-border/60">
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-lg font-bold text-foreground">{result.symbol}</span>
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${signalColor}`}>
                    {result.signal_label}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground truncate">{result.name}</p>
                <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Analysed {new Date(result.analyzed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xl font-mono font-bold text-foreground">{fmtPrice(result.price)}</p>
                <p className={`text-xs font-mono ${result.change_pct >= 0 ? 'text-positive' : 'text-negative'}`}>
                  {fmtPercent(result.change_pct)}
                </p>
              </div>
            </div>

            {/* Why this pick */}
            <div className="space-y-2">
              <h4 className="text-[11px] font-semibold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-primary" />
                Why this pick
              </h4>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-muted/20 rounded-lg p-2.5 border border-border/40 space-y-0.5">
                  <span className="text-[9px] text-muted-foreground uppercase">Signal Score</span>
                  <p className="text-sm font-mono font-bold text-foreground">{result.signal_score}/100</p>
                </div>
                <div className="bg-muted/20 rounded-lg p-2.5 border border-border/40 space-y-0.5">
                  <span className="text-[9px] text-muted-foreground uppercase">Confidence</span>
                  <p className={`text-sm font-mono font-bold ${confidenceColor}`}>{result.confidence}%</p>
                </div>
                <div className="bg-muted/20 rounded-lg p-2.5 border border-border/40 space-y-0.5">
                  <span className="text-[9px] text-muted-foreground uppercase">Projected Return</span>
                  <p className="text-sm font-mono font-bold text-positive">+{result.forecast_return_pct.toFixed(1)}%</p>
                </div>
                <div className="bg-muted/20 rounded-lg p-2.5 border border-border/40 space-y-0.5">
                  <span className="text-[9px] text-muted-foreground uppercase">Market Phase</span>
                  <p className="text-sm font-semibold text-foreground">{result.market_phase || '—'}</p>
                </div>
              </div>
            </div>

            {/* Entry / Target / Stop */}
            <div className="space-y-2">
              <h4 className="text-[11px] font-semibold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-primary" />
                Trade Levels
              </h4>
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-primary/5 rounded-lg p-2.5 border border-primary/15 text-center space-y-0.5">
                  <span className="text-[9px] text-muted-foreground uppercase">Entry</span>
                  <p className="text-xs font-mono font-bold text-foreground">{fmtPrice(entryPrice)}</p>
                </div>
                <div className="bg-positive/5 rounded-lg p-2.5 border border-positive/15 text-center space-y-0.5">
                  <span className="text-[9px] text-positive/80 uppercase">Target</span>
                  <p className="text-xs font-mono font-bold text-positive">
                    {targetPrice ? fmtPrice(targetPrice) : '—'}
                  </p>
                  {potentialGain > 0 && (
                    <p className="text-[8px] text-positive/70">+{potentialGain.toFixed(1)}%</p>
                  )}
                </div>
                <div className="bg-negative/5 rounded-lg p-2.5 border border-negative/15 text-center space-y-0.5">
                  <span className="text-[9px] text-negative/80 uppercase">Stop-Loss</span>
                  <p className="text-xs font-mono font-bold text-negative">
                    {stopLoss ? fmtPrice(stopLoss) : '—'}
                  </p>
                  {potentialLoss > 0 && (
                    <p className="text-[8px] text-negative/70">-{potentialLoss.toFixed(1)}%</p>
                  )}
                </div>
              </div>
            </div>

            {/* R:R + Indicators */}
            <div className="space-y-2">
              <h4 className="text-[11px] font-semibold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                <BarChart3 className="w-3.5 h-3.5 text-primary" />
                Key Indicators
              </h4>
              <div className="grid grid-cols-4 gap-1.5">
                {riskReward > 0 && (
                  <div className={`rounded-lg p-2 text-center border ${
                    riskReward >= 2 ? 'bg-positive/5 border-positive/15' :
                    riskReward >= 1 ? 'bg-warning/5 border-warning/15' :
                    'bg-negative/5 border-negative/15'
                  }`}>
                    <span className="text-[8px] text-muted-foreground block">R:R</span>
                    <span className={`text-[11px] font-mono font-bold ${
                      riskReward >= 2 ? 'text-positive' : riskReward >= 1 ? 'text-warning' : 'text-negative'
                    }`}>{riskReward.toFixed(1)}</span>
                  </div>
                )}
                {result.rsi != null && (
                  <div className="bg-muted/20 rounded-lg p-2 text-center border border-border/40">
                    <span className="text-[8px] text-muted-foreground block">RSI</span>
                    <span className={`text-[11px] font-mono font-bold ${
                      result.rsi < 30 ? 'text-positive' : result.rsi > 70 ? 'text-negative' : 'text-foreground'
                    }`}>{result.rsi.toFixed(0)}</span>
                  </div>
                )}
                {result.bb_position != null && (
                  <div className="bg-muted/20 rounded-lg p-2 text-center border border-border/40">
                    <span className="text-[8px] text-muted-foreground block">BB Pos</span>
                    <span className="text-[11px] font-mono font-bold text-foreground">{(result.bb_position * 100).toFixed(0)}%</span>
                  </div>
                )}
                {result.stochastic_k != null && (
                  <div className="bg-muted/20 rounded-lg p-2 text-center border border-border/40">
                    <span className="text-[8px] text-muted-foreground block">Stoch</span>
                    <span className={`text-[11px] font-mono font-bold ${
                      result.stochastic_k < 20 ? 'text-positive' : result.stochastic_k > 80 ? 'text-negative' : 'text-foreground'
                    }`}>{result.stochastic_k.toFixed(0)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* R:R explainer for beginners */}
            {riskReward > 0 && (
              <div className={`rounded-md p-2.5 text-[10px] leading-relaxed border ${
                riskReward >= 2 ? 'bg-positive/5 border-positive/15 text-positive' :
                riskReward >= 1 ? 'bg-warning/5 border-warning/15 text-warning' :
                'bg-negative/5 border-negative/15 text-negative'
              }`}>
                {riskReward >= 2
                  ? `✅ Great risk/reward — you stand to gain ${riskReward.toFixed(1)}× what you risk. This setup looks favourable.`
                  : riskReward >= 1
                  ? `⚠️ Okay risk/reward — you gain ${riskReward.toFixed(1)}× your risk. Not bad, but 2.0+ is ideal.`
                  : `🚫 Poor risk/reward — you risk more than you could gain. Consider waiting for a better entry.`}
              </div>
            )}

            {/* View full analysis CTA */}
            {onViewAsset && (
              <button
                onClick={() => onViewAsset(result.asset_id, assetClass)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-muted/50 border border-border text-foreground text-sm font-medium hover:bg-muted/80 transition-colors"
              >
                <ArrowUpRight className="w-4 h-4" />
                View Full Analysis — {result.symbol}
                <ChevronRight className="w-3 h-3 text-muted-foreground" />
              </button>
            )}

            {/* Share */}
            <ShareRow result={result} />

            {/* Disclaimer */}
            <p className="text-[8px] text-muted-foreground/60 leading-relaxed text-center">
              This is a data-driven suggestion based on technical analysis, not financial advice.
              Always do your own research and consider your risk tolerance before investing.
            </p>
          </div>
        )}

        {/* Empty state after no result */}
        {hasSearched && !result && !loading && !error && (
          <div className="bg-muted/20 rounded-lg p-4 text-center">
            <p className="text-xs text-muted-foreground">No qualifying picks found. Adjust your filters and try again.</p>
          </div>
        )}
      </div>
    </div>
  );
}
