import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import type { TechnicalData } from '@/types/analysis';
import { fmtCompact } from '@/utils/format';

interface Props {
  data: TechnicalData;
}

export default function VolumeChart({ data }: Props) {
  const chartData = data.prices
    .filter(p => p.volume && p.volume > 0)
    .map(p => ({
      time: p.timestamp,
      volume: p.volume,
    }));

  if (chartData.length === 0) return null;

  return (
    <div className="bg-sf-card border border-border rounded-xl p-3 sm:p-4">
      <div className="mb-2 sm:mb-3">
        <h3 className="text-foreground font-semibold text-xs sm:text-sm">Volume</h3>
        <p className="text-[10px] text-muted-foreground/70 mt-0.5">How much was traded each period. High volume on a price move = strong conviction. Low volume = weak move that may reverse.</p>
      </div>
      <ResponsiveContainer width="100%" height={100}>
        <BarChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(216 30% 18% / 0.3)" />
          <XAxis dataKey="time" tick={false} axisLine={{ stroke: 'hsl(216 30% 18%)' }} />
          <YAxis tick={{ fill: 'hsl(213 20% 55%)', fontSize: 9, fontFamily: 'JetBrains Mono' }} axisLine={false} tickFormatter={(v: number) => fmtCompact(v)} width={40} />
          <Bar dataKey="volume" fill="hsl(213 20% 55% / 0.3)" radius={[2, 2, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
