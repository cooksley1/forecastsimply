import { FORECAST_METHODS } from '@/analysis/forecast';
import type { ForecastMethodId } from '@/analysis/forecast';

const METHOD_COLORS: Record<ForecastMethodId, string> = {
  holt: 'hsl(142 71% 45%)',
  ema_momentum: 'hsl(263 91% 66%)',
  monte_carlo: 'hsl(38 92% 50%)',
};

interface Props {
  selectedMethods: ForecastMethodId[];
  setSelectedMethods: (methods: ForecastMethodId[]) => void;
}

export default function ForecastMethodBar({ selectedMethods, setSelectedMethods }: Props) {
  const allSelected = selectedMethods.length === FORECAST_METHODS.length;

  const toggle = (id: ForecastMethodId) => {
    if (selectedMethods.includes(id)) {
      // Don't allow deselecting the last one
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
    <div className="bg-sf-card border border-border rounded-xl px-3 py-2 flex flex-wrap items-center gap-2">
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
            title={m.description}
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
        className={`ml-auto px-2 py-1 rounded text-[10px] font-mono transition-all ${
          allSelected
            ? 'text-primary bg-primary/10'
            : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        {allSelected ? '✓ All' : 'Show All'}
      </button>
    </div>
  );
}
