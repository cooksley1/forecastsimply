import { useActivePicks, useAllSnapshots } from '@/hooks/useTrackedPicks';
import { TrendingUp, TrendingDown, Minus, Trophy, ArrowRight, Activity } from 'lucide-react';
import { Link } from 'react-router-dom';

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

          // Target progress
          const targetProgress = pick.target_price
            ? Math.min(100, Math.max(0, ((currentPrice - pick.entry_price) / (pick.target_price - pick.entry_price)) * 100))
            : null;

          return (
            <div key={pick.id} className="p-3 sm:p-4 space-y-2">
              {/* Asset header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-base">{ASSET_ICONS[pick.asset_type] || '📈'}</span>
                  <div>
                    <p className="text-xs font-semibold text-foreground">{pick.symbol}</p>
                    <p className="text-[10px] text-muted-foreground truncate max-w-[100px]">{pick.name}</p>
                  </div>
                </div>
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
                  {snapshots.slice(-14).map((s, i) => {
                    const minP = Math.min(...snapshots.slice(-14).map(x => x.change_from_entry_pct));
                    const maxP = Math.max(...snapshots.slice(-14).map(x => x.change_from_entry_pct));
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
            </div>
          );
        })}
      </div>
    </div>
  );
}
