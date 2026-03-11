import { useActivePicks, useAllSnapshots } from '@/hooks/useTrackedPicks';
import { TrendingUp, TrendingDown, Minus, Trophy, ArrowRight, Activity, Info, Play } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useState, useMemo } from 'react';
import ForecastReplayChart from '@/components/analysis/ForecastReplayChart';

const ASSET_ICONS: Record<string, string> = { crypto: '₿', stocks: '📈', etfs: '📊' };

export default function LiveTracker() {
  const { data: picks = [], isLoading } = useActivePicks();
  const pickIds = picks.map(p => p.id);
  const { data: allSnapshots = [] } = useAllSnapshots(pickIds);

  if (isLoading) {
    return (
      <div className="border border-border rounded-xl bg-card p-4 animate-pulse">
        <div className="h-5 w-48 bg-muted rounded mb-3" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[1, 2, 3].map(i => <div key={i} className="h-24 bg-muted rounded-lg" />)}
        </div>
      </div>
    );
  }

  if (!picks.length) {
    return (
      <div className="border border-border rounded-xl bg-card p-5">
        <div className="flex items-center gap-2 mb-2">
          <Activity className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Live Performance Tracker</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          Monthly tracked picks will appear here on the 1st. Each pick is monitored daily against our forecast models.
        </p>
        <Link to="/scorecard" className="inline-flex items-center gap-1 mt-2 text-xs text-primary hover:underline">
          View past results <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
    );
  }

  const monthLabel = new Date(picks[0].month_start + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div className="border border-primary/20 rounded-xl bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-primary/5 border-b border-primary/10">
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Live Picks — {monthLabel}</h3>
        </div>
        <Link to="/scorecard" className="text-[10px] text-primary hover:underline flex items-center gap-1">
          Full Scorecard <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      {/* Pick cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-border">
        {picks.map(pick => {
          const snapshots = allSnapshots.filter(s => s.pick_id === pick.id);
          const latestSnap = snapshots[snapshots.length - 1];
          const currentPrice = latestSnap?.price ?? pick.entry_price;
          const returnPct = ((currentPrice - pick.entry_price) / pick.entry_price) * 100;
          const isPositive = returnPct > 0;
          const isNeutral = Math.abs(returnPct) < 0.5;

          // Days tracked
          const daysTracked = snapshots.length;
          const startDate = new Date(pick.month_start + 'T00:00:00');
          const now = new Date();
          const elapsedMs = now.getTime() - startDate.getTime();
          const elapsedDays = Math.floor(elapsedMs / (1000 * 60 * 60 * 24));
          const elapsedWeeks = Math.floor(elapsedDays / 7);
          const elapsedLabel = elapsedDays < 7
            ? `${elapsedDays} day${elapsedDays !== 1 ? 's' : ''}`
            : elapsedWeeks < 5
              ? `${elapsedWeeks} week${elapsedWeeks !== 1 ? 's' : ''}`
              : `${Math.round(elapsedDays / 30)} month${Math.round(elapsedDays / 30) !== 1 ? 's' : ''}`;

          // Target progress
          const targetProgress = pick.target_price
            ? Math.min(100, Math.max(0, ((currentPrice - pick.entry_price) / (pick.target_price - pick.entry_price)) * 100))
            : null;

          // Price change from entry
          const priceChange = currentPrice - pick.entry_price;

          return (
            <PickCard
              key={pick.id}
              pick={pick}
              currentPrice={currentPrice}
              returnPct={returnPct}
              isPositive={isPositive}
              isNeutral={isNeutral}
              daysTracked={daysTracked}
              elapsedLabel={elapsedLabel}
              startDate={startDate}
              targetProgress={targetProgress}
              priceChange={priceChange}
              snapshots={snapshots}
            />
          );
        })}
      </div>
    </div>
  );
}

function PickCard({ pick, currentPrice, returnPct, isPositive, isNeutral, daysTracked, elapsedLabel, startDate, targetProgress, priceChange, snapshots }: {
  pick: any;
  currentPrice: number;
  returnPct: number;
  isPositive: boolean;
  isNeutral: boolean;
  daysTracked: number;
  elapsedLabel: string;
  startDate: Date;
  targetProgress: number | null;
  priceChange: number;
  snapshots: any[];
}) {
  const [showExplainer, setShowExplainer] = useState(false);

  return (
    <div className="p-3 sm:p-4 space-y-2">
      {/* Asset header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-base">{ASSET_ICONS[pick.asset_type] || '📈'}</span>
          <div>
            <p className="text-xs font-semibold text-foreground">{pick.symbol}</p>
            <p className="text-[10px] text-muted-foreground truncate max-w-[100px]">{pick.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setShowExplainer(e => !e)}
            className={`p-1 rounded transition-colors ${showExplainer ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:text-primary'}`}
            title="Pick details"
          >
            <Info className="w-3.5 h-3.5" />
          </button>
          <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
            pick.signal_label === 'Buy' || pick.signal_label === 'Strong Buy'
              ? 'bg-positive/10 text-positive'
              : pick.signal_label === 'Hold'
              ? 'bg-warning/10 text-warning'
              : 'bg-destructive/10 text-destructive'
          }`}>
            {pick.signal_label}
          </span>
        </div>
      </div>

      {/* Price + return */}
      <div className="flex items-end justify-between">
        <div>
          <p className="text-lg font-mono font-semibold text-foreground">
            ${currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-[10px] text-muted-foreground">
            Entry: ${pick.entry_price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
        <div className={`flex items-center gap-0.5 text-sm font-mono font-semibold ${
          isNeutral ? 'text-muted-foreground' : isPositive ? 'text-positive' : 'text-destructive'
        }`}>
          {isNeutral ? <Minus className="w-3.5 h-3.5" /> : isPositive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
          {isPositive ? '+' : ''}{returnPct.toFixed(2)}%
        </div>
      </div>

      {/* Mini sparkline using CSS bars */}
      {snapshots.length > 1 && (
        <div className="flex items-end gap-px h-6">
          {snapshots.slice(-14).map((s: any, i: number) => {
            const minP = Math.min(...snapshots.slice(-14).map((x: any) => x.change_from_entry_pct));
            const maxP = Math.max(...snapshots.slice(-14).map((x: any) => x.change_from_entry_pct));
            const range = maxP - minP || 1;
            const height = Math.max(2, ((s.change_from_entry_pct - minP) / range) * 20 + 4);
            return (
              <div
                key={i}
                className={`flex-1 rounded-sm ${s.change_from_entry_pct >= 0 ? 'bg-positive/60' : 'bg-destructive/60'}`}
                style={{ height: `${height}px` }}
              />
            );
          })}
        </div>
      )}

      {/* Target progress */}
      {targetProgress !== null && (
        <div className="space-y-0.5">
          <div className="flex justify-between text-[9px] text-muted-foreground">
            <span>Target progress</span>
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

      {/* Footer */}
      <p className="text-[9px] text-muted-foreground">
        {daysTracked} day{daysTracked !== 1 ? 's' : ''} tracked · Confidence: {pick.confidence}%
      </p>

      {/* Explainer box */}
      {showExplainer && (
        <div className="bg-muted/40 border border-border/60 rounded-lg p-2.5 space-y-1.5 mt-1">
          <p className="text-[10px] font-semibold text-foreground flex items-center gap-1">
            <Info className="w-3 h-3 text-primary" /> Pick Summary
          </p>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[9px]">
            <div className="text-muted-foreground">Started</div>
            <div className="text-foreground font-medium">
              {startDate.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
            </div>
            <div className="text-muted-foreground">Duration</div>
            <div className="text-foreground font-medium">{elapsedLabel}</div>
            <div className="text-muted-foreground">Entry Price</div>
            <div className="text-foreground font-mono">${pick.entry_price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <div className="text-muted-foreground">Current Price</div>
            <div className={`font-mono font-medium ${isPositive ? 'text-positive' : isNeutral ? 'text-foreground' : 'text-destructive'}`}>
              ${currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-muted-foreground">P/L</div>
            <div className={`font-mono font-medium ${isPositive ? 'text-positive' : isNeutral ? 'text-foreground' : 'text-destructive'}`}>
              {priceChange >= 0 ? '+' : ''}${Math.abs(priceChange).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({returnPct >= 0 ? '+' : ''}{returnPct.toFixed(2)}%)
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
            <div className="text-muted-foreground">Signal</div>
            <div className="text-foreground">{pick.signal_label} (score: {pick.signal_score}/100)</div>
            <div className="text-muted-foreground">Snapshots</div>
            <div className="text-foreground">{daysTracked} daily readings</div>
          </div>
          {pick.reasoning && (
            <div className="pt-1 border-t border-border/40 mt-1">
              <p className="text-[9px] text-muted-foreground leading-relaxed">
                <span className="font-semibold text-foreground">Reasoning:</span> {pick.reasoning}
              </p>
            </div>
          )}
          <p className="text-[8px] text-muted-foreground/70 leading-relaxed">
            This pick was auto-selected on {startDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} as the top-ranked {pick.asset_type === 'crypto' ? 'cryptocurrency' : pick.asset_type === 'etfs' ? 'ETF' : 'stock'} by our composite signal model. Price is tracked daily against 5 forecast methods. The pick runs for the full calendar month.
          </p>
        </div>
      )}
    </div>
  );
}
