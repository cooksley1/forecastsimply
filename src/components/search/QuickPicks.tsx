import { useState } from 'react';

interface PickItem {
  label: string;
  id: string;
  name?: string;
  divYield?: number;
  signal?: { label: string; score: number; confidence: number };
}

export type SortCriteria = 'default' | 'yield' | 'signal-best' | 'signal-worst' | 'name';

interface Props {
  picks: PickItem[];
  onSelect: (id: string) => void;
  loading?: boolean;
  onRank?: () => void;
  ranking?: boolean;
  showDividends?: boolean;
  /** When true, render the "card" layout for stocks with sort controls */
  cardMode?: boolean;
  sortBy?: SortCriteria;
  onSortChange?: (sort: SortCriteria) => void;
  maxVisible?: number;
}

const signalColors: Record<string, string> = {
  'Strong Buy': 'bg-positive/15 text-positive border-positive/30',
  'Buy': 'bg-positive/10 text-positive border-positive/20',
  'Hold': 'bg-warning/15 text-warning border-warning/30',
  'Sell': 'bg-destructive/10 text-destructive border-destructive/20',
  'Strong Sell': 'bg-destructive/15 text-destructive border-destructive/30',
};

const signalEmoji: Record<string, string> = {
  'Strong Buy': '🟢',
  'Buy': '🟡',
  'Hold': '🟠',
  'Sell': '🔴',
  'Strong Sell': '⛔',
};

function yieldBadge(y: number): { cls: string } {
  if (y >= 5) return { cls: 'text-positive' };
  if (y >= 2) return { cls: 'text-warning' };
  if (y > 0) return { cls: 'text-muted-foreground' };
  return { cls: 'text-muted-foreground/50' };
}

const SORT_OPTIONS: { value: SortCriteria; label: string; icon: string }[] = [
  { value: 'default', label: 'Default', icon: '📋' },
  { value: 'signal-best', label: 'Best Signal', icon: '🟢' },
  { value: 'signal-worst', label: 'Worst Signal', icon: '🔴' },
  { value: 'yield', label: 'Dividend Yield', icon: '💰' },
  { value: 'name', label: 'Name A–Z', icon: '🔤' },
];

export default function QuickPicks({
  picks,
  onSelect,
  loading,
  onRank,
  ranking,
  showDividends,
  cardMode,
  sortBy = 'default',
  onSortChange,
  maxVisible = 10,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const hasRanked = picks.some(p => p.signal);

  // Sort picks
  const sorted = [...picks];
  if (sortBy === 'yield') {
    sorted.sort((a, b) => (b.divYield ?? 0) - (a.divYield ?? 0));
  } else if (sortBy === 'signal-best' && hasRanked) {
    sorted.sort((a, b) => (b.signal?.score ?? -999) - (a.signal?.score ?? -999));
  } else if (sortBy === 'signal-worst' && hasRanked) {
    sorted.sort((a, b) => (a.signal?.score ?? 999) - (b.signal?.score ?? 999));
  } else if (sortBy === 'name') {
    sorted.sort((a, b) => (a.name ?? a.label).localeCompare(b.name ?? b.label));
  }

  const visible = expanded ? sorted : sorted.slice(0, maxVisible);
  const hasMore = sorted.length > maxVisible;

  /* ── Card mode: stock/ETF exchange-first layout ── */
  if (cardMode) {
    return (
      <div className="space-y-2">
        {/* Controls row */}
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

          {/* Sort dropdown */}
          {onSortChange && (
            <div className="relative">
              <select
                value={sortBy}
                onChange={e => onSortChange(e.target.value as SortCriteria)}
                className="appearance-none pl-2 pr-7 py-1.5 rounded-lg border border-border bg-sf-elevated text-xs font-medium text-foreground cursor-pointer hover:border-primary/40 transition-all"
              >
                {SORT_OPTIONS.map(o => (
                  <option key={o.value} value={o.value} disabled={
                    (o.value === 'signal-best' || o.value === 'signal-worst') && !hasRanked
                  }>
                    {o.icon} {o.label}{(o.value === 'signal-best' || o.value === 'signal-worst') && !hasRanked ? ' (rank first)' : ''}
                  </option>
                ))}
              </select>
              <svg className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" fill="none" viewBox="0 0 10 6">
                <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m1 1 4 4 4-4" />
              </svg>
            </div>
          )}

          <span className="text-[10px] text-muted-foreground ml-auto">
            {sorted.length} stocks{hasRanked && ` · ${Object.values(picks.filter(p => p.signal)).length} ranked`}
          </span>
        </div>

        {/* Card grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {visible.map((p, i) => (
            <button
              key={p.id}
              onClick={() => onSelect(p.id)}
              disabled={loading}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-sf-elevated border border-border text-left hover:border-primary/40 hover:bg-primary/5 transition-all disabled:opacity-50 group"
            >
              {/* Rank number */}
              <span className="text-[10px] font-mono text-muted-foreground/60 w-4 text-right shrink-0">
                {i + 1}
              </span>

              {/* Ticker + name */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-mono font-bold text-foreground group-hover:text-primary transition-colors">
                    {p.label}
                  </span>
                  {p.name && (
                    <span className="text-[10px] text-muted-foreground truncate">
                      {p.name}
                    </span>
                  )}
                </div>
              </div>

              {/* Info badges */}
              <div className="flex items-center gap-2 shrink-0">
                {showDividends && p.divYield !== undefined && p.divYield > 0 && (
                  <span className={`text-[10px] font-bold ${yieldBadge(p.divYield).cls}`}>
                    💰 {p.divYield.toFixed(1)}%
                  </span>
                )}
                {p.signal && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${signalColors[p.signal.label] || ''}`}>
                    {signalEmoji[p.signal.label] || ''} {p.signal.label} · {p.signal.confidence}%
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>

        {/* Show more / less */}
        {hasMore && (
          <button
            onClick={() => setExpanded(e => !e)}
            className="text-[10px] text-primary hover:underline font-medium"
          >
            {expanded ? '▲ Show less' : `▼ Show all ${sorted.length}`}
          </button>
        )}
      </div>
    );
  }

  /* ── Chip mode (crypto, forex, simple ETF) ── */
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

      <div className="flex flex-wrap gap-2">
        {sorted.map(p => (
          <button
            key={p.id}
            onClick={() => onSelect(p.id)}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-sf-elevated border border-border text-xs font-mono font-medium text-foreground hover:border-primary/40 hover:text-primary transition-all disabled:opacity-50"
          >
            <span>{p.label}</span>
            {p.signal && (
              <span className={`text-[8px] font-bold px-1 py-0.5 rounded border ${signalColors[p.signal.label] || ''}`}>
                {p.signal.label} {p.signal.confidence}%
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
