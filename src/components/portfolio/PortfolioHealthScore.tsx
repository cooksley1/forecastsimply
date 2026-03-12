import { useMemo } from 'react';
import { ShieldCheck, AlertTriangle, TrendingUp } from 'lucide-react';

interface CacheData {
  signal_score: number | null;
  signal_label: string | null;
  confidence: number | null;
  market_phase: string | null;
  forecast_return_pct: number | null;
}

interface EnrichedHolding {
  asset_id: string;
  symbol: string;
  asset_type: string;
  quantity: number;
  avg_price: number;
  cache: CacheData | undefined;
  currentPrice: number;
  pnl: number | null;
}

interface Props {
  holdings: EnrichedHolding[];
}

export default function PortfolioHealthScore({ holdings }: Props) {
  const health = useMemo(() => {
    if (holdings.length === 0) return null;

    const withCache = holdings.filter(h => h.cache);
    if (withCache.length === 0) return { score: 0, label: 'No data', color: 'text-muted-foreground', issues: ['Run analysis on your holdings to get a health score'] };

    let score = 50; // Start at neutral
    const issues: string[] = [];
    const positives: string[] = [];

    // 1. Signal strength (0-30 pts)
    const avgSignal = withCache.reduce((s, h) => s + (h.cache?.signal_score ?? 0), 0) / withCache.length;
    const signalPts = Math.min(30, avgSignal * 3);
    score += signalPts - 15; // Center around 0

    // 2. Diversification (0-20 pts)
    const types = new Set(holdings.map(h => h.asset_type));
    const diversePts = Math.min(20, types.size * 7);
    score += diversePts - 7;
    if (types.size === 1) issues.push(`All holdings are ${holdings[0].asset_type} — consider diversifying`);
    else positives.push(`Diversified across ${types.size} asset classes`);

    // 3. P&L health (0-20 pts)
    const avgPnl = holdings.filter(h => h.pnl !== null).reduce((s, h) => s + (h.pnl ?? 0), 0) / Math.max(1, holdings.filter(h => h.pnl !== null).length);
    if (avgPnl > 10) { score += 15; positives.push(`Portfolio up ${avgPnl.toFixed(1)}% on average`); }
    else if (avgPnl > 0) { score += 8; }
    else if (avgPnl > -10) { score -= 5; issues.push(`Portfolio down ${Math.abs(avgPnl).toFixed(1)}% on average`); }
    else { score -= 15; issues.push(`Significant losses: ${avgPnl.toFixed(1)}% average`); }

    // 4. Sell signals (risk flag)
    const sellCount = withCache.filter(h => h.cache?.signal_label?.toLowerCase().includes('sell')).length;
    if (sellCount > 0) {
      score -= sellCount * 8;
      issues.push(`${sellCount} holding${sellCount > 1 ? 's' : ''} with sell signals — review these positions`);
    }

    // 5. Forecast outlook
    const avgForecast = withCache.reduce((s, h) => s + (h.cache?.forecast_return_pct ?? 0), 0) / withCache.length;
    if (avgForecast > 5) { score += 10; positives.push(`Positive forecast outlook: +${avgForecast.toFixed(1)}%`); }
    else if (avgForecast < -5) { score -= 10; issues.push(`Negative forecast outlook: ${avgForecast.toFixed(1)}%`); }

    // Clamp
    score = Math.max(0, Math.min(100, Math.round(score)));

    const label = score >= 75 ? 'Strong' : score >= 50 ? 'Moderate' : score >= 25 ? 'Weak' : 'At Risk';
    const color = score >= 75 ? 'text-positive' : score >= 50 ? 'text-warning' : 'text-destructive';

    return { score, label, color, issues, positives };
  }, [holdings]);

  if (!health) return null;

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-primary" />
          <span className="text-sm font-bold text-foreground">Portfolio Health</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-lg font-bold font-mono ${health.color}`}>{health.score}</span>
          <span className={`text-[10px] font-semibold ${health.color}`}>{health.label}</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            health.score >= 75 ? 'bg-positive' : health.score >= 50 ? 'bg-warning' : 'bg-destructive'
          }`}
          style={{ width: `${health.score}%` }}
        />
      </div>

      {/* Issues + positives */}
      <div className="space-y-1">
        {health.positives?.map((p, i) => (
          <div key={i} className="flex items-start gap-1.5 text-[10px] text-positive">
            <TrendingUp className="w-3 h-3 mt-0.5 shrink-0" />
            <span>{p}</span>
          </div>
        ))}
        {health.issues.map((issue, i) => (
          <div key={i} className="flex items-start gap-1.5 text-[10px] text-warning">
            <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
            <span>{issue}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
