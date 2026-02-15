import { useState, useCallback } from 'react';
import { X, Maximize2 } from 'lucide-react';
import type { TechnicalData } from '@/types/analysis';
import type { OverlayId } from './AnalysisOverlayBar';
import { OVERLAYS } from './AnalysisOverlayBar';
import type { ForecastMethodId } from '@/analysis/forecast';
import { FORECAST_METHODS } from '@/analysis/forecast';
import MainChart from './MainChart';
import { useIsMobile } from '@/hooks/use-mobile';

interface Props {
  data: TechnicalData;
  timeframeDays: number;
  activeOverlays: OverlayId[];
  setActiveOverlays: (ids: OverlayId[]) => void;
  forecastMethods: ForecastMethodId[];
  setForecastMethods: (ids: ForecastMethodId[]) => void;
}

export function FullscreenChartButton({ onClick }: { onClick: () => void }) {
  const isMobile = useIsMobile();
  if (!isMobile) return null;
  return (
    <button
      onClick={onClick}
      className="absolute top-2 right-2 z-10 p-1.5 rounded-lg bg-card/80 backdrop-blur border border-border text-muted-foreground hover:text-foreground transition-colors"
      title="Expand to fullscreen landscape"
    >
      <Maximize2 size={16} />
    </button>
  );
}

export function FullscreenChartModal({
  data, timeframeDays, activeOverlays, setActiveOverlays,
  forecastMethods, setForecastMethods, onClose,
}: Props & { onClose: () => void }) {
  const [showControls, setShowControls] = useState(false);

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  const toggleOverlay = (id: OverlayId) => {
    if (activeOverlays.includes(id)) {
      setActiveOverlays(activeOverlays.filter(s => s !== id));
    } else {
      setActiveOverlays([...activeOverlays, id]);
    }
  };

  const toggleForecast = (id: ForecastMethodId) => {
    if (forecastMethods.includes(id)) {
      if (forecastMethods.length > 1) setForecastMethods(forecastMethods.filter(m => m !== id));
    } else {
      setForecastMethods([...forecastMethods, id]);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] bg-background flex flex-col"
      style={{
        transform: 'rotate(90deg)',
        transformOrigin: 'center center',
        width: '100vh',
        height: '100vw',
        top: '50%',
        left: '50%',
        marginTop: 'calc(-50vw)',
        marginLeft: 'calc(-50vh)',
      }}
    >
      {/* Top toolbar */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border bg-card shrink-0">
        <span className="text-[10px] font-mono text-muted-foreground uppercase">Landscape View</span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowControls(!showControls)}
            className="px-2 py-1 rounded text-[10px] font-mono text-muted-foreground hover:text-foreground border border-border transition-colors"
          >
            {showControls ? '▲ Hide' : '⚙️ Controls'}
          </button>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
            title="Back to portrait"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Controls panel */}
      {showControls && (
        <div className="px-3 py-2 border-b border-border bg-card/50 space-y-2 shrink-0 overflow-x-auto">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[9px] text-muted-foreground font-mono uppercase mr-1">Forecast:</span>
            {FORECAST_METHODS.map(m => {
              const active = forecastMethods.includes(m.id);
              return (
                <button
                  key={m.id}
                  onClick={() => toggleForecast(m.id)}
                  className={`px-2 py-0.5 rounded text-[9px] font-medium transition-all border ${
                    active
                      ? 'border-primary/50 bg-primary/10 text-primary'
                      : 'border-border text-muted-foreground opacity-50'
                  }`}
                >
                  {m.shortName}
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[9px] text-muted-foreground font-mono uppercase mr-1">Analysis:</span>
            {OVERLAYS.map(o => {
              const active = activeOverlays.includes(o.id);
              return (
                <button
                  key={o.id}
                  onClick={() => toggleOverlay(o.id)}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-medium transition-all border ${
                    active
                      ? 'border-current bg-current/10'
                      : 'border-border text-muted-foreground opacity-50'
                  }`}
                  style={active ? { color: o.color, borderColor: o.color, backgroundColor: `${o.color.replace(')', ' / 0.1)')}` } : undefined}
                >
                  <span className="text-[9px]">{o.icon}</span>
                  {o.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Chart fills remaining space */}
      <div className="flex-1 min-h-0 p-1 overflow-hidden">
        <div className="h-full w-full">
          <MainChart data={data} timeframeDays={timeframeDays} activeOverlays={activeOverlays} fullscreen />
        </div>
      </div>
    </div>
  );
}
