import { Clock, Sparkles, CheckCircle, Circle } from 'lucide-react';
import SEO from '@/components/SEO';
import BackToHome from '@/components/BackToHome';

interface ChangelogEntry {
  version: string;
  date: string;
  title: string;
  items: string[];
  type: 'released' | 'upcoming';
}

const CHANGELOG: ChangelogEntry[] = [
  {
    version: '1.7', date: 'March 2026', title: '15-Indicator Engine & Cross-Timeframe', type: 'released',
    items: [
      '15-indicator signal scoring: added Market Structure (BOS/CHoCH), Supply/Demand Zones, Fibonacci Levels, and Volume Profile',
      'Cross-timeframe signal consistency — short-term signals dampened when longer timeframes disagree',
      'Expanded score range (±15) with recalibrated thresholds (Strong Buy ≥8, Buy ≥4, Sell ≤-4, Strong Sell ≤-8)',
      'Daily analysis cron upgraded to full 15-indicator engine with cross-timeframe dampening',
      'Best Pick Finder and screeners now use same 15-indicator scoring as live analysis',
      'New Glossary entries: BOS, CHoCH, Supply/Demand Zones, Fibonacci Levels, Volume Profile, Cross-Timeframe',
    ],
  },
  {
    version: '1.6', date: 'March 2026', title: 'AI Case Studies & Blog', type: 'released',
    items: [
      'AI-powered case study generation for completed picks using Gemini 2.5 Flash',
      'Collapsible case study view on Scorecard with "Read full analysis" toggle',
      'New Insights & Analysis blog hub with category and type filters',
      'How It Works page explaining signal scoring and forecast methodology',
      'Country preference in account settings — auto-sets exchange, currency, and content',
      'Filter criteria explainers on all screener sort modes',
    ],
  },
  {
    version: '1.5', date: 'March 2026', title: 'Proof of Performance', type: 'released',
    items: [
      'Monthly auto-locking of top picks per asset class (crypto, stocks, ETFs)',
      'Daily price snapshots with 5 forecast model tracking',
      'Live Performance Tracker on homepage with sparkline bars',
      'Full Scorecard page with win rate, returns, and forecast accuracy comparison',
      'Stablecoin exclusion filter for crypto picks',
      'Fallback universe for stocks/ETFs when APIs timeout',
    ],
  },
  {
    version: '1.4', date: 'February 2026', title: 'Global Exchange Screening', type: 'released',
    items: [
      'Support for ASX, NYSE, NASDAQ, LSE, HKG, and JPX exchanges',
      'S&P/ASX 200 subgroup filtering',
      'Signal-based ranking with projected returns and peak-timing caveats',
      'Best Buys, Sells/Avoid, Highest Yield, and Growth filter categories',
      'Top 500 Cryptocurrencies screening by market cap',
    ],
  },
  {
    version: '1.3', date: 'February 2026', title: 'Market Digests & Alerts', type: 'released',
    items: [
      'Weekly AI-curated market digest emails per asset class',
      'Push notification alerts for price targets',
      'Granular newsletter subscription management',
      'Market/region selection for digest content',
    ],
  },
  {
    version: '1.2', date: 'January 2026', title: 'Ensemble Forecasting', type: 'released',
    items: [
      'Ensemble forecast model: Linear Reg 52%, Holt DES 29%, EMA Momentum 19%',
      'RSI/Price divergence detection for reversal signals',
      'Momentum capping at ±15% with 0.6x dampening',
      'Confidence band widening (1.67x) for 70% empirical capture',
    ],
  },
  {
    version: '1.8', date: 'Q2 2026', title: 'AI Blog Generation', type: 'upcoming',
    items: [
      'Auto-generated weekly market roundups from tracked data',
      'Country-specific content (ASX highlights for AU users, etc.)',
      'Published case studies from completed monthly picks',
      'Educational guide series on technical analysis',
    ],
  },
  {
    version: '1.9', date: 'Q2 2026', title: 'Portfolio Builder v2', type: 'upcoming',
    items: [
      'Multi-asset portfolio simulation with rebalancing',
      'Correlation matrix and diversification scoring',
      'Risk-adjusted return projections',
    ],
  },
];

export default function Changelog() {
  const released = CHANGELOG.filter(e => e.type === 'released');
  const upcoming = CHANGELOG.filter(e => e.type === 'upcoming');

  return (
    <div className="min-h-screen bg-background">
      <SEO title="Changelog & Roadmap — ForecastSimply" description="See what's new and what's coming next. Full transparency on features, improvements, and our product roadmap." />

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
        <BackToHome />

        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <Clock className="w-6 h-6 text-primary" />
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Changelog & Roadmap</h1>
          </div>
          <p className="text-sm text-muted-foreground">What we've shipped and what's coming next.</p>
        </div>

        {/* Upcoming */}
        {upcoming.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" /> Coming Soon
            </h2>
            {upcoming.map(entry => (
              <div key={entry.version} className="bg-primary/5 border border-primary/20 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-primary">v{entry.version} — {entry.title}</span>
                  <span className="text-[10px] text-muted-foreground">{entry.date}</span>
                </div>
                <ul className="space-y-1">
                  {entry.items.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                      <Circle className="w-3 h-3 text-primary/50 shrink-0 mt-0.5" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}

        {/* Released */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-positive" /> Released
          </h2>
          {released.map(entry => (
            <div key={entry.version} className="bg-card border border-border rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground">v{entry.version} — {entry.title}</span>
                <span className="text-[10px] text-muted-foreground">{entry.date}</span>
              </div>
              <ul className="space-y-1">
                {entry.items.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                    <CheckCircle className="w-3 h-3 text-positive/60 shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
