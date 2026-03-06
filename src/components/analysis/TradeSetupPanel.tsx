import { Play, Info } from 'lucide-react';
import type { TradeSetup } from '@/types/analysis';
import { fmtPrice } from '@/utils/format';

interface Props {
  setups: TradeSetup[];
  onSimulateSetup?: (setup: TradeSetup) => void;
  activeSetupSimulations?: Set<string>; // 'long' | 'short'
}

const termExplain: Record<string, string> = {
  ENTRY: 'The price to open the trade.',
  STOP: 'Exit price if the trade goes against you — limits your loss.',
  TP1: 'First profit target — consider taking some profits here.',
  TP2: 'Second profit target — the full move if the trend continues.',
  'R:R': 'Risk-to-Reward ratio. Higher is better — e.g., 3.0 means you could gain 3× what you risk.',
};

export default function TradeSetupPanel({ setups, onSimulateSetup, activeSetupSimulations }: Props) {
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
          const borderColor = isLong ? 'border-fs-green/40' : 'border-fs-red/40';
          const glowClass = isLong ? 'glow-green' : 'glow-red';
          const accentClass = isLong ? 'text-positive' : 'text-negative';
          const isSimulating = activeSetupSimulations?.has(setup.type);

          // Calculate P&L percentages
          const tp1Pct = ((setup.tp1 - setup.entry) / setup.entry * 100);
          const tp2Pct = ((setup.tp2 - setup.entry) / setup.entry * 100);
          const riskPct = ((setup.entry - setup.stop) / setup.entry * 100);

          return (
            <div
              key={setup.type}
              className={`bg-sf-card border-2 ${borderColor} rounded-xl p-3 sm:p-4 ${setup.bias ? glowClass : 'opacity-70'}`}
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
                  { label: 'STOP', value: setup.stop, color: 'text-negative', pct: `-${Math.abs(riskPct).toFixed(1)}%` },
                  { label: 'TP1', value: setup.tp1, color: 'text-positive', pct: `${tp1Pct >= 0 ? '+' : ''}${tp1Pct.toFixed(1)}%` },
                  { label: 'TP2', value: setup.tp2, color: 'text-positive', pct: `${tp2Pct >= 0 ? '+' : ''}${tp2Pct.toFixed(1)}%` },
                ].map(row => (
                  <div key={row.label} className="group">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground text-xs">{row.label}</span>
                      <div className="flex items-center gap-2">
                        {row.pct && <span className={`text-[10px] ${row.color}`}>{row.pct}</span>}
                        <span className={row.color}>{fmtPrice(row.value)}</span>
                      </div>
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

              {/* Simulate button */}
              {onSimulateSetup && (
                <div className="mt-3 pt-3 border-t border-border/50">
                  {isSimulating ? (
                    <div className="flex items-center gap-1.5 text-[10px] text-primary/70">
                      <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                      <span className="font-medium">Simulation active — tracking in watchlist</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => onSimulateSetup(setup)}
                      className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-medium bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-all"
                    >
                      <Play className="w-3 h-3" />
                      Simulate {isLong ? 'Long' : 'Short'} Setup
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
