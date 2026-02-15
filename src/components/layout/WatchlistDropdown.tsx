import { useState, useRef, useEffect } from 'react';
import type { WatchlistItem } from '@/types/assets';
import { fmtPercent } from '@/utils/format';

interface Props {
  items: WatchlistItem[];
  onSelect: (item: WatchlistItem) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
}

export default function WatchlistDropdown({ items, onSelect, onRemove, onClear }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
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
      </button>

      {open && (
        <div className="fixed right-2 sm:absolute sm:right-0 top-full mt-1 z-[60] w-[calc(100vw-1rem)] sm:w-80 max-w-80 bg-card border border-border rounded-xl shadow-xl overflow-hidden">
          {items.length === 0 ? (
            <div className="p-4 text-center text-xs text-muted-foreground">
              No items yet. Search & analyse an asset to add it.
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between px-3 py-2 border-b border-border">
                <span className="text-[10px] text-muted-foreground font-mono uppercase">
                  {items.length} item{items.length !== 1 ? 's' : ''}
                </span>
                <button
                  onClick={(e) => { e.stopPropagation(); onClear(); }}
                  className="text-[10px] text-muted-foreground hover:text-destructive transition-colors"
                >
                  Clear all
                </button>
              </div>
              <div className="max-h-64 overflow-y-auto divide-y divide-border/50">
                {items.map(item => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between px-3 py-2 hover:bg-background/50 transition-colors group"
                  >
                    <button
                      onClick={() => { onSelect(item); setOpen(false); }}
                      className="flex items-center gap-2 text-left flex-1 min-w-0"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-medium text-foreground font-mono">{item.symbol}</span>
                          <span className="text-[9px] text-muted-foreground capitalize">{item.assetType}</span>
                        </div>
                        <div className="text-[10px] text-muted-foreground truncate">{item.name}</div>
                      </div>
                    </button>
                    <div className="flex items-center gap-2 shrink-0">
                      {item.change24h !== undefined && (
                        <span className={`text-[10px] font-mono ${item.change24h >= 0 ? 'text-positive' : 'text-negative'}`}>
                          {fmtPercent(item.change24h)}
                        </span>
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); onRemove(item.id); }}
                        className="text-muted-foreground hover:text-destructive text-xs opacity-0 group-hover:opacity-100 transition-all p-0.5"
                        title="Remove from watchlist"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
