import {
  Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Area, ComposedChart, ReferenceLine,
} from 'recharts';
import type { TechnicalData } from '@/types/analysis';
import { fmtPrice } from '@/utils/format';
import { useIsMobile } from '@/hooks/use-mobile';

interface Props {
  data: TechnicalData;
}

export default function MainChart({ data }: Props) {
  const isMobile = useIsMobile();
  const { prices, indicators, forecast } = data;

  const chartData = prices.map((p, i) => ({
    time: p.timestamp,
    price: p.close,
    sma20: isNaN(indicators.sma20[i]) ? undefined : indicators.sma20[i],
    sma50: isNaN(indicators.sma50[i]) ? undefined : indicators.sma50[i],
    bbUpper: isNaN(indicators.bbUpper[i]) ? undefined : indicators.bbUpper[i],
    bbLower: isNaN(indicators.bbLower[i]) ? undefined : indicators.bbLower[i],
    volume: p.volume,
  }));

  const forecastData = forecast.map(f => ({
    time: f.timestamp,
    forecast: f.value,
    fcUpper: f.upper,
    fcLower: f.lower,
  }));

  const combined = [
    ...chartData.map(d => ({ ...d, forecast: undefined as number | undefined, fcUpper: undefined as number | undefined, fcLower: undefined as number | undefined })),
    { time: prices[prices.length - 1].timestamp, price: prices[prices.length - 1].close, forecast: prices[prices.length - 1].close, sma20: undefined, sma50: undefined, bbUpper: undefined, bbLower: undefined, volume: undefined, fcUpper: prices[prices.length - 1].close, fcLower: prices[prices.length - 1].close },
    ...forecastData.map(d => ({ ...d, price: undefined as number | undefined, sma20: undefined, sma50: undefined, bbUpper: undefined, bbLower: undefined, volume: undefined })),
  ];

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    const day = d.getDate();
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${months[d.getMonth()]} ${day}`;
  };

  return (
    <div className="bg-sf-card border border-border rounded-xl p-3 sm:p-4">
      <div className="flex items-center justify-between mb-2 sm:mb-3">
        <h3 className="text-foreground font-semibold text-xs sm:text-sm">Price Chart</h3>
        <span className="text-[10px] sm:text-xs font-mono px-2 py-0.5 rounded bg-accent/15 text-accent">{data.marketPhase}</span>
      </div>
      <ResponsiveContainer width="100%" height={isMobile ? 240 : 350}>
        <ComposedChart data={combined} margin={{ top: 5, right: 5, left: isMobile ? 0 : 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(216 30% 18% / 0.5)" />
          <XAxis dataKey="time" tickFormatter={formatTime} tick={{ fill: 'hsl(213 20% 55%)', fontSize: isMobile ? 8 : 10, fontFamily: 'JetBrains Mono' }} axisLine={{ stroke: 'hsl(216 30% 18%)' }} interval={isMobile ? 'preserveStartEnd' : undefined} />
          <YAxis domain={['auto', 'auto']} tick={{ fill: 'hsl(213 20% 55%)', fontSize: isMobile ? 8 : 10, fontFamily: 'JetBrains Mono' }} axisLine={{ stroke: 'hsl(216 30% 18%)' }} tickFormatter={(v: number) => fmtPrice(v).replace('$', '')} width={isMobile ? 50 : 60} />
          <Tooltip
            contentStyle={{ background: 'hsl(220 45% 8%)', border: '1px solid hsl(216 30% 18%)', borderRadius: 8, fontFamily: 'JetBrains Mono', fontSize: 11 }}
            labelFormatter={(ts: number) => new Date(ts).toLocaleDateString()}
            formatter={(value: number, name: string) => [fmtPrice(value), name]}
          />
          <Area dataKey="bbUpper" stroke="none" fill="hsl(213 20% 55% / 0.08)" />
          <Area dataKey="bbLower" stroke="none" fill="transparent" />
          <Line dataKey="bbUpper" stroke="hsl(213 20% 55% / 0.3)" strokeWidth={1} strokeDasharray="4 4" dot={false} />
          <Line dataKey="bbLower" stroke="hsl(213 20% 55% / 0.3)" strokeWidth={1} strokeDasharray="4 4" dot={false} />
          <Line dataKey="sma20" stroke="hsl(38 92% 50%)" strokeWidth={1.5} dot={false} name="SMA20" />
          <Line dataKey="sma50" stroke="hsl(25 95% 53%)" strokeWidth={1.5} dot={false} name="SMA50" />
          <Line dataKey="price" stroke="hsl(187 100% 47%)" strokeWidth={2} dot={false} name="Price" />
          {!isMobile && (
            <>
              <ReferenceLine y={indicators.support} stroke="hsl(142 71% 45%)" strokeDasharray="6 4" label={{ value: `S: ${fmtPrice(indicators.support)}`, fill: 'hsl(142 71% 45%)', fontSize: 10, fontFamily: 'JetBrains Mono' }} />
              <ReferenceLine y={indicators.resistance} stroke="hsl(0 84% 60%)" strokeDasharray="6 4" label={{ value: `R: ${fmtPrice(indicators.resistance)}`, fill: 'hsl(0 84% 60%)', fontSize: 10, fontFamily: 'JetBrains Mono' }} />
            </>
          )}
          <Area dataKey="fcUpper" stroke="none" fill="hsl(263 91% 66% / 0.08)" />
          <Area dataKey="fcLower" stroke="none" fill="transparent" />
          <Line dataKey="forecast" stroke="hsl(142 71% 45%)" strokeWidth={2.5} strokeDasharray="6 4" dot={false} name="Forecast" />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
