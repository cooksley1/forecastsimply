import type { AssetType } from '@/types/assets';

const tabs: { key: AssetType; label: string; icon: string }[] = [
  { key: 'crypto', label: 'Crypto', icon: '🪙' },
  { key: 'stocks', label: 'Stocks', icon: '📈' },
  { key: 'etfs', label: 'ETFs', icon: '📊' },
  { key: 'forex', label: 'Forex', icon: '💱' },
];

interface Props {
  active: AssetType;
  onSelect: (t: AssetType) => void;
}

export default function Header({ active, onSelect }: Props) {
  return (
    <header className="border-b border-border bg-sf-card px-4 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
            <span className="text-primary font-bold text-sm font-mono">SF</span>
          </div>
          <div>
            <h1 className="text-foreground font-bold text-lg leading-tight">Signal Forge</h1>
            <span className="text-muted-foreground text-xs font-mono">v6.0</span>
          </div>
        </div>

        <nav className="flex gap-1 overflow-x-auto">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => onSelect(t.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                active === t.key
                  ? 'bg-primary/15 text-primary glow-cyan'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
              }`}
            >
              <span className="mr-1.5">{t.icon}</span>
              {t.label}
            </button>
          ))}
        </nav>
      </div>
    </header>
  );
}
