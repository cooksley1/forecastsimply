import { ArrowUpRight, Trophy } from 'lucide-react';
import { fmtPrice, fmtPercent } from '@/utils/format';
import { BestPick, AssetClass } from './types';

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
  pick: BestPick;
  rank: number;
  assetClass: AssetClass;
  onViewAsset?: (assetId: string, assetType: AssetClass) => void;
}

export default function PickCompareCard({ pick, rank, assetClass, onViewAsset }: Props) {
  const targetPrice = pick.target_price ?? 0;
  const stopLoss = pick.stop_loss ?? 0;
  const potentialGain = targetPrice && pick.price ? ((targetPrice - pick.price) / pick.price) * 100 : 0;
  const potentialLoss = stopLoss && pick.price ? ((pick.price - stopLoss) / pick.price) * 100 : 0;
  const riskReward = potentialLoss > 0 ? potentialGain / potentialLoss : 0;

  const isTop = rank === 1;

  return (
    <div className={`rounded-xl border p-3 space-y-3 transition-all ${
      isTop
        ? 'border-primary/30 bg-primary/5 ring-1 ring-primary/10'
        : 'border-border/60 bg-muted/20'
    }`}>
      {/* Rank + Symbol header */}
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-0.5 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className={`text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
              isTop ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
            }`}>
              {isTop ? <Trophy className="w-3 h-3" /> : rank}
            </span>
            <span className="text-sm font-bold text-foreground">{pick.symbol}</span>
            <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full border ${getSignalColor(pick.signal_label)}`}>
              {pick.signal_label}
            </span>
          </div>
          <p className="text-[10px] text-muted-foreground truncate pl-6">{pick.name}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-sm font-mono font-bold text-foreground">{fmtPrice(pick.price)}</p>
          <p className={`text-[10px] font-mono ${pick.change_pct >= 0 ? 'text-positive' : 'text-negative'}`}>
            {fmtPercent(pick.change_pct)}
          </p>
        </div>
      </div>

      {/* Key metrics grid */}
      <div className="grid grid-cols-2 gap-1.5">
        <div className="bg-primary/10 rounded-md p-1.5 border border-primary/20 text-center col-span-2">
          <span className="text-[8px] text-primary/80 block">Composite Score</span>
          <span className="text-[11px] font-mono font-bold text-primary">{pick.composite_score ?? '—'}/100</span>
        </div>
        <div className="bg-background/50 rounded-md p-1.5 border border-border/30 text-center">
          <span className="text-[8px] text-muted-foreground block">Return</span>
          <span className="text-[11px] font-mono font-bold text-positive">+{pick.forecast_return_pct.toFixed(1)}%</span>
        </div>
        <div className="bg-background/50 rounded-md p-1.5 border border-border/30 text-center">
          <span className="text-[8px] text-muted-foreground block">Confidence</span>
          <span className={`text-[11px] font-mono font-bold ${getConfidenceColor(pick.confidence)}`}>{pick.confidence}%</span>
        </div>
        <div className="bg-background/50 rounded-md p-1.5 border border-border/30 text-center">
          <span className="text-[8px] text-muted-foreground block">R:R</span>
          <span className={`text-[11px] font-mono font-bold ${
            riskReward >= 2 ? 'text-positive' : riskReward >= 1 ? 'text-warning' : riskReward > 0 ? 'text-negative' : 'text-muted-foreground'
          }`}>{riskReward > 0 ? riskReward.toFixed(1) : '—'}</span>
        </div>
        <div className="bg-background/50 rounded-md p-1.5 border border-border/30 text-center">
          <span className="text-[8px] text-muted-foreground block">RSI</span>
          <span className={`text-[11px] font-mono font-bold ${
            pick.rsi != null ? (pick.rsi < 30 ? 'text-positive' : pick.rsi > 70 ? 'text-negative' : 'text-foreground') : 'text-muted-foreground'
          }`}>{pick.rsi != null ? pick.rsi.toFixed(0) : '—'}</span>
        </div>
      </div>

      {/* Trade levels row */}
      <div className="grid grid-cols-3 gap-1">
        <div className="bg-primary/5 rounded-md p-1.5 border border-primary/10 text-center">
          <span className="text-[7px] text-muted-foreground uppercase block">Entry</span>
          <span className="text-[10px] font-mono font-bold text-foreground">{fmtPrice(pick.price)}</span>
        </div>
        <div className="bg-positive/5 rounded-md p-1.5 border border-positive/10 text-center">
          <span className="text-[7px] text-positive/70 uppercase block">Target</span>
          <span className="text-[10px] font-mono font-bold text-positive">{targetPrice ? fmtPrice(targetPrice) : '—'}</span>
          {potentialGain > 0 && <span className="text-[7px] text-positive/60 block">+{potentialGain.toFixed(1)}%</span>}
        </div>
        <div className="bg-negative/5 rounded-md p-1.5 border border-negative/10 text-center">
          <span className="text-[7px] text-negative/70 uppercase block">Stop</span>
          <span className="text-[10px] font-mono font-bold text-negative">{stopLoss ? fmtPrice(stopLoss) : '—'}</span>
          {potentialLoss > 0 && <span className="text-[7px] text-negative/60 block">-{potentialLoss.toFixed(1)}%</span>}
        </div>
      </div>

      {/* Phase + CTA */}
      <div className="flex items-center justify-between">
        <span className="text-[9px] text-muted-foreground">
          {pick.market_phase || '—'}
        </span>
        {onViewAsset && (
          <button
            onClick={() => onViewAsset(pick.asset_id, assetClass)}
            className="flex items-center gap-1 text-[10px] font-medium text-primary hover:text-primary/80 transition-colors"
          >
            <ArrowUpRight className="w-3 h-3" />
            Analyse
          </button>
        )}
      </div>
    </div>
  );
}
