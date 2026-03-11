import {
  Target, Zap, BarChart3, Clock, ArrowUpRight, ChevronRight, AlertTriangle, Shield, Info,
} from 'lucide-react';
import { fmtPrice, fmtPercent } from '@/utils/format';
import { BestPick, AssetClass, type RiskProfile } from './types';
import ShareRow from './ShareRow';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const WEIGHT_LABELS: Record<RiskProfile, string> = {
  conservative:           'Signal 50% · Return 20% · Confidence 30%',
  'moderate-conservative': 'Signal 45% · Return 25% · Confidence 30%',
  moderate:               'Signal 40% · Return 35% · Confidence 25%',
  'moderate-aggressive':   'Signal 30% · Return 45% · Confidence 25%',
  aggressive:             'Signal 25% · Return 50% · Confidence 25%',
};

function derivedValues(pick: BestPick) {
  const entryPrice = pick.price;
  const targetPrice = pick.target_price ?? 0;
  const stopLoss = pick.stop_loss ?? 0;
  const potentialGain = targetPrice && entryPrice ? ((targetPrice - entryPrice) / entryPrice) * 100 : 0;
  const potentialLoss = stopLoss && entryPrice ? ((entryPrice - stopLoss) / entryPrice) * 100 : 0;
  const riskReward = potentialLoss > 0 ? potentialGain / potentialLoss : 0;
  return { entryPrice, targetPrice, stopLoss, potentialGain, potentialLoss, riskReward };
}

function getSignalColor(label: string) {
  if (label.includes('Buy')) return 'bg-positive/10 text-positive border-positive/20';
  if (label === 'Hold') return 'bg-warning/10 text-warning border-warning/20';
  return 'bg-negative/10 text-negative border-negative/20';
}

function getConfidenceColor(c: number) {
  if (c >= 80) return 'text-positive';
  if (c >= 65) return 'text-primary';
  return 'text-warning';
}

interface Props {
  result: BestPick;
  assetClass: AssetClass;
  onViewAsset?: (assetId: string, assetType: AssetClass) => void;
  riskProfile?: RiskProfile;
}

export default function PickDetailCard({ result, assetClass, onViewAsset, riskProfile = 'moderate' }: Props) {
  const { entryPrice, targetPrice, stopLoss, potentialGain, potentialLoss, riskReward } = derivedValues(result);
  const signalColor = getSignalColor(result.signal_label);
  const confidenceColor = getConfidenceColor(result.confidence);
  const hasWarnings = (result.filter_warnings?.length ?? 0) > 0;

  return (
    <div className="animate-fade-in space-y-4">
      {/* Filter warnings */}
      {hasWarnings && (
        <div className="flex items-start gap-2 bg-warning/10 border border-warning/20 rounded-lg p-2.5">
          <AlertTriangle className="w-3.5 h-3.5 text-warning shrink-0 mt-0.5" />
          <div>
            <p className="text-[10px] font-semibold text-warning">Quality flags</p>
            {result.filter_warnings!.map((w, i) => (
              <p key={i} className="text-[9px] text-muted-foreground">• {w}</p>
            ))}
          </div>
        </div>
      )}

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
          <Zap className="w-3.5 h-3.5 text-primary" /> Why this pick
        </h4>
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-primary/10 rounded-lg p-2.5 border border-primary/20 space-y-0.5 col-span-2">
            <div className="flex items-center gap-1">
              <span className="text-[9px] text-primary/80 uppercase">Composite Score</span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-3 h-3 text-primary/50 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[260px] text-[10px] leading-relaxed">
                    <p className="font-semibold mb-1">How the score is calculated</p>
                    <p>Blends three normalised factors into a single 0–100 ranking:</p>
                    <ul className="list-disc pl-3 mt-1 space-y-0.5">
                      <li><strong>Signal Strength</strong> — 15-indicator technical engine (±15 → 0–100)</li>
                      <li><strong>Forecast Return</strong> — projected upside capped at 50%</li>
                      <li><strong>Confidence</strong> — model certainty (0–100)</li>
                    </ul>
                    <p className="mt-1 text-muted-foreground">Weights adjust per risk profile. Higher = stronger confirmed upside.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <p className="text-sm font-mono font-bold text-primary">{result.composite_score ?? '—'}/100</p>
            <p className="text-[8px] text-muted-foreground flex items-center gap-1">
              <Shield className="w-2.5 h-2.5" />
              {WEIGHT_LABELS[riskProfile]}
            </p>
          </div>
          <div className="bg-muted/20 rounded-lg p-2.5 border border-border/40 space-y-0.5">
            <span className="text-[9px] text-muted-foreground uppercase">Signal Score</span>
            <p className="text-sm font-mono font-bold text-foreground">{result.signal_score}/15</p>
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

      {/* Trade Levels */}
      <div className="space-y-2">
        <h4 className="text-[11px] font-semibold text-foreground uppercase tracking-wider flex items-center gap-1.5">
          <Target className="w-3.5 h-3.5 text-primary" /> Trade Levels
        </h4>
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-primary/5 rounded-lg p-2.5 border border-primary/15 text-center space-y-0.5">
            <span className="text-[9px] text-muted-foreground uppercase">Entry</span>
            <p className="text-xs font-mono font-bold text-foreground">{fmtPrice(entryPrice)}</p>
          </div>
          <div className="bg-positive/5 rounded-lg p-2.5 border border-positive/15 text-center space-y-0.5">
            <span className="text-[9px] text-positive/80 uppercase">Target</span>
            <p className="text-xs font-mono font-bold text-positive">{targetPrice ? fmtPrice(targetPrice) : '—'}</p>
            {potentialGain > 0 && <p className="text-[8px] text-positive/70">+{potentialGain.toFixed(1)}%</p>}
          </div>
          <div className="bg-negative/5 rounded-lg p-2.5 border border-negative/15 text-center space-y-0.5">
            <span className="text-[9px] text-negative/80 uppercase">Stop-Loss</span>
            <p className="text-xs font-mono font-bold text-negative">{stopLoss ? fmtPrice(stopLoss) : '—'}</p>
            {potentialLoss > 0 && <p className="text-[8px] text-negative/70">-{potentialLoss.toFixed(1)}%</p>}
          </div>
        </div>
      </div>

      {/* Key Indicators */}
      <div className="space-y-2">
        <h4 className="text-[11px] font-semibold text-foreground uppercase tracking-wider flex items-center gap-1.5">
          <BarChart3 className="w-3.5 h-3.5 text-primary" /> Key Indicators
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

      {/* R:R explainer */}
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

      <ShareRow result={result} />

      <p className="text-[8px] text-muted-foreground/60 leading-relaxed text-center">
        This is a data-driven suggestion based on technical analysis, not financial advice.
        Always do your own research and consider your risk tolerance before investing.
      </p>
    </div>
  );
}
