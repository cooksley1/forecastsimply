import { useState } from 'react';

interface PickItem {
  label: string;
  id: string;
  name?: string;
  divYield?: number;
  signal?: { label: string; score: number; confidence: number };
}

type SignalFilter = 'All' | 'Strong Buy' | 'Buy' | 'Hold' | 'Sell' | 'Strong Sell';

interface Props {
  picks: PickItem[];
  onSelect: (id: string) => void;
  loading?: boolean;
  onRank?: () => void;
  ranking?: boolean;
  showDividends?: boolean;
}

const signalColors: Record<string, string> = {
  'Strong Buy': 'bg-positive/15 text-positive border-positive/30',
  'Buy': 'bg-positive/10 text-positive border-positive/20',
  'Hold': 'bg-warning/15 text-warning border-warning/30',
  'Sell': 'bg-destructive/10 text-destructive border-destructive/20',
  'Strong Sell': 'bg-destructive/15 text-destructive border-destructive/30',
};

const SIGNAL_FILTERS: SignalFilter[] = ['All', 'Strong Buy', 'Buy', 'Hold', 'Sell', 'Strong Sell'];

function yieldBadge(y: number): { text: string; cls: string } {
  if (y >= 5) return { text: `${y.toFixed(1)}%`, cls: 'bg-positive/15 text-positive border-positive/30' };
  if (y >= 2) return { text: `${y.toFixed(1)}%`, cls: 'bg-warning/15 text-warning border-warning/30' };
  if (y > 0) return { text: `${y.toFixed(1)}%`, cls: 'bg-muted/30 text-muted-foreground border-border' };
  return { text: '', cls: '' };
}

export default function QuickPicks({ picks, onSelect, loading, onRank, ranking, showDividends }: Props) {
  const [signalFilter, setSignalFilter] = useState<SignalFilter>('Strong Buy');
  const hasRanked = picks.some(p => p.signal);

  // Count picks per signal level
  const signalCounts: Record<string, number> = {};
  if (hasRanked) {
    for (const p of picks) {
      if (p.signal) {
        signalCounts[p.signal.label] = (signalCounts[p.signal.label] || 0) + 1;
      }
    }
    signalCounts['All'] = picks.length;
  }

  // Filter by signal level after ranking
  const filtered = hasRanked && signalFilter !== 'All'
    ? picks.filter(p => p.signal?.label === signalFilter)
    : picks;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        {onRank && (
          <button
            onClick={onRank}
            disabled={ranking || loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all bg-sf-elevated border-border text-foreground hover:border-primary/40 hover:text-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {ranking ? (
              <span className="animate-pulse">⏳ Ranking...</span>
            ) : (
              <>🏅 Rank by Signal</>
            )}
          </button>
        )}
      </div>

      {/* Signal filter chips — shown after ranking */}
      {hasRanked && (
        <div className="flex items-center gap-1 flex-wrap">
          <span className="text-[9px] text-muted-foreground font-mono mr-1">FILTER:</span>
          {SIGNAL_FILTERS.map(f => {
            const count = signalCounts[f] || 0;
            if (f !== 'All' && count === 0) return null;
            const active = signalFilter === f;
            return (
              <button
                key={f}
                onClick={() => setSignalFilter(f)}
                className={`px-2 py-0.5 rounded text-[9px] font-medium border transition-all ${
                  active
                    ? (signalColors[f] || 'bg-primary/15 text-primary border-primary/30')
                    : 'bg-background border-border text-muted-foreground hover:text-foreground'
                }`}
              >
                {f} {count > 0 && <span className="opacity-60">({count})</span>}
              </button>
            );
          })}
        </div>
      )}

      {filtered.length === 0 && hasRanked ? (
        <p className="text-xs text-muted-foreground italic py-2">No picks match "{signalFilter}". Try another filter.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {filtered.map(p => (
            <button
              key={p.id}
              onClick={() => onSelect(p.id)}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-sf-elevated border border-border text-xs font-mono font-medium text-foreground hover:border-primary/40 hover:text-primary transition-all disabled:opacity-50"
            >
              <span>{p.label}</span>
              {showDividends && p.name && (
                <span className="text-[9px] text-muted-foreground font-sans">{p.name}</span>
              )}
              {showDividends && p.divYield !== undefined && p.divYield > 0 && (
                <span className={`text-[8px] font-bold px-1 py-0.5 rounded border ${yieldBadge(p.divYield).cls}`}>
                  💰 {yieldBadge(p.divYield).text}
                </span>
              )}
              {p.signal && (
                <span className={`text-[8px] font-bold px-1 py-0.5 rounded border ${signalColors[p.signal.label] || ''}`}>
                  {p.signal.label} {p.signal.confidence}%
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
