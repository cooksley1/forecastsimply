import { useState } from 'react';

export type OverlayId = 'bollinger' | 'vwap' | 'ema_cross' | 'ichimoku' | 'fibonacci' | 'volume_profile';

export interface OverlayMeta {
  id: OverlayId;
  name: string;
  color: string;
  icon: string;
  description: string;
  whatItDoes: string;
  recommendation: string;
}

export const OVERLAYS: OverlayMeta[] = [
  {
    id: 'bollinger',
    name: 'Bollinger Bands',
    color: 'hsl(213 70% 60%)',
    icon: '📏',
    description: 'Volatility bands around a 20-period moving average (±2 standard deviations).',
    whatItDoes: 'Shows when price is overbought (touching upper band) or oversold (touching lower band). Tight bands signal an imminent breakout.',
    recommendation: 'Buy near the lower band in an uptrend. Sell near the upper band in a downtrend. When bands squeeze tight, prepare for a big move.',
  },
  {
    id: 'vwap',
    name: 'VWAP',
    color: 'hsl(280 70% 60%)',
    icon: '⚖️',
    description: 'Volume Weighted Average Price — the average price weighted by trading volume.',
    whatItDoes: 'Shows the "fair value" price based on where most volume traded. Institutional traders use this as a key benchmark.',
    recommendation: 'Price above VWAP = bullish bias. Price below VWAP = bearish bias. Great for intraday entries — buy dips to VWAP in an uptrend.',
  },
  {
    id: 'ema_cross',
    name: 'EMA 12/26',
    color: 'hsl(340 80% 55%)',
    icon: '✂️',
    description: 'Exponential Moving Average crossover — fast (12) vs slow (26) period EMAs.',
    whatItDoes: 'Detects trend changes. When EMA12 crosses above EMA26, momentum is shifting bullish (and vice versa). This is the same signal MACD is based on.',
    recommendation: 'Buy when EMA12 crosses above EMA26 (golden cross). Sell when it crosses below (death cross). More responsive than SMA crossovers.',
  },
  {
    id: 'ichimoku',
    name: 'Ichimoku Cloud',
    color: 'hsl(160 60% 45%)',
    icon: '☁️',
    description: 'Japanese "one glance" system showing support, resistance, trend, and momentum simultaneously.',
    whatItDoes: 'The cloud (Kumo) shows support/resistance zones. Price above cloud = bullish. Tenkan/Kijun crosses confirm entries. Widely used for crypto and forex.',
    recommendation: 'Buy when price breaks above the cloud. Sell when it falls below. Thicker clouds provide stronger support/resistance. Tenkan crossing above Kijun = buy signal.',
  },
  {
    id: 'fibonacci',
    name: 'Fibonacci Retracement',
    color: 'hsl(45 90% 55%)',
    icon: '🔢',
    description: 'Key retracement levels (23.6%, 38.2%, 50%, 61.8%, 78.6%) from the period\'s high to low.',
    whatItDoes: 'Identifies where pullbacks are likely to find support or resistance. The 61.8% level ("golden ratio") is the most watched.',
    recommendation: 'In uptrends, buy at 38.2% or 61.8% retracements. The 50% level is a strong psychological zone. If price breaks below 78.6%, the trend may be reversing.',
  },
  {
    id: 'volume_profile',
    name: 'Avg Volume Line',
    color: 'hsl(200 70% 50%)',
    icon: '📊',
    description: 'Displays the 20-period moving average of volume as a reference line on the chart.',
    whatItDoes: 'Shows whether current volume is above or below average. Volume spikes confirm breakouts; low volume suggests weak moves.',
    recommendation: 'Trust breakouts with above-average volume. Be skeptical of moves on below-average volume. Volume precedes price — watch for volume surges before big moves.',
  },
];

interface Props {
  selected: OverlayId[];
  setSelected: (ids: OverlayId[]) => void;
}

export default function AnalysisOverlayBar({ selected, setSelected }: Props) {
  const [showExplainer, setShowExplainer] = useState(false);

  const toggle = (id: OverlayId) => {
    if (selected.includes(id)) {
      setSelected(selected.filter(s => s !== id));
    } else {
      setSelected([...selected, id]);
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="px-3 py-2 flex flex-wrap items-center gap-2">
        <span className="text-[10px] text-muted-foreground font-mono uppercase mr-1">Analysis:</span>

        {OVERLAYS.map(o => {
          const active = selected.includes(o.id);
          return (
            <button
              key={o.id}
              onClick={() => toggle(o.id)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] sm:text-xs font-semibold transition-all border-2 ${
                active
                  ? 'shadow-md ring-1 ring-current/20'
                  : 'border-border/50 text-muted-foreground hover:text-foreground hover:border-muted-foreground opacity-40 hover:opacity-70'
              }`}
              style={active ? {
                color: o.color,
                borderColor: o.color,
                backgroundColor: `${o.color.replace(')', ' / 0.15)')}`,
                boxShadow: `0 0 12px ${o.color.replace(')', ' / 0.2)')}`,
              } : undefined}
            >
              <span className={`text-xs ${active ? 'scale-110' : ''} transition-transform`}>{o.icon}</span>
              {o.name}
              {active && <span className="w-1.5 h-1.5 rounded-full ml-0.5" style={{ backgroundColor: o.color }} />}
            </button>
          );
        })}

        <button
          onClick={() => setShowExplainer(!showExplainer)}
          className="ml-auto px-2 py-1 rounded text-[10px] font-mono text-muted-foreground hover:text-foreground transition-all"
        >
          {showExplainer ? '▲ Hide' : 'ℹ️ What do these do?'}
        </button>
      </div>

      {showExplainer && (
        <div className="border-t border-border px-3 py-3 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {OVERLAYS.map(o => (
              <div key={o.id} className="rounded-lg border border-border p-2.5 space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm">{o.icon}</span>
                  <span className="text-[11px] font-semibold" style={{ color: o.color }}>{o.name}</span>
                </div>
                <p className="text-[9px] text-muted-foreground leading-relaxed">{o.description}</p>
                <div className="border-t border-border/50 pt-1.5">
                  <p className="text-[9px] text-foreground font-medium">📖 What it shows</p>
                  <p className="text-[9px] text-muted-foreground leading-relaxed">{o.whatItDoes}</p>
                </div>
                <div className="border-t border-border/50 pt-1.5">
                  <p className="text-[9px] text-foreground font-medium">🎯 How to use it</p>
                  <p className="text-[9px] text-muted-foreground leading-relaxed">{o.recommendation}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-lg bg-primary/5 border border-primary/20 p-2.5 space-y-1">
            <p className="text-[10px] text-primary font-semibold">💡 Pro tip: Combine overlays for confluence</p>
            <p className="text-[9px] text-muted-foreground leading-relaxed">
              The strongest trading signals come when multiple indicators agree. For example: price at a Fibonacci 61.8% level + touching the lower Bollinger Band + above VWAP = high-probability long entry. Use 2-3 overlays together, not all 6 at once.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
