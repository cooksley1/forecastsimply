import { useState, useRef, useCallback, useMemo } from 'react';
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

function getFormatTime(spanDays: number) {
  return (ts: number) => {
    const d = new Date(ts);
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    if (spanDays < 0.25) {
      return `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;
    } else if (spanDays < 2) {
      return `${d.getHours().toString().padStart(2,'0')}:00`;
    } else if (spanDays < 60) {
      return `${months[d.getMonth()]} ${d.getDate()}`;
    } else if (spanDays < 365) {
      return `${months[d.getMonth()]} '${String(d.getFullYear()).slice(2)}`;
    } else {
      return `${months[d.getMonth()]} '${String(d.getFullYear()).slice(2)}`;
    }
  };
}

function getFormatTooltipLabel(spanDays: number) {
  return (ts: number) => {
    const d = new Date(ts);
    if (spanDays < 2) {
      return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  };
}

export default function MainChart({ data, timeframeDays = 90 }: Props) {
  const isMobile = useIsMobile();
  const { prices, indicators, forecasts } = data;

  // Zoom state: start/end as fraction of combined array [0, 1]
  const [zoomStart, setZoomStart] = useState(0);
  const [zoomEnd, setZoomEnd] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);
  const pinchRef = useRef<{ startDist: number; startZoomStart: number; startZoomEnd: number } | null>(null);

  const combined = useMemo(() => {
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

    return [
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
  }, [prices, indicators, forecasts]);

  // Reset zoom when data changes
  const prevDataLen = useRef(combined.length);
  if (combined.length !== prevDataLen.current) {
    prevDataLen.current = combined.length;
    if (zoomStart !== 0 || zoomEnd !== 1) {
      setZoomStart(0);
      setZoomEnd(1);
    }
  }

  // Slice visible data based on zoom
  const visibleData = useMemo(() => {
    const startIdx = Math.floor(zoomStart * combined.length);
    const endIdx = Math.ceil(zoomEnd * combined.length);
    return combined.slice(Math.max(0, startIdx), Math.min(combined.length, endIdx));
  }, [combined, zoomStart, zoomEnd]);

  // Compute span from visible data
  const firstTs = visibleData[0]?.time || 0;
  const lastTs = visibleData[visibleData.length - 1]?.time || 0;
  const spanDays = (lastTs - firstTs) / 86_400_000;

  const formatTime = useMemo(() => getFormatTime(spanDays), [spanDays]);
  const formatTooltipLabel = useMemo(() => getFormatTooltipLabel(spanDays), [spanDays]);

  // Pinch-to-zoom handlers
  const getTouchDist = (touches: React.TouchList) => {
    if (touches.length < 2) return 0;
    const t0 = touches.item(0)!;
    const t1 = touches.item(1)!;
    const dx = t1.clientX - t0.clientX;
    const dy = t1.clientY - t0.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const getTouchCenter = (touches: React.TouchList) => {
    if (touches.length < 2) return 0.5;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return 0.5;
    const t0 = touches.item(0)!;
    const t1 = touches.item(1)!;
    const cx = (t0.clientX + t1.clientX) / 2;
    return Math.max(0, Math.min(1, (cx - rect.left) / rect.width));
  };

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      pinchRef.current = {
        startDist: getTouchDist(e.touches),
        startZoomStart: zoomStart,
        startZoomEnd: zoomEnd,
      };
    }
  }, [zoomStart, zoomEnd]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2 && pinchRef.current) {
      e.preventDefault();
      const currentDist = getTouchDist(e.touches);
      const scale = pinchRef.current.startDist / currentDist; // >1 = pinch in (zoom out), <1 = pinch out (zoom in)
      const center = getTouchCenter(e.touches);

      const origRange = pinchRef.current.startZoomEnd - pinchRef.current.startZoomStart;
      const newRange = Math.max(0.02, Math.min(1, origRange * scale));

      const origCenter = pinchRef.current.startZoomStart + origRange * center;
      let newStart = origCenter - newRange * center;
      let newEnd = newStart + newRange;

      // Clamp
      if (newStart < 0) { newStart = 0; newEnd = newRange; }
      if (newEnd > 1) { newEnd = 1; newStart = 1 - newRange; }

      setZoomStart(Math.max(0, newStart));
      setZoomEnd(Math.min(1, newEnd));
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    pinchRef.current = null;
  }, []);

  // Mouse wheel zoom (desktop)
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (!e.ctrlKey && !e.metaKey) return; // Only zoom with Ctrl/Cmd + scroll
    e.preventDefault();
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mouseX = (e.clientX - rect.left) / rect.width;
    const zoomFactor = e.deltaY > 0 ? 1.1 : 0.9;

    const range = zoomEnd - zoomStart;
    const newRange = Math.max(0.02, Math.min(1, range * zoomFactor));
    const center = zoomStart + range * mouseX;

    let newStart = center - newRange * mouseX;
    let newEnd = newStart + newRange;

    if (newStart < 0) { newStart = 0; newEnd = newRange; }
    if (newEnd > 1) { newEnd = 1; newStart = 1 - newRange; }

    setZoomStart(Math.max(0, newStart));
    setZoomEnd(Math.min(1, newEnd));
  }, [zoomStart, zoomEnd]);

  const isZoomed = zoomStart > 0.001 || zoomEnd < 0.999;

  const resetZoom = useCallback(() => {
    setZoomStart(0);
    setZoomEnd(1);
  }, []);

  const primaryForecast = forecasts[0];
  const hasSma200 = indicators.sma200 && indicators.sma200.some(v => !isNaN(v));

  return (
    <div className="bg-sf-card border border-border rounded-xl p-3 sm:p-4">
      <div className="flex items-center justify-between mb-2 sm:mb-3">
        <div className="flex items-center gap-2">
          <h3 className="text-foreground font-semibold text-xs sm:text-sm">Price Chart</h3>
          {isZoomed && (
            <button
              onClick={resetZoom}
              className="text-[9px] font-mono text-primary bg-primary/10 px-1.5 py-0.5 rounded hover:bg-primary/20 transition-colors"
            >
              Reset Zoom
            </button>
          )}
        </div>
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
      <div
        ref={containerRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onWheel={handleWheel}
        className="touch-none"
      >
        <ResponsiveContainer width="100%" height={isMobile ? 240 : 350}>
          <ComposedChart data={visibleData} margin={{ top: 5, right: 5, left: isMobile ? 0 : 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(216 30% 18% / 0.5)" />
            <XAxis dataKey="time" tickFormatter={formatTime} tick={{ fill: 'hsl(213 20% 55%)', fontSize: isMobile ? 8 : 10, fontFamily: 'JetBrains Mono' }} axisLine={{ stroke: 'hsl(216 30% 18%)' }} interval="preserveStartEnd" minTickGap={isMobile ? 40 : 60} />
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
      {isZoomed && (
        <div className="mt-1 flex items-center gap-2">
          <div className="flex-1 h-1 bg-muted rounded-full relative">
            <div
              className="absolute h-full bg-primary/40 rounded-full"
              style={{ left: `${zoomStart * 100}%`, width: `${(zoomEnd - zoomStart) * 100}%` }}
            />
          </div>
          <span className="text-[9px] font-mono text-muted-foreground">
            {Math.round((zoomEnd - zoomStart) * 100)}%
          </span>
        </div>
      )}
    </div>
  );
}
