import { TrendingUp, Zap, BarChart3, Target, Shield, Brain, ArrowRight } from 'lucide-react';
import SEO from '@/components/SEO';
import BackToHome from '@/components/BackToHome';
import { Link } from 'react-router-dom';

const STEPS = [
  {
    icon: <BarChart3 className="w-6 h-6" />,
    title: '1. Data Collection',
    desc: 'We pull historical price, volume, and market data from multiple sources across crypto, stocks, ETFs, and forex markets worldwide.',
  },
  {
    icon: <Brain className="w-6 h-6" />,
    title: '2. Technical Analysis',
    desc: '11 weighted indicators are computed: SMA(20), SMA(50), MA Crossover, RSI(14), MACD, Bollinger Bands, Stochastic %K, OBV Divergence, VWAP, RSI Divergence, and Trend Strength.',
  },
  {
    icon: <TrendingUp className="w-6 h-6" />,
    title: '3. Signal Scoring',
    desc: 'Each indicator contributes +1 to +3 (bullish) or −1 to −3 (bearish). The composite score maps to Strong Buy, Buy, Hold, Sell, or Strong Sell.',
  },
  {
    icon: <Target className="w-6 h-6" />,
    title: '4. Forecast Generation',
    desc: 'Our Ensemble model blends Linear Regression (52%), Holt\'s DES (29%), and EMA Momentum (19%) — weights optimised from extensive backtesting.',
  },
  {
    icon: <Shield className="w-6 h-6" />,
    title: '5. Risk Management',
    desc: 'Entry, target, and stop-loss levels are generated based on your risk profile. Momentum projections are capped at ±15% with dampening to ensure realism.',
  },
  {
    icon: <Zap className="w-6 h-6" />,
    title: '6. Monthly Picks & Tracking',
    desc: 'On the 1st of each month, we lock the top-ranked pick per asset class. Every day, prices and forecasts are snapshotted for transparent, auditable tracking.',
  },
];

const FORECAST_METHODS = [
  { name: 'Ensemble ★', weight: 'Default', desc: 'Weighted blend of all methods below. Most reliable overall.', color: 'text-primary' },
  { name: 'Linear Regression', weight: '52%', desc: 'Projects the trend line forward. Best for steady trends.', color: 'text-orange-400' },
  { name: "Holt's DES", weight: '29%', desc: 'Captures both trend and momentum. Handles acceleration well.', color: 'text-emerald-400' },
  { name: 'EMA Momentum', weight: '19%', desc: 'Exponential moving average with momentum dampening. Reactive to recent moves.', color: 'text-purple-400' },
  { name: 'Monte Carlo', weight: 'Simulation', desc: 'Random walk simulation based on historical volatility. Shows probability ranges.', color: 'text-red-400' },
];

export default function HowItWorks() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="How It Works — ForecastSimply" description="Understand our signal scoring system, forecast models, and transparent pick tracking methodology." />

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-10">
        <BackToHome />

        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">How It Works</h1>
          <p className="text-sm text-muted-foreground max-w-2xl">
            From raw market data to actionable signals — here's exactly how ForecastSimply analyses assets, generates forecasts, and tracks performance.
          </p>
        </div>

        {/* Pipeline steps */}
        <div className="space-y-4">
          {STEPS.map((step, i) => (
            <div key={i} className="flex gap-4 bg-card border border-border rounded-xl p-4 sm:p-5">
              <div className="shrink-0 w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                {step.icon}
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-foreground">{step.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Forecast methods */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-foreground">Forecast Methods</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {FORECAST_METHODS.map(m => (
              <div key={m.name} className="bg-card border border-border rounded-xl p-4 space-y-1">
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-semibold ${m.color}`}>{m.name}</span>
                  <span className="text-[10px] font-mono text-muted-foreground">{m.weight}</span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">{m.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Signal thresholds */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-foreground">Signal Thresholds</h2>
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-muted/30">
                  <th className="text-left px-4 py-2 text-muted-foreground font-medium">Signal</th>
                  <th className="text-left px-4 py-2 text-muted-foreground font-medium">Score Range</th>
                  <th className="text-left px-4 py-2 text-muted-foreground font-medium">Meaning</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <tr><td className="px-4 py-2 text-positive font-semibold">Strong Buy</td><td className="px-4 py-2 font-mono">≥ 6</td><td className="px-4 py-2 text-muted-foreground">Multiple strong bullish signals aligned</td></tr>
                <tr><td className="px-4 py-2 text-positive">Buy</td><td className="px-4 py-2 font-mono">3 to 5</td><td className="px-4 py-2 text-muted-foreground">Net bullish indicators outweigh bearish</td></tr>
                <tr><td className="px-4 py-2 text-warning">Hold</td><td className="px-4 py-2 font-mono">-2 to 2</td><td className="px-4 py-2 text-muted-foreground">Mixed signals — no clear direction</td></tr>
                <tr><td className="px-4 py-2 text-destructive">Sell</td><td className="px-4 py-2 font-mono">-3 to -5</td><td className="px-4 py-2 text-muted-foreground">Net bearish indicators dominate</td></tr>
                <tr><td className="px-4 py-2 text-destructive font-semibold">Strong Sell</td><td className="px-4 py-2 font-mono">≤ -6</td><td className="px-4 py-2 text-muted-foreground">Multiple strong bearish signals aligned</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* CTA */}
        <div className="flex flex-wrap gap-3">
          <Link to="/scorecard" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-all">
            View Performance Scorecard <ArrowRight className="w-3.5 h-3.5" />
          </Link>
          <Link to="/blog" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border text-foreground text-xs font-semibold hover:border-primary/40 transition-all">
            Read Insights <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
