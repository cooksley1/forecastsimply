import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface CacheStats {
  asset_type: string;
  exchange: string | null;
  count: number;
  newest: string;
}

export default function AdminAnalysisTab() {
  const [running, setRunning] = useState<string | null>(null);
  const [selectedTimeframe, setSelectedTimeframe] = useState(90);
  const [stats, setStats] = useState<CacheStats[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('daily_analysis_cache')
      .select('asset_type, exchange, analyzed_at');

    if (data && data.length > 0) {
      const groups: Record<string, CacheStats> = {};
      for (const row of data) {
        const key = `${row.asset_type}|${row.exchange || 'global'}`;
        if (!groups[key]) {
          groups[key] = { asset_type: row.asset_type, exchange: row.exchange, count: 0, newest: row.analyzed_at };
        }
        groups[key].count++;
        if (row.analyzed_at > groups[key].newest) groups[key].newest = row.analyzed_at;
      }
      setStats(Object.values(groups));
    }
    setLoading(false);
  };

  useEffect(() => { fetchStats(); }, []);

  const triggerAnalysis = async (assetType: 'stocks' | 'crypto') => {
    setRunning(assetType);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/run-daily-analysis`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ asset_type: assetType, offset: 0 }),
        }
      );
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed');

      toast.success(
        `${assetType} analysis started — ${result.processed || 0} assets in first batch. ${result.has_more ? 'Auto-chaining next batch…' : 'Complete!'}`
      );
      // Refresh stats after a short delay
      setTimeout(fetchStats, 3000);
    } catch (e: any) {
      toast.error(e.message || 'Failed to trigger analysis');
    } finally {
      setRunning(null);
    }
  };

  const formatDate = (d: string) => {
    const date = new Date(d);
    const now = new Date();
    const diffH = (now.getTime() - date.getTime()) / 36e5;
    const relative = diffH < 1 ? `${Math.round(diffH * 60)}m ago` : diffH < 24 ? `${Math.round(diffH)}h ago` : `${Math.round(diffH / 24)}d ago`;
    return `${date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} ${date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })} (${relative})`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-foreground font-semibold mb-1">Daily Analysis Cache</h2>
        <p className="text-xs text-muted-foreground">
          Pre-computed technical analysis for instant Best Buys, Growth, and Yield filters. Runs automatically at 3:00 AM AEST daily.
        </p>
      </div>

      {/* Trigger buttons */}
      <div className="flex flex-wrap gap-3">
        <Button
          onClick={() => triggerAnalysis('stocks')}
          disabled={!!running}
          className="gap-2"
        >
          {running === 'stocks' ? (
            <>
              <span className="inline-block w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              Running Stocks…
            </>
          ) : (
            <>📈 Run Stocks Analysis Now</>
          )}
        </Button>

        <Button
          onClick={() => triggerAnalysis('crypto')}
          disabled={!!running}
          className="gap-2"
        >
          {running === 'crypto' ? (
            <>
              <span className="inline-block w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              Running Crypto…
            </>
          ) : (
            <>🪙 Run Crypto Analysis Now</>
          )}
        </Button>

        <Button variant="outline" onClick={fetchStats} disabled={loading} className="gap-2">
          🔄 Refresh Stats
        </Button>
      </div>

      {/* Cache stats */}
      {loading ? (
        <div className="text-muted-foreground text-sm animate-pulse py-4">Loading cache stats…</div>
      ) : stats.length === 0 ? (
        <div className="border border-dashed border-border rounded-xl p-6 text-center text-sm text-muted-foreground">
          No cached analysis data yet. Click a button above to run the first analysis.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {stats.map(s => (
            <div
              key={`${s.asset_type}-${s.exchange}`}
              className="border border-border rounded-xl bg-card p-4 space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span>{s.asset_type === 'stocks' ? '📈' : '🪙'}</span>
                  <span className="text-sm font-semibold text-foreground capitalize">{s.asset_type}</span>
                  {s.exchange && (
                    <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded font-mono">{s.exchange}</span>
                  )}
                </div>
                <span className="text-xs font-mono text-primary font-bold">{s.count.toLocaleString()} assets</span>
              </div>
              <div className="text-[11px] text-muted-foreground">
                Last updated: {formatDate(s.newest)}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Info */}
      <div className="bg-muted/40 border border-border/60 rounded-lg px-4 py-3 space-y-1">
        <p className="text-[11px] font-semibold text-foreground">How it works</p>
        <ul className="space-y-0.5 text-[10px] text-muted-foreground">
          <li>• Fetches all stocks from the exchange screener (Yahoo Finance) or top crypto from CoinGecko</li>
          <li>• Calculates 90-day technical indicators: SMA(20/50), RSI(14), MACD, Bollinger Bands, Stochastic</li>
          <li>• Scores each asset on a composite signal (Strong Buy → Strong Sell)</li>
          <li>• Processes in batches of 40, auto-chaining until all assets are done</li>
          <li>• Results are stored in the cache and served instantly to users</li>
        </ul>
      </div>
    </div>
  );
}
