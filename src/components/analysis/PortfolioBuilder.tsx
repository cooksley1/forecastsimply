import { useState, useMemo } from 'react';
import type { RiskProfile } from '@/components/charts/ChartControls';
import { getRiskMeta, type RiskLevel } from '@/components/charts/ChartControls';
import { fmtPrice } from '@/utils/format';
import { Info, Target, TrendingUp } from 'lucide-react';

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
  expectedReturn: number; // annual %
}

const PORTFOLIOS: Record<RiskProfile, Allocation[]> = {
  conservative: [
    { name: 'S&P 500 ETF', ticker: 'VOO', percent: 40, type: 'etfs', reason: 'Broad US market exposure, low fees', expectedReturn: 8 },
    { name: 'Bond ETF', ticker: 'BND', percent: 30, type: 'etfs', reason: 'Steady income, low volatility', expectedReturn: 4 },
    { name: 'Gold ETF', ticker: 'GLD', percent: 15, type: 'etfs', reason: 'Inflation hedge, safe haven', expectedReturn: 5 },
    { name: 'Bitcoin', ticker: 'BTC', percent: 10, type: 'crypto', reason: 'Small crypto exposure for growth', expectedReturn: 15 },
    { name: 'Cash Reserve', ticker: 'CASH', percent: 5, type: 'etfs', reason: 'Emergency buffer', expectedReturn: 2 },
  ],
  'moderate-conservative': [
    { name: 'S&P 500 ETF', ticker: 'VOO', percent: 35, type: 'etfs', reason: 'Core US equities position', expectedReturn: 8 },
    { name: 'Bond ETF', ticker: 'BND', percent: 20, type: 'etfs', reason: 'Income & stability anchor', expectedReturn: 4 },
    { name: 'Gold ETF', ticker: 'GLD', percent: 10, type: 'etfs', reason: 'Inflation hedge', expectedReturn: 5 },
    { name: 'International ETF', ticker: 'VEU', percent: 15, type: 'etfs', reason: 'Global diversification', expectedReturn: 7 },
    { name: 'Bitcoin', ticker: 'BTC', percent: 15, type: 'crypto', reason: 'Moderate crypto allocation', expectedReturn: 15 },
    { name: 'Cash Reserve', ticker: 'CASH', percent: 5, type: 'etfs', reason: 'Liquidity buffer', expectedReturn: 2 },
  ],
  moderate: [
    { name: 'S&P 500 ETF', ticker: 'VOO', percent: 30, type: 'etfs', reason: 'Core US equities position', expectedReturn: 8 },
    { name: 'Nasdaq 100 ETF', ticker: 'QQQ', percent: 20, type: 'etfs', reason: 'Tech-heavy growth allocation', expectedReturn: 12 },
    { name: 'Bitcoin', ticker: 'BTC', percent: 20, type: 'crypto', reason: 'Digital gold, long-term growth', expectedReturn: 15 },
    { name: 'Ethereum', ticker: 'ETH', percent: 15, type: 'crypto', reason: 'Smart contract platform leader', expectedReturn: 18 },
    { name: 'International ETF', ticker: 'VEU', percent: 15, type: 'etfs', reason: 'Global diversification', expectedReturn: 7 },
  ],
  'moderate-aggressive': [
    { name: 'Bitcoin', ticker: 'BTC', percent: 25, type: 'crypto', reason: 'High-conviction crypto holding', expectedReturn: 15 },
    { name: 'Nasdaq 100 ETF', ticker: 'QQQ', percent: 25, type: 'etfs', reason: 'Tech growth exposure', expectedReturn: 12 },
    { name: 'Ethereum', ticker: 'ETH', percent: 20, type: 'crypto', reason: 'DeFi ecosystem leader', expectedReturn: 18 },
    { name: 'Solana', ticker: 'SOL', percent: 10, type: 'crypto', reason: 'High-speed L1 momentum', expectedReturn: 25 },
    { name: 'Small Cap Growth', ticker: 'VBK', percent: 20, type: 'etfs', reason: 'High-growth small companies', expectedReturn: 10 },
  ],
  aggressive: [
    { name: 'Bitcoin', ticker: 'BTC', percent: 30, type: 'crypto', reason: 'Highest conviction crypto asset', expectedReturn: 15 },
    { name: 'Ethereum', ticker: 'ETH', percent: 20, type: 'crypto', reason: 'DeFi & smart contract growth', expectedReturn: 18 },
    { name: 'Solana', ticker: 'SOL', percent: 15, type: 'crypto', reason: 'High-speed L1, strong momentum', expectedReturn: 25 },
    { name: 'Nasdaq 100 ETF', ticker: 'QQQ', percent: 20, type: 'etfs', reason: 'Leveraged tech exposure', expectedReturn: 12 },
    { name: 'Small Cap Growth', ticker: 'VBK', percent: 15, type: 'etfs', reason: 'High-growth small companies', expectedReturn: 10 },
  ],
};

const RISK_DETAILS: Record<RiskProfile, { label: string; desc: string; color: string; volatility: string; drawdown: string; target: string }> = {
  conservative: { label: '🛡️ Conservative', desc: 'Protect capital first, grow slowly. You prefer stability over high returns. Best for short-term goals (1-3 years) or low risk tolerance.', color: 'text-positive', volatility: '5-10%', drawdown: '5-15%', target: '5-8% p.a.' },
  'moderate-conservative': { label: '🔒 Mod-Conservative', desc: 'Mostly safe with modest growth. You can handle small dips but want reliable returns. Good for medium-term goals (3-5 years).', color: 'text-positive', volatility: '8-15%', drawdown: '10-20%', target: '8-12% p.a.' },
  moderate: { label: '⚖️ Moderate', desc: 'Balanced between safety and growth. You accept ups and downs for better long-term returns. Ideal for 5-10 year goals.', color: 'text-primary', volatility: '12-20%', drawdown: '15-30%', target: '10-18% p.a.' },
  'moderate-aggressive': { label: '📈 Mod-Aggressive', desc: 'Growth-focused with controlled risk. You can stomach significant drawdowns for higher gains. For 5-15 year horizons.', color: 'text-warning', volatility: '18-30%', drawdown: '25-40%', target: '15-25% p.a.' },
  aggressive: { label: '🔥 Aggressive', desc: 'Maximum growth, high volatility. You have a long time horizon (10+ years) and won\'t panic-sell during crashes.', color: 'text-warning', volatility: '25-50%', drawdown: '35-60%', target: '20%+ p.a.' },
};

function compoundGrowth(principal: number, annualRate: number, months: number): number {
  return principal * Math.pow(1 + annualRate / 100, months / 12);
}

export default function PortfolioBuilder({ riskProfile, riskLevel, onRiskLevelChange }: Props) {
  const [budget, setBudget] = useState(1000);
  const [goalAmount, setGoalAmount] = useState(10000);
  const [goalMonths, setGoalMonths] = useState(60);

  const allocations = PORTFOLIOS[riskProfile];
  const riskInfo = RISK_DETAILS[riskProfile];
  const meta = getRiskMeta(riskLevel);

  // Calculate weighted portfolio expected return
  const portfolioReturn = useMemo(() => {
    return allocations.reduce((sum, a) => sum + (a.percent / 100) * a.expectedReturn, 0);
  }, [allocations]);

  // Project growth
  const projectedValue = useMemo(() => compoundGrowth(budget, portfolioReturn, goalMonths), [budget, portfolioReturn, goalMonths]);

  // What return would be needed to reach goal?
  const requiredReturn = useMemo(() => {
    if (budget <= 0 || goalMonths <= 0) return 0;
    return (Math.pow(goalAmount / budget, 12 / goalMonths) - 1) * 100;
  }, [budget, goalAmount, goalMonths]);

  const goalAchievable = portfolioReturn >= requiredReturn;
  const bestCaseValue = compoundGrowth(budget, portfolioReturn * 1.5, goalMonths);
  const worstCaseValue = compoundGrowth(budget, Math.max(0, portfolioReturn * 0.3), goalMonths);

  return (
    <div className="bg-sf-card border border-border rounded-xl p-3 sm:p-4 space-y-4">
      <div>
        <h3 className="text-sm sm:text-base font-semibold text-foreground">💼 Goal-Based Portfolio Builder</h3>
        <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">Tell us your starting budget, target, and timeframe — we'll show you what's realistic.</p>
      </div>

      {/* Risk Profile with detailed explanation */}
      <div className="bg-background/50 border border-border/50 rounded-lg p-3 space-y-2">
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-muted-foreground font-mono uppercase shrink-0">Risk</span>
          <input
            type="range" min={1} max={5} step={1}
            value={riskLevel}
            onChange={e => onRiskLevelChange(Number(e.target.value) as RiskLevel)}
            className="flex-1 accent-primary"
          />
          <span className={`text-[10px] sm:text-xs font-medium shrink-0 ${riskInfo.color}`}>
            {meta.icon} {meta.label}
          </span>
        </div>
        <p className="text-[10px] sm:text-[11px] text-muted-foreground leading-relaxed">{riskInfo.desc}</p>
        <div className="grid grid-cols-3 gap-2 pt-1">
          <div className="text-center">
            <div className="text-[9px] text-muted-foreground">Expected Return</div>
            <div className="text-xs font-mono font-bold text-positive">{riskInfo.target}</div>
          </div>
          <div className="text-center">
            <div className="text-[9px] text-muted-foreground">Volatility</div>
            <div className="text-xs font-mono font-bold text-warning">{riskInfo.volatility}</div>
          </div>
          <div className="text-center">
            <div className="text-[9px] text-muted-foreground">Max Drawdown</div>
            <div className="text-xs font-mono font-bold text-negative">{riskInfo.drawdown}</div>
          </div>
        </div>
      </div>

      {/* Goal inputs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="text-[10px] text-muted-foreground font-mono block mb-1">STARTING BUDGET</label>
          <div className="relative">
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
            <input
              type="number" value={budget}
              onChange={e => setBudget(Math.max(0, Number(e.target.value)))}
              className="w-full bg-background border border-border rounded-lg pl-6 pr-2 py-1.5 text-xs font-mono text-foreground focus:border-primary focus:outline-none"
            />
          </div>
        </div>
        <div>
          <label className="text-[10px] text-muted-foreground font-mono block mb-1">TARGET AMOUNT</label>
          <div className="relative">
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
            <input
              type="number" value={goalAmount}
              onChange={e => setGoalAmount(Math.max(0, Number(e.target.value)))}
              className="w-full bg-background border border-border rounded-lg pl-6 pr-2 py-1.5 text-xs font-mono text-foreground focus:border-primary focus:outline-none"
            />
          </div>
        </div>
        <div>
          <label className="text-[10px] text-muted-foreground font-mono block mb-1">TIMEFRAME (MONTHS)</label>
          <input
            type="number" value={goalMonths} min={1} max={360}
            onChange={e => setGoalMonths(Math.max(1, Math.min(360, Number(e.target.value))))}
            className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-xs font-mono text-foreground focus:border-primary focus:outline-none"
          />
        </div>
      </div>

      {/* Goal feasibility verdict */}
      <div className={`rounded-lg p-3 border ${goalAchievable ? 'bg-positive/5 border-positive/20' : 'bg-warning/5 border-warning/20'}`}>
        <div className="flex items-start gap-2">
          <Target className={`w-4 h-4 mt-0.5 shrink-0 ${goalAchievable ? 'text-positive' : 'text-warning'}`} />
          <div className="space-y-1">
            {goalAchievable ? (
              <>
                <p className="text-xs font-semibold text-positive">✅ Goal is achievable!</p>
                <p className="text-[10px] sm:text-[11px] text-muted-foreground leading-relaxed">
                  Starting with <strong className="text-foreground">{fmtPrice(budget)}</strong> at your <strong className="text-foreground">{meta.label}</strong> risk level, 
                  you could reach approximately <strong className="text-positive">{fmtPrice(projectedValue)}</strong> in {goalMonths} months 
                  ({(goalMonths / 12).toFixed(1)} years) based on a projected annual return of <strong className="text-foreground">{portfolioReturn.toFixed(1)}%</strong>.
                </p>
              </>
            ) : (
              <>
                <p className="text-xs font-semibold text-warning">⚠️ Goal requires {requiredReturn.toFixed(1)}% annual returns</p>
                <p className="text-[10px] sm:text-[11px] text-muted-foreground leading-relaxed">
                  To grow <strong className="text-foreground">{fmtPrice(budget)}</strong> to <strong className="text-foreground">{fmtPrice(goalAmount)}</strong> in {goalMonths} months 
                  requires <strong className="text-negative">{requiredReturn.toFixed(1)}% p.a.</strong> — your current {meta.label} portfolio projects about <strong className="text-foreground">{portfolioReturn.toFixed(1)}% p.a.</strong>
                </p>
                <p className="text-[10px] text-muted-foreground">
                  <strong className="text-foreground">Best realistic scenario:</strong> Starting at {fmtPrice(budget)} with {meta.label} risk, you could reach approximately <strong className="text-positive">{fmtPrice(bestCaseValue)}</strong> (best case) 
                  or <strong className="text-warning">{fmtPrice(worstCaseValue)}</strong> (worst case) in {goalMonths} months.
                  {requiredReturn > 30 && ' Consider increasing your budget, extending your timeframe, or accepting a higher risk level.'}
                </p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Projected outcomes */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-negative/5 rounded-lg p-2 text-center border border-negative/10">
          <div className="text-[9px] text-muted-foreground">Worst Case</div>
          <div className="text-sm font-mono font-bold text-negative">{fmtPrice(worstCaseValue)}</div>
          <div className="text-[9px] text-muted-foreground">{goalMonths}mo</div>
        </div>
        <div className="bg-primary/5 rounded-lg p-2 text-center border border-primary/10">
          <div className="text-[9px] text-muted-foreground">Expected</div>
          <div className="text-sm font-mono font-bold text-primary">{fmtPrice(projectedValue)}</div>
          <div className="text-[9px] text-muted-foreground">{goalMonths}mo</div>
        </div>
        <div className="bg-positive/5 rounded-lg p-2 text-center border border-positive/10">
          <div className="text-[9px] text-muted-foreground">Best Case</div>
          <div className="text-sm font-mono font-bold text-positive">{fmtPrice(bestCaseValue)}</div>
          <div className="text-[9px] text-muted-foreground">{goalMonths}mo</div>
        </div>
      </div>

      {/* Recommended allocations */}
      <div>
        <div className="flex items-center gap-1.5 mb-2">
          <TrendingUp className="w-3.5 h-3.5 text-primary" />
          <h4 className="text-xs font-semibold text-foreground">Recommended Portfolio</h4>
          <span className="text-[9px] text-muted-foreground">({portfolioReturn.toFixed(1)}% projected annual return)</span>
        </div>
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
                    <span className="text-[9px] font-mono text-positive">~{a.expectedReturn}% p.a.</span>
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
      </div>

      {/* Total */}
      <div className="flex justify-between items-center pt-2 border-t border-border">
        <span className="text-xs text-muted-foreground">Total Investment</span>
        <span className="text-sm font-mono font-semibold text-foreground">{fmtPrice(budget)}</span>
      </div>

      <div className="flex items-start gap-1.5 bg-muted/30 rounded-md p-2">
        <Info className="w-3 h-3 text-primary mt-0.5 shrink-0" />
        <p className="text-[9px] text-muted-foreground/70 italic leading-relaxed">
          Projections are based on historical average returns and are not guaranteed. Past performance doesn't guarantee future results. 
          "Worst case" uses 30% of the expected return; "Best case" uses 150%. Actual returns may differ significantly. This is not financial advice.
        </p>
      </div>
    </div>
  );
}
