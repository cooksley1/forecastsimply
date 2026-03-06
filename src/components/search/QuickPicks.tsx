import { useState } from 'react';

interface PickItem {
  label: string;
  id: string;
  name?: string;
  divYield?: number;
  signal?: { label: string; score: number; confidence: number; projectedReturn?: number; peakMonths?: number; peakWarning?: string };
}

export type SortCriteria = 'default' | 'best-buys' | 'sells' | 'yield' | 'growth';
export type RankTimeframe = '1M' | '3M' | '6M' | '1Y';

export const RANK_TIMEFRAME_DAYS: Record<RankTimeframe, number> = {
  '1M': 30, '3M': 90, '6M': 180, '1Y': 365,
};

interface Props {
  picks: PickItem[];
  onSelect: (id: string) => void;
  loading?: boolean;
  onRank?: (timeframeDays: number) => void;
  ranking?: boolean;
  showDividends?: boolean;
  cardMode?: boolean;
  sortBy?: SortCriteria;
  onSortChange?: (sort: SortCriteria) => void;
  maxVisible?: number;
  rankTimeframe?: RankTimeframe;
  onRankTimeframeChange?: (tf: RankTimeframe) => void;
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
  { value: 'best-buys', label: 'Best Buys', icon: '🟢' },
  { value: 'sells', label: 'Sells / Avoid', icon: '🔴' },
  { value: 'yield', label: 'Highest Yield', icon: '💰' },
  { value: 'growth', label: 'Growth', icon: '🌱' },
];

const TIMEFRAMES: RankTimeframe[] = ['1M', '3M', '6M', '1Y'];

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
  maxVisible = 15,
  rankTimeframe = '3M',
  onRankTimeframeChange,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const hasRanked = picks.some(p => p.signal);
  const needsRank = sortBy !== 'default' && sortBy !== 'yield' && sortBy !== 'growth';

  // Sort & filter picks
  let sorted = [...picks];
  if (sortBy === 'yield') {
    sorted.sort((a, b) => (b.divYield ?? 0) - (a.divYield ?? 0));
  } else if (sortBy === 'best-buys') {
    sorted = sorted.filter(p => p.signal?.label === 'Strong Buy' || p.signal?.label === 'Buy');
    sorted.sort((a, b) => (b.signal?.score ?? 0) - (a.signal?.score ?? 0));
  } else if (sortBy === 'sells') {
    sorted = sorted.filter(p => p.signal?.label === 'Sell' || p.signal?.label === 'Strong Sell' || p.signal?.label === 'Hold');
    sorted.sort((a, b) => (a.signal?.score ?? 999) - (b.signal?.score ?? 999));
  } else if (sortBy === 'growth') {
    sorted = sorted.filter(p => (p.divYield ?? 0) < 1);
    sorted.sort((a, b) => (b.signal?.score ?? 0) - (a.signal?.score ?? 0));
  }

  const visible = expanded ? sorted : sorted.slice(0, maxVisible);
  const hasMore = sorted.length > maxVisible;
  const isFiltering = ranking || (loading && sortBy !== 'default');

  /* ── Card mode: stock/ETF exchange-first layout ── */
  if (cardMode) {
    return (
      <div className="space-y-2">
        {/* Controls row */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Sort dropdown */}
          {onSortChange && (
            <div className="relative">
              <select
                value={sortBy}
                onChange={e => {
                  const val = e.target.value as SortCriteria;
                  onSortChange(val);
                  // Auto-trigger ranking if needed
                  if (val !== 'default' && val !== 'yield' && !hasRanked && onRank) {
                    onRank(RANK_TIMEFRAME_DAYS[rankTimeframe]);
                  }
                }}
                className={`appearance-none pl-2 pr-7 py-1.5 rounded-lg border text-xs font-medium cursor-pointer transition-all ${
                  sortBy !== 'default'
                    ? 'bg-primary/10 border-primary/30 text-primary'
                    : 'bg-sf-elevated border-border text-foreground hover:border-primary/40'
                }`}
              >
                {SORT_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>
                    {o.icon} {o.label}
                  </option>
                ))}
              </select>
              <svg className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" fill="none" viewBox="0 0 10 6">
                <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m1 1 4 4 4-4" />
              </svg>
            </div>
          )}

          {/* Timeframe selector — shows when a signal-based filter is active */}
          {onRankTimeframeChange && sortBy !== 'default' && sortBy !== 'yield' && (
            <div className="flex items-center gap-0.5 bg-sf-elevated border border-border rounded-lg p-0.5">
              {TIMEFRAMES.map(tf => (
                <button
                  key={tf}
                  onClick={() => {
                    onRankTimeframeChange(tf);
                    if (onRank) onRank(RANK_TIMEFRAME_DAYS[tf]);
                  }}
                  className={`px-2 py-1 rounded text-[10px] font-mono font-medium transition-all ${
                    rankTimeframe === tf
                      ? 'bg-primary/15 text-primary'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {tf}
                </button>
              ))}
            </div>
          )}

          {/* Active filter indicator */}
          {sortBy !== 'default' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-[10px] font-medium text-primary">
              {SORT_OPTIONS.find(o => o.value === sortBy)?.icon} {SORT_OPTIONS.find(o => o.value === sortBy)?.label}
              {needsRank && ` · ${rankTimeframe}`}
              <button
                onClick={() => onSortChange?.('default')}
                className="ml-0.5 hover:text-destructive transition-colors"
                title="Clear filter"
              >
                ✕
              </button>
            </span>
          )}

          <span className="text-[10px] text-muted-foreground ml-auto">
            {sorted.length} stocks{hasRanked && ` · ${picks.filter(p => p.signal).length} ranked`}
          </span>
        </div>

        {/* Loading overlay for ranking */}
        {isFiltering && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/5 border border-primary/20">
            <span className="inline-block w-3.5 h-3.5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            <span className="text-[11px] text-primary font-medium">
              {ranking ? `Analysing all stocks over ${rankTimeframe}…` : 'Filtering results…'}
            </span>
          </div>
        )}

        {/* Card grid */}
        {sorted.length === 0 ? (
          <p className="text-xs text-muted-foreground italic py-3 text-center">
            {hasRanked ? 'No stocks match this filter. Try a different sort.' : 'No stocks available for this filter.'}
          </p>
        ) : (
        <div className={`grid grid-cols-1 sm:grid-cols-2 gap-2 transition-opacity ${isFiltering ? 'opacity-50' : ''}`}>
          {visible.map((p, i) => (
            <button
              key={p.id}
              onClick={() => onSelect(p.id)}
              disabled={loading}
              className="flex items-start gap-3 px-3 py-2.5 rounded-xl bg-sf-elevated border border-border text-left hover:border-primary/40 hover:bg-primary/5 transition-all disabled:opacity-50 group"
            >
              {/* Rank number */}
              <span className="text-[10px] font-mono text-muted-foreground/60 w-4 text-right shrink-0 mt-0.5">
                {i + 1}
              </span>

              {/* Ticker + name + projection */}
              <div className="flex-1 min-w-0 space-y-0.5">
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

                {/* Projected return caveat */}
                {p.signal?.projectedReturn !== undefined && (
                  <div className="text-[9px] leading-tight text-muted-foreground">
                    <span className={p.signal.projectedReturn >= 0 ? 'text-positive font-semibold' : 'text-destructive font-semibold'}>
                      {p.signal.projectedReturn >= 0 ? '+' : ''}{p.signal.projectedReturn.toFixed(1)}% expected
                    </span>
                    {p.signal.peakWarning && (
                      <span className="ml-1 text-warning">⚠ {p.signal.peakWarning}</span>
                    )}
                  </div>
                )}
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
                    {signalEmoji[p.signal.label] || ''} {p.signal.label}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
        )}

        {/* Show more / less */}
        {hasMore && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setExpanded(e => !e)}
              className="text-[10px] text-primary hover:underline font-medium"
            >
              {expanded ? `▲ Show top ${maxVisible}` : `▼ Show all ${sorted.length}`}
            </button>
          </div>
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
            onClick={() => onRank(RANK_TIMEFRAME_DAYS[rankTimeframe])}
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
