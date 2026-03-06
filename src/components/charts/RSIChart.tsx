import { Info } from 'lucide-react';
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

  const currentRsi = data.indicators.currentRsi;
  const zone = currentRsi < 30 ? 'oversold' : currentRsi > 70 ? 'overbought' : 'neutral';

  return (
    <div className="bg-card border border-border rounded-xl p-3 sm:p-4 space-y-2">
      <div>
        <div className="flex items-center justify-between">
          <h3 className="text-foreground font-semibold text-xs sm:text-sm">
            RSI (14) — <span className="font-mono text-primary">{currentRsi.toFixed(1)}</span>
          </h3>
          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
            zone === 'oversold' ? 'bg-positive/15 text-positive' :
            zone === 'overbought' ? 'bg-negative/15 text-negative' :
            'bg-warning/15 text-warning'
          }`}>
            {zone === 'oversold' ? 'Oversold' : zone === 'overbought' ? 'Overbought' : 'Neutral'}
          </span>
        </div>
      </div>

      {/* What am I looking at? */}
      <div className="bg-muted/30 rounded-md p-2">
        <div className="flex items-start gap-1.5">
          <Info className="w-3 h-3 text-primary mt-0.5 shrink-0" />
          <div className="text-[10px] text-muted-foreground leading-relaxed space-y-1">
            <p>
              <strong className="text-foreground">What is this chart?</strong> RSI measures how fast and how much the price has been moving recently, on a scale of 0 to 100.
            </p>
            <p>
              {zone === 'oversold' ? (
                <><strong className="text-positive">Currently oversold ({currentRsi.toFixed(0)})</strong> — the price has dropped significantly. This could mean it's "on sale" and may bounce back. Look for buying opportunities, but wait for confirmation (the line turning upward).</>
              ) : zone === 'overbought' ? (
                <><strong className="text-negative">Currently overbought ({currentRsi.toFixed(0)})</strong> — the price has risen fast. It may be due for a pullback. If you're holding, consider taking some profits. If you're looking to buy, it might be worth waiting for a dip.</>
              ) : (
                <><strong className="text-warning">Currently neutral ({currentRsi.toFixed(0)})</strong> — the price isn't stretched in either direction. No urgent action needed from RSI alone. Watch for it to move toward the green (oversold/buying) or red (overbought/caution) zones.</>
              )}
            </p>
          </div>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={100}>
        <LineChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.3)" horizontal={true} vertical={false} />
          <XAxis dataKey="time" tick={false} axisLine={{ stroke: 'hsl(var(--border))' }} />
          <YAxis domain={[0, 100]} ticks={[30, 50, 70]} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 9, fontFamily: 'monospace' }} axisLine={false} width={30} />
          <ReferenceArea y1={70} y2={100} fill="hsl(0 84% 60% / 0.08)" />
          <ReferenceArea y1={0} y2={30} fill="hsl(142 71% 45% / 0.08)" />
          <ReferenceLine y={30} stroke="hsl(142 71% 45% / 0.3)" strokeDasharray="4 4" />
          <ReferenceLine y={70} stroke="hsl(0 84% 60% / 0.3)" strokeDasharray="4 4" />
          <ReferenceLine y={50} stroke="hsl(var(--muted-foreground) / 0.2)" strokeDasharray="2 4" />
          <Line dataKey="rsi" stroke="hsl(var(--primary))" strokeWidth={1.5} dot={false} />
        </LineChart>
      </ResponsiveContainer>

      {/* Chart legend */}
      <div className="flex items-center justify-between text-[9px] text-muted-foreground/60">
        <span><span className="inline-block w-2 h-2 rounded-sm bg-positive/30 mr-1" />Green zone = oversold (potential buy)</span>
        <span><span className="inline-block w-2 h-2 rounded-sm bg-negative/30 mr-1" />Red zone = overbought (caution)</span>
      </div>
    </div>
  );
}
