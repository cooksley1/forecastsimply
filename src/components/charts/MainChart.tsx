import {
  Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Area, ComposedChart, ReferenceLine,
} from 'recharts';
import type { TechnicalData } from '@/types/analysis';
import { fmtPrice } from '@/utils/format';
import { useIsMobile } from '@/hooks/use-mobile';

interface Props {
  data: TechnicalData;
  timeframeDays?: number;
}

export default function MainChart({ data, timeframeDays = 90 }: Props) {
  const isMobile = useIsMobile();
  const { prices, indicators, forecasts } = data;

  const chartData = prices.map((p, i) => {
    const row: Record<string, any> = {
      time: p.timestamp,
      price: p.close,
      sma20: isNaN(indicators.sma20[i]) ? undefined : indicators.sma20[i],
      sma50: isNaN(indicators.sma50[i]) ? undefined : indicators.sma50[i],
      bbUpper: isNaN(indicators.bbUpper[i]) ? undefined : indicators.bbUpper[i],
      bbLower: isNaN(indicators.bbLower[i]) ? undefined : indicators.bbLower[i],
      volume: p.volume,
    };
    // SMA200
    if (indicators.sma200 && indicators.sma200[i] !== undefined && !isNaN(indicators.sma200[i])) {
      row.sma200 = indicators.sma200[i];
    }
    return row;
  });

  const lastPrice = prices[prices.length - 1];
  const maxForecastLen = Math.max(0, ...forecasts.map(f => f.points.length));

  const bridgePoint: Record<string, any> = {
    time: lastPrice.timestamp,
    price: lastPrice.close,
    sma20: undefined, sma50: undefined, sma200: undefined, bbUpper: undefined, bbLower: undefined, volume: undefined,
  };
  forecasts.forEach(f => {
    bridgePoint[`fc_${f.methodId}`] = lastPrice.close;
    bridgePoint[`fcU_${f.methodId}`] = lastPrice.close;
    bridgePoint[`fcL_${f.methodId}`] = lastPrice.close;
  });

  const forecastPoints: Record<string, any>[] = [];
  for (let i = 0; i < maxForecastLen; i++) {
    const point: Record<string, any> = {
      time: 0,
      price: undefined,
      sma20: undefined, sma50: undefined, sma200: undefined, bbUpper: undefined, bbLower: undefined, volume: undefined,
    };
    forecasts.forEach(f => {
      if (i < f.points.length) {
        point.time = f.points[i].timestamp;
        point[`fc_${f.methodId}`] = f.points[i].value;
        point[`fcU_${f.methodId}`] = f.points[i].upper;
        point[`fcL_${f.methodId}`] = f.points[i].lower;
      }
    });
    forecastPoints.push(point);
  }

  const combined = [
    ...chartData.map(d => {
      const row: Record<string, any> = { ...d };
      forecasts.forEach(f => {
        row[`fc_${f.methodId}`] = undefined;
        row[`fcU_${f.methodId}`] = undefined;
        row[`fcL_${f.methodId}`] = undefined;
      });
      return row;
    }),
    bridgePoint,
    ...forecastPoints,
  ];

  // Derive actual data span from timestamps to pick the right format
  const firstTs = combined[0]?.time || 0;
  const lastTs = combined[combined.length - 1]?.time || 0;
  const spanMs = lastTs - firstTs;
  const spanDays = spanMs / 86_400_000;

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    if (spanDays < 2) {
      // Under 2 days — just hours
      return `${d.getHours().toString().padStart(2,'0')}:00`;
    } else if (spanDays < 180) {
      // Under 6 months — month + day
      return `${months[d.getMonth()]} ${d.getDate()}`;
    } else if (spanDays < 900) {
      // Under ~2.5 years — month + short year
      return `${months[d.getMonth()]} '${String(d.getFullYear()).slice(2)}`;
    } else if (spanDays < 2000) {
      return `${months[d.getMonth()]} '${String(d.getFullYear()).slice(2)}`;
    } else {
      return `${d.getFullYear()}`;
    }
  };

  const formatTooltipLabel = (ts: number) => {
    const d = new Date(ts);
    if (spanDays < 2) {
      return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const primaryForecast = forecasts[0];
  const hasSma200 = indicators.sma200 && indicators.sma200.some(v => !isNaN(v));

  return (
    <div className="bg-sf-card border border-border rounded-xl p-3 sm:p-4">
      <div className="flex items-center justify-between mb-2 sm:mb-3">
        <h3 className="text-foreground font-semibold text-xs sm:text-sm">Price Chart</h3>
        <div className="flex items-center gap-2 flex-wrap">
          {forecasts.map(f => (
            <span key={f.methodId} className="flex items-center gap-1 text-[9px] sm:text-[10px] font-mono">
              <span className="w-3 h-0.5 rounded-full inline-block" style={{ backgroundColor: f.color }} />
              {f.label}
            </span>
          ))}
          {hasSma200 && (
            <span className="flex items-center gap-1 text-[9px] sm:text-[10px] font-mono text-muted-foreground">
              <span className="w-3 h-0.5 rounded-full inline-block border-b border-dashed border-muted-foreground" />
              SMA200
            </span>
          )}
          <span className="text-[10px] sm:text-xs font-mono px-2 py-0.5 rounded bg-accent/15 text-accent">{data.marketPhase}</span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={isMobile ? 240 : 350}>
        <ComposedChart data={combined} margin={{ top: 5, right: 5, left: isMobile ? 0 : 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(216 30% 18% / 0.5)" />
          <XAxis dataKey="time" tickFormatter={formatTime} tick={{ fill: 'hsl(213 20% 55%)', fontSize: isMobile ? 8 : 10, fontFamily: 'JetBrains Mono' }} axisLine={{ stroke: 'hsl(216 30% 18%)' }} interval={isMobile ? 'preserveStartEnd' : undefined} />
          <YAxis domain={['auto', 'auto']} tick={{ fill: 'hsl(213 20% 55%)', fontSize: isMobile ? 8 : 10, fontFamily: 'JetBrains Mono' }} axisLine={{ stroke: 'hsl(216 30% 18%)' }} tickFormatter={(v: number) => fmtPrice(v).replace('$', '')} width={isMobile ? 50 : 60} />
          <Tooltip
            contentStyle={{ background: 'hsl(220 45% 8%)', border: '1px solid hsl(216 30% 18%)', borderRadius: 8, fontFamily: 'JetBrains Mono', fontSize: 11 }}
            labelFormatter={formatTooltipLabel}
            formatter={(value: number, name: string) => [fmtPrice(value), name]}
          />
          <Area dataKey="bbUpper" stroke="none" fill="hsl(213 20% 55% / 0.08)" />
          <Area dataKey="bbLower" stroke="none" fill="transparent" />
          <Line dataKey="bbUpper" stroke="hsl(213 20% 55% / 0.3)" strokeWidth={1} strokeDasharray="4 4" dot={false} />
          <Line dataKey="bbLower" stroke="hsl(213 20% 55% / 0.3)" strokeWidth={1} strokeDasharray="4 4" dot={false} />
          <Line dataKey="sma20" stroke="hsl(38 92% 50%)" strokeWidth={1.5} dot={false} name="SMA20" />
          <Line dataKey="sma50" stroke="hsl(25 95% 53%)" strokeWidth={1.5} dot={false} name="SMA50" />
          {hasSma200 && (
            <Line dataKey="sma200" stroke="hsl(213 20% 55% / 0.6)" strokeWidth={1} strokeDasharray="8 4" dot={false} name="SMA200" />
          )}
          <Line dataKey="price" stroke="hsl(187 100% 47%)" strokeWidth={2} dot={false} name="Price" />
          {!isMobile && (
            <>
              <ReferenceLine y={indicators.support} stroke="hsl(142 71% 45%)" strokeDasharray="6 4" label={{ value: `S: ${fmtPrice(indicators.support)}`, fill: 'hsl(142 71% 45%)', fontSize: 10, fontFamily: 'JetBrains Mono' }} />
              <ReferenceLine y={indicators.resistance} stroke="hsl(0 84% 60%)" strokeDasharray="6 4" label={{ value: `R: ${fmtPrice(indicators.resistance)}`, fill: 'hsl(0 84% 60%)', fontSize: 10, fontFamily: 'JetBrains Mono' }} />
            </>
          )}

          {primaryForecast && (
            <>
              <Area dataKey={`fcU_${primaryForecast.methodId}`} stroke="none" fill={`${primaryForecast.color.replace(')', ' / 0.06)')}`} />
              <Area dataKey={`fcL_${primaryForecast.methodId}`} stroke="none" fill="transparent" />
            </>
          )}

          {forecasts.map(f => (
            <Line
              key={f.methodId}
              dataKey={`fc_${f.methodId}`}
              stroke={f.color}
              strokeWidth={2.5}
              strokeDasharray="6 4"
              dot={false}
              name={f.label}
            />
          ))}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
