import type { Indicators } from '@/types/analysis';
import { fmtPrice } from '@/utils/format';

interface Props {
  indicators: Indicators;
  currentPrice: number;
}

interface IndicatorRow {
  label: string;
  value: string;
  zone?: string;
  explain: string;
}

export default function IndicatorsPanel({ indicators, currentPrice }: Props) {
  const last = (arr: number[]) => arr.filter(v => !isNaN(v)).pop();

  const rows: IndicatorRow[] = [
    {
      label: 'RSI (14)',
      value: indicators.currentRsi.toFixed(1),
      zone: indicators.currentRsi < 30 ? 'Oversold' : indicators.currentRsi > 70 ? 'Overbought' : 'Neutral',
      explain: 'Relative Strength Index measures momentum on a 0-100 scale. Below 30 = potentially undervalued (oversold). Above 70 = potentially overvalued (overbought). Between 30-70 = neutral.',
    },
    {
      label: 'SMA 20',
      value: last(indicators.sma20) ? fmtPrice(last(indicators.sma20)!) : 'N/A',
      zone: currentPrice > (last(indicators.sma20) || 0) ? 'Above' : 'Below',
      explain: 'Simple Moving Average of the last 20 periods. When the price is above the SMA, the short-term trend is generally up. Below = short-term downtrend.',
    },
    {
      label: 'SMA 50',
      value: last(indicators.sma50) ? fmtPrice(last(indicators.sma50)!) : 'N/A',
      zone: currentPrice > (last(indicators.sma50) || 0) ? 'Above' : 'Below',
      explain: 'Simple Moving Average of the last 50 periods. This tracks the medium-term trend. Price above = bullish. When SMA 20 crosses above SMA 50, it\'s called a "Golden Cross" (bullish signal).',
    },
    {
      label: 'BB Upper',
      value: last(indicators.bbUpper) ? fmtPrice(last(indicators.bbUpper)!) : 'N/A',
      explain: 'Bollinger Band upper limit. When price touches or breaks above this, the asset may be overbought. Think of it as a ceiling the price tends to bounce off.',
    },
    {
      label: 'BB Lower',
      value: last(indicators.bbLower) ? fmtPrice(last(indicators.bbLower)!) : 'N/A',
      explain: 'Bollinger Band lower limit. When price touches or breaks below this, the asset may be oversold. Think of it as a floor the price tends to bounce off.',
    },
    {
      label: 'MACD',
      value: last(indicators.macdLine)?.toFixed(4) || 'N/A',
      explain: 'Moving Average Convergence Divergence — measures the gap between fast and slow moving averages. Positive = upward momentum. Negative = downward momentum. A rising MACD is bullish.',
    },
    {
      label: 'MACD Signal',
      value: last(indicators.macdSignal)?.toFixed(4) || 'N/A',
      explain: 'The signal line is a smoothed version of MACD. When MACD crosses above the signal line, it\'s a buy signal. When it crosses below, it\'s a sell signal.',
    },
    {
      label: 'Stochastic %K',
      value: last(indicators.stochasticK)?.toFixed(1) || 'N/A',
      zone: (last(indicators.stochasticK) || 50) < 20 ? 'Oversold' : (last(indicators.stochasticK) || 50) > 80 ? 'Overbought' : 'Neutral',
      explain: 'Compares the closing price to the recent price range on a 0-100 scale. Below 20 = oversold (potential bounce up). Above 80 = overbought (potential drop). Works best in sideways markets.',
    },
    {
      label: 'Support',
      value: fmtPrice(indicators.support),
      explain: 'The price level where buying pressure historically prevents the price from falling further. Think of it as a "floor" — the price tends to bounce up from here.',
    },
    {
      label: 'Resistance',
      value: fmtPrice(indicators.resistance),
      explain: 'The price level where selling pressure historically prevents the price from rising further. Think of it as a "ceiling" — the price tends to bounce down from here.',
    },
  ];

  return (
    <div className="bg-sf-card border border-border rounded-xl p-3 sm:p-5">
      <div className="mb-4">
        <h3 className="text-foreground font-semibold text-sm">Technical Indicators</h3>
        <p className="text-[11px] text-muted-foreground mt-1">
          These are mathematical calculations based on price history. They help identify trends, momentum, and potential turning points. Tap any indicator to learn more.
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {rows.map(row => (
          <details key={row.label} className="group rounded-lg bg-sf-inset">
            <summary className="flex items-center justify-between py-2 px-3 cursor-pointer list-none">
              <span className="text-xs text-muted-foreground">{row.label}</span>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-foreground">{row.value}</span>
                {row.zone && (
                  <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                    row.zone === 'Oversold' || row.zone === 'Above' ? 'bg-sf-green/10 text-positive' :
                    row.zone === 'Overbought' || row.zone === 'Below' ? 'bg-sf-red/10 text-negative' :
                    'bg-sf-amber/10 text-neutral-signal'
                  }`}>
                    {row.zone}
                  </span>
                )}
                <span className="text-muted-foreground/40 text-[10px] group-open:rotate-90 transition-transform">▶</span>
              </div>
            </summary>
            <div className="px-3 pb-2.5 pt-0.5">
              <p className="text-[11px] text-muted-foreground/80 leading-relaxed">{row.explain}</p>
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}
