import type { WatchlistItem } from '@/types/assets';
import { fmtPrice, fmtPercent } from '@/utils/format';

interface Props {
  items: WatchlistItem[];
  onSelect: (item: WatchlistItem) => void;
  onClear: () => void;
}

export default function WatchlistBar({ items, onSelect, onClear }: Props) {
  if (items.length === 0) return null;

  return (
    <div className="border-b border-border bg-sf-inset px-4 py-2">
      <div className="max-w-7xl mx-auto flex items-center gap-2 overflow-x-auto">
        <span className="text-muted-foreground text-xs shrink-0 font-mono">WATCHLIST</span>
        {items.map(item => (
          <button
            key={item.id}
            onClick={() => onSelect(item)}
            className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-sf-card border border-border hover:border-primary/30 transition-colors shrink-0"
          >
            <span className="text-foreground text-xs font-mono font-medium">{item.symbol}</span>
            <span className="text-xs font-mono">
              {item.change24h !== undefined && (
                <span className={item.change24h >= 0 ? 'text-positive' : 'text-negative'}>
                  {fmtPercent(item.change24h)}
                </span>
              )}
            </span>
          </button>
        ))}
        <button
          onClick={onClear}
          className="text-muted-foreground hover:text-destructive text-xs shrink-0 ml-2"
        >
          ✕ Clear
        </button>
      </div>
    </div>
  );
}
