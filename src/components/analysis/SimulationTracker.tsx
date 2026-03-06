import { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, ReferenceLine, CartesianGrid, Tooltip, Area, ComposedChart } from 'recharts';
import { Target, Clock, CheckCircle, XCircle, Info, ChevronDown, ChevronUp } from 'lucide-react';
import type { SimulationData } from '@/types/assets';
import { fmtPrice } from '@/utils/format';

interface Props {
  simulation: SimulationData;
  currentPrice: number;
  symbol: string;
}

export default function SimulationTracker({ simulation, currentPrice, symbol }: Props) {
  const [expanded, setExpanded] = useState(true);

  const { entry, target, stopLoss, horizon, signal, confidence, startedAt, snapshots } = simulation;

  // Calculate progress
  const pnl = currentPrice - entry;
  const pnlPct = (pnl / entry) * 100;
  const targetPct = ((target - entry) / entry) * 100;
  const progressToTarget = target !== entry ? Math.min(100, Math.max(-50, (pnl / (target - entry)) * 100)) : 0;

  // Status
  const hitTarget = signal.includes('Buy') ? currentPrice >= target : currentPrice <= target;
  const hitStop = signal.includes('Buy') ? currentPrice <= stopLoss : currentPrice >= stopLoss;

  // Elapsed time
  const now = Date.now();
  const elapsed = now - startedAt;
  const elapsedDays = Math.floor(elapsed / (1000 * 60 * 60 * 24));
  const elapsedHours = Math.floor(elapsed / (1000 * 60 * 60));
  const elapsedMinutes = Math.floor(elapsed / (1000 * 60));

  const elapsedLabel = elapsedDays > 0 ? `${elapsedDays}d ${Math.floor((elapsed % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))}h`
    : elapsedHours > 0 ? `${elapsedHours}h ${Math.floor((elapsed % (1000 * 60 * 60)) / (1000 * 60))}m`
    : `${elapsedMinutes}m`;

  // Expected duration
  const durationMs = horizon === 'short' ? 7 * 24 * 60 * 60 * 1000
    : horizon === 'mid' ? 90 * 24 * 60 * 60 * 1000
    : 365 * 24 * 60 * 60 * 1000;
  const durationLabel = horizon === 'short' ? '1-7 days' : horizon === 'mid' ? '1-3 months' : '6-12+ months';
  const timeProgress = Math.min(100, (elapsed / durationMs) * 100);

  // Build chart data — always include entry, all snapshots, and current price
  const allPoints = [
    { timestamp: startedAt, price: entry },
    ...snapshots,
    { timestamp: now, price: currentPrice },
  ];

  // Project the target line to the expected end date
  const expectedEnd = startedAt + durationMs;
  const chartData = allPoints.map(p => ({
    time: p.timestamp,
    price: p.price,
    target: target,
    stopLoss: stopLoss,
    entry: entry,
  }));

  // Add a projected end point to extend the chart
  if (now < expectedEnd) {
    chartData.push({
      time: expectedEnd,
      price: NaN, // no actual data
      target,
      stopLoss,
      entry,
    });
  }

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    if (horizon === 'short') {
      return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  const formatDate = (ts: number) => new Date(ts).toLocaleDateString(undefined, {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  const statusConfig = hitTarget
    ? { icon: CheckCircle, label: 'Target Hit! 🎯', color: 'text-positive', bg: 'bg-positive/10', border: 'border-positive/30' }
    : hitStop
    ? { icon: XCircle, label: 'Stop-Loss Hit', color: 'text-negative', bg: 'bg-negative/10', border: 'border-negative/30' }
    : { icon: Clock, label: 'Active', color: 'text-primary', bg: 'bg-primary/10', border: 'border-primary/30' };

  const StatusIcon = statusConfig.icon;

  const priceMin = Math.min(stopLoss * 0.98, ...allPoints.map(p => p.price));
  const priceMax = Math.max(target * 1.02, ...allPoints.map(p => p.price));

  return (
    <div className={`rounded-lg border overflow-hidden ${statusConfig.border} ${statusConfig.bg}`}>
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full p-2.5 text-left hover:bg-muted/10 transition-colors"
      >
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1.5">
            <Target className="w-3.5 h-3.5 text-primary" />
            <span className="text-[11px] font-semibold text-foreground">Simulation</span>
            <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded ${statusConfig.bg} ${statusConfig.color}`}>
              <StatusIcon className="w-2.5 h-2.5 inline mr-0.5" />
              {statusConfig.label}
            </span>
          </div>
          {expanded ? <ChevronUp className="w-3 h-3 text-muted-foreground" /> : <ChevronDown className="w-3 h-3 text-muted-foreground" />}
        </div>

        {/* Summary row */}
        <div className="flex items-center gap-2 text-[10px] flex-wrap">
          <span className="text-muted-foreground font-mono">{signal}</span>
          <span className="text-muted-foreground">Entry: <span className="text-foreground">{fmtPrice(entry)}</span></span>
          <span className="text-muted-foreground">Now: <span className="text-foreground font-semibold">{fmtPrice(currentPrice)}</span></span>
          <span className={`font-mono font-bold ${pnlPct >= 0 ? 'text-positive' : 'text-negative'}`}>
            {pnlPct >= 0 ? '+' : ''}{pnlPct.toFixed(2)}%
          </span>
          <span className="text-muted-foreground/60 ml-auto">{elapsedLabel}</span>
        </div>
      </button>

      {expanded && (
        <div className="px-2.5 pb-3 space-y-3 border-t border-border/30 pt-2.5">
          {/* Explainer */}
          <div className="flex items-start gap-1.5 bg-muted/20 rounded-md p-2">
            <Info className="w-3 h-3 text-primary mt-0.5 shrink-0" />
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              Tracking {symbol} since <strong className="text-foreground">{formatDate(startedAt)}</strong>.
              {' '}Entry at {fmtPrice(entry)}, target {fmtPrice(target)} ({targetPct >= 0 ? '+' : ''}{targetPct.toFixed(1)}%),
              stop-loss at {fmtPrice(stopLoss)}.
              {horizon === 'short' ? ' Data captured hourly.' : ' Data captured daily.'}
              {' '}Expected timeframe: {durationLabel}.
            </p>
          </div>

          {/* Price progress toward target */}
          <div>
            <div className="flex items-center justify-between text-[9px] text-muted-foreground mb-1">
              <span className="text-negative">Stop: {fmtPrice(stopLoss)}</span>
              <span>Entry: {fmtPrice(entry)}</span>
              <span className="text-positive">Target: {fmtPrice(target)}</span>
            </div>
            <div className="h-3 bg-muted/40 rounded-full overflow-hidden relative border border-border/30">
              {/* Price position indicator */}
              <div
                className={`absolute inset-y-0 left-0 rounded-full transition-all duration-500 ${
                  pnlPct >= 0 ? 'bg-positive/60' : 'bg-negative/60'
                }`}
                style={{ width: `${Math.min(100, Math.max(3, progressToTarget))}%` }}
              />
              {/* Entry marker */}
              <div className="absolute inset-y-0 bg-primary/40" style={{ left: '0%', width: '2px' }} />
            </div>
            <div className="flex justify-between mt-1 text-[9px]">
              <span className={`font-mono ${pnlPct >= 0 ? 'text-positive' : 'text-negative'}`}>
                P&L: {pnlPct >= 0 ? '+' : ''}{fmtPrice(pnl)} ({pnlPct.toFixed(2)}%)
              </span>
              <span className="text-muted-foreground">
                {progressToTarget.toFixed(0)}% to target
              </span>
            </div>
          </div>

          {/* Time progress */}
          <div>
            <div className="flex items-center justify-between text-[9px] text-muted-foreground mb-1">
              <span>Started: {formatDate(startedAt)}</span>
              <span>{elapsedLabel} of ~{durationLabel}</span>
            </div>
            <div className="h-1.5 bg-muted/40 rounded-full overflow-hidden border border-border/30">
              <div className="h-full bg-primary/50 rounded-full transition-all" style={{ width: `${timeProgress}%` }} />
            </div>
          </div>

          {/* Timeline chart — always show */}
          <div className="bg-muted/10 rounded-lg p-2 border border-border/30">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wide">Price Timeline</span>
              <span className="text-[9px] text-muted-foreground">{snapshots.length + 2} data points</span>
            </div>
            <div className="h-28">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.3)" horizontal vertical={false} />
                  <XAxis
                    dataKey="time"
                    tickFormatter={formatTime}
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 8 }}
                    axisLine={false}
                    tickLine={false}
                    type="number"
                    domain={[startedAt, Math.max(now, expectedEnd)]}
                    scale="time"
                  />
                  <YAxis
                    domain={[priceMin, priceMax]}
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 8, fontFamily: 'monospace' }}
                    axisLine={false}
                    tickLine={false}
                    width={50}
                    tickFormatter={(v: number) => fmtPrice(v)}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.[0]) return null;
                      const d = payload[0].payload;
                      if (isNaN(d.price)) return null;
                      const changePct = ((d.price - entry) / entry) * 100;
                      return (
                        <div className="bg-popover border border-border rounded-lg px-2.5 py-1.5 shadow-lg">
                          <p className="text-[9px] text-muted-foreground">{formatDate(d.time)}</p>
                          <p className="text-[11px] text-foreground font-mono font-semibold">{fmtPrice(d.price)}</p>
                          <p className={`text-[9px] font-mono ${changePct >= 0 ? 'text-positive' : 'text-negative'}`}>
                            {changePct >= 0 ? '+' : ''}{changePct.toFixed(2)}% from entry
                          </p>
                        </div>
                      );
                    }}
                  />
                  {/* Reference lines */}
                  <ReferenceLine y={target} stroke="hsl(142 71% 45% / 0.6)" strokeDasharray="6 3" />
                  <ReferenceLine y={entry} stroke="hsl(var(--primary) / 0.5)" strokeDasharray="4 4" />
                  <ReferenceLine y={stopLoss} stroke="hsl(0 84% 60% / 0.6)" strokeDasharray="6 3" />
                  {/* Target zone shading */}
                  {/* Price line */}
                  <Line
                    dataKey="price"
                    stroke="hsl(var(--foreground))"
                    strokeWidth={2}
                    dot={(props: any) => {
                      const { cx, cy, index } = props;
                      if (index === 0) return <circle key="entry" cx={cx} cy={cy} r={4} fill="hsl(var(--primary))" stroke="hsl(var(--background))" strokeWidth={2} />;
                      if (index === chartData.length - 2 && !isNaN(chartData[index]?.price)) return <circle key="now" cx={cx} cy={cy} r={4} fill="hsl(var(--foreground))" stroke="hsl(var(--background))" strokeWidth={2} />;
                      return <circle key={index} cx={cx} cy={cy} r={2} fill="hsl(var(--muted-foreground))" opacity={0.5} />;
                    }}
                    connectNulls={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            {/* Legend */}
            <div className="flex items-center justify-between text-[8px] text-muted-foreground/60 mt-1 px-1">
              <span><span className="inline-block w-3 h-0.5 bg-positive/60 mr-1 align-middle" />Target ({fmtPrice(target)})</span>
              <span><span className="inline-block w-3 h-0.5 bg-primary/50 mr-1 align-middle" />Entry ({fmtPrice(entry)})</span>
              <span><span className="inline-block w-3 h-0.5 bg-negative/60 mr-1 align-middle" />Stop ({fmtPrice(stopLoss)})</span>
            </div>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-4 gap-1.5 text-[9px]">
            <div className="bg-muted/20 rounded-md p-1.5 text-center">
              <span className="text-muted-foreground block mb-0.5">P&L</span>
              <span className={`font-mono font-bold ${pnlPct >= 0 ? 'text-positive' : 'text-negative'}`}>
                {pnlPct >= 0 ? '+' : ''}{pnlPct.toFixed(2)}%
              </span>
            </div>
            <div className="bg-muted/20 rounded-md p-1.5 text-center">
              <span className="text-muted-foreground block mb-0.5">Points</span>
              <span className="font-mono text-foreground">{snapshots.length + 2}</span>
            </div>
            <div className="bg-muted/20 rounded-md p-1.5 text-center">
              <span className="text-muted-foreground block mb-0.5">Elapsed</span>
              <span className="font-mono text-foreground">{elapsedLabel}</span>
            </div>
            <div className="bg-muted/20 rounded-md p-1.5 text-center">
              <span className="text-muted-foreground block mb-0.5">Confidence</span>
              <span className="font-mono text-foreground">{confidence}%</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
