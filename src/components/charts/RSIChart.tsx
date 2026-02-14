import {
  LineChart, Line, XAxis, YAxis, ResponsiveContainer, CartesianGrid, ReferenceLine, ReferenceArea,
} from 'recharts';
import type { TechnicalData } from '@/types/analysis';

interface Props {
  data: TechnicalData;
}

export default function RSIChart({ data }: Props) {
  const chartData = data.indicators.rsi
    .map((val, i) => ({
      time: data.prices[i]?.timestamp,
      rsi: isNaN(val) ? undefined : val,
    }))
    .filter(d => d.rsi !== undefined);

  return (
    <div className="bg-sf-card border border-border rounded-xl p-4">
      <h3 className="text-foreground font-semibold text-sm mb-3">
        RSI (14) — <span className="font-mono text-primary">{data.indicators.currentRsi.toFixed(1)}</span>
      </h3>
      <ResponsiveContainer width="100%" height={120}>
        <LineChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(216 30% 18% / 0.3)" />
          <XAxis dataKey="time" tick={false} axisLine={{ stroke: 'hsl(216 30% 18%)' }} />
          <YAxis domain={[0, 100]} ticks={[30, 50, 70]} tick={{ fill: 'hsl(213 20% 55%)', fontSize: 9, fontFamily: 'JetBrains Mono' }} axisLine={false} />
          <ReferenceArea y1={70} y2={100} fill="hsl(0 84% 60% / 0.08)" />
          <ReferenceArea y1={0} y2={30} fill="hsl(142 71% 45% / 0.08)" />
          <ReferenceLine y={30} stroke="hsl(142 71% 45% / 0.3)" strokeDasharray="4 4" />
          <ReferenceLine y={70} stroke="hsl(0 84% 60% / 0.3)" strokeDasharray="4 4" />
          <ReferenceLine y={50} stroke="hsl(213 20% 55% / 0.2)" strokeDasharray="2 4" />
          <Line dataKey="rsi" stroke="hsl(263 91% 66%)" strokeWidth={1.5} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
