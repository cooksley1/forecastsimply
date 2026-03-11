import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface CacheStats {
  asset_type: string;
  exchange: string | null;
  timeframe_days: number;
  count: number;
  newest: string;
}

export default function AdminAnalysisTab() {
  const [running, setRunning] = useState<string | null>(null);
  const [selectedTimeframe, setSelectedTimeframe] = useState(90);
  const [stats, setStats] = useState<CacheStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [excludedSuffixes, setExcludedSuffixes] = useState<string[]>([]);
  const [newSuffix, setNewSuffix] = useState('');
  const [suffixSaving, setSuffixSaving] = useState(false);

  const fetchStats = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('daily_analysis_cache')
      .select('asset_type, exchange, timeframe_days, analyzed_at');

    if (data && data.length > 0) {
      const groups: Record<string, CacheStats> = {};
      for (const row of data) {
        const key = `${row.asset_type}|${row.exchange || 'global'}|${row.timeframe_days}`;
        if (!groups[key]) {
          groups[key] = { asset_type: row.asset_type, exchange: row.exchange, timeframe_days: row.timeframe_days, count: 0, newest: row.analyzed_at };
        }
        groups[key].count++;
        if (row.analyzed_at > groups[key].newest) groups[key].newest = row.analyzed_at;
      }
      setStats(Object.values(groups).sort((a, b) => {
        if (a.asset_type !== b.asset_type) return a.asset_type.localeCompare(b.asset_type);
        return a.timeframe_days - b.timeframe_days;
      }));
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
          body: JSON.stringify({ asset_type: assetType, offset: 0, timeframe: selectedTimeframe }),
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

      {/* Timeframe selector + Trigger buttons */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 bg-card border border-border rounded-lg p-1">
          {[30, 90, 180, 365].map(tf => (
            <button
              key={tf}
              onClick={() => setSelectedTimeframe(tf)}
              className={`px-3 py-1.5 rounded text-xs font-mono font-medium transition-all ${
                selectedTimeframe === tf
                  ? 'bg-primary/15 text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tf === 30 ? '1M' : tf === 90 ? '3M' : tf === 180 ? '6M' : '1Y'}
            </button>
          ))}
        </div>

        <Button
          onClick={() => triggerAnalysis('stocks')}
          disabled={!!running}
          className="gap-2"
        >
          {running === 'stocks' ? (
            <>
              <span className="inline-block w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              Running Stocks ({selectedTimeframe}d)…
            </>
          ) : (
            <>📈 Run Stocks ({selectedTimeframe}d)</>
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
              Running Crypto ({selectedTimeframe}d)…
            </>
          ) : (
            <>🪙 Run Crypto ({selectedTimeframe}d)</>
          )}
        </Button>

        <Button variant="outline" onClick={fetchStats} disabled={loading} className="gap-2">
          🔄 Refresh Stats
        </Button>
      </div>

      {/* Timeframe coverage matrix */}
      {!loading && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-foreground">Cache Coverage</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {(['stocks', 'crypto'] as const).map(type => {
              const TIMEFRAMES = [
                { days: 30, label: '1M' },
                { days: 90, label: '3M' },
                { days: 180, label: '6M' },
                { days: 365, label: '1Y' },
              ];
              return (
                <div key={type} className="border border-border rounded-xl bg-card p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <span>{type === 'stocks' ? '📈' : '🪙'}</span>
                    <span className="text-sm font-semibold text-foreground capitalize">{type}</span>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {TIMEFRAMES.map(tf => {
                      const match = stats.find(s => s.asset_type === type && s.timeframe_days === tf.days);
                      const populated = match && match.count > 0;
                      const diffH = match ? (Date.now() - new Date(match.newest).getTime()) / 36e5 : 0;
                      const stale = populated && diffH > 36;
                      return (
                        <div
                          key={tf.days}
                          className={`flex flex-col items-center gap-1 rounded-lg border px-2 py-2 text-center transition-colors ${
                            populated
                              ? stale
                                ? 'bg-warning/10 border-warning/30'
                                : 'bg-positive/10 border-positive/30'
                              : 'bg-muted/30 border-border'
                          }`}
                        >
                          <span className="text-xs font-mono font-bold text-foreground">{tf.label}</span>
                          {populated ? (
                            <>
                              <span className={`text-[10px] font-semibold ${stale ? 'text-warning' : 'text-positive'}`}>
                                {stale ? '⚠ Stale' : '✓ Ready'}
                              </span>
                              <span className="text-[9px] text-muted-foreground font-mono">{match!.count.toLocaleString()}</span>
                              <span className="text-[8px] text-muted-foreground">
                                {diffH < 1 ? `${Math.round(diffH * 60)}m` : diffH < 24 ? `${Math.round(diffH)}h` : `${Math.round(diffH / 24)}d`} ago
                              </span>
                            </>
                          ) : (
                            <span className="text-[10px] text-muted-foreground/60 font-medium">Pending</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Cache stats detail */}
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
              key={`${s.asset_type}-${s.exchange}-${s.timeframe_days}`}
              className="border border-border rounded-xl bg-card p-4 space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span>{s.asset_type === 'stocks' ? '📈' : '🪙'}</span>
                  <span className="text-sm font-semibold text-foreground capitalize">{s.asset_type}</span>
                  {s.exchange && (
                    <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded font-mono">{s.exchange}</span>
                  )}
                  <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-mono">
                    {s.timeframe_days === 30 ? '1M' : s.timeframe_days === 90 ? '3M' : s.timeframe_days === 180 ? '6M' : '1Y'}
                  </span>
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
