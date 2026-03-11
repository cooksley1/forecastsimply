import { useState } from 'react';

interface PickItem {
  label: string;
  id: string;
  name?: string;
  divYield?: number;
  signal?: { label: string; score: number; confidence: number; projectedReturn?: number; peakMonths?: number; peakWarning?: string; compositeScore?: number };
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
  sortBy?: SortCriteria;
  onSortChange?: (sort: SortCriteria) => void;
  maxVisible?: number;
  rankTimeframe?: RankTimeframe;
  onRankTimeframeChange?: (tf: RankTimeframe) => void;
  watchlistIds?: Set<string>;
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

const FILTER_CRITERIA: Record<SortCriteria, { title: string; bullets: string[]; note?: string }> = {
  default: { title: '', bullets: [] },
  'best-buys': {
    title: 'Best Buys — Selection Criteria',
    bullets: [
      'Signal must be "Buy" or "Strong Buy" (composite score ≥ 3/10)',
      'Score is built from 11 weighted indicators: SMA(20), SMA(50), MA Crossover, RSI(14), MACD, Bollinger Bands, Stochastic %K, OBV Divergence, VWAP, RSI Divergence, and Trend Strength',
      'Each indicator contributes +1 to +3 (bullish) or −1 to −3 (bearish)',
      'Sorted by highest composite score — strongest technical setups first',
    ],
    note: 'If no assets appear, market conditions are currently unfavourable across the board for this timeframe. This is a valid signal — it means there are no strong buying opportunities right now. Try a different timeframe or check back after market conditions shift.',
  },
  sells: {
    title: 'Sells / Avoid — Selection Criteria',
    bullets: [
      'Signal must be "Sell", "Strong Sell", or "Hold" (composite score ≤ 0)',
      'Same 11-indicator scoring system — these assets have predominantly bearish readings',
      'Sorted by lowest score first — weakest setups at the top',
    ],
    note: 'These are assets showing technical weakness. "Hold" assets are included because they lack bullish conviction.',
  },
  yield: {
    title: 'Highest Yield — Selection Criteria',
    bullets: [
      'Sorted by annual dividend yield (highest first)',
      'No signal filter applied — includes all dividend-paying assets',
      'Yield data sourced from the latest available market data',
    ],
  },
  growth: {
    title: 'Growth — Selection Criteria',
    bullets: [
      'Filters to assets with dividend yield < 1% (capital-growth focus)',
      'Sorted by highest composite signal score',
      'Identifies momentum-driven assets reinvesting earnings into growth',
    ],
  },
};

const TIMEFRAMES: RankTimeframe[] = ['1M', '3M', '6M', '1Y'];

export default function QuickPicks({
  picks,
  onSelect,
  loading,
  onRank,
  ranking,
  showDividends,
  sortBy = 'default',
  onSortChange,
  maxVisible = 15,
  rankTimeframe = '3M',
  onRankTimeframeChange,
  watchlistIds,
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

  // Pin watchlist items at top (max 5)
  const watchlistPinned: PickItem[] = [];
  const rest: PickItem[] = [];
  if (watchlistIds && watchlistIds.size > 0) {
    for (const p of sorted) {
      if (watchlistIds.has(p.id) && watchlistPinned.length < 5) {
        watchlistPinned.push(p);
      } else {
        rest.push(p);
      }
    }
  } else {
    rest.push(...sorted);
  }

  const allOrdered = [...watchlistPinned, ...rest];
  const visible = expanded ? allOrdered : allOrdered.slice(0, maxVisible);
  const hasMore = allOrdered.length > maxVisible;
  const isFiltering = ranking || (loading && sortBy !== 'default');

  const renderCard = (p: PickItem, i: number, isPinned: boolean) => (
    <button
      key={p.id}
      onClick={() => onSelect(p.id)}
      disabled={loading}
      className={`flex items-start gap-3 px-3 py-2.5 rounded-xl border text-left hover:border-primary/40 hover:bg-primary/5 transition-all disabled:opacity-50 group ${
        isPinned ? 'bg-primary/5 border-primary/20' : 'bg-sf-elevated border-border'
      }`}
    >
      {/* Rank / pin indicator */}
      <span className="text-[10px] font-mono text-muted-foreground/60 w-4 text-right shrink-0 mt-0.5">
        {isPinned ? '⭐' : i + 1}
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
          {isPinned && (
            <span className="text-[8px] text-primary/70 font-medium">WATCHLIST</span>
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
  );

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

        {/* Timeframe selector */}
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
          {allOrdered.length} assets{watchlistPinned.length > 0 && ` · ${watchlistPinned.length} from watchlist`}
        </span>
      </div>

      {/* Loading overlay */}
      {isFiltering && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/5 border border-primary/20">
          <span className="inline-block w-3.5 h-3.5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          <span className="text-[11px] text-primary font-medium">
            {ranking ? `Analysing all assets over ${rankTimeframe}…` : 'Filtering results…'}
          </span>
        </div>
      )}

      {/* Filter criteria explainer */}
      {sortBy !== 'default' && FILTER_CRITERIA[sortBy]?.title && (
        <div className="bg-muted/40 border border-border/60 rounded-lg px-3 py-2.5 space-y-1.5">
          <p className="text-[10px] font-semibold text-foreground">{FILTER_CRITERIA[sortBy].title}</p>
          <ul className="space-y-0.5">
            {FILTER_CRITERIA[sortBy].bullets.map((b, i) => (
              <li key={i} className="text-[9px] text-muted-foreground flex gap-1.5">
                <span className="text-primary/70 shrink-0">•</span>
                <span>{b}</span>
              </li>
            ))}
          </ul>
          {FILTER_CRITERIA[sortBy].note && allOrdered.length === 0 && (
            <p className="text-[9px] text-warning/90 mt-1 leading-relaxed">{FILTER_CRITERIA[sortBy].note}</p>
          )}
        </div>
      )}

      {/* Card grid */}
      {allOrdered.length === 0 ? (
        <div className="py-4 text-center space-y-2">
          {hasRanked ? (
            <>
              <p className="text-xs text-muted-foreground italic">
                0 assets meet the {SORT_OPTIONS.find(o => o.value === sortBy)?.label || 'selected'} criteria for the {rankTimeframe} timeframe.
              </p>
              {rankTimeframe !== '3M' && (
                <div className="flex flex-col items-center gap-1.5 px-4">
                  <p className="text-[10px] text-muted-foreground">
                    Data for this timeframe may not have been generated yet.
                  </p>
                  <button
                    onClick={() => {
                      onRankTimeframeChange?.('3M');
                      if (onRank) onRank(RANK_TIMEFRAME_DAYS['3M']);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20 text-[11px] font-medium text-primary hover:bg-primary/20 transition-colors"
                  >
                    <span>📊</span> Try 3M timeframe
                  </button>
                </div>
              )}
            </>
          ) : (
            <p className="text-xs text-muted-foreground italic">No assets available.</p>
          )}
        </div>
      ) : (
        <div className={`grid grid-cols-1 sm:grid-cols-2 gap-2 transition-opacity ${isFiltering ? 'opacity-50' : ''}`}>
          {visible.map((p, i) => renderCard(p, i, watchlistPinned.includes(p)))}
        </div>
      )}

      {/* Show more / less */}
      {hasMore && (
        <div className="flex items-center gap-2">
          <button
            onClick={() => setExpanded(e => !e)}
            className="text-[10px] text-primary hover:underline font-medium"
          >
            {expanded ? `▲ Show top ${maxVisible}` : `▼ Show all ${allOrdered.length}`}
          </button>
        </div>
      )}
    </div>
  );
}
