import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import LoginDialog from '@/components/auth/LoginDialog';
import NewsletterSignup from '@/components/NewsletterSignup';
import { useState } from 'react';
import { TrendingUp, Shield, BarChart3, Zap, ArrowRight } from 'lucide-react';
import SEO from '@/components/SEO';
import logoStackedDark from '@/assets/logo-stacked.svg';
import logoStackedLight from '@/assets/logo-stacked-light.svg';

export default function Landing() {
  const { user, loading } = useAuth();
  const { theme } = useTheme();
  const [loginOpen, setLoginOpen] = useState(false);
  const logo = theme === 'dark' ? logoStackedDark : logoStackedLight;

  if (user) return <Navigate to="/" replace />;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEO
        title="ForecastSimply — Free Technical Analysis & Price Forecasting"
        description="Analyse crypto, stocks, ETFs, and forex with real-time signals, trade setups, and smart forecasting. Free and no account required."
      />

      <header className="border-b border-border px-4 py-3 bg-background/95 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <img src={logo} alt="ForecastSimply" className="h-12 sm:h-14" />
          <div className="flex items-center gap-3">
            <Link to="/about" className="text-xs text-muted-foreground hover:text-foreground transition-colors hidden sm:inline">About</Link>
            <Link to="/faq" className="text-xs text-muted-foreground hover:text-foreground transition-colors hidden sm:inline">FAQ</Link>
            <button
              onClick={() => setLoginOpen(true)}
              className="px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-all"
            >
              Sign In
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-12 sm:py-20">
        <div className="max-w-2xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-medium mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            Free · No sign-up required
          </div>

          <h1 className="text-3xl sm:text-5xl font-bold text-foreground leading-tight tracking-tight">
            Analyse · Forecast · <span className="text-primary">Decide</span>
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
            Real-time technical analysis, buy/sell signals, and price forecasting for Crypto, Stocks, ETFs, and Forex.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
            <Link
              to="/"
              className="group inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-all text-sm"
            >
              Start Analysing
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
            <button
              onClick={() => setLoginOpen(true)}
              className="px-6 py-3 rounded-lg border border-border text-foreground font-medium hover:border-primary/40 transition-all text-sm"
            >
              Sign In to Sync
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl mx-auto mt-16 w-full">
          {[
            { icon: <TrendingUp className="w-5 h-5" />, title: 'Crypto', desc: 'Bitcoin, Ethereum, and thousands of altcoins with live data.' },
            { icon: <BarChart3 className="w-5 h-5" />, title: 'Stocks', desc: 'US & ASX equities with real-time signals and trade setups.' },
            { icon: <Shield className="w-5 h-5" />, title: 'ETFs', desc: 'SPY, VGS, and more with DCA timing recommendations.' },
            { icon: <Zap className="w-5 h-5" />, title: 'Forex', desc: 'Major and minor currency pairs with technical forecasts.' },
          ].map(f => (
            <div key={f.title} className="bg-card border border-border rounded-lg p-5 space-y-3 hover:border-primary/30 transition-all">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                {f.icon}
              </div>
              <h3 className="text-sm font-semibold text-foreground">{f.title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>

        <div className="max-w-3xl mx-auto mt-16 text-center space-y-6">
          <h2 className="text-xl sm:text-2xl font-bold text-foreground">Powerful Tools, Zero Cost</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { title: 'Smart Forecasting', desc: 'Holt\'s, Linear Regression, Monte Carlo — backtested and calibrated.' },
              { title: 'Trade Setups', desc: 'Risk-adjusted entry, stop-loss & take-profit levels with R:R ratios.' },
              { title: 'Breakout Finder', desc: 'Automated scanning for breakout opportunities across markets.' },
            ].map(t => (
              <div key={t.title} className="bg-card border border-border rounded-lg p-4 space-y-1.5 text-left">
                <h3 className="text-xs font-semibold text-foreground">{t.title}</h3>
                <p className="text-[11px] text-muted-foreground leading-relaxed">{t.desc}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="max-w-lg mx-auto mt-16">
          <NewsletterSignup variant="hero" />
        </div>
      </main>

      <footer className="border-t border-border py-6 px-3">
        <div className="max-w-6xl mx-auto space-y-3">
          <div className="flex flex-wrap justify-center gap-3 sm:gap-4">
            <Link to="/how-it-works" className="text-[10px] sm:text-xs text-muted-foreground hover:text-foreground transition-colors">How It Works</Link>
            <Link to="/blog" className="text-[10px] sm:text-xs text-muted-foreground hover:text-foreground transition-colors">Blog</Link>
            <Link to="/changelog" className="text-[10px] sm:text-xs text-muted-foreground hover:text-foreground transition-colors">Changelog</Link>
            <Link to="/about" className="text-[10px] sm:text-xs text-muted-foreground hover:text-foreground transition-colors">About</Link>
            <Link to="/faq" className="text-[10px] sm:text-xs text-muted-foreground hover:text-foreground transition-colors">FAQ</Link>
            <Link to="/contact" className="text-[10px] sm:text-xs text-muted-foreground hover:text-foreground transition-colors">Contact</Link>
            <Link to="/privacy" className="text-[10px] sm:text-xs text-muted-foreground hover:text-foreground transition-colors">Privacy</Link>
            <Link to="/terms" className="text-[10px] sm:text-xs text-muted-foreground hover:text-foreground transition-colors">Terms</Link>
            <Link to="/disclaimer" className="text-[10px] sm:text-xs text-muted-foreground hover:text-foreground transition-colors">Disclaimer</Link>
          </div>
          <p className="text-center text-[10px] text-muted-foreground italic">Not financial advice. Always do your own research.</p>
        </div>
      </footer>

      <LoginDialog open={loginOpen} onClose={() => setLoginOpen(false)} />
    </div>
  );
}
