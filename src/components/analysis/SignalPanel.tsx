import { useState } from 'react';
import type { Signal, SignalBreakdown } from '@/types/analysis';

interface Props {
  signal: Signal;
  price: number;
  name: string;
  symbol: string;
}

const signalExplanations: Record<string, string> = {
  'Strong Buy': 'Multiple indicators suggest this is a great time to buy. The price is showing strong upward momentum.',
  'Buy': 'More indicators point up than down. Conditions look favourable for buying.',
  'Hold': 'Signals are mixed — no clear direction. Best to wait for a stronger signal before acting.',
  'Sell': 'More indicators point down than up. Consider reducing your position or waiting.',
  'Strong Sell': 'Multiple indicators suggest downward pressure. Caution is advised.',
};

const sigColor = (s: string) =>
  s === 'bullish' ? 'text-positive' : s === 'bearish' ? 'text-negative' : 'text-neutral-signal';
const sigBg = (s: string) =>
  s === 'bullish' ? 'border-l-positive' : s === 'bearish' ? 'border-l-negative' : 'border-l-neutral-signal';

function IndicatorRow({ ind }: { ind: SignalBreakdown }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`border border-border rounded-lg overflow-hidden border-l-[3px] ${sigBg(ind.signal)}`}>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full p-2 flex items-center gap-2 text-left hover:bg-secondary/30 transition-colors"
      >
        <span className={`text-xs ${sigColor(ind.signal)}`}>
          {ind.signal === 'bullish' ? '✓' : ind.signal === 'bearish' ? '✗' : '—'}
        </span>
        <span className="text-xs font-semibold text-foreground flex-1">{ind.name}</span>
        <span className={`text-xs font-mono font-semibold ${sigColor(ind.signal)}`}>{ind.value}</span>
        <span className="text-[10px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded font-mono">
          {ind.contribution > 0 ? '+' : ''}{ind.contribution}pts
        </span>
        <span className="text-muted-foreground text-xs">{open ? '▾' : '▸'}</span>
      </button>
      {open && (
        <div className="px-3 pb-2 pl-7 space-y-1.5">
          <p className="text-[11px] text-muted-foreground leading-relaxed">{ind.explanation}</p>
          {/* What this means for the user */}
          <div className={`flex items-start gap-1.5 rounded-md p-2 ${
            ind.signal === 'bullish' ? 'bg-positive/8 border border-positive/15' :
            ind.signal === 'bearish' ? 'bg-negative/8 border border-negative/15' :
            'bg-warning/8 border border-warning/15'
          }`}>
            <p className={`text-[10px] font-medium leading-relaxed ${
              ind.signal === 'bullish' ? 'text-positive' :
              ind.signal === 'bearish' ? 'text-negative' :
              'text-warning'
            }`}>
              {ind.signal === 'bullish'
                ? `🟢 This means BUY / HOLD — ${ind.name} is signaling upward momentum, supporting a bullish position.`
                : ind.signal === 'bearish'
                ? `🔴 This means SELL / CAUTION — ${ind.name} is signaling downward pressure. Consider reducing exposure or waiting.`
                : `🟡 This means HOLD / WAIT — ${ind.name} is neutral. No strong directional signal from this indicator.`
              }
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground/70">Weight: {ind.weight}%</span>
            <div className="flex-1 h-1 bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${ind.weight}%`,
                  backgroundColor: ind.signal === 'bullish'
                    ? 'hsl(var(--positive))'
                    : ind.signal === 'bearish'
                      ? 'hsl(var(--negative))'
                      : 'hsl(var(--muted-foreground))',
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SignalPanel({ signal, price, name, symbol }: Props) {
  const [showBreakdown, setShowBreakdown] = useState(false);
  const breakdown = signal.breakdown || [];
  const bullish = breakdown.filter(i => i.signal === 'bullish');
  const bearish = breakdown.filter(i => i.signal === 'bearish');
  const neutral = breakdown.filter(i => i.signal === 'neutral');
  const total = breakdown.length;
  const agreePct = total > 0
    ? Math.round(((signal.color === 'red' ? bearish.length : bullish.length) / total) * 100)
    : 0;

  const colorMap = {
    green: 'text-positive border-fs-green/30 bg-fs-green/5',
    red: 'text-negative border-fs-red/30 bg-fs-red/5',
    amber: 'text-neutral-signal border-fs-amber/30 bg-fs-amber/5',
  };

  const glowMap = {
    green: 'glow-green',
    red: 'glow-red',
    amber: '',
  };

  return (
    <div className="space-y-3">
      <div className={`border rounded-xl p-3 sm:p-5 ${colorMap[signal.color]} ${glowMap[signal.color]}`}>
        <div className="flex items-center justify-between mb-2 sm:mb-3">
          <div>
            <h2 className="text-foreground text-base sm:text-lg font-bold">{name}</h2>
            <span className="text-muted-foreground text-[10px] sm:text-xs font-mono">{symbol}</span>
          </div>
          <div className="text-right">
            <div className="text-foreground text-lg sm:text-xl font-mono font-bold">
              ${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
        </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
          <div className="flex items-center gap-2">
            <div className={`text-xl sm:text-2xl font-bold font-mono ${signal.color === 'green' ? 'text-positive' : signal.color === 'red' ? 'text-negative' : 'text-neutral-signal'}`}>
              {signal.label}
            </div>
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-border/50">
              Short-Term
            </span>
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-muted-foreground">Confidence</span>
              <span className="font-mono text-foreground">{signal.confidence}%</span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  signal.color === 'green' ? 'bg-fs-green' : signal.color === 'red' ? 'bg-fs-red' : 'bg-fs-amber'
                }`}
                style={{ width: `${signal.confidence}%` }}
              />
            </div>
          </div>
          <div className="flex sm:flex-col items-center sm:items-end gap-1 sm:gap-0 sm:text-right">
            <span className="text-xs text-muted-foreground">Score</span>
            <span className="font-mono font-bold text-foreground">{signal.score > 0 ? '+' : ''}{signal.score}</span>
          </div>
        </div>

        {/* Cross-timeframe warning */}
        {(signal as any).crossTimeframeNote && (
          <div className="mt-3 pt-3 border-t border-border/50">
            <p className="text-[11px] sm:text-xs text-warning leading-relaxed font-medium">
              {(signal as any).crossTimeframeNote}
            </p>
          </div>
        )}

        {/* Summary with indicator counts */}
        <div className="mt-3 pt-3 border-t border-border/50">
          <p className="text-[11px] sm:text-xs text-muted-foreground leading-relaxed">
            <span className="font-semibold text-foreground/80">What does this mean? </span>
            {signalExplanations[signal.label]}
            {breakdown.length > 0 && (
              <> <strong className="text-positive">{bullish.length} bullish</strong> vs <strong className="text-negative">{bearish.length} bearish</strong> indicators.
              {bullish.length > 0 && <> Bullish: {bullish.map(i => i.name).join(', ')}.</>}
              {bearish.length > 0 && <> Bearish: {bearish.map(i => i.name).join(', ')}.</>}
              </>
            )}
          </p>
        </div>

        {/* Signal Agreement Meter */}
        {total > 0 && (
          <div className="mt-3 pt-3 border-t border-border/50">
            <div className="flex items-center justify-between text-[10px] sm:text-xs mb-1.5">
              <span className="font-semibold text-foreground/80">Signal Agreement</span>
              <span className="font-mono text-muted-foreground">
                {signal.color === 'red' ? bearish.length : bullish.length}/{total} indicators agree
              </span>
            </div>
            <div className="flex h-2.5 rounded-full overflow-hidden bg-muted gap-px">
              {bullish.length > 0 && (
                <div
                  className="bg-positive rounded-l-full transition-all"
                  style={{ width: `${(bullish.length / total) * 100}%` }}
                  title={`${bullish.length} bullish`}
                />
              )}
              {neutral.length > 0 && (
                <div
                  className="bg-muted-foreground/30 transition-all"
                  style={{ width: `${(neutral.length / total) * 100}%` }}
                  title={`${neutral.length} neutral`}
                />
              )}
              {bearish.length > 0 && (
                <div
                  className="bg-negative rounded-r-full transition-all"
                  style={{ width: `${(bearish.length / total) * 100}%` }}
                  title={`${bearish.length} bearish`}
                />
              )}
            </div>
            <div className="flex justify-between mt-1 text-[9px]">
              <span className="text-positive font-medium">{bullish.length} bullish</span>
              {neutral.length > 0 && <span className="text-muted-foreground">{neutral.length} neutral</span>}
              <span className="text-negative font-medium">{bearish.length} bearish</span>
            </div>
          </div>
        )}
      </div>

      {/* Indicator Breakdown */}
      {breakdown.length > 0 && (
        <div className="space-y-1.5">
          <button
            onClick={() => setShowBreakdown(o => !o)}
            className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
          >
            {showBreakdown ? '▾' : '▸'} {showBreakdown ? 'Hide' : 'Show'} indicator breakdown ({breakdown.length} indicators)
          </button>
          {showBreakdown && (
            <div className="space-y-1">
              {breakdown.map(ind => (
                <IndicatorRow key={ind.name} ind={ind} />
              ))}
              <p className="text-[10px] text-muted-foreground italic pt-1">
                Click any indicator to see why it matters and how it contributed to the signal. 15 indicators scored from backtesting 13 assets across 234 tests. Cross-timeframe consistency may adjust scores.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
