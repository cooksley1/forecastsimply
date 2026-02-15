export type RiskLevel = 1 | 2 | 3 | 4 | 5;
export type RiskProfile = 'conservative' | 'moderate-conservative' | 'moderate' | 'moderate-aggressive' | 'aggressive';

const RISK_META: { level: RiskLevel; profile: RiskProfile; label: string; icon: string; desc: string }[] = [
  { level: 1, profile: 'conservative', label: 'Conservative', icon: '🛡️', desc: 'Capital preservation' },
  { level: 2, profile: 'moderate-conservative', label: 'Mod-Conservative', icon: '🔒', desc: 'Steady growth' },
  { level: 3, profile: 'moderate', label: 'Moderate', icon: '⚖️', desc: 'Balanced' },
  { level: 4, profile: 'moderate-aggressive', label: 'Mod-Aggressive', icon: '📈', desc: 'Growth-focused' },
  { level: 5, profile: 'aggressive', label: 'Aggressive', icon: '🔥', desc: 'Max returns' },
];

export function riskLevelToProfile(level: RiskLevel): RiskProfile {
  return RISK_META.find(r => r.level === level)!.profile;
}

export function getRiskMeta(level: RiskLevel) {
  return RISK_META.find(r => r.level === level)!;
}

interface Props {
  timeframes: { label: string; days: number }[];
  timeframeDays: number;
  setTimeframeDays: (d: number) => void;
  forecastPercent: number;
  setForecastPercent: (p: number) => void;
  riskLevel: RiskLevel;
  setRiskLevel: (r: RiskLevel) => void;
}

export default function ChartControls({
  timeframes, timeframeDays, setTimeframeDays,
  forecastPercent, setForecastPercent,
  riskLevel, setRiskLevel,
}: Props) {
  const meta = getRiskMeta(riskLevel);

  return (
    <div className="bg-sf-card border border-border rounded-xl p-3 space-y-4 lg:sticky lg:top-4">
      {/* Risk Profile - 5-point slider */}
      <div className="space-y-2">
        <span className="text-[10px] sm:text-xs text-muted-foreground font-mono uppercase">Risk Profile</span>
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={1}
              max={5}
              step={1}
              value={riskLevel}
              onChange={e => setRiskLevel(Number(e.target.value) as RiskLevel)}
              className="flex-1 accent-primary"
            />
          </div>
          {/* Scale indicators */}
          <div className="flex justify-between px-0.5">
            {RISK_META.map(r => (
              <button
                key={r.level}
                onClick={() => setRiskLevel(r.level)}
                className={`flex flex-col items-center gap-0.5 transition-all ${
                  riskLevel === r.level ? 'scale-110' : 'opacity-50 hover:opacity-80'
                }`}
                title={`${r.label}: ${r.desc}`}
              >
                <span className="text-sm">{r.icon}</span>
                <span className={`text-[8px] font-mono leading-tight ${
                  riskLevel === r.level ? 'text-primary font-semibold' : 'text-muted-foreground'
                }`}>
                  {r.level}
                </span>
              </button>
            ))}
          </div>
          {/* Active label */}
          <div className="text-center">
            <span className="text-[10px] sm:text-xs font-medium text-primary">{meta.icon} {meta.label}</span>
            <span className="text-[9px] text-muted-foreground/70 ml-1.5">— {meta.desc}</span>
          </div>
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
