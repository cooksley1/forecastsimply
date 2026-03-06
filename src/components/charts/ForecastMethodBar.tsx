import { useState } from 'react';
import { FORECAST_METHODS } from '@/analysis/forecast';
import type { ForecastMethodId } from '@/analysis/forecast';

const METHOD_COLORS: Record<ForecastMethodId, string> = {
  ensemble: 'hsl(210 90% 55%)',
  linear: 'hsl(350 80% 55%)',
  holt: 'hsl(142 71% 45%)',
  ema_momentum: 'hsl(263 91% 66%)',
  monte_carlo: 'hsl(38 92% 50%)',
};

const METHOD_WHENS: Record<ForecastMethodId, string> = {
  ensemble: 'Best default choice. Blends Linear (best direction) + Holt (best bands) + Momentum (short-term) using weights optimised from 234 backtests. Use this if unsure which method to pick.',
  linear: 'Best single method for direction (64.1% accuracy). Use when the asset has a clear trend and you want the most statistically reliable projection. Bands widened 1.67× for better coverage.',
  holt: 'Use when you care more about the range (confidence bands) than the exact direction. Holt captures 83.3% of actual prices within its bands — best of any method. But only 44.9% directional accuracy.',
  ema_momentum: 'Use for volatile assets like crypto. Captures momentum bursts but dampened 40% and capped at ±15% after backtesting showed avg error of 27.7% without these limits.',
  monte_carlo: 'Use when you want to see the full range of possible outcomes rather than a single prediction. Best for risk assessment — shows realistic best/worst cases based on historical volatility.',
};

interface Props {
  selectedMethods: ForecastMethodId[];
  setSelectedMethods: (methods: ForecastMethodId[]) => void;
}

export default function ForecastMethodBar({ selectedMethods, setSelectedMethods }: Props) {
  const allSelected = selectedMethods.length === FORECAST_METHODS.length;
  const [showExplainer, setShowExplainer] = useState(false);

  const toggle = (id: ForecastMethodId) => {
    if (selectedMethods.includes(id)) {
      if (selectedMethods.length === 1) return;
      setSelectedMethods(selectedMethods.filter(m => m !== id));
    } else {
      setSelectedMethods([...selectedMethods, id]);
    }
  };

  const toggleAll = () => {
    if (allSelected) {
      setSelectedMethods([selectedMethods[0]]);
    } else {
      setSelectedMethods(FORECAST_METHODS.map(m => m.id));
    }
  };

  return (
    <div className="bg-sf-card border border-border rounded-xl overflow-hidden">
      <div className="px-3 py-2 flex flex-wrap items-center gap-2">
        <span className="text-[10px] text-muted-foreground font-mono uppercase mr-1">Forecast:</span>

        {FORECAST_METHODS.map(m => {
          const active = selectedMethods.includes(m.id);
          const color = METHOD_COLORS[m.id];
          return (
            <button
              key={m.id}
              onClick={() => toggle(m.id)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] sm:text-xs font-medium transition-all border ${
                active
                  ? 'border-current bg-current/10'
                  : 'border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground opacity-50'
              }`}
              style={active ? { color, borderColor: color, backgroundColor: `${color.replace(')', ' / 0.1)')}` } : undefined}
            >
              <span
                className="w-2.5 h-0.5 rounded-full inline-block"
                style={{ backgroundColor: color, opacity: active ? 1 : 0.3 }}
              />
              {m.shortName}
            </button>
          );
        })}

        <button
          onClick={toggleAll}
          className={`px-2 py-1 rounded text-[10px] font-mono transition-all ${
            allSelected ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {allSelected ? '✓ All' : 'Show All'}
        </button>

        <button
          onClick={() => setShowExplainer(!showExplainer)}
          className="ml-auto px-2 py-1 rounded text-[10px] font-mono text-muted-foreground hover:text-foreground transition-all"
          title="Why do these give different results?"
        >
          {showExplainer ? '▲ Hide' : 'ℹ️ Why different?'}
        </button>
      </div>

      {showExplainer && (
        <div className="border-t border-border px-3 py-3 space-y-3">
          <div className="space-y-1">
            <p className="text-[11px] text-foreground font-semibold">Why do these methods give different forecasts?</p>
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              Each method models price behaviour differently. No single model can predict markets — they each capture different aspects of price dynamics. Comparing them reveals how much consensus or uncertainty exists in the outlook.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {FORECAST_METHODS.map(m => {
              const color = METHOD_COLORS[m.id];
              return (
                <div key={m.id} className="rounded-lg border border-border p-2.5 space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-1 rounded-full" style={{ backgroundColor: color }} />
                    <span className="text-[11px] font-semibold" style={{ color }}>{m.shortName}</span>
                  </div>
                  <p className="text-[9px] text-muted-foreground leading-relaxed">{m.description}</p>
                  <div className="border-t border-border/50 pt-1.5">
                    <p className="text-[9px] text-foreground font-medium">📌 When to use</p>
                    <p className="text-[9px] text-muted-foreground leading-relaxed">{METHOD_WHENS[m.id]}</p>
                  </div>
                  <div className="border-t border-border/50 pt-1.5">
                    <p className="text-[9px] text-foreground font-medium">⚠️ Limitations</p>
                    <p className="text-[9px] text-muted-foreground leading-relaxed">{m.limitations}</p>
                  </div>
                  <div className="pt-0.5">
                    <p className="text-[9px] text-muted-foreground/70 italic">Accuracy: {m.accuracy}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="rounded-lg bg-primary/5 border border-primary/20 p-2.5 space-y-1">
            <p className="text-[10px] text-primary font-semibold">💡 Pro tip: Use "Show All" to compare</p>
            <p className="text-[9px] text-muted-foreground leading-relaxed">
              When all three lines point the same direction, there's stronger consensus about the trend. When they diverge, the outlook is uncertain — consider reducing position size or waiting for clearer signals.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
