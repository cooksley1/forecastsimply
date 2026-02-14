import type { TradeSetup } from '@/types/analysis';
import { fmtPrice } from '@/utils/format';

interface Props {
  setups: TradeSetup[];
}

const termExplain: Record<string, string> = {
  ENTRY: 'The price to open the trade.',
  STOP: 'Exit price if the trade goes against you — limits your loss.',
  TP1: 'First profit target — consider taking some profits here.',
  TP2: 'Second profit target — the full move if the trend continues.',
  'R:R': 'Risk-to-Reward ratio. Higher is better — e.g., 3.0 means you could gain 3× what you risk.',
};

export default function TradeSetupPanel({ setups }: Props) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-foreground font-semibold text-sm">Trade Setups</h3>
        <p className="text-[11px] text-muted-foreground mt-1">
          Two possible trades based on current support & resistance levels. The one with the <span className="text-primary font-semibold">BIAS</span> tag is favoured by the current trend. <strong>Long</strong> = bet the price goes up. <strong>Short</strong> = bet the price goes down.
        </p>
      </div>
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
              <div className="flex items-center justify-between mb-1">
                <span className={`text-sm font-bold uppercase ${accentClass}`}>
                  {isLong ? '▲ LONG' : '▼ SHORT'}
                </span>
                {setup.bias && (
                  <span className="text-xs px-2 py-0.5 rounded bg-primary/15 text-primary font-mono">BIAS</span>
                )}
              </div>
              <p className="text-[10px] text-muted-foreground/70 mb-3">
                {isLong ? 'Buy now, sell later at a higher price for profit.' : 'Borrow & sell now, buy back cheaper later for profit (advanced).'}
              </p>

              <div className="space-y-2 font-mono text-sm">
                {[
                  { label: 'ENTRY', value: setup.entry, color: 'text-foreground' },
                  { label: 'STOP', value: setup.stop, color: 'text-negative' },
                  { label: 'TP1', value: setup.tp1, color: 'text-positive' },
                  { label: 'TP2', value: setup.tp2, color: 'text-positive' },
                ].map(row => (
                  <div key={row.label} className="group">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground text-xs">{row.label}</span>
                      <span className={row.color}>{fmtPrice(row.value)}</span>
                    </div>
                    <p className="text-[9px] text-muted-foreground/60 mt-0.5 hidden group-hover:block">{termExplain[row.label]}</p>
                  </div>
                ))}
                <div className="flex justify-between pt-2 border-t border-border">
                  <span className="text-muted-foreground text-xs">R:R</span>
                  <span className="text-primary font-bold">{setup.riskReward.toFixed(2)}</span>
                </div>
                <p className="text-[9px] text-muted-foreground/60">{termExplain['R:R']}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
