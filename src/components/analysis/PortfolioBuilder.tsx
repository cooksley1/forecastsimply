import { useState } from 'react';
import type { RiskProfile } from '@/components/charts/ChartControls';
import { fmtPrice } from '@/utils/format';

interface Props {
  riskProfile: RiskProfile;
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
  moderate: [
    { name: 'S&P 500 ETF', ticker: 'VOO', percent: 30, type: 'etfs', reason: 'Core US equities position' },
    { name: 'Nasdaq 100 ETF', ticker: 'QQQ', percent: 20, type: 'etfs', reason: 'Tech-heavy growth allocation' },
    { name: 'Bitcoin', ticker: 'BTC', percent: 20, type: 'crypto', reason: 'Digital gold, long-term growth' },
    { name: 'Ethereum', ticker: 'ETH', percent: 15, type: 'crypto', reason: 'Smart contract platform leader' },
    { name: 'International ETF', ticker: 'VEU', percent: 15, type: 'etfs', reason: 'Global diversification' },
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
  conservative: { label: '🛡️ Conservative', desc: 'Focus on capital preservation with steady growth. Target: 5-10% annual returns.', color: 'text-positive' },
  moderate: { label: '⚖️ Moderate', desc: 'Balanced approach mixing stability with growth. Target: 10-20% annual returns.', color: 'text-primary' },
  aggressive: { label: '🔥 Aggressive', desc: 'Maximum growth potential, higher volatility. Target: 20%+ annual returns.', color: 'text-warning' },
};

export default function PortfolioBuilder({ riskProfile }: Props) {
  const [budget, setBudget] = useState(1000);
  const allocations = PORTFOLIOS[riskProfile];
  const profile = PROFILE_LABELS[riskProfile];

  return (
    <div className="bg-sf-card border border-border rounded-xl p-3 sm:p-4 space-y-4">
      <div>
        <h3 className="text-sm sm:text-base font-semibold text-foreground">💼 Portfolio Builder</h3>
        <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
          Suggested allocation based on your <span className={profile.color}>{profile.label}</span> profile. {profile.desc}
        </p>
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
        {allocations.map((a, i) => {
          const dollarAmount = budget * a.percent / 100;
          return (
            <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-background/50 border border-border/50">
              {/* Percent bar */}
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
