import Header from '@/components/layout/Header';
import { Link } from 'react-router-dom';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import SEO from '@/components/SEO';
import BackToHome from '@/components/BackToHome';

const faqs = [
  { q: 'What is ForecastSimply?', a: 'ForecastSimply is a technical analysis and price forecasting tool for crypto, stocks, ETFs, and forex. It provides signals, trade setups, and AI-powered analysis to help you make informed decisions.' },
  { q: 'Is this financial advice?', a: 'No. ForecastSimply is for educational and informational purposes only. Always do your own research (DYOR) and consult a qualified financial advisor before making investment decisions.' },
  { q: 'Do I need an account?', a: 'No. You can use most features without signing in. An account lets you sync watchlists across devices, save analysis history, and set default preferences.' },
  { q: 'What does the Risk slider do?', a: 'The Risk slider adjusts your trade setup parameters — it controls how tight or wide your stop-loss and take-profit levels are, and influences the recommendations panel. Conservative = tighter stops, aggressive = wider stops with higher potential returns.' },
  { q: 'What does the Forecast (FC) slider do?', a: 'The FC slider controls how far ahead the price projection extends — from 10% to 80% of your selected timeframe. This affects the forecast lines on the price chart.' },
  { q: 'Where does the market data come from?', a: 'We aggregate data from multiple sources including CoinGecko, Yahoo Finance, DIA, CoinLore, CoinPaprika, Alpha Vantage, Financial Modeling Prep, and Frankfurter for forex rates.' },
  { q: 'What are the forecast methods?', a: "ForecastSimply offers multiple forecasting models including Holt's Exponential Smoothing, Linear Regression, ARIMA-style analysis, and Monte Carlo simulations. You can enable one or more methods to compare projections." },
  { q: 'How does the Breakout Finder work?', a: 'The Breakout Finder scans trending coins and top assets by market cap, running deep technical analysis on each to identify potential breakout opportunities with detailed profit plans.' },
  { q: 'Can I provide my own API keys?', a: 'Yes, you can add your own API keys for certain data providers in Settings (⚙️). Keys are stored locally in your browser and never sent to our servers. We recommend using only free/demo-tier keys.' },
  { q: 'Is my data secure?', a: 'Yes. All data is stored with industry-standard encryption. We use row-level security to ensure you can only access your own data. See our Privacy Policy for full details.' },
];

export default function FAQ() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="FAQ — ForecastSimply" description="Frequently asked questions about ForecastSimply's technical analysis and forecasting tools." />
      <Header />
      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <BackToHome />
        <h1 className="text-2xl font-bold text-foreground">Frequently Asked Questions</h1>

        <Accordion type="multiple" className="space-y-2">
          {faqs.map((faq, i) => (
            <AccordionItem key={i} value={`faq-${i}`} className="border border-border rounded-xl px-4 bg-card">
              <AccordionTrigger className="text-sm font-medium text-foreground hover:no-underline">{faq.q}</AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground leading-relaxed">{faq.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        <p className="text-xs text-muted-foreground">
          Have another question? <Link to="/contact" className="text-primary hover:underline">Get in touch</Link>.
        </p>
      </main>
    </div>
  );
}
