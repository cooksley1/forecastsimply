import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

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
  onSelectAsset?: (id: string, type: string) => void;
}

export default function SmartFeed({ onSelectAsset }: Props) {
  const { user } = useAuth();
  const [digest, setDigest] = useState<Digest | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDigest = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('curated-digest');
      if (fnError) throw fnError;
      setDigest(data);
    } catch (e: any) {
      setError(e.message || 'Failed to load digest');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) fetchDigest();
  }, [user]);

  if (!user) return null;

  const sentimentColor = (s: string) =>
    s === 'bullish' ? 'text-positive' : s === 'bearish' ? 'text-negative' : 'text-neutral-signal';

  const sentimentIcon = (s: string) =>
    s === 'bullish' ? '🟢' : s === 'bearish' ? '🔴' : '🟡';

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="text-sm">🧠</span>
          <h3 className="text-xs font-semibold text-foreground font-mono">AI Market Digest</h3>
        </div>
        <button
          onClick={fetchDigest}
          disabled={loading}
          className="text-[10px] text-muted-foreground hover:text-primary transition-colors disabled:opacity-50"
        >
          {loading ? '⏳' : '🔄'} Refresh
        </button>
      </div>

      <div className="p-4 space-y-3">
        {loading && !digest && (
          <div className="text-center py-6 space-y-2">
            <div className="text-2xl animate-pulse-glow">🧠</div>
            <p className="text-xs text-muted-foreground">Generating your personalised digest...</p>
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
            <p className="text-xs text-muted-foreground">Analyse some assets to get your personalised AI digest</p>
            <button
              onClick={fetchDigest}
              className="text-xs text-primary hover:underline"
            >
              Generate Digest →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
