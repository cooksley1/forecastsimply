import { useState } from 'react';
import type { RiskProfile } from '@/components/charts/ChartControls';
import { getRiskMeta, type RiskLevel } from '@/components/charts/ChartControls';
import { fmtPrice } from '@/utils/format';

interface Props {
  riskProfile: RiskProfile;
  riskLevel: RiskLevel;
  onRiskLevelChange: (level: RiskLevel) => void;
}

interface Allocation {
  name: string;
  ticker: string;
  percent: number;
  type: 'crypto' | 'stocks' | 'etfs' | 'forex';
  reason: string;
}

const PORTFOLIOS: Record<RiskProfile, Allocation[]> = {
  conservative: [
    { name: 'S&P 500 ETF', ticker: 'VOO', percent: 40, type: 'etfs', reason: 'Broad US market exposure, low fees' },
    { name: 'Bond ETF', ticker: 'BND', percent: 30, type: 'etfs', reason: 'Steady income, low volatility' },
    { name: 'Gold ETF', ticker: 'GLD', percent: 15, type: 'etfs', reason: 'Inflation hedge, safe haven' },
    { name: 'Bitcoin', ticker: 'BTC', percent: 10, type: 'crypto', reason: 'Small crypto exposure for growth' },
    { name: 'Cash Reserve', ticker: 'CASH', percent: 5, type: 'etfs', reason: 'Emergency buffer, buying dips' },
  ],
  'moderate-conservative': [
    { name: 'S&P 500 ETF', ticker: 'VOO', percent: 35, type: 'etfs', reason: 'Core US equities position' },
    { name: 'Bond ETF', ticker: 'BND', percent: 20, type: 'etfs', reason: 'Income & stability anchor' },
    { name: 'Gold ETF', ticker: 'GLD', percent: 10, type: 'etfs', reason: 'Inflation hedge' },
    { name: 'International ETF', ticker: 'VEU', percent: 15, type: 'etfs', reason: 'Global diversification' },
    { name: 'Bitcoin', ticker: 'BTC', percent: 15, type: 'crypto', reason: 'Moderate crypto allocation' },
    { name: 'Cash Reserve', ticker: 'CASH', percent: 5, type: 'etfs', reason: 'Liquidity buffer' },
  ],
  moderate: [
    { name: 'S&P 500 ETF', ticker: 'VOO', percent: 30, type: 'etfs', reason: 'Core US equities position' },
    { name: 'Nasdaq 100 ETF', ticker: 'QQQ', percent: 20, type: 'etfs', reason: 'Tech-heavy growth allocation' },
    { name: 'Bitcoin', ticker: 'BTC', percent: 20, type: 'crypto', reason: 'Digital gold, long-term growth' },
    { name: 'Ethereum', ticker: 'ETH', percent: 15, type: 'crypto', reason: 'Smart contract platform leader' },
    { name: 'International ETF', ticker: 'VEU', percent: 15, type: 'etfs', reason: 'Global diversification' },
  ],
  'moderate-aggressive': [
    { name: 'Bitcoin', ticker: 'BTC', percent: 25, type: 'crypto', reason: 'High-conviction crypto holding' },
    { name: 'Nasdaq 100 ETF', ticker: 'QQQ', percent: 25, type: 'etfs', reason: 'Tech growth exposure' },
    { name: 'Ethereum', ticker: 'ETH', percent: 20, type: 'crypto', reason: 'DeFi ecosystem leader' },
    { name: 'Solana', ticker: 'SOL', percent: 10, type: 'crypto', reason: 'High-speed L1 momentum' },
    { name: 'Small Cap Growth', ticker: 'VBK', percent: 20, type: 'etfs', reason: 'High-growth small companies' },
  ],
  aggressive: [
    { name: 'Bitcoin', ticker: 'BTC', percent: 30, type: 'crypto', reason: 'Highest conviction crypto asset' },
    { name: 'Ethereum', ticker: 'ETH', percent: 20, type: 'crypto', reason: 'DeFi & smart contract growth' },
    { name: 'Solana', ticker: 'SOL', percent: 15, type: 'crypto', reason: 'High-speed L1, strong momentum' },
    { name: 'Nasdaq 100 ETF', ticker: 'QQQ', percent: 20, type: 'etfs', reason: 'Leveraged tech exposure' },
    { name: 'Small Cap Growth', ticker: 'VBK', percent: 15, type: 'etfs', reason: 'High-growth small companies' },
  ],
};

const PROFILE_LABELS: Record<RiskProfile, { label: string; desc: string; color: string }> = {
  conservative: { label: '🛡️ Conservative', desc: 'Capital preservation, steady growth. Target: 5-8% p.a.', color: 'text-positive' },
  'moderate-conservative': { label: '🔒 Mod-Conservative', desc: 'Stability-first with measured growth. Target: 8-12% p.a.', color: 'text-positive' },
  moderate: { label: '⚖️ Moderate', desc: 'Balanced stability & growth. Target: 10-18% p.a.', color: 'text-primary' },
  'moderate-aggressive': { label: '📈 Mod-Aggressive', desc: 'Growth-focused, controlled risk. Target: 15-25% p.a.', color: 'text-warning' },
  aggressive: { label: '🔥 Aggressive', desc: 'Max growth, higher volatility. Target: 20%+ p.a.', color: 'text-warning' },
};

export default function PortfolioBuilder({ riskProfile, riskLevel, onRiskLevelChange }: Props) {
  const [budget, setBudget] = useState(1000);
  const allocations = PORTFOLIOS[riskProfile];
  const profile = PROFILE_LABELS[riskProfile];
  const meta = getRiskMeta(riskLevel);

  return (
    <div className="bg-sf-card border border-border rounded-xl p-3 sm:p-4 space-y-4">
      <div>
        <h3 className="text-sm sm:text-base font-semibold text-foreground">💼 Portfolio Builder</h3>
        <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">{profile.desc}</p>
      </div>

      {/* Risk slider inline */}
      <div className="flex items-center gap-3 bg-background/50 border border-border/50 rounded-lg p-2.5">
        <span className="text-[10px] text-muted-foreground font-mono uppercase shrink-0">Risk</span>
        <input
          type="range"
          min={1}
          max={5}
          step={1}
          value={riskLevel}
          onChange={e => onRiskLevelChange(Number(e.target.value) as RiskLevel)}
          className="flex-1 accent-primary"
        />
        <span className={`text-[10px] sm:text-xs font-medium shrink-0 ${profile.color}`}>
          {meta.icon} {meta.label}
        </span>
      </div>

      {/* Budget input */}
      <div className="flex items-center gap-3">
        <label className="text-[10px] sm:text-xs text-muted-foreground font-mono shrink-0">BUDGET</label>
        <div className="relative flex-1 max-w-[200px]">
          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
          <input
            type="number"
            value={budget}
            onChange={e => setBudget(Math.max(0, Number(e.target.value)))}
            className="w-full bg-background border border-border rounded-lg pl-6 pr-2 py-1.5 text-xs font-mono text-foreground focus:border-primary focus:outline-none"
          />
        </div>
      </div>

      {/* Allocations */}
      <div className="space-y-2">
        {allocations.map((a) => {
          const dollarAmount = budget * a.percent / 100;
          return (
            <div key={a.name} className="flex items-center gap-3 p-2 rounded-lg bg-background/50 border border-border/50">
              <div className="w-10 shrink-0">
                <div className="text-[10px] font-mono text-primary text-center">{a.percent}%</div>
                <div className="h-1 bg-border rounded-full overflow-hidden mt-0.5">
                  <div className="h-full bg-primary rounded-full" style={{ width: `${a.percent}%` }} />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-medium text-foreground">{a.name}</span>
                  <span className="text-[9px] font-mono text-muted-foreground bg-muted/50 px-1 rounded">{a.ticker}</span>
                </div>
                <p className="text-[9px] text-muted-foreground/70 truncate">{a.reason}</p>
              </div>
              <div className="text-xs font-mono text-foreground shrink-0">
                {fmtPrice(dollarAmount)}
              </div>
            </div>
          );
        })}
      </div>

      {/* Total */}
      <div className="flex justify-between items-center pt-2 border-t border-border">
        <span className="text-xs text-muted-foreground">Total</span>
        <span className="text-sm font-mono font-semibold text-foreground">{fmtPrice(budget)}</span>
      </div>

      <p className="text-[9px] text-muted-foreground/70 italic">
        ⚠️ This is a suggested starting point, not financial advice. Adjust based on your research and financial situation.
      </p>
    </div>
  );
}
