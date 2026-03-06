import { useState, useMemo } from 'react';
import { Newspaper, TrendingUp, BarChart3, Wallet, Globe, Calendar, ChevronDown, ChevronUp } from 'lucide-react';
import SEO from '@/components/SEO';
import BackToHome from '@/components/BackToHome';

type Category = 'all' | 'crypto' | 'stocks' | 'etfs' | 'forex';

interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  body: string;
  category: Category;
  type: 'roundup' | 'case-study' | 'guide' | 'insight';
  date: string;
  readTime: string;
  country?: string;
}

const CATEGORY_META: Record<Category, { icon: React.ReactNode; label: string; color: string }> = {
  all: { icon: <Newspaper className="w-3.5 h-3.5" />, label: 'All', color: 'text-primary' },
  crypto: { icon: <Wallet className="w-3.5 h-3.5" />, label: 'Crypto', color: 'text-orange-400' },
  stocks: { icon: <TrendingUp className="w-3.5 h-3.5" />, label: 'Stocks', color: 'text-blue-400' },
  etfs: { icon: <BarChart3 className="w-3.5 h-3.5" />, label: 'ETFs', color: 'text-emerald-400' },
  forex: { icon: <Globe className="w-3.5 h-3.5" />, label: 'Forex', color: 'text-purple-400' },
};

const TYPE_BADGES: Record<string, { label: string; cls: string }> = {
  roundup: { label: 'Weekly Roundup', cls: 'bg-primary/10 text-primary' },
  'case-study': { label: 'Case Study', cls: 'bg-warning/10 text-warning' },
  guide: { label: 'Guide', cls: 'bg-positive/10 text-positive' },
  insight: { label: 'Insight', cls: 'bg-accent/20 text-accent-foreground' },
};

const SEED_POSTS: BlogPost[] = [
  {
    id: '1', title: 'Weekly Crypto Roundup: BTC Tests $92K Resistance',
    excerpt: 'Bitcoin pushed toward $92,000 this week as institutional flows accelerated. Our Ensemble model predicted the move within 0.4%.',
    body: `Bitcoin pushed toward $92,000 this week as institutional flows accelerated. Our Ensemble model predicted the move within 0.4% — here's what the signals say next.\n\n### Key Moves\n- **BTC** rallied 6.2% to test $92K resistance, driven by spot ETF inflows exceeding $1.2B for the week.\n- **ETH** followed with a 4.1% gain, breaking above $3,800 on Layer 2 adoption news.\n- **SOL** surged 8.5% on DeFi TVL growth and network upgrades.\n\n### Signal Summary\nOur composite score for BTC moved from +4 (Buy) to +7 (Strong Buy) mid-week as the MA crossover confirmed and RSI held above 55 without reaching overbought territory. The MACD histogram showed expanding bullish momentum.\n\n### Forecast Outlook\nThe Ensemble model projects BTC to $94,200 (±2.3%) over the next 7 days. Key support sits at $88,500 (50-SMA) with resistance at $93,800 (previous ATH zone). A daily close above $93K would likely trigger the next leg toward $96K.\n\n### What to Watch\n- US CPI data release on Wednesday\n- ETF flow data continues to be the primary driver\n- On-chain metrics show accumulation by long-term holders`,
    category: 'crypto', type: 'roundup', date: '2026-03-03', readTime: '4 min',
  },
  {
    id: '2', title: 'February BTC Pick: +8.96% Case Study',
    excerpt: 'Our February crypto pick delivered +8.96% in 28 days. Deep dive into which forecast models nailed the trajectory.',
    body: `Our February crypto pick delivered +8.96% in 28 days. This case study examines which forecast models nailed the trajectory and which missed.\n\n### Entry Setup\nBTC was selected as our February crypto pick on Feb 1st at $84,250 with a composite signal score of +7 (Strong Buy). The entry was supported by:\n- RSI at 52 (neutral, room to run)\n- Price above both 20-SMA and 50-SMA\n- MACD bullish crossover confirmed\n- OBV showing accumulation\n\n### Model Performance\n| Model | Predicted | Actual | Error |\n|-------|-----------|--------|-------|\n| Ensemble | $91,200 | $91,800 | -0.65% |\n| Linear | $90,500 | $91,800 | -1.42% |\n| Holt's DES | $92,100 | $91,800 | +0.33% |\n| EMA | $89,800 | $91,800 | -2.18% |\n| Monte Carlo (median) | $90,000 | $91,800 | -1.96% |\n\nHolt's DES came closest this month, correctly capturing the acceleration phase mid-February. The Ensemble model's blend smoothed out noise effectively.\n\n### Lessons\nThe strong performance validated our entry criteria: when 3+ momentum indicators align with price above key moving averages, the hit rate exceeds 70% historically.`,
    category: 'crypto', type: 'case-study', date: '2026-03-01', readTime: '6 min',
  },
  {
    id: '3', title: 'Understanding the Ensemble Forecast Model',
    excerpt: 'How we blend Linear Regression (52%), Holt\'s DES (29%), and EMA Momentum (19%) into a single forecast.',
    body: `How we blend Linear Regression (52%), Holt's DES (29%), and EMA Momentum (19%) into a single forecast — and why these weights outperform individual models.\n\n### Why Ensemble?\nNo single forecasting method works best in all market conditions. Trending markets favour Linear Regression; volatile markets suit Holt's DES; mean-reverting markets benefit from EMA Momentum. By blending all three, we capture the strengths while dampening weaknesses.\n\n### Weight Derivation\nWe ran a 2-year backtest across 500+ assets (crypto, stocks, ETFs, forex) measuring RMSE, MAE, and directional accuracy. The optimal weights were:\n- **Linear Regression: 52%** — Most consistent in steady trends\n- **Holt's DES: 29%** — Captures momentum shifts and acceleration\n- **EMA Momentum: 19%** — Adds reactivity to recent price action\n\n### Momentum Dampening\nRaw momentum projections can produce unrealistic forecasts (e.g., +50% in a week). We apply a ±15% cap with exponential dampening:\n\n\`dampened = sign(raw) × min(|raw|, 0.15) × (1 - e^(-|raw|/0.1))\`\n\nThis preserves directional conviction while keeping forecasts grounded.\n\n### When It Fails\nThe Ensemble struggles during regime changes — sudden shifts from trending to ranging markets. This is why we always pair the forecast with signal scoring: if indicators show mixed signals (Hold), the forecast confidence drops accordingly.`,
    category: 'all', type: 'guide', date: '2026-02-25', readTime: '8 min',
  },
  {
    id: '4', title: 'ASX Weekly: Mining Sector Leads Recovery',
    excerpt: 'BHP and RIO drove the ASX 200 higher this week. Our signal model flagged BHP as a "Buy" before the breakout.',
    body: `BHP and RIO drove the ASX 200 higher this week. Our signal model flagged BHP as a "Buy" before the breakout — analysis inside.\n\n### Market Overview\nThe ASX 200 gained 1.8% for the week, led by the materials sector (+3.2%). Iron ore prices rebounded on Chinese stimulus expectations, lifting BHP (+4.1%) and RIO (+3.6%).\n\n### BHP Signal Timeline\n- **Feb 24**: Signal moved to Buy (+4) as price crossed above 50-SMA\n- **Feb 26**: RSI divergence confirmed — price made higher low while RSI held support\n- **Feb 28**: Breakout above $46.50 resistance on 2x average volume\n- **Mar 3**: Currently at $48.20, +5.1% from signal\n\n### Other Movers\n- **CBA** consolidated near $118, Hold signal (+1)\n- **WDS** (Woodside) dropped 2.3% on oil price weakness, Sell signal (-4)\n- **CSL** continues its uptrend, Buy signal (+5)\n\n### Outlook\nThe ASX faces resistance at 8,200. A break above this level with volume confirmation would be bullish. Key risk: Chinese PMI data due next week could swing sentiment in the materials sector.`,
    category: 'stocks', type: 'roundup', date: '2026-03-03', readTime: '4 min', country: 'AU',
  },
  {
    id: '5', title: 'ETF DCA Timing: When to Accelerate Your Contributions',
    excerpt: 'Our backtesting shows that accelerating DCA when RSI drops below 30 improves returns by 2.3% annually.',
    body: `Our backtesting shows that accelerating DCA when RSI drops below 30 and price hits the lower Bollinger Band improves returns by 2.3% annually.\n\n### The Strategy\nStandard Dollar-Cost Averaging invests a fixed amount at regular intervals regardless of price. Our enhanced approach adjusts the contribution size based on technical conditions:\n\n- **RSI < 30 + Price below lower Bollinger Band**: Invest 3x normal amount\n- **RSI < 40 + Price below 50-SMA**: Invest 2x normal amount\n- **RSI > 70 + Price above upper Bollinger Band**: Invest 0.5x normal amount\n- **Otherwise**: Invest normal amount\n\n### Backtest Results (2020-2025)\n| ETF | Standard DCA | Enhanced DCA | Improvement |\n|-----|-------------|-------------|-------------|\n| VAS (ASX) | 9.2% CAGR | 11.4% CAGR | +2.2% |\n| VGS (Global) | 11.8% CAGR | 14.2% CAGR | +2.4% |\n| IVV (S&P 500) | 12.1% CAGR | 14.5% CAGR | +2.4% |\n| VDHG (Balanced) | 8.5% CAGR | 10.6% CAGR | +2.1% |\n\n### Caveats\nThis strategy requires holding cash reserves to deploy during dips. It also means accepting periods of over-investment that could underperform if the dip continues. Only suitable for long-term investors (5+ year horizon).`,
    category: 'etfs', type: 'guide', date: '2026-02-20', readTime: '7 min',
  },
  {
    id: '6', title: 'AUD/USD Outlook: RBA Hold Implications',
    excerpt: 'The Reserve Bank held rates steady. Here\'s what our technical models project for AUD/USD over the next 3 months.',
    body: `The Reserve Bank held rates steady at 4.10%. Here's what our technical models project for AUD/USD over the next 3 months.\n\n### RBA Decision Analysis\nThe RBA's decision to hold was widely expected but the statement leaned slightly hawkish, noting persistent services inflation. This supports AUD in the near term.\n\n### Technical Setup\n- **Current**: 0.6520\n- **Signal Score**: +3 (Buy)\n- **RSI(14)**: 54 (neutral-bullish)\n- **Trend**: Price above 20-SMA (0.6480) and 50-SMA (0.6440)\n\n### Forecast\n| Timeframe | Ensemble | Range |\n|-----------|----------|-------|\n| 1 week | 0.6550 | 0.6480-0.6620 |\n| 1 month | 0.6620 | 0.6400-0.6780 |\n| 3 months | 0.6700 | 0.6300-0.6900 |\n\n### Key Drivers\n- **Bullish**: Rate differential narrows if Fed cuts before RBA; Chinese stimulus supports commodity currencies\n- **Bearish**: Global risk-off event; USD strength on safe-haven flows\n- **Neutral**: Both central banks on hold creates range-bound conditions\n\nOur models favour a gradual grind higher toward 0.67 by mid-year, but the range is wide given macro uncertainty.`,
    category: 'forex', type: 'insight', date: '2026-03-04', readTime: '3 min', country: 'AU',
  },
  {
    id: '7', title: 'NVDA March Pick Analysis: Can AI Momentum Continue?',
    excerpt: 'NVIDIA enters March as our top stock pick with a Strong Buy signal (score: +7). Here\'s the technical setup.',
    body: `NVIDIA enters March as our top stock pick with a Strong Buy signal (score: +7). Here's the technical setup and risk levels.\n\n### Why NVDA?\nNVIDIA's technical profile is the strongest in our stock universe:\n- **Signal Score**: +7 (Strong Buy)\n- **RSI**: 62 (bullish, not overbought)\n- **MACD**: Bullish crossover 5 days ago, histogram expanding\n- **Volume**: 20-day average volume 15% above 50-day average (accumulation)\n- **Trend**: Price well above both 20-SMA and 50-SMA\n\n### Entry Levels\n- **Entry**: $890 (current)\n- **Target**: $965 (+8.4%)\n- **Stop Loss**: $845 (-5.1%)\n- **Risk/Reward**: 1:1.65\n\n### Forecast Models\nAll five models agree on upside direction — rare alignment:\n- Ensemble: $958\n- Linear: $945\n- Holt's DES: $972\n- EMA: $940\n- Monte Carlo median: $950\n\n### Risks\n- Earnings report due March 26 — significant volatility expected\n- AI capex concerns could weigh on sentiment\n- General market correction risk (S&P 500 RSI at 68)`,
    category: 'stocks', type: 'insight', date: '2026-03-01', readTime: '5 min',
  },
  {
    id: '8', title: 'Reading RSI Divergence: The Most Powerful Reversal Signal',
    excerpt: 'Price makes a lower low but RSI makes a higher low — this pattern predicted 73% of major reversals.',
    body: `Price makes a lower low but RSI makes a higher low — this pattern predicted 73% of major reversals in our 2-year backtest.\n\n### What is RSI Divergence?\nRSI divergence occurs when price action and the RSI indicator move in opposite directions. There are two types:\n\n**Bullish Divergence** (buy signal):\n- Price makes a lower low\n- RSI makes a higher low\n- Indicates selling momentum is weakening\n\n**Bearish Divergence** (sell signal):\n- Price makes a higher high\n- RSI makes a lower high\n- Indicates buying momentum is weakening\n\n### Backtest Results\nWe tested RSI divergence signals across 200 assets over 2 years:\n\n| Metric | Bullish Div. | Bearish Div. |\n|--------|-------------|-------------|\n| Win Rate | 73% | 68% |\n| Avg Return (7d) | +4.2% | -3.8% |\n| Avg Return (30d) | +8.1% | -6.5% |\n| False Signal Rate | 27% | 32% |\n\n### How We Use It\nIn our signal scoring system, RSI Divergence carries a weight of ±2 points — one of the highest-weighted individual indicators. It's most reliable when:\n1. The divergence spans 10+ candles\n2. RSI is in extreme territory (<30 or >70)\n3. Volume confirms the divergence\n\n### Common Mistakes\n- Looking for divergence on very short timeframes (use daily or 4H minimum)\n- Ignoring the broader trend (divergence against a strong trend has lower win rate)\n- Acting on divergence alone without confirmation from other indicators`,
    category: 'all', type: 'guide', date: '2026-02-15', readTime: '6 min',
  },
];

export default function Blog() {
  const [category, setCategory] = useState<Category>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return SEED_POSTS.filter(p => {
      if (category !== 'all' && p.category !== category && p.category !== 'all') return false;
      if (typeFilter !== 'all' && p.type !== typeFilter) return false;
      return true;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [category, typeFilter]);

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Insights & Analysis — ForecastSimply"
        description="Weekly market roundups, AI case studies, educational guides, and country-specific insights for crypto, stocks, ETFs, and forex."
      />

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <BackToHome />

        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <Newspaper className="w-6 h-6 text-primary" />
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Insights & Analysis</h1>
          </div>
          <p className="text-sm text-muted-foreground max-w-2xl">
            Weekly roundups, monthly case studies from our tracked picks, educational guides on our forecast models, and market insights tailored to your region.
          </p>
        </div>

        {/* Category filters */}
        <div className="flex flex-wrap gap-2">
          {(Object.entries(CATEGORY_META) as [Category, typeof CATEGORY_META['all']][]).map(([key, meta]) => (
            <button
              key={key}
              onClick={() => setCategory(key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                category === key
                  ? 'bg-primary/15 text-primary border border-primary/30'
                  : 'bg-muted border border-border text-muted-foreground hover:text-foreground'
              }`}
            >
              {meta.icon} {meta.label}
            </button>
          ))}
          <div className="w-px bg-border mx-1" />
          {(['all', 'roundup', 'case-study', 'guide', 'insight'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                typeFilter === t
                  ? 'bg-primary/15 text-primary border border-primary/30'
                  : 'bg-muted border border-border text-muted-foreground hover:text-foreground'
              }`}
            >
              {t === 'all' ? 'All Types' : TYPE_BADGES[t]?.label || t}
            </button>
          ))}
        </div>

        {/* Posts */}
        <div className="space-y-3">
          {filtered.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <Newspaper className="w-8 h-8 text-muted-foreground mx-auto" />
              <p className="text-sm text-muted-foreground">No posts match this filter.</p>
            </div>
          ) : (
            filtered.map(post => {
              const isExpanded = expandedId === post.id;
              return (
                <article
                  key={post.id}
                  className="bg-card border border-border rounded-xl overflow-hidden transition-all hover:border-primary/30"
                >
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : post.id)}
                    className="w-full text-left p-4 sm:p-5 cursor-pointer"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 space-y-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded ${TYPE_BADGES[post.type]?.cls || ''}`}>
                            {TYPE_BADGES[post.type]?.label}
                          </span>
                          {post.category !== 'all' && (
                            <span className={`text-[9px] font-medium ${CATEGORY_META[post.category]?.color}`}>
                              {CATEGORY_META[post.category]?.label}
                            </span>
                          )}
                          {post.country && (
                            <span className="text-[9px] text-muted-foreground">
                              {post.country === 'AU' ? '🇦🇺' : post.country === 'US' ? '🇺🇸' : post.country === 'UK' ? '🇬🇧' : '🌍'} {post.country}
                            </span>
                          )}
                        </div>
                        <h2 className="text-sm sm:text-base font-semibold text-foreground">
                          {post.title}
                        </h2>
                        {!isExpanded && (
                          <p className="text-xs text-muted-foreground leading-relaxed">{post.excerpt}</p>
                        )}
                        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                          <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(post.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                          <span>{post.readTime} read</span>
                        </div>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-primary shrink-0 mt-1" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0 mt-1" />
                      )}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="px-4 sm:px-5 pb-5 border-t border-border pt-4">
                      <div className="prose-sm text-xs text-muted-foreground leading-relaxed space-y-3">
                        {post.body.split('\n\n').map((block, i) => {
                          if (block.startsWith('### ')) {
                            return <h3 key={i} className="text-sm font-semibold text-foreground mt-4 mb-1">{block.replace('### ', '')}</h3>;
                          }
                          if (block.startsWith('| ')) {
                            const rows = block.split('\n').filter(r => !r.match(/^\|[-\s|]+\|$/));
                            return (
                              <div key={i} className="overflow-x-auto">
                                <table className="w-full text-[11px] border border-border rounded">
                                  {rows.map((row, ri) => {
                                    const cells = row.split('|').filter(Boolean).map(c => c.trim());
                                    const Tag = ri === 0 ? 'th' : 'td';
                                    return (
                                      <tr key={ri} className={ri === 0 ? 'bg-muted/30' : ''}>
                                        {cells.map((cell, ci) => (
                                          <Tag key={ci} className="px-2 py-1 text-left border-b border-border">{cell}</Tag>
                                        ))}
                                      </tr>
                                    );
                                  })}
                                </table>
                              </div>
                            );
                          }
                          if (block.startsWith('- ')) {
                            return (
                              <ul key={i} className="list-disc list-inside space-y-0.5">
                                {block.split('\n').map((line, li) => (
                                  <li key={li} dangerouslySetInnerHTML={{ __html: line.replace(/^- /, '').replace(/\*\*(.+?)\*\*/g, '<strong class="text-foreground">$1</strong>') }} />
                                ))}
                              </ul>
                            );
                          }
                          if (block.startsWith('`')) {
                            return <code key={i} className="block bg-muted rounded p-2 text-[10px] font-mono">{block.replace(/`/g, '')}</code>;
                          }
                          return <p key={i} dangerouslySetInnerHTML={{ __html: block.replace(/\*\*(.+?)\*\*/g, '<strong class="text-foreground">$1</strong>') }} />;
                        })}
                      </div>
                    </div>
                  )}
                </article>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
