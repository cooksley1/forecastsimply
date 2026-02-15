import type { AssetType } from '@/types/assets';

const ASSET_TABS: { key: AssetType; label: string; icon: string }[] = [
  { key: 'crypto', label: 'Crypto', icon: '🪙' },
  { key: 'stocks', label: 'Stocks', icon: '📈' },
  { key: 'etfs', label: 'ETFs', icon: '📊' },
  { key: 'forex', label: 'Forex', icon: '💱' },
];

const SECTIONS = [
  { id: 'section-chart', label: 'Chart', icon: '📉' },
  { id: 'section-signal', label: 'Signal', icon: '🎯' },
  { id: 'section-recs', label: 'Advice', icon: '💡' },
  { id: 'section-setups', label: 'Setups', icon: '⚡' },
  { id: 'section-indicators', label: 'Indicators', icon: '📐' },
  { id: 'section-analysis', label: 'Analysis', icon: '📝' },
];

interface Props {
  assetType: AssetType;
  onAssetChange: (t: AssetType) => void;
  showSections: boolean;
}

export default function StickySubNav({ assetType, onAssetChange, showSections }: Props) {
  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="sticky top-0 z-40 bg-background/90 backdrop-blur-md border-b border-border/60">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 flex items-center gap-1 overflow-x-auto py-1.5 scrollbar-none">
        {/* Asset tabs */}
        {ASSET_TABS.map(t => (
          <button
            key={t.key}
            onClick={() => onAssetChange(t.key)}
            className={`shrink-0 px-2.5 py-1 rounded-md text-[10px] sm:text-xs font-medium transition-all ${
              assetType === t.key
                ? 'bg-primary/15 text-primary'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
            }`}
          >
            <span className="mr-0.5">{t.icon}</span>
            {t.label}
          </button>
        ))}

        {/* Divider */}
        {showSections && (
          <>
            <span className="w-px h-4 bg-border shrink-0 mx-1" />
            {SECTIONS.map(s => (
              <button
                key={s.id}
                onClick={() => scrollTo(s.id)}
                className="shrink-0 px-2 py-1 rounded-md text-[10px] sm:text-xs font-medium text-muted-foreground hover:text-primary hover:bg-primary/5 transition-all"
              >
                <span className="mr-0.5">{s.icon}</span>
                <span className="hidden sm:inline">{s.label}</span>
              </button>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
