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
        {/* Timeframe explanation */}
        <div className="bg-muted/40 border border-border/50 rounded-lg p-2 space-y-1">
          <p className="text-[9px] sm:text-[10px] text-muted-foreground leading-relaxed">
            <span className="font-semibold text-foreground/80">⚠️ Why does advice change?</span>{' '}
            {timeframeDays <= 7
              ? 'Short timeframes (≤1W) capture recent momentum — ideal for day/swing trades. Indicators react quickly, signals flip faster, and noise is higher.'
              : timeframeDays <= 30
              ? 'Medium timeframes (1M) balance trend clarity with recency. Good for swing trades and position entries. Signals are more stable than shorter windows.'
              : timeframeDays <= 90
              ? '3-month windows reveal intermediate trends and mean-reversion setups. Indicators smooth out daily noise, giving steadier buy/sell signals.'
              : timeframeDays <= 180
              ? '6-month data captures full market cycles and seasonal patterns. Signals here suit position traders and DCA timing strategies.'
              : 'Long timeframes (1Y+) show the big picture — secular trends and major support/resistance. Best for long-term investors. Short-term fluctuations are filtered out.'}
          </p>
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
        <div className="bg-muted/40 border border-border/50 rounded-lg p-2">
          <p className="text-[9px] sm:text-[10px] text-muted-foreground leading-relaxed">
            <span className="font-semibold text-foreground/80">ℹ️ What is this?</span>{' '}
            {forecastPercent <= 20
              ? 'A short forecast (≤20%) projects just a few candles ahead — higher accuracy but limited planning horizon. Best for confirming immediate trend direction.'
              : forecastPercent <= 40
              ? 'A moderate forecast (20–40%) balances accuracy with useful lookahead. Good for swing trade timing and near-term price targets.'
              : forecastPercent <= 60
              ? 'A longer forecast (40–60%) gives broader price trajectory estimates. Useful for position planning, but confidence bands widen significantly.'
              : 'An extended forecast (60%+) projects far ahead — useful for big-picture scenarios but inherently less precise. Treat as directional guidance, not targets.'}
          </p>
        </div>
      </div>
    </div>
  );
}
