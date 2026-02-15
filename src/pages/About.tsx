import Header from '@/components/layout/Header';
import { Link } from 'react-router-dom';
import SEO from '@/components/SEO';
import BackToHome from '@/components/BackToHome';

export default function About() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="About — ForecastSimply" description="Learn about ForecastSimply's mission to democratise access to professional-grade technical analysis tools." />
      <Header />
      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <BackToHome />
        <h1 className="text-2xl font-bold text-foreground">About ForecastSimply</h1>

        <section className="space-y-4 text-sm text-muted-foreground leading-relaxed">
          <p className="text-base text-foreground">
            ForecastSimply is a free, open technical analysis platform that helps traders and investors make more informed decisions across crypto, stocks, ETFs, and forex markets.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-card border border-border rounded-xl p-4 space-y-2">
              <h3 className="text-foreground font-semibold">📊 Multi-Asset Analysis</h3>
              <p className="text-xs">Analyse crypto, stocks, ETFs, and forex pairs with unified technical indicators and signals.</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-4 space-y-2">
              <h3 className="text-foreground font-semibold">🔮 Smart Forecasting</h3>
              <p className="text-xs">Multiple forecasting models including Holt's, Linear Regression, ARIMA, and Monte Carlo simulations.</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-4 space-y-2">
              <h3 className="text-foreground font-semibold">🎯 Trade Setups</h3>
              <p className="text-xs">Risk-adjusted entry, stop-loss, and take-profit levels generated from real technical data.</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-4 space-y-2">
              <h3 className="text-foreground font-semibold">🚀 Breakout Finder</h3>
              <p className="text-xs">Automated scanning of trending assets to identify potential breakout opportunities.</p>
            </div>
          </div>

          <h2 className="text-lg font-semibold text-foreground pt-4">Our Mission</h2>
          <p>To democratise access to professional-grade technical analysis tools. We believe every investor — from beginner to expert — deserves clear, actionable insights without the complexity of traditional platforms.</p>

          <h2 className="text-lg font-semibold text-foreground">Data Sources</h2>
          <p>We aggregate data from multiple trusted providers including CoinGecko, Yahoo Finance, DIA, CoinLore, CoinPaprika, Alpha Vantage, Financial Modeling Prep, and Frankfurter for forex rates.</p>

          <div className="border border-destructive/30 bg-destructive/5 rounded-xl p-4">
            <p className="text-xs text-destructive">
              ⚠️ ForecastSimply is for educational purposes only. Not financial advice. <Link to="/disclaimer" className="underline">Read our full disclaimer</Link>.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
