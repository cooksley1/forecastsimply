import { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, ReferenceLine, CartesianGrid, Tooltip } from 'recharts';
import { Target, TrendingUp, TrendingDown, Clock, AlertTriangle, CheckCircle, XCircle, Info, ChevronDown, ChevronUp } from 'lucide-react';
import type { SimulationData } from '@/types/assets';
import { fmtPrice } from '@/utils/format';

interface Props {
  simulation: SimulationData;
  currentPrice: number;
  symbol: string;
}

export default function SimulationTracker({ simulation, currentPrice, symbol }: Props) {
  const [expanded, setExpanded] = useState(false);

  const { entry, target, stopLoss, horizon, signal, confidence, startedAt, snapshots } = simulation;

  // Calculate progress
  const pnl = currentPrice - entry;
  const pnlPct = (pnl / entry) * 100;
  const targetPct = ((target - entry) / entry) * 100;
  const progressToTarget = Math.min(100, Math.max(0, (pnl / (target - entry)) * 100));

  // Status
  const hitTarget = currentPrice >= target;
  const hitStop = currentPrice <= stopLoss;
  const isActive = !hitTarget && !hitStop;

  // Elapsed time
  const elapsed = Date.now() - startedAt;
  const elapsedDays = Math.floor(elapsed / (1000 * 60 * 60 * 24));
  const elapsedHours = Math.floor(elapsed / (1000 * 60 * 60));

  // Expected duration
  const durationLabel = horizon === 'short' ? '1-7 days' : horizon === 'mid' ? '1-3 months' : '6-12+ months';

  // Chart data
  const chartData = [
    { time: startedAt, price: entry, label: 'Entry' },
    ...snapshots.map(s => ({ time: s.timestamp, price: s.price, label: '' })),
    { time: Date.now(), price: currentPrice, label: 'Now' },
  ];

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    if (horizon === 'short') return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  const statusConfig = hitTarget
    ? { icon: CheckCircle, label: 'Target Hit! 🎯', color: 'text-positive', bg: 'bg-positive/10' }
    : hitStop
    ? { icon: XCircle, label: 'Stop-Loss Hit', color: 'text-negative', bg: 'bg-negative/10' }
    : { icon: Clock, label: 'Active', color: 'text-primary', bg: 'bg-primary/10' };

  const StatusIcon = statusConfig.icon;

  return (
    <div className={`rounded-lg border overflow-hidden ${
      hitTarget ? 'border-positive/30 bg-positive/5' :
      hitStop ? 'border-negative/30 bg-negative/5' :
      'border-primary/30 bg-primary/5'
    }`}>
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full p-2.5 text-left hover:bg-muted/10 transition-colors"
      >
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1.5">
            <Target className="w-3 h-3 text-primary" />
            <span className="text-[10px] font-semibold text-foreground uppercase tracking-wide">Simulation</span>
            <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded ${statusConfig.bg} ${statusConfig.color}`}>
              {statusConfig.label}
            </span>
          </div>
          {expanded ? <ChevronUp className="w-3 h-3 text-muted-foreground" /> : <ChevronDown className="w-3 h-3 text-muted-foreground" />}
        </div>

        {/* Quick stats row */}
        <div className="flex items-center gap-3 text-[10px]">
          <span className="text-muted-foreground">
            {signal} @ {fmtPrice(entry)}
          </span>
          <span className="text-muted-foreground">→</span>
          <span className="text-foreground font-mono">{fmtPrice(currentPrice)}</span>
          <span className={`font-mono font-semibold ${pnlPct >= 0 ? 'text-positive' : 'text-negative'}`}>
            {pnlPct >= 0 ? '+' : ''}{pnlPct.toFixed(2)}%
          </span>
          <span className="text-muted-foreground ml-auto">
            {elapsedDays > 0 ? `${elapsedDays}d` : `${elapsedHours}h`} elapsed
          </span>
        </div>
      </button>

      {expanded && (
        <div className="px-2.5 pb-3 space-y-3 border-t border-border/30 pt-2">
          {/* Explainer */}
          <div className="flex items-start gap-1.5 bg-muted/20 rounded-md p-2">
            <Info className="w-3 h-3 text-primary mt-0.5 shrink-0" />
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              This simulation tracks what would happen if you followed the {horizon}-term recommendation.
              Entry was {fmtPrice(entry)}, target is {fmtPrice(target)} ({targetPct >= 0 ? '+' : ''}{targetPct.toFixed(1)}%),
              and stop-loss is {fmtPrice(stopLoss)}.
              {horizon === 'short' ? ' Data points are captured roughly every hour.' :
               ' Data points are captured daily.'}
            </p>
          </div>

          {/* Progress bar */}
          <div>
            <div className="flex items-center justify-between text-[9px] text-muted-foreground mb-1">
              <span>Stop: {fmtPrice(stopLoss)}</span>
              <span>Entry: {fmtPrice(entry)}</span>
              <span>Target: {fmtPrice(target)}</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden relative">
              {/* Stop loss zone */}
              <div className="absolute inset-y-0 left-0 bg-negative/20 rounded-l-full" style={{ width: '15%' }} />
              {/* Target zone */}
              <div className="absolute inset-y-0 right-0 bg-positive/20 rounded-r-full" style={{ width: '15%' }} />
              {/* Current position */}
              <div
                className={`absolute inset-y-0 left-0 rounded-full transition-all ${
                  pnlPct >= 0 ? 'bg-positive' : 'bg-negative'
                }`}
                style={{ width: `${Math.min(100, Math.max(5, progressToTarget))}%` }}
              />
            </div>
          </div>

          {/* Mini chart */}
          {chartData.length > 2 && (
            <div className="h-24">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.3)" horizontal vertical={false} />
                  <XAxis
                    dataKey="time"
                    tickFormatter={formatTime}
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 8 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    domain={[Math.min(stopLoss * 0.98, ...chartData.map(d => d.price)), Math.max(target * 1.02, ...chartData.map(d => d.price))]}
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 8, fontFamily: 'monospace' }}
                    axisLine={false}
                    tickLine={false}
                    width={45}
                    tickFormatter={(v: number) => fmtPrice(v)}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.[0]) return null;
                      const d = payload[0].payload;
                      return (
                        <div className="bg-popover border border-border rounded-lg px-2 py-1 shadow-lg">
                          <p className="text-[9px] text-muted-foreground">{formatTime(d.time)}</p>
                          <p className="text-[10px] text-foreground font-mono font-semibold">{fmtPrice(d.price)}</p>
                        </div>
                      );
                    }}
                  />
                  <ReferenceLine y={target} stroke="hsl(142 71% 45% / 0.5)" strokeDasharray="4 4" label={{ value: 'Target', fontSize: 8, fill: 'hsl(142 71% 45%)' }} />
                  <ReferenceLine y={entry} stroke="hsl(var(--primary) / 0.5)" strokeDasharray="4 4" label={{ value: 'Entry', fontSize: 8, fill: 'hsl(var(--primary))' }} />
                  <ReferenceLine y={stopLoss} stroke="hsl(0 84% 60% / 0.5)" strokeDasharray="4 4" label={{ value: 'Stop', fontSize: 8, fill: 'hsl(0 84% 60%)' }} />
                  <Line dataKey="price" stroke="hsl(var(--foreground))" strokeWidth={1.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Stats grid */}
          <div className="grid grid-cols-3 gap-2 text-[10px]">
            <div className="bg-muted/20 rounded-md p-1.5 text-center">
              <span className="text-muted-foreground block">P&L</span>
              <span className={`font-mono font-semibold ${pnlPct >= 0 ? 'text-positive' : 'text-negative'}`}>
                {pnlPct >= 0 ? '+' : ''}{fmtPrice(pnl)} ({pnlPct.toFixed(2)}%)
              </span>
            </div>
            <div className="bg-muted/20 rounded-md p-1.5 text-center">
              <span className="text-muted-foreground block">Snapshots</span>
              <span className="font-mono text-foreground">{snapshots.length}</span>
            </div>
            <div className="bg-muted/20 rounded-md p-1.5 text-center">
              <span className="text-muted-foreground block">Horizon</span>
              <span className="font-mono text-foreground">{durationLabel}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
