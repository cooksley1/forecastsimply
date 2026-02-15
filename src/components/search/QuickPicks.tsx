interface PickItem {
  label: string;
  id: string;
  signal?: { label: string; score: number; confidence: number };
}

interface Props {
  picks: PickItem[];
  onSelect: (id: string) => void;
  loading?: boolean;
  onRank?: () => void;
  ranking?: boolean;
}

const signalColors: Record<string, string> = {
  'Strong Buy': 'bg-positive/15 text-positive border-positive/30',
  'Buy': 'bg-positive/10 text-positive border-positive/20',
  'Hold': 'bg-warning/15 text-warning border-warning/30',
  'Sell': 'bg-destructive/10 text-destructive border-destructive/20',
  'Strong Sell': 'bg-destructive/15 text-destructive border-destructive/30',
};

export default function QuickPicks({ picks, onSelect, loading, onRank, ranking }: Props) {
  return (
    <div className="space-y-2">
      {onRank && (
        <div className="flex items-center gap-2">
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
          {picks.some(p => p.signal) && (
            <span className="text-[9px] text-muted-foreground/60 italic">Sorted by confidence</span>
          )}
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        {picks.map(p => (
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
