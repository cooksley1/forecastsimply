export type RiskProfile = 'conservative' | 'moderate' | 'aggressive';

interface Props {
  timeframes: { label: string; days: number }[];
  timeframeDays: number;
  setTimeframeDays: (d: number) => void;
  forecastPercent: number;
  setForecastPercent: (p: number) => void;
  riskProfile: RiskProfile;
  setRiskProfile: (r: RiskProfile) => void;
}

const RISK_PROFILES: { id: RiskProfile; label: string; icon: string; desc: string }[] = [
  { id: 'conservative', label: 'Conservative', icon: '🛡️', desc: 'Lower risk, steady returns' },
  { id: 'moderate', label: 'Moderate', icon: '⚖️', desc: 'Balanced risk & reward' },
  { id: 'aggressive', label: 'Aggressive', icon: '🔥', desc: 'Higher risk, bigger moves' },
];

export default function ChartControls({
  timeframes, timeframeDays, setTimeframeDays,
  forecastPercent, setForecastPercent,
  riskProfile, setRiskProfile,
}: Props) {
  return (
    <div className="bg-sf-card border border-border rounded-xl p-3 space-y-4 lg:sticky lg:top-4">
      {/* Risk Profile */}
      <div className="space-y-1.5">
        <span className="text-[10px] sm:text-xs text-muted-foreground font-mono uppercase">Risk Profile</span>
        <div className="flex flex-col gap-1">
          {RISK_PROFILES.map(r => (
            <button
              key={r.id}
              onClick={() => setRiskProfile(r.id)}
              className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-[10px] sm:text-xs transition-all text-left ${
                riskProfile === r.id
                  ? 'bg-primary/10 border border-primary text-primary'
                  : 'border border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/30'
              }`}
            >
              <span>{r.icon}</span>
              <div>
                <div className="font-medium">{r.label}</div>
                <div className="text-muted-foreground/70 text-[9px]">{r.desc}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Timeframe */}
      <div className="space-y-1.5">
        <span className="text-[10px] sm:text-xs text-muted-foreground font-mono uppercase">Timeframe</span>
        <div className="flex flex-wrap gap-1">
          {timeframes.map(tf => (
            <button
              key={tf.days}
              onClick={() => setTimeframeDays(tf.days)}
              className={`px-2 py-1 rounded text-[10px] sm:text-xs font-mono transition-all ${
                timeframeDays === tf.days
                  ? 'bg-primary/15 text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tf.label}
            </button>
          ))}
        </div>
      </div>

      {/* Forecast Length */}
      <div className="space-y-1.5">
        <span className="text-[10px] sm:text-xs text-muted-foreground font-mono uppercase">Forecast Length</span>
        <div className="flex items-center gap-2">
          <input
            type="range"
            min={10}
            max={80}
            value={forecastPercent}
            onChange={e => setForecastPercent(Number(e.target.value))}
            className="flex-1 accent-primary"
          />
          <span className="text-[10px] sm:text-xs font-mono text-foreground w-8 text-right">{forecastPercent}%</span>
        </div>
        <p className="text-[9px] text-muted-foreground/70">How far ahead to project</p>
      </div>
    </div>
  );
}
