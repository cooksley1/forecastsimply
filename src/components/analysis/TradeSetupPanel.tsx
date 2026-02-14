import type { TradeSetup } from '@/types/analysis';
import { fmtPrice } from '@/utils/format';

interface Props {
  setups: TradeSetup[];
}

export default function TradeSetupPanel({ setups }: Props) {
  return (
    <div className="space-y-4">
      <h3 className="text-foreground font-semibold text-sm">Trade Setups</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {setups.map(setup => {
          const isLong = setup.type === 'long';
          const borderColor = isLong ? 'border-sf-green/40' : 'border-sf-red/40';
          const glowClass = isLong ? 'glow-green' : 'glow-red';
          const accentClass = isLong ? 'text-positive' : 'text-negative';

          return (
            <div
              key={setup.type}
              className={`bg-sf-card border-2 ${borderColor} rounded-xl p-4 ${setup.bias ? glowClass : 'opacity-70'}`}
            >
              <div className="flex items-center justify-between mb-4">
                <span className={`text-sm font-bold uppercase ${accentClass}`}>
                  {isLong ? '▲ LONG' : '▼ SHORT'}
                </span>
                {setup.bias && (
                  <span className="text-xs px-2 py-0.5 rounded bg-primary/15 text-primary font-mono">BIAS</span>
                )}
              </div>

              <div className="space-y-2 font-mono text-sm">
                {[
                  { label: 'ENTRY', value: setup.entry, color: 'text-foreground' },
                  { label: 'STOP', value: setup.stop, color: 'text-negative' },
                  { label: 'TP1', value: setup.tp1, color: 'text-positive' },
                  { label: 'TP2', value: setup.tp2, color: 'text-positive' },
                ].map(row => (
                  <div key={row.label} className="flex justify-between">
                    <span className="text-muted-foreground text-xs">{row.label}</span>
                    <span className={row.color}>{fmtPrice(row.value)}</span>
                  </div>
                ))}
                <div className="flex justify-between pt-2 border-t border-border">
                  <span className="text-muted-foreground text-xs">R:R</span>
                  <span className="text-primary font-bold">{setup.riskReward.toFixed(2)}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
