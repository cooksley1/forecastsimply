import { useState } from 'react';

interface FilterOption {
  label: string;
  id: string;
  category?: string;
}

interface FilterCategory {
  key: string;
  label: string;
  icon: string;
  options: FilterOption[];
}

interface Props {
  assetType: 'crypto' | 'stocks' | 'etfs' | 'forex';
  onSelect: (id: string) => void;
  loading?: boolean;
}

const CRYPTO_FILTERS: FilterCategory[] = [
  {
    key: 'sector', label: 'By Sector', icon: '🏷️',
    options: [
      { label: 'Layer 1s', id: 'ethereum', category: 'Smart contract platforms' },
      { label: 'DeFi', id: 'uniswap', category: 'Decentralised finance' },
      { label: 'Meme Coins', id: 'dogecoin', category: 'Community-driven tokens' },
      { label: 'AI & Data', id: 'render-token', category: 'AI infrastructure' },
      { label: 'Gaming', id: 'the-sandbox', category: 'GameFi & metaverse' },
      { label: 'Privacy', id: 'monero', category: 'Privacy-focused coins' },
    ],
  },
  {
    key: 'marketcap', label: 'By Market Cap', icon: '📊',
    options: [
      { label: 'BTC', id: 'bitcoin', category: 'Mega cap ($1T+)' },
      { label: 'ETH', id: 'ethereum', category: 'Large cap ($100B+)' },
      { label: 'SOL', id: 'solana', category: 'Large cap' },
      { label: 'ADA', id: 'cardano', category: 'Mid cap' },
      { label: 'DOT', id: 'polkadot', category: 'Mid cap' },
      { label: 'AVAX', id: 'avalanche-2', category: 'Mid cap' },
    ],
  },
  {
    key: 'ecosystem', label: 'By Ecosystem', icon: '🔗',
    options: [
      { label: 'Ethereum', id: 'ethereum', category: 'EVM ecosystem' },
      { label: 'Solana', id: 'solana', category: 'Solana ecosystem' },
      { label: 'BNB Chain', id: 'binancecoin', category: 'BNB ecosystem' },
      { label: 'Polkadot', id: 'polkadot', category: 'Parachain ecosystem' },
      { label: 'Cosmos', id: 'cosmos', category: 'IBC ecosystem' },
      { label: 'Avalanche', id: 'avalanche-2', category: 'Subnet ecosystem' },
    ],
  },
];

const STOCK_FILTERS: FilterCategory[] = [
  {
    key: 'sector', label: 'By Sector', icon: '🏢',
    options: [
      { label: 'Tech', id: 'AAPL', category: 'Technology' },
      { label: 'Finance', id: 'JPM', category: 'Banking & finance' },
      { label: 'Healthcare', id: 'JNJ', category: 'Pharma & biotech' },
      { label: 'Energy', id: 'XOM', category: 'Oil & renewables' },
      { label: 'Consumer', id: 'AMZN', category: 'Retail & e-commerce' },
      { label: 'Auto', id: 'TSLA', category: 'Electric vehicles' },
    ],
  },
  {
    key: 'market', label: 'By Market', icon: '🌏',
    options: [
      { label: 'US Mega', id: 'MSFT', category: 'US mega caps' },
      { label: 'US Growth', id: 'NVDA', category: 'US growth stocks' },
      { label: 'ASX Banks', id: 'CBA.AX', category: 'Australian banks' },
      { label: 'ASX Mining', id: 'BHP.AX', category: 'Australian mining' },
      { label: 'ASX Health', id: 'CSL.AX', category: 'Australian healthcare' },
      { label: 'ASX Retail', id: 'WES.AX', category: 'Australian retail' },
    ],
  },
  {
    key: 'style', label: 'By Style', icon: '🎯',
    options: [
      { label: 'Dividends', id: 'JNJ', category: 'Dividend aristocrats' },
      { label: 'Growth', id: 'NVDA', category: 'High-growth tech' },
      { label: 'Value', id: 'JPM', category: 'Value plays' },
      { label: 'Momentum', id: 'META', category: 'Strong price momentum' },
      { label: 'Blue Chip', id: 'AAPL', category: 'Stable large caps' },
      { label: 'Volatile', id: 'TSLA', category: 'High-beta movers' },
    ],
  },
];

const ETF_FILTERS: FilterCategory[] = [
  {
    key: 'strategy', label: 'By Strategy', icon: '📈',
    options: [
      { label: 'Index', id: 'SPY', category: 'Tracks S&P 500' },
      { label: 'Growth', id: 'QQQ', category: 'NASDAQ-100 tech-heavy' },
      { label: 'Innovation', id: 'ARKK', category: 'Disruptive innovation' },
      { label: 'Total Market', id: 'VTI', category: 'Broad US market' },
      { label: 'International', id: 'VGS.AX', category: 'Global developed markets' },
      { label: 'Diversified', id: 'VDHG.AX', category: 'Multi-asset diversified' },
    ],
  },
  {
    key: 'region', label: 'By Region', icon: '🌍',
    options: [
      { label: 'US S&P', id: 'SPY', category: 'United States' },
      { label: 'US Vanguard', id: 'VOO', category: 'United States' },
      { label: 'Australia', id: 'VAS.AX', category: 'ASX 300' },
      { label: 'ASX Top 200', id: 'A200.AX', category: 'Australia top 200' },
      { label: 'Global', id: 'VGS.AX', category: 'Developed world' },
      { label: 'iShares US', id: 'IVV.AX', category: 'US via ASX' },
    ],
  },
];

const FOREX_FILTERS: FilterCategory[] = [
  {
    key: 'type', label: 'By Type', icon: '💱',
    options: [
      { label: 'Majors', id: 'EURUSD', category: 'Most liquid pairs' },
      { label: 'AUD Pairs', id: 'AUDUSD', category: 'Australian dollar crosses' },
      { label: 'USD Pairs', id: 'USDJPY', category: 'US dollar crosses' },
      { label: 'Crosses', id: 'EURGBP', category: 'Non-USD pairs' },
      { label: 'Exotics', id: 'USDTRY', category: 'Emerging market pairs' },
      { label: 'Commodity', id: 'NZDUSD', category: 'Commodity-linked currencies' },
    ],
  },
];

function getFilters(assetType: string): FilterCategory[] {
  switch (assetType) {
    case 'crypto': return CRYPTO_FILTERS;
    case 'stocks': return STOCK_FILTERS;
    case 'etfs': return ETF_FILTERS;
    case 'forex': return FOREX_FILTERS;
    default: return [];
  }
}

export default function GuidedDiscovery({ assetType, onSelect, loading }: Props) {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const filters = getFilters(assetType);

  if (filters.length === 0) return null;

  const activeFilter = filters.find(f => f.key === activeCategory);

  return (
    <div className="bg-sf-card border border-border rounded-xl p-3 space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-muted-foreground font-mono uppercase">Discover by</span>
        <div className="flex flex-wrap gap-1">
          {filters.map(f => (
            <button
              key={f.key}
              onClick={() => setActiveCategory(activeCategory === f.key ? null : f.key)}
              className={`px-2.5 py-1 rounded-lg text-[10px] sm:text-xs font-medium transition-all border ${
                activeCategory === f.key
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground'
              }`}
            >
              {f.icon} {f.label}
            </button>
          ))}
        </div>
      </div>

      {activeFilter && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {activeFilter.options.map(opt => (
            <button
              key={`${opt.id}-${opt.label}`}
              onClick={() => onSelect(opt.id)}
              disabled={loading}
              className="group flex flex-col items-start px-3 py-2 rounded-lg bg-sf-inset border border-border hover:border-primary/40 hover:bg-primary/5 transition-all disabled:opacity-50 text-left"
            >
              <span className="text-xs font-mono font-semibold text-foreground group-hover:text-primary transition-colors">{opt.label}</span>
              {opt.category && (
                <span className="text-[9px] text-muted-foreground">{opt.category}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
