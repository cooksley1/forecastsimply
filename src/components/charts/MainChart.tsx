import { useState, useRef, useCallback, useMemo } from 'react';
import {
  Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Area, ComposedChart, ReferenceLine,
} from 'recharts';
import type { TechnicalData } from '@/types/analysis';
import type { OverlayId } from './AnalysisOverlayBar';
import { fmtPrice } from '@/utils/format';
import { useIsMobile } from '@/hooks/use-mobile';

interface Props {
  data: TechnicalData;
  timeframeDays?: number;
  activeOverlays?: OverlayId[];
  fullscreen?: boolean;
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

export default function MainChart({ data, timeframeDays = 90, activeOverlays = [], fullscreen = false }: Props) {
  const isMobile = useIsMobile();
  const { prices, indicators, forecasts } = data;
  const overlayData = (data as any).overlayData;

  const [zoomStart, setZoomStart] = useState(0);
  const [zoomEnd, setZoomEnd] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);
  const pinchRef = useRef<{ startDist: number; startZoomStart: number; startZoomEnd: number } | null>(null);

  const showBB = activeOverlays.includes('bollinger');
  const showVWAP = activeOverlays.includes('vwap');
  const showEMACross = activeOverlays.includes('ema_cross');
  const showIchimoku = activeOverlays.includes('ichimoku');
  const showFib = activeOverlays.includes('fibonacci');
  const hasActiveOverlays = activeOverlays.length > 0;

  // When overlays are active, fade base lines so overlays pop
  const baseFade = hasActiveOverlays ? 0.25 : 1;
  const priceFade = hasActiveOverlays ? 0.5 : 1;

  const combined = useMemo(() => {
    const chartData = prices.map((p, i) => {
      const row: Record<string, any> = {
        time: p.timestamp,
        price: p.close,
        sma20: isNaN(indicators.sma20[i]) ? undefined : indicators.sma20[i],
        sma50: isNaN(indicators.sma50[i]) ? undefined : indicators.sma50[i],
        volume: p.volume,
      };
      if (indicators.sma200 && indicators.sma200[i] !== undefined && !isNaN(indicators.sma200[i])) {
        row.sma200 = indicators.sma200[i];
      }
      // Overlay data
      if (showBB) {
        row.bbUpper = isNaN(indicators.bbUpper[i]) ? undefined : indicators.bbUpper[i];
        row.bbLower = isNaN(indicators.bbLower[i]) ? undefined : indicators.bbLower[i];
      }
      if (showVWAP && overlayData?.vwap) {
        row.vwap = overlayData.vwap[i];
      }
      if (showEMACross && overlayData?.emaPair) {
        row.ema12 = overlayData.emaPair.ema12[i];
        row.ema26 = overlayData.emaPair.ema26[i];
      }
      if (showIchimoku && overlayData?.ichimoku) {
        const ichi = overlayData.ichimoku;
        row.tenkan = isNaN(ichi.tenkan[i]) ? undefined : ichi.tenkan[i];
        row.kijun = isNaN(ichi.kijun[i]) ? undefined : ichi.kijun[i];
        row.senkouA = isNaN(ichi.senkouA[i]) ? undefined : ichi.senkouA[i];
        row.senkouB = isNaN(ichi.senkouB[i]) ? undefined : ichi.senkouB[i];
      }
      return row;
    });

    const lastPrice = prices[prices.length - 1];
    const maxForecastLen = Math.max(0, ...forecasts.map(f => f.points.length));

    const bridgePoint: Record<string, any> = {
      time: lastPrice.timestamp,
      price: lastPrice.close,
      sma20: undefined, sma50: undefined, sma200: undefined, bbUpper: undefined, bbLower: undefined, volume: undefined,
      vwap: undefined, ema12: undefined, ema26: undefined, tenkan: undefined, kijun: undefined, senkouA: undefined, senkouB: undefined,
    };
    forecasts.forEach(f => {
      bridgePoint[`fc_${f.methodId}`] = lastPrice.close;
      bridgePoint[`fcU_${f.methodId}`] = lastPrice.close;
      bridgePoint[`fcL_${f.methodId}`] = lastPrice.close;
    });

    const forecastPoints: Record<string, any>[] = [];
    for (let i = 0; i < maxForecastLen; i++) {
      const point: Record<string, any> = {
        time: 0, price: undefined,
        sma20: undefined, sma50: undefined, sma200: undefined, bbUpper: undefined, bbLower: undefined, volume: undefined,
        vwap: undefined, ema12: undefined, ema26: undefined, tenkan: undefined, kijun: undefined, senkouA: undefined, senkouB: undefined,
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
  }, [prices, indicators, forecasts, showBB, showVWAP, showEMACross, showIchimoku, overlayData]);

  // Reset zoom when data changes
  const prevDataLen = useRef(combined.length);
  if (combined.length !== prevDataLen.current) {
    prevDataLen.current = combined.length;
    if (zoomStart !== 0 || zoomEnd !== 1) {
      setZoomStart(0);
      setZoomEnd(1);
    }
  }

  const visibleData = useMemo(() => {
    const startIdx = Math.floor(zoomStart * combined.length);
    const endIdx = Math.ceil(zoomEnd * combined.length);
    return combined.slice(Math.max(0, startIdx), Math.min(combined.length, endIdx));
  }, [combined, zoomStart, zoomEnd]);

  const firstTs = visibleData[0]?.time || 0;
  const lastTs = visibleData[visibleData.length - 1]?.time || 0;
  const spanDays = (lastTs - firstTs) / 86_400_000;

  const formatTime = useMemo(() => getFormatTime(spanDays), [spanDays]);
  const formatTooltipLabel = useMemo(() => getFormatTooltipLabel(spanDays), [spanDays]);

  // Pinch-to-zoom handlers
  const getTouchDist = (touches: React.TouchList) => {
    if (touches.length < 2) return 0;
    const dx = touches.item(1)!.clientX - touches.item(0)!.clientX;
    const dy = touches.item(1)!.clientY - touches.item(0)!.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const getTouchCenter = (touches: React.TouchList) => {
    if (touches.length < 2) return 0.5;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return 0.5;
    const cx = (touches.item(0)!.clientX + touches.item(1)!.clientX) / 2;
    return Math.max(0, Math.min(1, (cx - rect.left) / rect.width));
  };

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      pinchRef.current = { startDist: getTouchDist(e.touches), startZoomStart: zoomStart, startZoomEnd: zoomEnd };
    }
  }, [zoomStart, zoomEnd]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2 && pinchRef.current) {
      e.preventDefault();
      const currentDist = getTouchDist(e.touches);
      const scale = pinchRef.current.startDist / currentDist;
      const center = getTouchCenter(e.touches);
      const origRange = pinchRef.current.startZoomEnd - pinchRef.current.startZoomStart;
      const newRange = Math.max(0.02, Math.min(1, origRange * scale));
      const origCenter = pinchRef.current.startZoomStart + origRange * center;
      let newStart = origCenter - newRange * center;
      let newEnd = newStart + newRange;
      if (newStart < 0) { newStart = 0; newEnd = newRange; }
      if (newEnd > 1) { newEnd = 1; newStart = 1 - newRange; }
      setZoomStart(Math.max(0, newStart));
      setZoomEnd(Math.min(1, newEnd));
    }
  }, []);

  const handleTouchEnd = useCallback(() => { pinchRef.current = null; }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (!e.ctrlKey && !e.metaKey) return;
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
  const resetZoom = useCallback(() => { setZoomStart(0); setZoomEnd(1); }, []);

  const primaryForecast = forecasts[0];
  const hasSma200 = indicators.sma200 && indicators.sma200.some(v => !isNaN(v));

  // Fibonacci levels
  const fibLevels = overlayData?.fibonacci;

  return (
    <div className={`bg-card border border-border rounded-xl p-3 sm:p-4 ${fullscreen ? 'h-full flex flex-col' : ''}`}>
      <div className="flex items-center justify-between mb-2 sm:mb-3 pr-8 sm:pr-0">
        <div className="flex items-center gap-2">
          <h3 className="text-foreground font-semibold text-xs sm:text-sm">Price Chart</h3>
          {isZoomed && (
            <button onClick={resetZoom} className="text-[9px] font-mono text-primary bg-primary/10 px-1.5 py-0.5 rounded hover:bg-primary/20 transition-colors">
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

      {/* Active overlay legend — richer with color swatches */}
      {activeOverlays.length > 0 && (
        <div className="flex items-center gap-3 flex-wrap mb-2 px-1 py-1.5 rounded-lg bg-muted/30 border border-border/50">
          <span className="text-[8px] font-mono text-muted-foreground uppercase tracking-wider">Active:</span>
          {showBB && (
            <span className="flex items-center gap-1.5 text-[10px] font-mono font-medium" style={{ color: 'hsl(213 70% 60%)' }}>
              <span className="w-4 h-1 rounded-full inline-block" style={{ backgroundColor: 'hsl(213 70% 60%)', opacity: 0.7, border: '1px dashed hsl(213 70% 60%)' }} />
              Bollinger Bands
            </span>
          )}
          {showVWAP && (
            <span className="flex items-center gap-1.5 text-[10px] font-mono font-medium" style={{ color: 'hsl(280 70% 60%)' }}>
              <span className="w-4 h-0.5 rounded-full inline-block" style={{ backgroundColor: 'hsl(280 70% 60%)' }} />
              VWAP
            </span>
          )}
          {showEMACross && (
            <span className="flex items-center gap-1.5 text-[10px] font-mono font-medium" style={{ color: 'hsl(340 80% 55%)' }}>
              <span className="flex gap-0.5">
                <span className="w-2 h-0.5 rounded-full inline-block" style={{ backgroundColor: 'hsl(340 80% 55%)' }} />
                <span className="w-2 h-0.5 rounded-full inline-block" style={{ backgroundColor: 'hsl(340 50% 40%)' }} />
              </span>
              EMA 12/26
            </span>
          )}
          {showIchimoku && (
            <span className="flex items-center gap-1.5 text-[10px] font-mono font-medium" style={{ color: 'hsl(160 60% 55%)' }}>
              <span className="w-4 h-2 rounded inline-block" style={{ background: 'linear-gradient(to bottom, hsl(160 60% 45% / 0.4), hsl(0 60% 45% / 0.3))', border: '1px solid hsl(160 60% 45% / 0.5)' }} />
              Ichimoku
            </span>
          )}
          {showFib && (
            <span className="flex items-center gap-1.5 text-[10px] font-mono font-medium" style={{ color: 'hsl(45 90% 55%)' }}>
              <span className="w-4 h-0.5 inline-block" style={{ borderBottom: '2px dashed hsl(45 90% 55%)' }} />
              Fibonacci
            </span>
          )}
        </div>
      )}

      <div
        ref={containerRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onWheel={handleWheel}
        className={`touch-none ${fullscreen ? 'flex-1 min-h-0' : ''}`}
      >
        <ResponsiveContainer width="100%" height={fullscreen ? '100%' : isMobile ? 240 : 350}>
          <ComposedChart data={visibleData} margin={{ top: 5, right: 5, left: isMobile ? 0 : 10, bottom: 30 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.4)" horizontal={true} vertical={false} />
            <XAxis dataKey="time" tickFormatter={formatTime} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: isMobile ? 8 : 10, fontFamily: 'JetBrains Mono' }} axisLine={{ stroke: 'hsl(var(--border))' }} interval="preserveStartEnd" minTickGap={isMobile ? 30 : 50} angle={-45} textAnchor="end" dy={10} />
            <YAxis domain={['auto', 'auto']} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: isMobile ? 8 : 10, fontFamily: 'JetBrains Mono' }} axisLine={{ stroke: 'hsl(var(--border))' }} tickFormatter={(v: number) => fmtPrice(v).replace('$', '')} width={isMobile ? 50 : 60} />
            <Tooltip
              contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontFamily: 'JetBrains Mono', fontSize: 11, color: 'hsl(var(--popover-foreground))' }}
              labelFormatter={formatTooltipLabel}
              formatter={(value: number, name: string) => [fmtPrice(value), name]}
            />

            {/* Ichimoku Cloud — bolder fills and lines */}
            {showIchimoku && (
              <>
                <Area dataKey="senkouA" stroke="none" fill="hsl(160 60% 45% / 0.40)" />
                <Area dataKey="senkouB" stroke="none" fill="hsl(0 60% 45% / 0.35)" />
                <Line dataKey="tenkan" stroke="hsl(160 80% 65%)" strokeWidth={2.5} dot={false} name="Tenkan (9)" />
                <Line dataKey="kijun" stroke="hsl(0 80% 65%)" strokeWidth={2.5} dot={false} name="Kijun (26)" />
                <Line dataKey="senkouA" stroke="hsl(160 70% 55% / 0.8)" strokeWidth={1.5} strokeDasharray="4 4" dot={false} name="Senkou A" />
                <Line dataKey="senkouB" stroke="hsl(0 70% 55% / 0.8)" strokeWidth={1.5} strokeDasharray="4 4" dot={false} name="Senkou B" />
              </>
            )}

            {/* Bollinger Bands — stronger fill and thicker lines */}
            {showBB && (
              <>
                <Area dataKey="bbUpper" stroke="none" fill="hsl(213 70% 60% / 0.30)" />
                <Area dataKey="bbLower" stroke="none" fill="transparent" />
                <Line dataKey="bbUpper" stroke="hsl(213 80% 70%)" strokeWidth={2} strokeDasharray="6 3" dot={false} name="BB Upper" />
                <Line dataKey="bbLower" stroke="hsl(213 80% 70%)" strokeWidth={2} strokeDasharray="6 3" dot={false} name="BB Lower" />
              </>
            )}

            {/* VWAP — thicker */}
            {showVWAP && (
              <Line dataKey="vwap" stroke="hsl(280 80% 65%)" strokeWidth={3} dot={false} name="VWAP" />
            )}

            {/* EMA 12/26 — thicker, more distinct colors */}
            {showEMACross && (
              <>
                <Line dataKey="ema12" stroke="hsl(340 90% 65%)" strokeWidth={2.5} dot={false} name="EMA 12 (fast)" />
                <Line dataKey="ema26" stroke="hsl(340 55% 55%)" strokeWidth={2.5} strokeDasharray="8 4" dot={false} name="EMA 26 (slow)" />
              </>
            )}

            {/* SMAs — fade when overlays active */}
            <Line dataKey="sma20" stroke={`hsl(38 92% 55% / ${baseFade})`} strokeWidth={hasActiveOverlays ? 1.5 : 2} dot={false} name="SMA20" />
            <Line dataKey="sma50" stroke={`hsl(25 95% 58% / ${baseFade})`} strokeWidth={hasActiveOverlays ? 1.5 : 2} dot={false} name="SMA50" />
            {hasSma200 && (
              <Line dataKey="sma200" stroke={`hsl(213 20% 55% / ${baseFade * 0.6})`} strokeWidth={1} strokeDasharray="8 4" dot={false} name="SMA200" />
            )}

            {/* Price line — slightly faded when overlays active so they stand out */}
            <Line dataKey="price" stroke={`hsl(187 100% 47% / ${priceFade})`} strokeWidth={2} dot={false} name="Price" />

            {/* Fibonacci Retracement levels — shown on all screens */}
            {showFib && fibLevels && (
              <>
                <ReferenceLine y={fibLevels.level236} stroke="hsl(45 90% 60% / 0.7)" strokeWidth={1.5} strokeDasharray="4 4" label={{ value: isMobile ? '23.6' : '23.6%', fill: 'hsl(45 90% 60%)', fontSize: isMobile ? 8 : 10, fontFamily: 'JetBrains Mono', position: 'right' }} />
                <ReferenceLine y={fibLevels.level382} stroke="hsl(45 90% 60% / 0.8)" strokeWidth={1.5} strokeDasharray="4 4" label={{ value: isMobile ? '38.2' : '38.2%', fill: 'hsl(45 90% 60%)', fontSize: isMobile ? 8 : 10, fontFamily: 'JetBrains Mono', position: 'right' }} />
                <ReferenceLine y={fibLevels.level500} stroke="hsl(45 90% 65% / 0.9)" strokeWidth={2} strokeDasharray="6 4" label={{ value: '50%', fill: 'hsl(45 90% 65%)', fontSize: isMobile ? 9 : 11, fontFamily: 'JetBrains Mono', fontWeight: 600, position: 'right' }} />
                <ReferenceLine y={fibLevels.level618} stroke="hsl(45 90% 60%)" strokeWidth={2} strokeDasharray="6 4" label={{ value: '61.8%', fill: 'hsl(45 90% 60%)', fontSize: isMobile ? 9 : 11, fontFamily: 'JetBrains Mono', fontWeight: 700, position: 'right' }} />
                <ReferenceLine y={fibLevels.level786} stroke="hsl(45 90% 60% / 0.7)" strokeWidth={1.5} strokeDasharray="4 4" label={{ value: isMobile ? '78.6' : '78.6%', fill: 'hsl(45 90% 60%)', fontSize: isMobile ? 8 : 10, fontFamily: 'JetBrains Mono', position: 'right' }} />
              </>
            )}

            {/* Support/Resistance */}
            {!isMobile && (
              <>
                <ReferenceLine y={indicators.support} stroke={`hsl(142 71% 45% / ${baseFade})`} strokeDasharray="6 4" label={{ value: `S: ${fmtPrice(indicators.support)}`, fill: `hsl(142 71% 45% / ${baseFade})`, fontSize: 10, fontFamily: 'JetBrains Mono' }} />
                <ReferenceLine y={indicators.resistance} stroke={`hsl(0 84% 60% / ${baseFade})`} strokeDasharray="6 4" label={{ value: `R: ${fmtPrice(indicators.resistance)}`, fill: `hsl(0 84% 60% / ${baseFade})`, fontSize: 10, fontFamily: 'JetBrains Mono' }} />
              </>
            )}

            {/* Forecast bands */}
            {primaryForecast && (
              <>
                <Area dataKey={`fcU_${primaryForecast.methodId}`} stroke="none" fill={`${primaryForecast.color.replace(')', ' / 0.12)')}`} />
                <Area dataKey={`fcL_${primaryForecast.methodId}`} stroke="none" fill="transparent" />
              </>
            )}

            {forecasts.map(f => (
              <Line key={f.methodId} dataKey={`fc_${f.methodId}`} stroke={f.color} strokeWidth={2.5} strokeDasharray="6 4" dot={false} name={f.label} />
            ))}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      {isZoomed && (
        <div className="mt-1 flex items-center gap-2">
          <div className="flex-1 h-1 bg-muted rounded-full relative">
            <div className="absolute h-full bg-primary/40 rounded-full" style={{ left: `${zoomStart * 100}%`, width: `${(zoomEnd - zoomStart) * 100}%` }} />
          </div>
          <span className="text-[9px] font-mono text-muted-foreground">{Math.round((zoomEnd - zoomStart) * 100)}%</span>
        </div>
      )}
    </div>
  );
}
