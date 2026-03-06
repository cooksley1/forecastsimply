import { Info } from 'lucide-react';
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
  whatToDo: string;
}

export default function IndicatorsPanel({ indicators, currentPrice }: Props) {
  const last = (arr: number[] | undefined) => arr?.filter(v => !isNaN(v)).pop();

  const rows: IndicatorRow[] = [
    {
      label: 'RSI (14)',
      value: indicators.currentRsi.toFixed(1),
      zone: indicators.currentRsi < 30 ? 'Oversold' : indicators.currentRsi > 70 ? 'Overbought' : 'Neutral',
      explain: 'RSI measures momentum on a 0-100 scale. It tells you whether the price has been rising or falling too quickly.',
      whatToDo: indicators.currentRsi < 30
        ? 'The price has dropped a lot — it could bounce back. Look for a potential buying opportunity.'
        : indicators.currentRsi > 70
        ? 'The price has risen fast — it may pull back soon. Consider taking profits or waiting before buying.'
        : 'No extreme signal. RSI is in the neutral zone — other indicators may give clearer guidance.',
    },
    {
      label: 'SMA 20',
      value: last(indicators.sma20) ? fmtPrice(last(indicators.sma20)!) : 'N/A',
      zone: currentPrice > (last(indicators.sma20) || 0) ? 'Above' : 'Below',
      explain: 'The average price over the last 20 days. Smooths out daily noise to show the short-term trend direction.',
      whatToDo: currentPrice > (last(indicators.sma20) || 0)
        ? 'Price is above the 20-day average — the short-term trend is up. Favourable for holding or buying dips.'
        : 'Price is below the 20-day average — short-term momentum is weak. Be cautious about new purchases.',
    },
    {
      label: 'SMA 50',
      value: last(indicators.sma50) ? fmtPrice(last(indicators.sma50)!) : 'N/A',
      zone: currentPrice > (last(indicators.sma50) || 0) ? 'Above' : 'Below',
      explain: 'The average price over the last 50 days. Represents the medium-term trend. When SMA 20 crosses above SMA 50, it\'s called a "Golden Cross" (bullish).',
      whatToDo: currentPrice > (last(indicators.sma50) || 0)
        ? 'Price is above the 50-day average — the medium-term trend supports upward movement.'
        : 'Price is below the 50-day average — the medium-term trend is bearish. Wait for it to reclaim this level.',
    },
  ];

  const sma200Val = last(indicators.sma200);
  if (sma200Val) {
    rows.push({
      label: 'SMA 200',
      value: fmtPrice(sma200Val),
      zone: currentPrice > sma200Val ? 'Above' : 'Below',
      explain: 'The long-term trend indicator. Institutions watch this closely. Price above SMA 200 = long-term bullish. Below = bearish.',
      whatToDo: currentPrice > sma200Val
        ? 'Long-term trend is bullish — this is the kind of asset institutions are comfortable holding.'
        : 'Below the 200-day average is a warning sign. The long-term trend is against you — extra caution warranted.',
    });
  }

  rows.push(
    {
      label: 'BB Upper',
      value: last(indicators.bbUpper) ? fmtPrice(last(indicators.bbUpper)!) : 'N/A',
      explain: 'Bollinger Band upper limit — a dynamic "ceiling". When price touches this, the asset may be overextended.',
      whatToDo: 'If price is near or above this level, it\'s stretched high. Often a short-term pullback follows.',
    },
    {
      label: 'BB Lower',
      value: last(indicators.bbLower) ? fmtPrice(last(indicators.bbLower)!) : 'N/A',
      explain: 'Bollinger Band lower limit — a dynamic "floor". When price touches this, the asset may be oversold.',
      whatToDo: 'If price is near or below this level, it could be a buying opportunity — but wait for a bounce to confirm.',
    },
    {
      label: 'MACD',
      value: last(indicators.macdLine)?.toFixed(4) || 'N/A',
      explain: 'Measures the gap between fast and slow moving averages. Positive = upward momentum building. Negative = momentum fading.',
      whatToDo: (last(indicators.macdLine) || 0) > 0
        ? 'Positive MACD — momentum is building upward. This supports buying or holding.'
        : 'Negative MACD — momentum is fading or bearish. Not ideal for new entries.',
    },
    {
      label: 'MACD Signal',
      value: last(indicators.macdSignal)?.toFixed(4) || 'N/A',
      explain: 'A smoothed version of MACD. When MACD crosses above the signal line = buy signal. Below = sell signal.',
      whatToDo: (last(indicators.macdLine) || 0) > (last(indicators.macdSignal) || 0)
        ? 'MACD is above its signal line — this is a bullish crossover signal.'
        : 'MACD is below its signal line — this is a bearish crossover warning.',
    },
    {
      label: 'Stochastic %K',
      value: last(indicators.stochasticK)?.toFixed(1) || 'N/A',
      zone: (last(indicators.stochasticK) || 50) < 20 ? 'Oversold' : (last(indicators.stochasticK) || 50) > 80 ? 'Overbought' : 'Neutral',
      explain: 'Compares today\'s close to the recent price range (0-100). Below 20 = oversold. Above 80 = overbought.',
      whatToDo: (last(indicators.stochasticK) || 50) < 20
        ? 'The stochastic is oversold — the price may be due for a bounce.'
        : (last(indicators.stochasticK) || 50) > 80
        ? 'The stochastic is overbought — a pullback could be coming.'
        : 'Stochastic is in the neutral range — no extreme signal here.',
    },
  );

  const atrVal = last(indicators.atr);
  if (atrVal) {
    rows.push({
      label: 'ATR (14)',
      value: fmtPrice(atrVal),
      explain: 'Average True Range measures daily volatility (how much the price swings). Higher = more volatile.',
      whatToDo: `This asset moves about ${fmtPrice(atrVal)} per day on average. Set stop-losses at least 2× ATR (${fmtPrice(atrVal * 2)}) from your entry to avoid being stopped out by normal noise.`,
    });
  }

  const obvVal = last(indicators.obv);
  if (obvVal !== undefined) {
    rows.push({
      label: 'OBV',
      value: obvVal > 1e9 ? `${(obvVal / 1e9).toFixed(2)}B` : obvVal > 1e6 ? `${(obvVal / 1e6).toFixed(2)}M` : obvVal.toFixed(0),
      explain: 'On-Balance Volume tracks whether volume is flowing in (buying) or out (selling). Rising OBV with rising price = strong trend.',
      whatToDo: 'If OBV is rising with the price, the uptrend is supported by real buying volume — that\'s a good sign. If OBV is falling while price rises, it may be a weak rally.',
    });
  }

  const vwapVal = last(indicators.vwap);
  if (vwapVal) {
    rows.push({
      label: 'VWAP',
      value: fmtPrice(vwapVal),
      zone: currentPrice > vwapVal ? 'Above' : 'Below',
      explain: 'Volume Weighted Average Price — the "fair price" based on volume. Institutions use this to gauge if they\'re getting a good deal.',
      whatToDo: currentPrice > vwapVal
        ? 'Price is above VWAP — institutions consider this the "buying zone". The trend is in your favour.'
        : 'Price is below VWAP — institutions see this as the "selling zone". Wait for price to reclaim VWAP before buying.',
    });
  }

  rows.push(
    {
      label: 'Support',
      value: fmtPrice(indicators.support),
      explain: 'The price level where buyers historically step in, creating a "floor" that prevents further drops.',
      whatToDo: `If price approaches ${fmtPrice(indicators.support)}, watch for a bounce. This is often a good place to set buy orders. If it breaks below, the next drop could be significant.`,
    },
    {
      label: 'Resistance',
      value: fmtPrice(indicators.resistance),
      explain: 'The price level where sellers historically appear, creating a "ceiling" that prevents further rises.',
      whatToDo: `If price approaches ${fmtPrice(indicators.resistance)}, it may stall or pull back. A break above this level is bullish and could trigger a larger move up.`,
    },
  );

  return (
    <div className="bg-card border border-border rounded-xl p-3 sm:p-5">
      <div className="mb-4">
        <h3 className="text-foreground font-semibold text-sm">Technical Indicators</h3>
        <div className="flex items-start gap-1.5 mt-1.5 bg-muted/30 rounded-md p-2">
          <Info className="w-3 h-3 text-primary mt-0.5 shrink-0" />
          <p className="text-[10px] text-muted-foreground leading-relaxed">
            These are mathematical tools that analyse price history to identify trends, momentum, and turning points.
            <strong className="text-foreground"> Tap any indicator</strong> to see what it means, what the current reading tells you, and what action to consider.
          </p>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {rows.map(row => (
          <details key={row.label} className="group rounded-lg bg-muted/20 border border-border/50">
            <summary className="flex items-center justify-between py-2 px-3 cursor-pointer list-none">
              <span className="text-xs text-muted-foreground">{row.label}</span>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-foreground">{row.value}</span>
                {row.zone && (
                  <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                    row.zone === 'Oversold' || row.zone === 'Above' ? 'bg-positive/10 text-positive' :
                    row.zone === 'Overbought' || row.zone === 'Below' ? 'bg-negative/10 text-negative' :
                    'bg-warning/10 text-warning'
                  }`}>
                    {row.zone}
                  </span>
                )}
                <span className="text-muted-foreground/40 text-[10px] group-open:rotate-90 transition-transform">▶</span>
              </div>
            </summary>
            <div className="px-3 pb-2.5 pt-0.5 space-y-1.5">
              <p className="text-[11px] text-muted-foreground/80 leading-relaxed">{row.explain}</p>
              <div className="flex items-start gap-1.5 bg-primary/5 rounded-md p-2">
                <span className="text-[10px] text-primary font-semibold shrink-0">→</span>
                <p className="text-[10px] text-primary/90 leading-relaxed">{row.whatToDo}</p>
              </div>
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}
