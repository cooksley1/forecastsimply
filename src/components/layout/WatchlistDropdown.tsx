import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Target, ChevronDown, ChevronUp } from 'lucide-react';
import type { WatchlistItem } from '@/types/assets';
import SimulationTracker from '@/components/analysis/SimulationTracker';

interface Props {
  items: WatchlistItem[];
  onSelect: (item: WatchlistItem) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
}

export default function WatchlistDropdown({ items, onSelect, onRemove, onClear }: Props) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, right: 0 });

  const simulations = items.filter(i => i.simulation);

  const updatePos = useCallback(() => {
    if (btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      const panelWidth = Math.min(window.innerWidth - 16, 360);
      let right = window.innerWidth - r.right;
      if (window.innerWidth - right - panelWidth < 8) {
        right = window.innerWidth - panelWidth - 8;
      }
      setPos({ top: r.bottom + 4, right: Math.max(right, 8) });
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    updatePos();
    const handler = (e: MouseEvent) => {
      if (
        panelRef.current && !panelRef.current.contains(e.target as Node) &&
        btnRef.current && !btnRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open, updatePos]);

  return (
    <>
      <button
        ref={btnRef}
        onClick={() => setOpen(o => !o)}
        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-all ${
          open
            ? 'bg-primary/15 text-primary border-primary/30'
            : 'bg-card text-muted-foreground border-border hover:text-foreground hover:border-primary/20'
        }`}
      >
        <span>📋</span>
        <span className="hidden sm:inline">Watchlist</span>
        {items.length > 0 && (
          <span className="bg-primary/20 text-primary text-[10px] font-mono px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
            {items.length}
          </span>
        )}
        {simulations.length > 0 && (
          <span className="bg-positive/20 text-positive text-[10px] font-mono px-1 py-0.5 rounded-full">
            <Target className="w-2.5 h-2.5 inline" />
          </span>
        )}
      </button>

      {open && createPortal(
        <div
          ref={panelRef}
          className="fixed z-[200] w-[min(calc(100vw-1rem),22.5rem)] bg-card border border-border rounded-xl shadow-xl overflow-hidden"
          style={{ top: pos.top, right: Math.max(pos.right, 8) }}
        >
          {items.length === 0 ? (
            <div className="p-4 text-center text-xs text-muted-foreground">
              No items yet. Search & analyse an asset to add it.
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between px-3 py-2 border-b border-border">
                <span className="text-[10px] text-muted-foreground font-mono uppercase">
                  {items.length} item{items.length !== 1 ? 's' : ''}
                  {simulations.length > 0 && ` · ${simulations.length} simulation${simulations.length !== 1 ? 's' : ''}`}
                </span>
                <button
                  onClick={(e) => { e.stopPropagation(); onClear(); }}
                  className="text-[10px] text-muted-foreground hover:text-destructive transition-colors"
                >
                  Clear all
                </button>
              </div>
              <div className="max-h-96 overflow-y-auto divide-y divide-border/50">
                {items.map(item => {
                  const addedPrice = item.addedPrice ?? item.price;
                  const pctChange = addedPrice > 0 ? ((item.price - addedPrice) / addedPrice) * 100 : 0;
                  return (
                    <div key={item.id} className="px-3 py-2 hover:bg-background/50 transition-colors">
                      <div className="flex items-center justify-between">
                        <button
                          onClick={() => { onSelect(item); setOpen(false); }}
                          className="flex items-center gap-2 text-left flex-1 min-w-0"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-medium text-foreground font-mono">{item.symbol}</span>
                              <span className="text-[9px] text-muted-foreground capitalize">{item.assetType}</span>
                              {item.simulation && <Target className="w-3 h-3 text-primary" />}
                            </div>
                            <div className="text-[10px] text-muted-foreground truncate">
                              ${addedPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })} →{' '}
                              <span className="text-foreground">${Number(item.price).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                              <span className={`ml-1 font-mono ${pctChange >= 0 ? 'text-positive' : 'text-negative'}`}>
                                {pctChange >= 0 ? '+' : ''}{pctChange.toFixed(1)}%
                              </span>
                            </div>
                            {item.note && (
                              <div className="text-[9px] text-primary/70 truncate mt-0.5">📝 {item.note}</div>
                            )}
                          </div>
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); onRemove(item.id); }}
                          className="text-muted-foreground hover:text-destructive text-xs transition-all p-1 rounded hover:bg-destructive/10"
                          title="Remove from watchlist"
                        >
                          ✕
                        </button>
                      </div>

                      {/* Simulation tracker inline */}
                      {item.simulation && (
                        <div className="mt-2">
                          <SimulationTracker
                            simulation={item.simulation}
                            currentPrice={item.price}
                            symbol={item.symbol}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>,
        document.body
      )}
    </>
  );
}
