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
    const el = document.getElementById(id);
    if (el) {
      // Offset for header (56px) + subnav with sections (~90px)
      const y = el.getBoundingClientRect().top + window.scrollY - 160;
      window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
    }
  };

  return (
    <nav
      className="sticky top-[56px] z-40 bg-background border-b border-border shadow-sm"
      style={{ position: 'sticky' }}
    >
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-1.5 space-y-1">
        {/* Row 1: Asset tabs — always visible */}
        <div className="flex justify-between gap-1 bg-secondary/50 rounded-lg p-1">
          {ASSET_TABS.map(t => (
            <button
              key={t.key}
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                onAssetChange(t.key);
              }}
              className={`flex-1 text-center px-1 py-1.5 rounded-md text-[10px] sm:text-xs font-medium transition-all ${
                assetType === t.key
                  ? 'bg-primary/15 text-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
              }`}
            >
              <span className="mr-0.5">{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>

        {/* Row 2: Section jump links — only when analysis is visible */}
        {showSections && (
          <div className="flex justify-between gap-1 border-t border-border/40 pt-1">
            {SECTIONS.map(s => (
              <button
                key={s.id}
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  scrollTo(s.id);
                }}
                className="flex-1 text-center px-1 py-0.5 rounded-md text-[10px] sm:text-xs font-medium text-muted-foreground hover:text-primary hover:bg-primary/5 transition-all"
              >
                <span className="mr-0.5">{s.icon}</span>
                <span className="hidden sm:inline">{s.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </nav>
  );
}
