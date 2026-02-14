import { useState, useEffect } from 'react';
import { getCoinData } from '@/services/api/coingecko';

interface TopPick {
  id: string;
  name: string;
  symbol: string;
  price: number;
  change24h: number;
  change7d?: number;
  marketCap: number;
  image: string;
  verdict: 'Buy' | 'Watch' | 'Avoid';
  reason: string;
}

interface Props {
  onSelect: (id: string) => void;
}

const TOP_COIN_IDS = ['bitcoin', 'ethereum', 'solana', 'cardano', 'chainlink', 'avalanche-2'];

function getVerdict(change24h: number, change7d: number): { verdict: TopPick['verdict']; reason: string } {
  if (change7d > 5 && change24h > 0) return { verdict: 'Buy', reason: 'Strong momentum — rising on both daily and weekly timeframes.' };
  if (change7d < -10) return { verdict: 'Avoid', reason: 'Heavy selling pressure — wait for stabilisation before entering.' };
  if (change24h > 3) return { verdict: 'Buy', reason: 'Breaking out today — momentum traders are stepping in.' };
  if (change24h < -5) return { verdict: 'Avoid', reason: 'Significant drop today — could fall further. Wait for a bounce.' };
  return { verdict: 'Watch', reason: 'Consolidating — no clear direction yet. Set alerts and wait.' };
}

export default function TopPicks({ onSelect }: Props) {
  const [picks, setPicks] = useState<TopPick[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const results = await Promise.allSettled(
          TOP_COIN_IDS.map(id => getCoinData(id))
        );
        if (cancelled) return;
        const items: TopPick[] = [];
        for (const r of results) {
          if (r.status !== 'fulfilled') continue;
          const d = r.value;
          const c24 = d.market_data?.price_change_percentage_24h || 0;
          const c7d = d.market_data?.price_change_percentage_7d || 0;
          const { verdict, reason } = getVerdict(c24, c7d);
          items.push({
            id: d.id,
            name: d.name,
            symbol: d.symbol?.toUpperCase(),
            price: d.market_data?.current_price?.usd || 0,
            change24h: c24,
            change7d: c7d,
            marketCap: d.market_data?.market_cap?.usd || 0,
            image: d.image?.small || '',
            verdict,
            reason,
          });
        }
        setPicks(items);
      } catch {
        // silent fail
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const verdictStyles: Record<string, string> = {
    Buy: 'bg-positive/15 text-positive border-positive/30',
    Avoid: 'bg-destructive/15 text-destructive border-destructive/30',
    Watch: 'bg-warning/15 text-warning border-warning/30',
  };

  if (loading) {
    return (
      <div className="bg-sf-card border border-border rounded-xl p-4 text-center">
        <p className="text-primary font-mono text-xs animate-pulse">Loading top picks...</p>
      </div>
    );
  }

  return (
    <div className="bg-sf-card border border-border rounded-xl p-3 sm:p-4 space-y-3">
      <div>
        <h3 className="text-sm sm:text-base font-semibold text-foreground">🏆 Top Picks — Right Now</h3>
        <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
          Live signals based on 24h and 7d momentum. Tap any asset to run a full analysis.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {picks.map(p => (
          <button
            key={p.id}
            onClick={() => onSelect(p.id)}
            className="text-left p-3 rounded-lg border border-border bg-background/50 hover:border-primary/50 transition-all space-y-2"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {p.image && <img src={p.image} alt={p.name} className="w-5 h-5 rounded-full" />}
                <div>
                  <span className="text-xs font-medium text-foreground">{p.name}</span>
                  <span className="text-[9px] text-muted-foreground ml-1">{p.symbol}</span>
                </div>
              </div>
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${verdictStyles[p.verdict]}`}>
                {p.verdict}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-foreground">
                ${p.price >= 1 ? p.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : p.price.toFixed(4)}
              </span>
              <div className="flex gap-2">
                <span className={`text-[9px] font-mono ${p.change24h >= 0 ? 'text-positive' : 'text-destructive'}`}>
                  24h: {p.change24h >= 0 ? '+' : ''}{p.change24h.toFixed(1)}%
                </span>
                {p.change7d !== undefined && (
                  <span className={`text-[9px] font-mono ${p.change7d >= 0 ? 'text-positive' : 'text-destructive'}`}>
                    7d: {p.change7d >= 0 ? '+' : ''}{p.change7d.toFixed(1)}%
                  </span>
                )}
              </div>
            </div>

            <p className="text-[9px] text-muted-foreground leading-relaxed">{p.reason}</p>
          </button>
        ))}
      </div>

      <p className="text-[9px] text-muted-foreground/60 italic text-center">
        Signals are based on short-term momentum only. Always check the full analysis before investing.
      </p>
    </div>
  );
}
