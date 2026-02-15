import Header from '@/components/layout/Header';

export default function Disclaimer() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <h1 className="text-2xl font-bold text-foreground">Financial Disclaimer</h1>
        <p className="text-xs text-muted-foreground font-mono">Last updated: February 2026</p>

        <div className="border border-destructive/30 bg-destructive/5 rounded-xl p-4">
          <p className="text-sm font-semibold text-destructive">⚠️ Important: This is not financial advice.</p>
        </div>

        <section className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <h2 className="text-lg font-semibold text-foreground">No Financial Advice</h2>
          <p>ForecastSimply provides technical analysis tools and price forecasts for <strong>educational and informational purposes only</strong>. Nothing on this platform constitutes financial advice, investment advice, trading advice, or any other form of professional advice.</p>

          <h2 className="text-lg font-semibold text-foreground">No Guarantees</h2>
          <p>All forecasts, signals, trade setups, and recommendations are generated algorithmically based on historical price data. Past performance does not guarantee future results. Markets are inherently unpredictable and can move against any analysis.</p>

          <h2 className="text-lg font-semibold text-foreground">Risk of Loss</h2>
          <p>Trading and investing in financial instruments (including cryptocurrencies, stocks, ETFs, and forex) involves substantial risk of loss. You should only invest money you can afford to lose entirely.</p>

          <h2 className="text-lg font-semibold text-foreground">Do Your Own Research (DYOR)</h2>
          <p>Always conduct your own research and consult with a qualified financial advisor before making any investment decisions. ForecastSimply should be one of many tools in your decision-making process, not the sole basis for action.</p>

          <h2 className="text-lg font-semibold text-foreground">Data Accuracy</h2>
          <p>While we strive for accuracy, market data is sourced from third-party providers and may contain delays, errors, or inaccuracies. We do not guarantee the completeness, accuracy, or timeliness of any data displayed.</p>

          <h2 className="text-lg font-semibold text-foreground">Limitation of Liability</h2>
          <p>ForecastSimply and its creators shall not be held liable for any losses, damages, or expenses arising from the use of this platform or reliance on any information provided herein.</p>
        </section>
      </main>
    </div>
  );
}
