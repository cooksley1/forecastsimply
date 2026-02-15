import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import type { AssetType, WatchlistItem } from '@/types/assets';

interface Insight {
  asset: string;
  name: string;
  type: string;
  insight: string;
  sentiment: 'bullish' | 'bearish' | 'neutral';
}

interface Digest {
  greeting: string;
  market_summary: string;
  insights: Insight[];
  recommendations: string[];
  watchlist_alerts: string[];
}

interface Props {
  assetType: AssetType;
  watchlist?: WatchlistItem[];
  onSelectAsset?: (id: string, type: string) => void;
}

const DIGEST_NAMES: Record<AssetType, { icon: string; label: string }> = {
  crypto: { icon: '🪙', label: 'CryptoSimply Market Digest' },
  stocks: { icon: '📈', label: 'StockSimply Market Digest' },
  etfs: { icon: '📊', label: 'ETFSimply Market Digest' },
  forex: { icon: '💱', label: 'ForexSimply Market Digest' },
};

export default function SmartFeed({ assetType, watchlist = [], onSelectAsset }: Props) {
  const { user } = useAuth();
  const [digest, setDigest] = useState<Digest | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  const fetchDigest = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      // First check for an admin-approved digest for this asset type
      const { data: approved } = await supabase
        .from('market_digests')
        .select('greeting, market_summary, insights, recommendations, watchlist_alerts')
        .eq('asset_type', assetType)
        .eq('status', 'approved')
        .order('approved_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (approved) {
        setDigest(approved as any);
        setExpanded(true);
      } else {
        // Pass local watchlist to the edge function so it knows about user's watched assets
        const watchlistPayload = watchlist.map(w => ({
          asset_id: w.id,
          symbol: w.symbol,
          name: w.name,
          asset_type: w.assetType,
        }));
        const { data, error: fnError } = await supabase.functions.invoke('curated-digest', {
          body: { watchlist: watchlistPayload },
        });
        if (fnError) throw fnError;
        setDigest(data);
        setExpanded(true);
      }
    } catch (e: any) {
      setError(e.message || 'Failed to load digest');
      setExpanded(true);
    } finally {
      setLoading(false);
    }
  };

  // Reset expanded when asset type changes
  useEffect(() => {
    setExpanded(false);
    setDigest(null);
  }, [assetType]);

  if (!user) return null;

  const { icon, label } = DIGEST_NAMES[assetType];

  const sentimentColor = (s: string) =>
    s === 'bullish' ? 'text-positive' : s === 'bearish' ? 'text-negative' : 'text-neutral-signal';

  const sentimentIcon = (s: string) =>
    s === 'bullish' ? '🟢' : s === 'bearish' ? '🔴' : '🟡';

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <button
        onClick={() => {
          if (!expanded && !digest && !loading) {
            setExpanded(true);
            fetchDigest();
          } else {
            setExpanded(e => !e);
          }
        }}
        className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-secondary/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className={`text-sm ${loading ? 'animate-bounce' : ''}`}>{icon}</span>
          <h3 className="text-xs font-semibold text-foreground font-mono">{label}</h3>
          {loading && (
            <span className="text-[10px] text-primary font-mono animate-pulse">Loading…</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {expanded && (
            <span
              onClick={(e) => { e.stopPropagation(); fetchDigest(); }}
              className="text-[10px] text-muted-foreground hover:text-primary transition-colors cursor-pointer"
            >
              🔄
            </span>
          )}
          <span className={`text-muted-foreground text-xs transition-transform ${expanded ? 'rotate-180' : ''}`}>▼</span>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-border p-4 space-y-3">
          {loading && !digest && (
            <div className="text-center py-8 space-y-3">
              <div className="text-3xl animate-bounce">🧠</div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-foreground">Generating your personalised digest</p>
                <p className="text-[10px] text-muted-foreground animate-pulse">Analysing markets & your portfolio…</p>
              </div>
              <div className="flex justify-center gap-1 pt-1">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}

          {error && (
            <p className="text-xs text-destructive text-center py-4">{error}</p>
          )}

          {digest && (
            <>
              <p className="text-xs text-primary font-medium">{digest.greeting}</p>

              <div className="bg-secondary/50 rounded-lg p-3">
                <p className="text-[11px] text-foreground leading-relaxed">{digest.market_summary}</p>
              </div>

              {digest.insights.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[10px] text-muted-foreground font-mono uppercase">Your Assets</span>
                  {digest.insights.map((ins, i) => (
                    <button
                      key={i}
                      onClick={() => onSelectAsset?.(ins.asset, ins.type)}
                      className="w-full text-left flex items-start gap-2 px-3 py-2 rounded-lg bg-secondary/30 hover:bg-primary/5 border border-border hover:border-primary/30 transition-all"
                    >
                      <span className="text-sm mt-0.5">{sentimentIcon(ins.sentiment)}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-mono font-semibold text-foreground">{ins.asset}</span>
                          <span className={`text-[9px] font-medium ${sentimentColor(ins.sentiment)}`}>
                            {ins.sentiment.toUpperCase()}
                          </span>
                        </div>
                        <p className="text-[10px] text-muted-foreground leading-snug mt-0.5">{ins.insight}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {digest.recommendations.length > 0 && (
                <div className="space-y-1">
                  <span className="text-[10px] text-muted-foreground font-mono uppercase">Recommendations</span>
                  {digest.recommendations.map((rec, i) => (
                    <div key={i} className="flex items-start gap-2 text-[11px] text-foreground">
                      <span className="text-primary">→</span>
                      <span>{rec}</span>
                    </div>
                  ))}
                </div>
              )}

              {digest.watchlist_alerts.length > 0 && (
                <div className="space-y-1">
                  <span className="text-[10px] text-muted-foreground font-mono uppercase">Watchlist Alerts</span>
                  {digest.watchlist_alerts.map((alert, i) => (
                    <div key={i} className="flex items-start gap-2 text-[11px] text-foreground">
                      <span>⚡</span>
                      <span>{alert}</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {!loading && !digest && !error && (
            <div className="text-center py-4 space-y-2">
              <p className="text-xs text-muted-foreground">Analyse some assets to get your personalised digest</p>
              <button
                onClick={fetchDigest}
                className="text-xs text-primary hover:underline"
              >
                Generate Digest →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
