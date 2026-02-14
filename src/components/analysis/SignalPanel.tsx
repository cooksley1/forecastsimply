import type { Signal } from '@/types/analysis';

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

export default function SignalPanel({ signal, price, name, symbol }: Props) {
  const colorMap = {
    green: 'text-positive border-sf-green/30 bg-sf-green/5',
    red: 'text-negative border-sf-red/30 bg-sf-red/5',
    amber: 'text-neutral-signal border-sf-amber/30 bg-sf-amber/5',
  };

  const glowMap = {
    green: 'glow-green',
    red: 'glow-red',
    amber: '',
  };

  return (
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
        <div className={`text-xl sm:text-2xl font-bold font-mono ${signal.color === 'green' ? 'text-positive' : signal.color === 'red' ? 'text-negative' : 'text-neutral-signal'}`}>
          {signal.label}
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-muted-foreground">Confidence</span>
            <span className="font-mono text-foreground">{signal.confidence}%</span>
          </div>
          <div className="h-2 rounded-full bg-sf-inset overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                signal.color === 'green' ? 'bg-sf-green' : signal.color === 'red' ? 'bg-sf-red' : 'bg-sf-amber'
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

      {/* Beginner explanation */}
      <div className="mt-3 pt-3 border-t border-border/50">
        <p className="text-[11px] sm:text-xs text-muted-foreground leading-relaxed">
          <span className="font-semibold text-foreground/80">What does this mean? </span>
          {signalExplanations[signal.label]}
          {' '}The <strong>confidence</strong> shows how certain the algorithm is (higher = more indicators agree). The <strong>score</strong> ranges from -10 to +10 based on combined indicator readings.
        </p>
      </div>
    </div>
  );
}
