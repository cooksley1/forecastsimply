import type { Indicators } from '@/types/analysis';
import { fmtPrice } from '@/utils/format';

interface Props {
  indicators: Indicators;
  currentPrice: number;
}

export default function IndicatorsPanel({ indicators, currentPrice }: Props) {
  const last = (arr: number[]) => arr.filter(v => !isNaN(v)).pop();

  const rows = [
    { label: 'RSI (14)', value: indicators.currentRsi.toFixed(1), zone: indicators.currentRsi < 30 ? 'Oversold' : indicators.currentRsi > 70 ? 'Overbought' : 'Neutral' },
    { label: 'SMA 20', value: last(indicators.sma20) ? fmtPrice(last(indicators.sma20)!) : 'N/A', zone: currentPrice > (last(indicators.sma20) || 0) ? 'Above' : 'Below' },
    { label: 'SMA 50', value: last(indicators.sma50) ? fmtPrice(last(indicators.sma50)!) : 'N/A', zone: currentPrice > (last(indicators.sma50) || 0) ? 'Above' : 'Below' },
    { label: 'BB Upper', value: last(indicators.bbUpper) ? fmtPrice(last(indicators.bbUpper)!) : 'N/A' },
    { label: 'BB Lower', value: last(indicators.bbLower) ? fmtPrice(last(indicators.bbLower)!) : 'N/A' },
    { label: 'MACD', value: last(indicators.macdLine)?.toFixed(4) || 'N/A' },
    { label: 'MACD Signal', value: last(indicators.macdSignal)?.toFixed(4) || 'N/A' },
    { label: 'Stochastic %K', value: last(indicators.stochasticK)?.toFixed(1) || 'N/A', zone: (last(indicators.stochasticK) || 50) < 20 ? 'Oversold' : (last(indicators.stochasticK) || 50) > 80 ? 'Overbought' : 'Neutral' },
    { label: 'Support', value: fmtPrice(indicators.support) },
    { label: 'Resistance', value: fmtPrice(indicators.resistance) },
  ];

  return (
    <div className="bg-sf-card border border-border rounded-xl p-5">
      <h3 className="text-foreground font-semibold text-sm mb-4">Raw Indicators</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {rows.map(row => (
          <div key={row.label} className="flex items-center justify-between py-2 px-3 rounded-lg bg-sf-inset">
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
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
