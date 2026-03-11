import { useState, useEffect, useRef, useCallback } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine, Legend,
} from 'recharts';
import { Play, Pause, RotateCcw, FastForward } from 'lucide-react';

interface DataPoint {
  date: string;
  actual: number | null;
  ensemble: number | null;
  linear: number | null;
  holt: number | null;
  ema: number | null;
  monteCarlo: number | null;
}

interface Props {
  /** Full dataset of snapshots already formatted */
  data: DataPoint[];
  entryPrice: number;
  targetPrice?: number | null;
  stopLoss?: number | null;
  symbol: string;
}

const METHOD_COLORS: Record<string, string> = {
  ensemble: 'hsl(173, 58%, 49%)',
  linear: 'hsl(36, 80%, 52%)',
  holt: 'hsl(152, 60%, 42%)',
  ema: 'hsl(260, 60%, 60%)',
  monteCarlo: 'hsl(0, 72%, 55%)',
};

const SPEED_OPTIONS = [
  { label: '1×', ms: 400 },
  { label: '2×', ms: 200 },
  { label: '4×', ms: 100 },
];

export default function ForecastReplayChart({ data, entryPrice, targetPrice, stopLoss, symbol }: Props) {
  const [visibleCount, setVisibleCount] = useState(1);
  const [playing, setPlaying] = useState(false);
  const [speedIdx, setSpeedIdx] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const total = data.length;
  const isComplete = visibleCount >= total;

  const stop = useCallback(() => {
    setPlaying(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const play = useCallback(() => {
    if (isComplete) {
      setVisibleCount(1);
    }
    setPlaying(true);
  }, [isComplete]);

  const reset = useCallback(() => {
    stop();
    setVisibleCount(1);
  }, [stop]);

  const cycleSpeed = useCallback(() => {
    setSpeedIdx(i => (i + 1) % SPEED_OPTIONS.length);
  }, []);

  // Animation loop
  useEffect(() => {
    if (!playing) return;
    intervalRef.current = setInterval(() => {
      setVisibleCount(prev => {
        if (prev >= total) {
          stop();
          return total;
        }
        return prev + 1;
      });
    }, SPEED_OPTIONS[speedIdx].ms);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [playing, speedIdx, total, stop]);

  // Build display data: forecast lines are fully visible, actual is revealed progressively
  const displayData = data.map((d, i) => ({
    ...d,
    actual: i < visibleCount ? d.actual : null,
  }));

  // Progress percentage
  const progress = total > 1 ? ((visibleCount - 1) / (total - 1)) * 100 : 0;

  // Y-axis domain
  const allPrices = data.flatMap(d => [d.actual, d.ensemble, d.linear, d.holt, d.ema, d.monteCarlo].filter(Boolean) as number[]);
  if (targetPrice) allPrices.push(targetPrice);
  if (stopLoss) allPrices.push(stopLoss);
  allPrices.push(entryPrice);
  const yMin = Math.min(...allPrices) * 0.98;
  const yMax = Math.max(...allPrices) * 1.02;

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Play className="w-3.5 h-3.5 text-primary" />
          <span className="text-[11px] font-semibold text-foreground">Forecast Replay — {symbol}</span>
        </div>
        <span className="text-[9px] text-muted-foreground font-mono">
          Day {visibleCount} of {total}
        </span>
      </div>

      {/* Chart */}
      <div className="h-56 sm:h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={displayData} margin={{ top: 5, right: 5, left: 5, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.3)" horizontal vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              domain={[yMin, yMax]}
              tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))', fontFamily: 'monospace' }}
              axisLine={false}
              tickLine={false}
              width={55}
              tickFormatter={(v: number) => v >= 1000 ? `$${(v / 1000).toFixed(1)}k` : `$${v.toFixed(2)}`}
            />
            <Tooltip
              contentStyle={{
                background: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                fontSize: '10px',
              }}
              labelStyle={{ color: 'hsl(var(--foreground))' }}
            />
            <Legend wrapperStyle={{ fontSize: '9px' }} />

            {/* Reference lines */}
            <ReferenceLine
              y={entryPrice}
              stroke="hsl(var(--muted-foreground) / 0.5)"
              strokeDasharray="4 4"
              label={{ value: 'Entry', fill: 'hsl(var(--muted-foreground))', fontSize: 8, position: 'left' }}
            />
            {targetPrice && (
              <ReferenceLine
                y={targetPrice}
                stroke="hsl(142 71% 45% / 0.5)"
                strokeDasharray="6 3"
                label={{ value: 'Target', fill: 'hsl(142 71% 45%)', fontSize: 8, position: 'left' }}
              />
            )}
            {stopLoss && (
              <ReferenceLine
                y={stopLoss}
                stroke="hsl(0 84% 60% / 0.5)"
                strokeDasharray="6 3"
                label={{ value: 'Stop', fill: 'hsl(0 84% 60%)', fontSize: 8, position: 'left' }}
              />
            )}

            {/* Forecast lines — always fully visible (dashed) */}
            <Line type="monotone" dataKey="ensemble" stroke={METHOD_COLORS.ensemble} strokeWidth={1.5} strokeDasharray="6 3" dot={false} name="Ensemble" connectNulls />
            <Line type="monotone" dataKey="linear" stroke={METHOD_COLORS.linear} strokeWidth={1} strokeDasharray="4 2" dot={false} name="Linear" connectNulls />
            <Line type="monotone" dataKey="holt" stroke={METHOD_COLORS.holt} strokeWidth={1} strokeDasharray="4 2" dot={false} name="Holt" connectNulls />
            <Line type="monotone" dataKey="ema" stroke={METHOD_COLORS.ema} strokeWidth={1} strokeDasharray="4 2" dot={false} name="EMA" connectNulls />
            <Line type="monotone" dataKey="monteCarlo" stroke={METHOD_COLORS.monteCarlo} strokeWidth={1} strokeDasharray="4 2" dot={false} name="Monte Carlo" connectNulls />

            {/* Actual price — progressively revealed (solid, thick) */}
            <Line
              type="monotone"
              dataKey="actual"
              stroke="hsl(var(--foreground))"
              strokeWidth={2.5}
              dot={false}
              name="Actual"
              connectNulls={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Scrubber slider */}
      <div className="flex items-center gap-2">
        <span className="text-[9px] text-muted-foreground font-mono w-6 text-right shrink-0">1</span>
        <input
          type="range"
          min={1}
          max={total}
          value={visibleCount}
          onChange={(e) => {
            stop();
            setVisibleCount(Number(e.target.value));
          }}
          className="flex-1 h-1.5 appearance-none bg-muted rounded-full cursor-pointer accent-primary [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:shadow-md [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-primary [&::-moz-range-thumb]:border-0"
        />
        <span className="text-[9px] text-muted-foreground font-mono w-6 shrink-0">{total}</span>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <button
            onClick={playing ? stop : play}
            className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-primary/10 hover:bg-primary/20 text-primary text-[10px] font-medium transition-colors"
          >
            {playing ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
            {playing ? 'Pause' : isComplete ? 'Replay' : 'Play'}
          </button>
          <button
            onClick={reset}
            className="p-1.5 rounded-md hover:bg-muted text-muted-foreground transition-colors"
            title="Reset"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
          <button
            onClick={cycleSpeed}
            className="flex items-center gap-0.5 px-2 py-1 rounded-md hover:bg-muted text-muted-foreground text-[10px] font-mono transition-colors"
            title="Playback speed"
          >
            <FastForward className="w-3 h-3" />
            {SPEED_OPTIONS[speedIdx].label}
          </button>
        </div>

        {/* Scrubber hint */}
        <span className="text-[8px] text-muted-foreground/60">
          {isComplete ? '✓ Complete' : `${Math.round(progress)}% through`}
        </span>
      </div>

      {/* Beginner explainer */}
      <p className="text-[9px] text-muted-foreground/70 leading-relaxed">
        The solid line is the <strong className="text-foreground">actual price</strong> — it draws in real-time to show how the asset moved day-by-day.
        The dashed lines are our <strong className="text-foreground">forecast models</strong>, visible from the start. Watch how closely they track reality.
      </p>
    </div>
  );
}
