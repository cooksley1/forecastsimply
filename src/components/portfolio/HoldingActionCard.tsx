import { Trash2, ArrowRight, TrendingUp, TrendingDown } from 'lucide-react';

interface CacheData {
  price: number;
  signal_score: number | null;
  signal_label: string | null;
  confidence: number | null;
  market_phase: string | null;
  forecast_return_pct: number | null;
  target_price: number | null;
  stop_loss: number | null;
}

interface EnrichedHolding {
  id: string;
  asset_id: string;
  symbol: string;
  name: string;
  asset_type: string;
  quantity: number;
  avg_price: number;
  cache: CacheData | undefined;
  currentPrice: number;
  pnl: number | null;
  pnlValue: number | null;
}

interface Props {
  holding: EnrichedHolding;
  onRemove: () => void;
  onAnalyse?: () => void;
}

function getActionAdvice(h: EnrichedHolding): { label: string; color: string; detail: string } {
  const c = h.cache;
  if (!c || !c.signal_label) return { label: 'Analyse', color: 'text-muted-foreground', detail: 'Run analysis to get a recommendation' };

  const sig = c.signal_label.toLowerCase();
  const pnl = h.pnl ?? 0;
  const forecast = c.forecast_return_pct ?? 0;

  // Strong sell signals
  if (sig.includes('strong sell')) {
    return { label: 'Consider Selling', color: 'text-destructive', detail: `Strong sell signal · ${pnl > 0 ? 'Lock in profits' : 'Cut losses'}` };
  }
  if (sig.includes('sell')) {
    return { label: 'Review Position', color: 'text-destructive/80', detail: `Sell signal detected · Confidence ${c.confidence ?? '?'}%` };
  }
  // Strong buy with negative P&L = potential averaging opportunity
  if (sig.includes('strong buy') && pnl < -5) {
    return { label: 'Add More — Undervalued', color: 'text-positive', detail: `Strong buy signal with ${pnl.toFixed(1)}% dip — consider averaging down` };
  }
  if (sig.includes('strong buy')) {
    return { label: 'Strong Position', color: 'text-positive', detail: `Strong buy signal · Forecast ${forecast >= 0 ? '+' : ''}${forecast.toFixed(1)}%` };
  }
  if (sig.includes('buy') && forecast > 5) {
    return { label: 'Hold — Strong Momentum', color: 'text-positive/80', detail: `Buy signal with +${forecast.toFixed(1)}% forecast` };
  }
  if (sig.includes('buy')) {
    return { label: 'Hold Position', color: 'text-positive/80', detail: `Buy signal · Confidence ${c.confidence ?? '?'}%` };
  }
  // Hold
  if (pnl !== null && pnl > 20 && forecast < 0) {
    return { label: 'Consider Profit Taking', color: 'text-warning', detail: `Up ${pnl.toFixed(1)}% but forecast is ${forecast.toFixed(1)}%` };
  }
  return { label: 'Hold — Monitor', color: 'text-warning', detail: `Neutral signal · Market phase: ${c.market_phase ?? 'Unknown'}` };
}

export default function HoldingActionCard({ holding, onRemove, onAnalyse }: Props) {
  const action = getActionAdvice(holding);
  const hasData = !!holding.cache;
  const value = (holding.currentPrice || holding.avg_price) * holding.quantity;

  return (
    <div className="rounded-xl border border-border bg-card p-3 space-y-2">
      {/* Top row: asset info + P&L */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-bold text-foreground truncate">{holding.symbol}</span>
            <span className="text-[10px] text-muted-foreground">{holding.asset_type.toUpperCase()}</span>
          </div>
          <p className="text-[11px] text-muted-foreground truncate">{holding.name}</p>
        </div>
        <div className="text-right shrink-0">
          <div className="text-sm font-mono font-bold text-foreground">
            ${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </div>
          {holding.pnl !== null && (
            <div className={`text-[11px] font-mono font-semibold flex items-center justify-end gap-0.5 ${holding.pnl >= 0 ? 'text-positive' : 'text-destructive'}`}>
              {holding.pnl >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {holding.pnl >= 0 ? '+' : ''}{holding.pnl.toFixed(1)}%
              {holding.pnlValue !== null && (
                <span className="text-[10px] ml-1">(${Math.abs(holding.pnlValue).toLocaleString(undefined, { maximumFractionDigits: 2 })})</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Stats row */}
      <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
        <span>{holding.quantity} units @ ${holding.avg_price.toLocaleString(undefined, { maximumFractionDigits: 6 })}</span>
        {hasData && holding.cache?.signal_label && (
          <span className="px-1.5 py-0.5 rounded bg-muted text-[10px] font-medium">
            {holding.cache.signal_label}
          </span>
        )}
      </div>

      {/* Action advice */}
      <div className={`flex items-center justify-between rounded-lg bg-muted/40 border border-border/50 px-3 py-2`}>
        <div className="min-w-0">
          <div className={`text-xs font-bold ${action.color}`}>{action.label}</div>
          <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{action.detail}</p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {onAnalyse && (
            <button
              onClick={onAnalyse}
              className="px-2 py-1 rounded-md bg-primary/10 text-primary text-[10px] font-medium hover:bg-primary/20 transition-colors flex items-center gap-0.5"
            >
              Analyse <ArrowRight className="w-3 h-3" />
            </button>
          )}
          <button onClick={onRemove} className="p-1 rounded-md text-muted-foreground hover:text-destructive transition-colors" title="Remove">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
