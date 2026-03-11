import { useState, type ReactNode } from 'react';
import { BookOpen, ChevronDown, ShoppingCart, TrendingUp, Package, TrendingDown } from 'lucide-react';

interface Term {
  term: string;
  short: string;
  detail: string;
  richDetail?: ReactNode;
}

const TERMS: Term[] = [
  {
    term: 'RSI (Relative Strength Index)',
    short: 'Measures how fast the price is rising or falling.',
    detail: 'RSI runs from 0 to 100. Below 30 means the price has dropped a lot recently and could bounce back (oversold). Above 70 means it has risen a lot and could pull back (overbought). Between 30–70 is neutral.',
  },
  {
    term: 'SMA (Simple Moving Average)',
    short: 'The average price over a set number of days.',
    detail: 'SMA 20 averages the last 20 days, SMA 50 the last 50, and SMA 200 the last 200. When the price is above the average, the trend is up. When it\'s below, the trend is down. A "Golden Cross" happens when a shorter SMA crosses above a longer one — that\'s a bullish signal.',
  },
  {
    term: 'MACD',
    short: 'Tracks the momentum of a trend — is it speeding up or slowing down?',
    detail: 'MACD compares a fast and slow moving average. When the MACD line is above zero, momentum is positive (upward). When it crosses above the signal line, that\'s a buy signal. The opposite is a sell signal.',
  },
  {
    term: 'Bollinger Bands',
    short: 'Dynamic boundaries showing where the price usually trades.',
    detail: 'The upper band acts as a "ceiling" and the lower band as a "floor". When the price touches the upper band, it may be stretched too high. Near the lower band, it could be a buying opportunity. The bands widen when volatility increases.',
  },
  {
    term: 'Stochastic %K',
    short: 'Compares today\'s price to its recent range.',
    detail: 'Runs from 0 to 100. Below 20 means the price is near its recent low (oversold, may bounce). Above 80 means it\'s near its recent high (overbought, may dip). Similar to RSI but reacts faster to changes.',
  },
  {
    term: 'ATR (Average True Range)',
    short: 'How much the price swings per day on average.',
    detail: 'ATR doesn\'t tell you direction — just volatility. Use it to set stop-losses: a common rule is to place stops at least 2× ATR from your entry so normal price swings don\'t trigger them.',
  },
  {
    term: 'OBV (On-Balance Volume)',
    short: 'Tracks whether money is flowing in or out.',
    detail: 'Rising OBV means more volume on up-days (buying pressure). Falling OBV means more volume on down-days (selling pressure). When OBV rises alongside price, the trend is considered strong and trustworthy.',
  },
  {
    term: 'VWAP',
    short: 'The "fair price" based on volume — used by institutions.',
    detail: 'Volume Weighted Average Price shows the average price weighted by how much was traded at each level. If the current price is above VWAP, buyers are dominant. Below VWAP, sellers have the edge.',
  },
  {
    term: 'Support & Resistance',
    short: 'Key price levels where the market tends to react.',
    detail: 'Support is a price "floor" — where buyers historically step in to stop falls. Resistance is a "ceiling" — where sellers appear to cap rises. A break above resistance is bullish; a break below support is bearish.',
  },
  {
    term: 'R:R (Risk-to-Reward Ratio)',
    short: 'How much you stand to gain vs. how much you could lose.',
    detail: 'An R:R of 2.0 means your potential profit is twice your potential loss. Generally, 2.0 or higher is considered good. Below 1.0 means you\'re risking more than you could gain — usually not worth it.',
  },
  {
    term: 'Market Phase',
    short: 'The current stage of the market cycle — tells you "where we are" in the bigger picture.',
    detail: 'Markets move in four phases. Knowing the phase helps you decide whether to buy, hold, or stay cautious.',
    richDetail: (
      <div className="space-y-2">
        <p className="text-[11px] text-muted-foreground leading-relaxed">Markets move in four phases. Knowing the current phase helps you decide whether to buy, hold, or stay cautious.</p>
        <div className="grid grid-cols-1 gap-1.5">
          {[
            { phase: 'Accumulation', icon: <ShoppingCart className="w-3 h-3" />, color: 'bg-primary/10 text-primary border-primary/20', desc: 'Smart money buys quietly after a downturn. Prices are flat, sentiment is negative — but opportunity is building.' },
            { phase: 'Markup', icon: <TrendingUp className="w-3 h-3" />, color: 'bg-positive/10 text-positive border-positive/20', desc: 'Prices start rising as more buyers join. This is the main uptrend — the best phase to be invested.' },
            { phase: 'Distribution', icon: <Package className="w-3 h-3" />, color: 'bg-warning/10 text-warning border-warning/20', desc: 'Early buyers take profits near the top. Prices go sideways with high volatility — be cautious.' },
            { phase: 'Decline', icon: <TrendingDown className="w-3 h-3" />, color: 'bg-negative/10 text-negative border-negative/20', desc: 'Selling accelerates and prices fall. This is the downtrend — capital preservation is key.' },
          ].map(p => (
            <div key={p.phase} className={`flex items-start gap-2 rounded-md p-2 border ${p.color}`}>
              <div className="mt-0.5 shrink-0">{p.icon}</div>
              <div>
                <span className="text-[11px] font-semibold">{p.phase}</span>
                <p className="text-[10px] leading-relaxed opacity-80">{p.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    term: 'Signal Score',
    short: 'A combined rating from all indicators, from −100 to +100.',
    detail: 'The signal score weighs every indicator together to give one overall reading. A high positive score = Strong Buy. A high negative score = Strong Sell. Near zero = Hold. This is the number you should follow — individual indicator readings are just context.',
  },
  {
    term: 'Confidence Level',
    short: 'How strongly the indicators agree — higher means more reliable.',
    detail: 'Confidence tells you how much the data supports the signal.',
    richDetail: (
      <div className="space-y-2">
        <p className="text-[11px] text-muted-foreground leading-relaxed">Confidence tells you how much the data supports the current signal. It's not a guarantee — it's a measure of agreement among indicators.</p>
        <div className="grid grid-cols-1 gap-1.5">
          {[
            { level: '90%+', color: 'bg-positive/10 text-positive border-positive/20', desc: 'Very high agreement — most indicators point the same way. The signal is well-supported, though no prediction is certain.' },
            { level: '75–89%', color: 'bg-primary/10 text-primary border-primary/20', desc: 'Good agreement — the majority of indicators align. A solid basis for decisions, but keep an eye on the market.' },
            { level: '60–74%', color: 'bg-warning/10 text-warning border-warning/20', desc: 'Moderate agreement — indicators are mixed. The signal could go either way; consider waiting for stronger confirmation.' },
            { level: 'Below 60%', color: 'bg-negative/10 text-negative border-negative/20', desc: 'Low agreement — indicators conflict. The signal is unreliable; avoid acting on it alone.' },
          ].map(p => (
            <div key={p.level} className={`flex items-start gap-2 rounded-md p-2 border ${p.color}`}>
              <span className="text-[11px] font-semibold shrink-0 mt-0.5 w-14">{p.level}</span>
              <p className="text-[10px] leading-relaxed opacity-80">{p.desc}</p>
            </div>
          ))}
        </div>
      </div>
    ),
  },
];

export default function Glossary() {
  const [open, setOpen] = useState(false);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  return (
    <div className="bg-card border border-border rounded-xl p-3 sm:p-5">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-2"
      >
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-primary" />
          <h3 className="text-foreground font-semibold text-sm">What does this mean? — Glossary</h3>
        </div>
        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="mt-3 space-y-1">
          <p className="text-[10px] text-muted-foreground mb-2">
            Tap any term to learn what it means and how to use it.
          </p>
          {TERMS.map((t, i) => {
            const isExpanded = expandedIdx === i;
            return (
              <div key={t.term} className="rounded-lg border border-border/50 bg-muted/20 overflow-hidden">
                <button
                  onClick={() => setExpandedIdx(isExpanded ? null : i)}
                  className="w-full flex items-center justify-between py-2 px-3 text-left hover:bg-secondary/30 transition-colors"
                >
                  <div className="min-w-0">
                    <span className="text-xs font-medium text-foreground">{t.term}</span>
                    {!isExpanded && (
                      <span className="text-[10px] text-muted-foreground ml-2">— {t.short}</span>
                    )}
                  </div>
                  <ChevronDown className={`w-3 h-3 text-muted-foreground/50 shrink-0 ml-2 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                </button>
                {isExpanded && (
                  <div className="px-3 pb-2.5 space-y-1.5">
                    {t.richDetail ? t.richDetail : (
                      <>
                        <p className="text-[11px] text-primary/90 font-medium">{t.short}</p>
                        <p className="text-[11px] text-muted-foreground leading-relaxed">{t.detail}</p>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
