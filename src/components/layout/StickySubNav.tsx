import { BarChart3, TrendingUp, Layers, DollarSign, LineChart, Target, Lightbulb, Zap, SlidersHorizontal, FileText, LayoutGrid } from 'lucide-react';
import type { AssetType } from '@/types/assets';

const ASSET_TABS: { key: AssetType | 'all'; label: string; icon: React.ReactNode }[] = [
  { key: 'all', label: 'All', icon: <LayoutGrid className="w-3.5 h-3.5" /> },
  { key: 'crypto', label: 'Crypto', icon: <DollarSign className="w-3.5 h-3.5" /> },
  { key: 'stocks', label: 'Stocks', icon: <TrendingUp className="w-3.5 h-3.5" /> },
  { key: 'etfs', label: 'ETFs', icon: <Layers className="w-3.5 h-3.5" /> },
  { key: 'forex', label: 'Forex', icon: <BarChart3 className="w-3.5 h-3.5" /> },
];

const SECTIONS = [
  { id: 'section-chart', label: 'Chart', icon: <LineChart className="w-3 h-3" /> },
  { id: 'section-signal', label: 'Signal', icon: <Target className="w-3 h-3" /> },
  { id: 'section-recs', label: 'Advice', icon: <Lightbulb className="w-3 h-3" /> },
  { id: 'section-setups', label: 'Setups', icon: <Zap className="w-3 h-3" /> },
  { id: 'section-indicators', label: 'Indicators', icon: <SlidersHorizontal className="w-3 h-3" /> },
  { id: 'section-analysis', label: 'Analysis', icon: <FileText className="w-3 h-3" /> },
];

interface Props {
  assetType: AssetType;
  overviewMode: boolean;
  onAssetChange: (t: AssetType) => void;
  onOverviewToggle: (on: boolean) => void;
  showSections: boolean;
}

export default function StickySubNav({ assetType, overviewMode, onAssetChange, onOverviewToggle, showSections }: Props) {
  const activeKey = overviewMode ? 'all' : assetType;

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      const y = el.getBoundingClientRect().top + window.scrollY - 160;
      window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
    }
  };

  return (
    <nav
      className="sticky top-[56px] z-40 bg-background/95 backdrop-blur-sm border-b border-border"
      style={{ position: 'sticky' }}
    >
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-1.5 space-y-1">
        <div className="flex gap-0.5 bg-muted/50 rounded-lg p-0.5">
          {ASSET_TABS.map(t => (
            <button
              key={t.key}
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                if (t.key === 'all') {
                  onOverviewToggle(true);
                } else {
                  onOverviewToggle(false);
                  onAssetChange(t.key);
                }
              }}
              className={`flex-1 flex items-center justify-center gap-1.5 px-1 py-1.5 rounded-md text-[11px] sm:text-xs font-medium transition-all ${
                activeKey === t.key
                  ? 'bg-card text-primary shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        {showSections && !overviewMode && (
          <div className="flex gap-0.5 border-t border-border/40 pt-1 overflow-x-auto no-scrollbar">
            {SECTIONS.map(s => (
              <button
                key={s.id}
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  scrollTo(s.id);
                }}
                className="shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] sm:text-xs font-medium text-muted-foreground hover:text-primary hover:bg-primary/5 transition-all"
              >
                {s.icon}
                <span>{s.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </nav>
  );
}
