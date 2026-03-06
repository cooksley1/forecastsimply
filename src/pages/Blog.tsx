import { useState, useMemo } from 'react';
import { Newspaper, TrendingUp, BarChart3, Wallet, Globe, Calendar, ChevronRight, Sparkles } from 'lucide-react';
import SEO from '@/components/SEO';
import BackToHome from '@/components/BackToHome';
import { Link } from 'react-router-dom';

type Category = 'all' | 'crypto' | 'stocks' | 'etfs' | 'forex';

interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
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

// Seed posts — in production these would come from DB
const SEED_POSTS: BlogPost[] = [
  {
    id: '1', title: 'Weekly Crypto Roundup: BTC Tests $92K Resistance',
    excerpt: 'Bitcoin pushed toward $92,000 this week as institutional flows accelerated. Our Ensemble model predicted the move within 0.4% — here\'s what the signals say next.',
    category: 'crypto', type: 'roundup', date: '2026-03-03', readTime: '4 min',
  },
  {
    id: '2', title: 'February BTC Pick: +8.96% Case Study',
    excerpt: 'Our February crypto pick delivered +8.96% in 28 days. Deep dive into which forecast models nailed the trajectory and which missed.',
    category: 'crypto', type: 'case-study', date: '2026-03-01', readTime: '6 min',
  },
  {
    id: '3', title: 'Understanding the Ensemble Forecast Model',
    excerpt: 'How we blend Linear Regression (52%), Holt\'s DES (29%), and EMA Momentum (19%) into a single forecast — and why these weights outperform individual models.',
    category: 'all', type: 'guide', date: '2026-02-25', readTime: '8 min',
  },
  {
    id: '4', title: 'ASX Weekly: Mining Sector Leads Recovery',
    excerpt: 'BHP and RIO drove the ASX 200 higher this week. Our signal model flagged BHP as a "Buy" before the breakout — analysis inside.',
    category: 'stocks', type: 'roundup', date: '2026-03-03', readTime: '4 min', country: 'AU',
  },
  {
    id: '5', title: 'ETF DCA Timing: When to Accelerate Your Contributions',
    excerpt: 'Our backtesting shows that accelerating DCA when RSI drops below 30 and price hits the lower Bollinger Band improves returns by 2.3% annually.',
    category: 'etfs', type: 'guide', date: '2026-02-20', readTime: '7 min',
  },
  {
    id: '6', title: 'AUD/USD Outlook: RBA Hold Implications',
    excerpt: 'The Reserve Bank held rates steady. Here\'s what our technical models project for AUD/USD over the next 3 months.',
    category: 'forex', type: 'insight', date: '2026-03-04', readTime: '3 min', country: 'AU',
  },
  {
    id: '7', title: 'NVDA March Pick Analysis: Can AI Momentum Continue?',
    excerpt: 'NVIDIA enters March as our top stock pick with a Strong Buy signal (score: 78). Here\'s the technical setup and risk levels.',
    category: 'stocks', type: 'insight', date: '2026-03-01', readTime: '5 min',
  },
  {
    id: '8', title: 'Reading RSI Divergence: The Most Powerful Reversal Signal',
    excerpt: 'Price makes a lower low but RSI makes a higher low — this pattern predicted 73% of major reversals in our 2-year backtest.',
    category: 'all', type: 'guide', date: '2026-02-15', readTime: '6 min',
  },
];

export default function Blog() {
  const [category, setCategory] = useState<Category>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

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

        {/* Posts grid */}
        <div className="space-y-3">
          {filtered.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <Newspaper className="w-8 h-8 text-muted-foreground mx-auto" />
              <p className="text-sm text-muted-foreground">No posts match this filter.</p>
            </div>
          ) : (
            filtered.map(post => (
              <article
                key={post.id}
                className="group bg-card border border-border rounded-xl p-4 sm:p-5 hover:border-primary/30 transition-all cursor-pointer"
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
                    <h2 className="text-sm sm:text-base font-semibold text-foreground group-hover:text-primary transition-colors">
                      {post.title}
                    </h2>
                    <p className="text-xs text-muted-foreground leading-relaxed">{post.excerpt}</p>
                    <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(post.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                      <span>{post.readTime} read</span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0 mt-1" />
                </div>
              </article>
            ))
          )}
        </div>

        {/* Coming soon */}
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-5 text-center space-y-2">
          <Sparkles className="w-5 h-5 text-primary mx-auto" />
          <p className="text-sm font-medium text-foreground">AI-Generated Content Coming Soon</p>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            Weekly roundups and case studies will be auto-generated from our tracked picks and market data, personalised to your country and preferred asset classes.
          </p>
        </div>
      </div>
    </div>
  );
}
