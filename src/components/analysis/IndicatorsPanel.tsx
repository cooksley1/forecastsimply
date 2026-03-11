import { Info, TrendingUp, TrendingDown, Minus } from 'lucide-react';
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
  action: 'buy' | 'sell' | 'hold';
  explain: string;
  whatToDo: string;
  actionSummary: string;
}

export default function IndicatorsPanel({ indicators, currentPrice }: Props) {
  const last = (arr: number[] | undefined) => arr?.filter(v => !isNaN(v)).pop();

  const rows: IndicatorRow[] = [
    {
      label: 'RSI (14)',
      value: indicators.currentRsi.toFixed(1),
      zone: indicators.currentRsi < 30 ? 'Oversold' : indicators.currentRsi > 70 ? 'Overbought' : 'Neutral',
      action: indicators.currentRsi < 30 ? 'buy' : indicators.currentRsi > 70 ? 'sell' : 'hold',
      explain: 'RSI measures momentum on a 0-100 scale. It tells you whether the price has been rising or falling too quickly.',
      whatToDo: indicators.currentRsi < 30
        ? 'The price has dropped a lot — it could bounce back. Look for a potential buying opportunity.'
        : indicators.currentRsi > 70
        ? 'The price has risen fast — it may pull back soon. Consider taking profits or waiting before buying.'
        : 'No extreme signal. RSI is in the neutral zone — other indicators may give clearer guidance.',
      actionSummary: indicators.currentRsi < 30
        ? '🟢 This indicator suggests BUY — the asset appears oversold and may bounce.'
        : indicators.currentRsi > 70
        ? '🔴 This indicator suggests SELL / TAKE PROFIT — the asset appears overbought.'
        : '🟡 This indicator suggests HOLD — no extreme reading, wait for a stronger signal.',
    },
    {
      label: 'SMA 20',
      value: last(indicators.sma20) ? fmtPrice(last(indicators.sma20)!) : 'N/A',
      zone: currentPrice > (last(indicators.sma20) || 0) ? 'Above' : 'Below',
      action: currentPrice > (last(indicators.sma20) || 0) ? 'buy' : 'sell',
      explain: 'The average price over the last 20 days. Smooths out daily noise to show the short-term trend direction.',
      whatToDo: currentPrice > (last(indicators.sma20) || 0)
        ? 'Price is above the 20-day average — the short-term trend is up. Favourable for holding or buying dips.'
        : 'Price is below the 20-day average — short-term momentum is weak. Be cautious about new purchases.',
      actionSummary: currentPrice > (last(indicators.sma20) || 0)
        ? '🟢 This indicator suggests BUY / HOLD — short-term trend supports upside.'
        : '🔴 This indicator suggests SELL / WAIT — short-term trend is bearish.',
    },
    {
      label: 'SMA 50',
      value: last(indicators.sma50) ? fmtPrice(last(indicators.sma50)!) : 'N/A',
      zone: currentPrice > (last(indicators.sma50) || 0) ? 'Above' : 'Below',
      action: currentPrice > (last(indicators.sma50) || 0) ? 'buy' : 'sell',
      explain: 'The average price over the last 50 days. Represents the medium-term trend. When SMA 20 crosses above SMA 50, it\'s called a "Golden Cross" (bullish).',
      whatToDo: currentPrice > (last(indicators.sma50) || 0)
        ? 'Price is above the 50-day average — the medium-term trend supports upward movement.'
        : 'Price is below the 50-day average — the medium-term trend is bearish. Wait for it to reclaim this level.',
      actionSummary: currentPrice > (last(indicators.sma50) || 0)
        ? '🟢 This indicator suggests BUY / HOLD — medium-term trend is bullish.'
        : '🔴 This indicator suggests SELL / AVOID — medium-term trend is against you.',
    },
  ];

  const sma200Val = last(indicators.sma200);
  if (sma200Val) {
    rows.push({
      label: 'SMA 200',
      value: fmtPrice(sma200Val),
      zone: currentPrice > sma200Val ? 'Above' : 'Below',
      action: currentPrice > sma200Val ? 'buy' : 'sell',
      explain: 'The long-term trend indicator. Institutions watch this closely. Price above SMA 200 = long-term bullish. Below = bearish.',
      whatToDo: currentPrice > sma200Val
        ? 'Long-term trend is bullish — this is the kind of asset institutions are comfortable holding.'
        : 'Below the 200-day average is a warning sign. The long-term trend is against you — extra caution warranted.',
      actionSummary: currentPrice > sma200Val
        ? '🟢 This indicator suggests BUY / HOLD — long-term trend is bullish.'
        : '🔴 This indicator suggests SELL / AVOID — long-term trend is bearish.',
    });
  }

  const lastBBU = last(indicators.bbUpper);
  const lastBBL = last(indicators.bbLower);
  const bbPos = lastBBU && lastBBL && lastBBU !== lastBBL ? (currentPrice - lastBBL) / (lastBBU - lastBBL) : 0.5;

  rows.push(
    {
      label: 'BB Upper',
      value: lastBBU ? fmtPrice(lastBBU) : 'N/A',
      action: bbPos > 0.85 ? 'sell' : bbPos < 0.15 ? 'buy' : 'hold',
      explain: 'Bollinger Band upper limit — a dynamic "ceiling". When price touches this, the asset may be overextended.',
      whatToDo: 'If price is near or above this level, it\'s stretched high. Often a short-term pullback follows.',
      actionSummary: bbPos > 0.85
        ? '🔴 This indicator suggests SELL / WAIT — price is near the upper band, may pull back.'
        : '🟡 This indicator suggests HOLD — price is within normal Bollinger range.',
    },
    {
      label: 'BB Lower',
      value: lastBBL ? fmtPrice(lastBBL) : 'N/A',
      action: bbPos < 0.15 ? 'buy' : bbPos > 0.85 ? 'sell' : 'hold',
      explain: 'Bollinger Band lower limit — a dynamic "floor". When price touches this, the asset may be oversold.',
      whatToDo: 'If price is near or below this level, it could be a buying opportunity — but wait for a bounce to confirm.',
      actionSummary: bbPos < 0.15
        ? '🟢 This indicator suggests BUY — price is near the lower band, potential bounce.'
        : '🟡 This indicator suggests HOLD — price is within normal Bollinger range.',
    },
  );

  const lastMacdLine = last(indicators.macdLine) || 0;
  const lastMacdSignal = last(indicators.macdSignal) || 0;
  const macdBullish = lastMacdLine > 0;
  const macdCross = lastMacdLine > lastMacdSignal;

  rows.push(
    {
      label: 'MACD',
      value: lastMacdLine?.toFixed(4) || 'N/A',
      action: macdBullish ? 'buy' : 'sell',
      explain: 'Measures the gap between fast and slow moving averages. Positive = upward momentum building. Negative = momentum fading.',
      whatToDo: macdBullish
        ? 'Positive MACD — momentum is building upward. This supports buying or holding.'
        : 'Negative MACD — momentum is fading or bearish. Not ideal for new entries.',
      actionSummary: macdBullish
        ? '🟢 This indicator suggests BUY / HOLD — momentum is positive and building.'
        : '🔴 This indicator suggests SELL / WAIT — momentum is negative.',
    },
    {
      label: 'MACD Signal',
      value: lastMacdSignal?.toFixed(4) || 'N/A',
      action: macdCross ? 'buy' : 'sell',
      explain: 'A smoothed version of MACD. When MACD crosses above the signal line = buy signal. Below = sell signal.',
      whatToDo: macdCross
        ? 'MACD is above its signal line — this is a bullish crossover signal.'
        : 'MACD is below its signal line — this is a bearish crossover warning.',
      actionSummary: macdCross
        ? '🟢 This indicator suggests BUY — bullish MACD crossover detected.'
        : '🔴 This indicator suggests SELL — bearish MACD crossover detected.',
    },
  );

  const lastK = last(indicators.stochasticK) || 50;
  rows.push({
    label: 'Stochastic %K',
    value: lastK.toFixed(1),
    zone: lastK < 20 ? 'Oversold' : lastK > 80 ? 'Overbought' : 'Neutral',
    action: lastK < 20 ? 'buy' : lastK > 80 ? 'sell' : 'hold',
    explain: 'Compares today\'s close to the recent price range (0-100). Below 20 = oversold. Above 80 = overbought.',
    whatToDo: lastK < 20
      ? 'The stochastic is oversold — the price may be due for a bounce.'
      : lastK > 80
      ? 'The stochastic is overbought — a pullback could be coming.'
      : 'Stochastic is in the neutral range — no extreme signal here.',
    actionSummary: lastK < 20
      ? '🟢 This indicator suggests BUY — stochastic shows the asset is oversold.'
      : lastK > 80
      ? '🔴 This indicator suggests SELL / TAKE PROFIT — stochastic shows overbought conditions.'
      : '🟡 This indicator suggests HOLD — stochastic is in a neutral range.',
  });

  const atrVal = last(indicators.atr);
  if (atrVal) {
    rows.push({
      label: 'ATR (14)',
      value: fmtPrice(atrVal),
      action: 'hold',
      explain: 'Average True Range measures daily volatility (how much the price swings). Higher = more volatile.',
      whatToDo: `This asset moves about ${fmtPrice(atrVal)} per day on average. Set stop-losses at least 2× ATR (${fmtPrice(atrVal * 2)}) from your entry to avoid being stopped out by normal noise.`,
      actionSummary: `🟡 ATR is a risk-sizing tool, not a buy/sell signal. Use it to set stop-losses: place your stop at least ${fmtPrice(atrVal * 2)} away from entry.`,
    });
  }

  const obvVal = last(indicators.obv);
  if (obvVal !== undefined) {
    const obvRising = indicators.obv && indicators.obv.length > 20
      ? indicators.obv[indicators.obv.length - 1] > indicators.obv[Math.floor(indicators.obv.length / 2)]
      : true;
    rows.push({
      label: 'OBV',
      value: obvVal > 1e9 ? `${(obvVal / 1e9).toFixed(2)}B` : obvVal > 1e6 ? `${(obvVal / 1e6).toFixed(2)}M` : obvVal.toFixed(0),
      action: obvRising ? 'buy' : 'sell',
      explain: 'On-Balance Volume tracks whether volume is flowing in (buying) or out (selling). Rising OBV with rising price = strong trend.',
      whatToDo: obvRising
        ? 'OBV is rising — buying volume is increasing, which supports the current trend.'
        : 'OBV is falling — selling volume is dominating, which weakens the trend.',
      actionSummary: obvRising
        ? '🟢 This indicator suggests BUY / HOLD — volume flow supports the uptrend.'
        : '🔴 This indicator suggests SELL / CAUTION — volume flow suggests selling pressure.',
    });
  }

  const vwapVal = last(indicators.vwap);
  if (vwapVal) {
    rows.push({
      label: 'VWAP',
      value: fmtPrice(vwapVal),
      zone: currentPrice > vwapVal ? 'Above' : 'Below',
      action: currentPrice > vwapVal ? 'buy' : 'sell',
      explain: 'Volume Weighted Average Price — the "fair price" based on volume. Institutions use this to gauge if they\'re getting a good deal.',
      whatToDo: currentPrice > vwapVal
        ? 'Price is above VWAP — institutions consider this the "buying zone". The trend is in your favour.'
        : 'Price is below VWAP — institutions see this as the "selling zone". Wait for price to reclaim VWAP before buying.',
      actionSummary: currentPrice > vwapVal
        ? '🟢 This indicator suggests BUY — price is above fair value, trend is bullish.'
        : '🔴 This indicator suggests SELL / WAIT — price is below fair value.',
    });
  }

  rows.push(
    {
      label: 'Support',
      value: fmtPrice(indicators.support),
      action: currentPrice <= indicators.support * 1.02 ? 'buy' : 'hold',
      explain: 'The price level where buyers historically step in, creating a "floor" that prevents further drops.',
      whatToDo: `If price approaches ${fmtPrice(indicators.support)}, watch for a bounce. This is often a good place to set buy orders. If it breaks below, the next drop could be significant.`,
      actionSummary: currentPrice <= indicators.support * 1.02
        ? `🟢 This indicator suggests BUY — price is near support at ${fmtPrice(indicators.support)}, a potential bounce zone.`
        : `🟡 This indicator suggests HOLD — support is at ${fmtPrice(indicators.support)}, ${((currentPrice - indicators.support) / currentPrice * 100).toFixed(1)}% below current price.`,
    },
    {
      label: 'Resistance',
      value: fmtPrice(indicators.resistance),
      action: currentPrice >= indicators.resistance * 0.98 ? 'sell' : 'hold',
      explain: 'The price level where sellers historically appear, creating a "ceiling" that prevents further rises.',
      whatToDo: `If price approaches ${fmtPrice(indicators.resistance)}, it may stall or pull back. A break above this level is bullish and could trigger a larger move up.`,
      actionSummary: currentPrice >= indicators.resistance * 0.98
        ? `🔴 This indicator suggests SELL / TAKE PROFIT — price is near resistance at ${fmtPrice(indicators.resistance)}.`
        : `🟡 This indicator suggests HOLD — resistance is at ${fmtPrice(indicators.resistance)}, ${((indicators.resistance - currentPrice) / currentPrice * 100).toFixed(1)}% above current price.`,
    },
  );

  const actionIcon = (action: 'buy' | 'sell' | 'hold') => {
    if (action === 'buy') return <TrendingUp className="w-3 h-3 text-positive" />;
    if (action === 'sell') return <TrendingDown className="w-3 h-3 text-negative" />;
    return <Minus className="w-3 h-3 text-warning" />;
  };

  return (
    <div className="bg-card border border-border rounded-xl p-3 sm:p-5">
      <div className="mb-4">
        <h3 className="text-foreground font-semibold text-sm">Technical Indicators</h3>
        <div className="flex items-start gap-1.5 mt-1.5 bg-muted/30 rounded-md p-2">
          <Info className="w-3 h-3 text-primary mt-0.5 shrink-0" />
          <p className="text-[10px] text-muted-foreground leading-relaxed">
            These are mathematical tools that analyse price history to identify trends, momentum, and turning points.
            <strong className="text-foreground"> Tap any indicator</strong> to see what it means and what action it suggests.
          </p>
        </div>
        <div className="flex items-start gap-1.5 mt-1.5 bg-primary/5 rounded-md p-2 border border-primary/15">
          <Info className="w-3 h-3 text-primary mt-0.5 shrink-0" />
          <p className="text-[10px] text-primary/80 leading-relaxed">
            <strong>Note:</strong> Each indicator shows its own individual reading. These may differ from the overall signal above, which weighs all indicators together. The overall signal is what you should follow — individual readings are for context only.
          </p>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {rows.map(row => (
          <details key={row.label} className="group rounded-lg bg-muted/20 border border-border/50">
            <summary className="flex items-center justify-between py-2 px-3 cursor-pointer list-none gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                {actionIcon(row.action)}
                <span className="text-xs text-muted-foreground truncate">{row.label}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
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
              {/* Clear action recommendation */}
              <div className={`flex items-start gap-1.5 rounded-md p-2 ${
                row.action === 'buy' ? 'bg-positive/8 border border-positive/15' :
                row.action === 'sell' ? 'bg-negative/8 border border-negative/15' :
                'bg-warning/8 border border-warning/15'
              }`}>
                <p className={`text-[10px] font-medium leading-relaxed ${
                  row.action === 'buy' ? 'text-positive' :
                  row.action === 'sell' ? 'text-negative' :
                  'text-warning'
                }`}>{row.actionSummary}</p>
              </div>
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}
