import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { bustUnsupportedCache } from '@/utils/unsupportedCoins';

interface CacheStats {
  asset_type: string;
  exchange: string | null;
  timeframe_days: number;
  count: number;
  newest: string;
}

interface UnsupportedCoinRow {
  id: string;
  coin_id: string;
  name: string;
  reason: string;
}

interface HealthResult {
  label: string;
  status: 'healthy' | 'stale' | 'empty';
  count: number;
  age_hours: number | null;
}

interface HealthReport {
  checked_at: string;
  results: HealthResult[];
  issues: string[];
  healthy: boolean;
}

export default function AdminAnalysisTab() {
  const [running, setRunning] = useState<string | null>(null);
  const [selectedTimeframe, setSelectedTimeframe] = useState(90);
  const [stats, setStats] = useState<CacheStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [excludedSuffixes, setExcludedSuffixes] = useState<string[]>([]);
  const [newSuffix, setNewSuffix] = useState('');
  const [suffixSaving, setSuffixSaving] = useState(false);

  // Health check state
  const [healthReport, setHealthReport] = useState<HealthReport | null>(null);
  const [healthLoading, setHealthLoading] = useState(false);

  // Unsupported coins state
  const [unsupportedCoins, setUnsupportedCoins] = useState<UnsupportedCoinRow[]>([]);
  const [newCoinId, setNewCoinId] = useState('');
  const [newCoinName, setNewCoinName] = useState('');
  const [newCoinReason, setNewCoinReason] = useState('');
  const [coinSaving, setCoinSaving] = useState(false);

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

  const fetchUnsupportedCoins = async () => {
    const { data } = await supabase.from('unsupported_coins').select('id, coin_id, name, reason').order('coin_id');
    setUnsupportedCoins((data as UnsupportedCoinRow[]) || []);
  };

  const fetchHealthReport = async () => {
    const { data } = await supabase.from('app_config').select('value').eq('key', 'cache_health_report').maybeSingle();
    if (data?.value && typeof data.value === 'object') {
      setHealthReport(data.value as unknown as HealthReport);
    }
  };

  const runHealthCheck = async () => {
    setHealthLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/check-cache-health`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
        }
      );
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed');
      setHealthReport(result);
      toast.success(result.healthy ? 'All caches healthy ✓' : `${result.issues.length} issue(s) found`);
    } catch (e: any) {
      toast.error(e.message || 'Health check failed');
    } finally {
      setHealthLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchUnsupportedCoins();
    fetchHealthReport();
    // Load excluded suffixes
    supabase.from('app_config').select('value').eq('key', 'excluded_email_suffixes').maybeSingle()
      .then(({ data }) => {
        if (data?.value && Array.isArray(data.value)) {
          setExcludedSuffixes((data.value as any[]).map(String));
        }
      });
  }, []);

  const addUnsupportedCoin = async () => {
    const coinId = newCoinId.trim().toLowerCase().replace(/\s+/g, '-');
    const name = newCoinName.trim();
    const reason = newCoinReason.trim() || `${name} is not available on supported free data APIs.`;
    if (!coinId || !name) { toast.error('Coin ID and name are required'); return; }
    setCoinSaving(true);
    const { error } = await supabase.from('unsupported_coins').insert({ coin_id: coinId, name, reason } as any);
    setCoinSaving(false);
    if (error) { toast.error(error.message.includes('duplicate') ? 'Already in list' : error.message); return; }
    bustUnsupportedCache();
    setNewCoinId(''); setNewCoinName(''); setNewCoinReason('');
    fetchUnsupportedCoins();
    toast.success(`Added ${name} to unsupported list`);
  };

  const removeUnsupportedCoin = async (id: string, name: string) => {
    const { error } = await supabase.from('unsupported_coins').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    bustUnsupportedCache();
    fetchUnsupportedCoins();
    toast.success(`Removed ${name} from unsupported list`);
  };

  const saveSuffixes = async (updated: string[]) => {
    setSuffixSaving(true);
    const { error } = await supabase.from('app_config' as any)
      .update({ value: updated, updated_at: new Date().toISOString() } as any)
      .eq('key', 'excluded_email_suffixes');
    setSuffixSaving(false);
    if (error) {
      toast.error('Failed to save: ' + error.message);
    } else {
      setExcludedSuffixes(updated);
      toast.success('Excluded suffixes updated');
    }
  };

  const addSuffix = () => {
    const s = newSuffix.trim().toLowerCase();
    if (!s) return;
    const formatted = s.startsWith('@') ? s : `@${s}`;
    if (excludedSuffixes.includes(formatted)) { toast.error('Already added'); return; }
    saveSuffixes([...excludedSuffixes, formatted]);
    setNewSuffix('');
  };

  const removeSuffix = (s: string) => {
    saveSuffixes(excludedSuffixes.filter(x => x !== s));
  };

  const triggerAnalysis = async (assetType: 'stocks' | 'crypto' | 'etfs' | 'forex') => {
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

      {/* Health Check Panel */}
      <div className={`border rounded-xl p-4 space-y-3 ${
        healthReport
          ? healthReport.healthy
            ? 'border-positive/30 bg-positive/5'
            : 'border-warning/30 bg-warning/5'
          : 'border-border bg-card'
      }`}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-semibold text-foreground">🩺 Cache Health Monitor</h3>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Automated check runs every 6 hours. Alerts when any timeframe is empty or stale (&gt;24h).
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={runHealthCheck} disabled={healthLoading} className="gap-1.5">
            {healthLoading ? (
              <><span className="inline-block w-3 h-3 border-2 border-foreground/30 border-t-foreground rounded-full animate-spin" /> Checking…</>
            ) : '🩺 Run Now'}
          </Button>
        </div>

        {healthReport && (
          <>
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5">
              {healthReport.results.map(r => (
                <div
                  key={r.label}
                  className={`flex flex-col items-center gap-0.5 rounded-lg border px-1.5 py-2 text-center ${
                    r.status === 'healthy'
                      ? 'bg-positive/10 border-positive/30'
                      : r.status === 'stale'
                        ? 'bg-warning/10 border-warning/30'
                        : 'bg-destructive/10 border-destructive/30'
                  }`}
                >
                  <span className="text-[9px] font-mono font-bold text-foreground">{r.label.replace('Stocks ', 'S').replace('Crypto ', 'C')}</span>
                  <span className={`text-[9px] font-semibold ${
                    r.status === 'healthy' ? 'text-positive' : r.status === 'stale' ? 'text-warning' : 'text-destructive'
                  }`}>
                    {r.status === 'healthy' ? '✓' : r.status === 'stale' ? '⚠' : '✕'} {r.status}
                  </span>
                  {r.age_hours !== null && (
                    <span className="text-[8px] text-muted-foreground font-mono">{r.age_hours < 1 ? `${Math.round(r.age_hours * 60)}m` : `${Math.round(r.age_hours)}h`}</span>
                  )}
                </div>
              ))}
            </div>

            {healthReport.issues.length > 0 && (
              <div className="space-y-1 bg-background/50 rounded-lg px-3 py-2">
                <p className="text-[10px] font-semibold text-destructive">Issues detected:</p>
                {healthReport.issues.map((issue, i) => (
                  <p key={i} className="text-[10px] text-muted-foreground">{issue}</p>
                ))}
              </div>
            )}

            <p className="text-[9px] text-muted-foreground">
              Last checked: {new Date(healthReport.checked_at).toLocaleString()}
            </p>
          </>
        )}
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

        <Button
          onClick={() => triggerAnalysis('etfs')}
          disabled={!!running}
          className="gap-2"
        >
          {running === 'etfs' ? (
            <>
              <span className="inline-block w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              Running ETFs ({selectedTimeframe}d)…
            </>
          ) : (
            <>🏛️ Run ETFs ({selectedTimeframe}d)</>
          )}
        </Button>

        <Button
          onClick={() => triggerAnalysis('forex')}
          disabled={!!running}
          className="gap-2"
        >
          {running === 'forex' ? (
            <>
              <span className="inline-block w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              Running Forex ({selectedTimeframe}d)…
            </>
          ) : (
            <>💱 Run Forex ({selectedTimeframe}d)</>
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
            {(['stocks', 'crypto', 'etfs'] as const).map(type => {
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
      {/* Refresh Limit Exemptions */}
      <div className="border border-border rounded-xl bg-card p-4 space-y-3">
        <div>
          <h3 className="text-xs font-semibold text-foreground">🔓 Refresh Limit Exemptions</h3>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            Admins are always exempt. Add email suffixes below to exempt other users from the daily live refresh limit.
          </p>
        </div>

        {/* Current suffixes */}
        {excludedSuffixes.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {excludedSuffixes.map(s => (
              <span key={s} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-primary/10 border border-primary/20 text-[10px] font-mono text-primary">
                {s}
                <button onClick={() => removeSuffix(s)} className="hover:text-destructive transition-colors" disabled={suffixSaving}>✕</button>
              </span>
            ))}
          </div>
        )}

        {/* Add new */}
        <div className="flex gap-2">
          <input
            type="text"
            value={newSuffix}
            onChange={e => setNewSuffix(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addSuffix()}
            placeholder="@company.com"
            className="flex-1 bg-background border border-border rounded-lg px-3 py-1.5 text-xs font-mono text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none"
          />
          <Button size="sm" onClick={addSuffix} disabled={suffixSaving || !newSuffix.trim()}>
            {suffixSaving ? '...' : 'Add'}
          </Button>
        </div>

        <p className="text-[9px] text-muted-foreground">
          e.g. <code className="font-mono text-primary/70">@myteam.com</code> — any user with this email suffix gets unlimited live refreshes.
        </p>
      </div>

      {/* Unsupported Coins */}
      <div className="border border-border rounded-xl bg-card p-4 space-y-3">
        <div>
          <h3 className="text-xs font-semibold text-foreground">🚫 Unsupported Coins</h3>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            Coins listed here will show a warning immediately instead of attempting (and failing) API calls. Uses CoinGecko-style IDs.
          </p>
        </div>

        {/* Current list */}
        {unsupportedCoins.length > 0 && (
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {unsupportedCoins.map(coin => (
              <div key={coin.id} className="flex items-start gap-2 px-2 py-1.5 rounded-lg bg-muted/50 border border-border/50">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <code className="text-[10px] font-mono text-primary">{coin.coin_id}</code>
                    <span className="text-[10px] text-muted-foreground">— {coin.name}</span>
                  </div>
                  <p className="text-[9px] text-muted-foreground/70 truncate">{coin.reason}</p>
                </div>
                <button
                  onClick={() => removeUnsupportedCoin(coin.id, coin.name)}
                  className="text-muted-foreground hover:text-destructive transition-colors text-xs shrink-0 mt-0.5"
                >✕</button>
              </div>
            ))}
          </div>
        )}

        {/* Add new coin */}
        <div className="space-y-2 border-t border-border/50 pt-3">
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              value={newCoinId}
              onChange={e => setNewCoinId(e.target.value)}
              placeholder="coin-id (e.g. pi-network)"
              className="bg-background border border-border rounded-lg px-3 py-1.5 text-xs font-mono text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none"
            />
            <input
              type="text"
              value={newCoinName}
              onChange={e => setNewCoinName(e.target.value)}
              placeholder="Display name (e.g. Pi Network)"
              className="bg-background border border-border rounded-lg px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none"
            />
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={newCoinReason}
              onChange={e => setNewCoinReason(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addUnsupportedCoin()}
              placeholder="Reason (optional — auto-generated if blank)"
              className="flex-1 bg-background border border-border rounded-lg px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none"
            />
            <Button size="sm" onClick={addUnsupportedCoin} disabled={coinSaving || !newCoinId.trim() || !newCoinName.trim()}>
              {coinSaving ? '...' : 'Add'}
            </Button>
          </div>
        </div>
      </div>

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
