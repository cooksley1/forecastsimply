import { Play, Info, TrendingUp, TrendingDown, Clock } from 'lucide-react';
import type { Recommendation } from '@/types/analysis';
import { fmtPrice } from '@/utils/format';

interface Props {
  recommendations: Recommendation[];
  onSimulate?: (rec: Recommendation) => void;
  activeSimulations?: Set<string>;
}

const horizonLabels: Record<string, string> = {
  short: 'Short-Term (1-7 days)',
  mid: 'Mid-Term (1-3 months)',
  long: 'Long-Term (6-12+ months)',
  dca: 'DCA Timing',
};

const horizonExplain: Record<string, string> = {
  short: 'Quick trades or swing positions. Good for active traders looking at days, not months.',
  mid: 'For investors willing to hold a few weeks to months. Balances risk and opportunity.',
  long: 'For patient investors. Long-term trends tend to be more reliable than short-term noise.',
  dca: 'Dollar-cost averaging: invest a fixed amount regularly regardless of price.',
};

const termExplain: Record<string, string> = {
  Entry: 'The suggested price to buy or enter the position.',
  Target: 'The price the analysis predicts the asset could reach — your profit goal.',
  'Stop Loss': 'The price where you should sell to limit losses if the trade goes wrong.',
  Confidence: 'How sure the algorithm is about this recommendation (higher = more signals agree).',
};

function getActionExplanation(rec: Recommendation): string {
  const pctToTarget = ((rec.target - rec.entry) / rec.entry * 100).toFixed(1);
  const pctRisk = ((rec.entry - rec.stopLoss) / rec.entry * 100).toFixed(1);
  const horizonTime: Record<string, string> = {
    short: 'within 1-7 days',
    mid: 'within 1-3 months',
    long: 'within 6-12+ months',
  };
  const timeframe = horizonTime[rec.horizon] || '';
  const action = rec.action || rec.label;

  if (['Strong Buy', 'Buy', 'Strong Add', 'Add to Position', 'Strong Long', 'Go Long'].includes(action)) {
    return `Buy at ${fmtPrice(rec.entry)} with a target of ${fmtPrice(rec.target)} (+${pctToTarget}%) ${timeframe}. Set a stop-loss at ${fmtPrice(rec.stopLoss)} to limit downside to ${pctRisk}%. The algorithm sees upside potential based on current indicators.`;
  }
  if (['Sell', 'Strong Sell', 'Strong Short', 'Go Short'].includes(action)) {
    return `Sell or avoid buying at ${fmtPrice(rec.entry)}. The analysis projects a move toward ${fmtPrice(rec.target)} (${pctToTarget}%) ${timeframe}. Place a stop at ${fmtPrice(rec.stopLoss)} if shorting. Multiple indicators are pointing to downside risk.`;
  }
  if (['Hold', 'Hold/DCA', 'Flat/Neutral'].includes(action)) {
    return `No strong signal to buy or sell right now. If you already own this, hold your position. The projected range is ${fmtPrice(rec.stopLoss)} to ${fmtPrice(rec.target)} ${timeframe}. Wait for a clearer directional signal before acting.`;
  }
  // Fallback
  return `Entry at ${fmtPrice(rec.entry)}, target ${fmtPrice(rec.target)} (+${pctToTarget}%), stop at ${fmtPrice(rec.stopLoss)} (-${pctRisk}%) ${timeframe}.`;
}

export default function RecommendationPanel({ recommendations, onSimulate, activeSimulations }: Props) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-foreground font-semibold text-sm">Investment Recommendations</h3>
        <p className="text-[11px] text-muted-foreground mt-1">
          These are algorithmic suggestions based on technical indicators. Each timeframe has different risk levels and strategies.
        </p>
        <div className="flex items-center gap-1.5 mt-1.5">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-[9px] font-medium text-primary">
            <Info className="w-2.5 h-2.5" />
            Derived from main signal
          </span>
          <span className="text-[9px] text-muted-foreground/60">— all timeframes use the same core analysis, adjusted only for risk &amp; horizon</span>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {recommendations.map(rec => {
          const isSimulating = activeSimulations?.has(rec.horizon);
          const canSimulate = rec.horizon !== 'dca' && onSimulate;
          const pctToTarget = ((rec.target - rec.entry) / rec.entry * 100);
          const pctRisk = ((rec.entry - rec.stopLoss) / rec.entry * 100);
          const actionExplanation = getActionExplanation(rec);

          return (
            <div key={rec.horizon} className={`rounded-xl p-3 sm:p-4 ${
              rec.horizon === 'dca'
                ? 'bg-purple-950/30 border-2 border-purple-500/30 md:col-span-3'
                : 'bg-card border border-border'
            }`}>
              <div className={`text-xs mb-1 font-mono ${rec.horizon === 'dca' ? 'text-purple-400' : 'text-muted-foreground'}`}>{horizonLabels[rec.horizon]}</div>
              <p className={`text-[10px] mb-2 italic ${rec.horizon === 'dca' ? 'text-purple-400/70' : 'text-muted-foreground/70'}`}>{horizonExplain[rec.horizon]}</p>
              <div className={`text-lg font-bold mb-1 ${
                rec.color === 'green' ? 'text-positive' : rec.color === 'red' ? 'text-negative' : 'text-neutral-signal'
              }`}>
                {rec.label}
              </div>

              {/* What this means in plain English */}
              <div className="bg-muted/30 rounded-lg p-2.5 mb-3 border border-border/30">
                <div className="flex items-start gap-1.5">
                  <Info className="w-3 h-3 text-primary mt-0.5 shrink-0" />
                  <p className="text-[10px] sm:text-[11px] text-foreground/80 leading-relaxed">{actionExplanation}</p>
                </div>
              </div>

              {/* Key metrics as visual summary */}
              <div className="grid grid-cols-2 gap-2 mb-3">
                <div className="bg-positive/5 rounded-lg p-2 text-center border border-positive/10">
                  <div className="text-[9px] text-muted-foreground mb-0.5">Potential Gain</div>
                  <div className="text-sm font-mono font-bold text-positive">
                    {pctToTarget >= 0 ? '+' : ''}{pctToTarget.toFixed(1)}%
                  </div>
                  <div className="text-[9px] text-muted-foreground font-mono">{fmtPrice(rec.target)}</div>
                </div>
                <div className="bg-negative/5 rounded-lg p-2 text-center border border-negative/10">
                  <div className="text-[9px] text-muted-foreground mb-0.5">Max Risk</div>
                  <div className="text-sm font-mono font-bold text-negative">
                    -{Math.abs(pctRisk).toFixed(1)}%
                  </div>
                  <div className="text-[9px] text-muted-foreground font-mono">{fmtPrice(rec.stopLoss)}</div>
                </div>
              </div>

              <div className="space-y-1.5 text-xs font-mono">
                {[
                  { label: 'Entry', value: fmtPrice(rec.entry), explain: termExplain.Entry },
                  { label: 'Target', value: fmtPrice(rec.target), color: 'text-positive', explain: termExplain.Target },
                  { label: 'Stop Loss', value: fmtPrice(rec.stopLoss), color: 'text-negative', explain: termExplain['Stop Loss'] },
                  { label: 'Confidence', value: `${rec.confidence}%`, explain: termExplain.Confidence },
                ].map(row => (
                  <div key={row.label} className="group">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{row.label}</span>
                      <span className={row.color || 'text-foreground'}>{row.value}</span>
                    </div>
                    <p className="text-[9px] text-muted-foreground/60 leading-tight mt-0.5 hidden group-hover:block">{row.explain}</p>
                  </div>
                ))}
              </div>

              <div className="mt-3 pt-3 border-t border-border">
                <p className="text-[10px] sm:text-xs text-muted-foreground leading-relaxed">{rec.reasoning}</p>
              </div>

              {canSimulate && (
                <div className="mt-3 pt-3 border-t border-border/50">
                  {isSimulating ? (
                    <div className="flex items-center gap-1.5 text-[10px] text-primary/70">
                      <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                      <span className="font-medium">Simulation active — tracking in watchlist</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => onSimulate(rec)}
                      className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-medium bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-all"
                    >
                      <Play className="w-3 h-3" />
                      Simulate This Recommendation
                    </button>
                  )}
                  <div className="flex items-start gap-1 mt-1.5">
                    <Info className="w-2.5 h-2.5 text-muted-foreground/50 mt-0.5 shrink-0" />
                    <p className="text-[9px] text-muted-foreground/50 leading-relaxed">
                      Adds to your watchlist and tracks price{rec.horizon === 'short' ? ' hourly' : ' daily'} against entry, target, and stop-loss.
                    </p>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <p className="text-[10px] sm:text-xs text-muted-foreground italic">Algorithmic analysis only. Not financial advice. Always do your own research.</p>
    </div>
  );
}
