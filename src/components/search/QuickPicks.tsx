interface PickItem {
  label: string;
  id: string;
}

interface Props {
  picks: PickItem[];
  onSelect: (id: string) => void;
  loading?: boolean;
}

export default function QuickPicks({ picks, onSelect, loading }: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      {picks.map(p => (
        <button
          key={p.id}
          onClick={() => onSelect(p.id)}
          disabled={loading}
          className="px-3 py-1.5 rounded-md bg-sf-elevated border border-border text-xs font-mono font-medium text-foreground hover:border-primary/40 hover:text-primary transition-all disabled:opacity-50"
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}
