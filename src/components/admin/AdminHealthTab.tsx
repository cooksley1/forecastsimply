import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface FunctionResult {
  name: string;
  status: 'ok' | 'error' | 'timeout' | 'slow_ok';
  http_status: number | null;
  latency_ms: number;
  error?: string;
}

interface CronResult {
  name: string;
  status: 'found' | 'missing';
  schedule?: string;
}

interface TableResult {
  name: string;
  status: 'ok' | 'missing' | 'error';
  row_count?: number;
}

interface HealthReport {
  checked_at: string;
  duration_ms: number;
  healthy: boolean;
  summary: {
    functions: { ok: number; failed: number; total: number };
    cron_jobs: { found: number; missing: number; total: number };
    tables: { ok: number; failed: number; total: number };
    app_config_keys: number;
  };
  issues: string[];
  details: {
    functions: FunctionResult[];
    cron_jobs: CronResult[];
    tables: TableResult[];
    app_config_keys: string[];
  };
}

function StatusBadge({ ok, total, label }: { ok: number; total: number; label: string }) {
  const allGood = ok === total;
  return (
    <div className={`rounded-lg border p-3 ${allGood ? 'border-positive/30 bg-positive/5' : 'border-destructive/30 bg-destructive/5'}`}>
      <div className="text-[10px] font-mono uppercase text-muted-foreground">{label}</div>
      <div className={`text-xl font-bold ${allGood ? 'text-positive' : 'text-destructive'}`}>
        {ok}/{total}
      </div>
    </div>
  );
}

export default function AdminHealthTab() {
  const [report, setReport] = useState<HealthReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('app_config')
      .select('value')
      .eq('key', 'weekly_health_report')
      .maybeSingle();
    if (data?.value) setReport(data.value as unknown as HealthReport);
    setLoading(false);
  }, []);

  useEffect(() => { fetchReport(); }, [fetchReport]);

  const runNow = async () => {
    setRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke('weekly-health-check', { body: {} });
      if (error) throw error;
      setReport(data as HealthReport);
      toast.success('Health check completed');
    } catch (e: any) {
      toast.error(e.message || 'Health check failed');
    } finally {
      setRunning(false);
    }
  };

  const formatDate = (d: string) => {
    const date = new Date(d);
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) + ' ' +
      date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  };

  const toggle = (section: string) => setExpandedSection(prev => prev === section ? null : section);

  if (loading) return <div className="text-center py-12 text-muted-foreground font-mono animate-pulse">Loading health report...</div>;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <h2 className="text-foreground font-semibold">System Health</h2>
          {report && (
            <span className={`text-[10px] px-2 py-0.5 rounded font-mono ${report.healthy ? 'bg-positive/10 text-positive' : 'bg-destructive/10 text-destructive'}`}>
              {report.healthy ? '✅ HEALTHY' : '⚠️ ISSUES DETECTED'}
            </span>
          )}
        </div>
        <Button size="sm" onClick={runNow} disabled={running}>
          {running ? '⏳ Running...' : '🔄 Run Health Check'}
        </Button>
      </div>

      {!report ? (
        <div className="border border-dashed border-border rounded-lg p-8 text-center text-sm text-muted-foreground">
          No health report yet. Click "Run Health Check" to generate one.
        </div>
      ) : (
        <>
          {/* Meta */}
          <div className="text-xs text-muted-foreground font-mono">
            Last checked: {formatDate(report.checked_at)} · Duration: {(report.duration_ms / 1000).toFixed(1)}s
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatusBadge ok={report.summary.functions.ok} total={report.summary.functions.total} label="Edge Functions" />
            <StatusBadge ok={report.summary.cron_jobs.found} total={report.summary.cron_jobs.total} label="Cron Jobs" />
            <StatusBadge ok={report.summary.tables.ok} total={report.summary.tables.total} label="DB Tables" />
            <div className="rounded-lg border border-border bg-card p-3">
              <div className="text-[10px] font-mono uppercase text-muted-foreground">Config Keys</div>
              <div className="text-xl font-bold text-foreground">{report.summary.app_config_keys}</div>
            </div>
          </div>

          {/* Issues */}
          {report.issues.length > 0 && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 space-y-1">
              <div className="text-xs font-semibold text-destructive">Issues ({report.issues.length})</div>
              {report.issues.map((issue, i) => (
                <div key={i} className="text-xs text-destructive/80 font-mono">{issue}</div>
              ))}
            </div>
          )}

          {/* Functions Detail */}
          <button onClick={() => toggle('functions')} className="w-full text-left border border-border rounded-lg p-3 hover:bg-muted/30 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">📡 Edge Functions</span>
              <span className="text-xs text-muted-foreground">{expandedSection === 'functions' ? '▲' : '▼'}</span>
            </div>
          </button>
          {expandedSection === 'functions' && (
            <div className="border border-border rounded-lg overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="text-left p-2 font-mono">Function</th>
                    <th className="text-left p-2 font-mono">Status</th>
                    <th className="text-left p-2 font-mono">HTTP</th>
                    <th className="text-right p-2 font-mono">Latency</th>
                  </tr>
                </thead>
                <tbody>
                  {report.details.functions.map(fn => (
                    <tr key={fn.name} className="border-t border-border">
                      <td className="p-2 font-mono text-foreground">{fn.name}</td>
                      <td className="p-2">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                          fn.status === 'ok' ? 'bg-positive/10 text-positive' :
                          fn.status === 'slow_ok' ? 'bg-positive/10 text-positive' :
                          fn.status === 'timeout' ? 'bg-warning/10 text-warning' :
                          'bg-destructive/10 text-destructive'
                        }`}>{fn.status === 'slow_ok' ? 'SLOW OK' : fn.status.toUpperCase()}</span>
                      </td>
                      <td className="p-2 text-muted-foreground font-mono">{fn.http_status ?? '—'}</td>
                      <td className="p-2 text-right text-muted-foreground font-mono">{fn.latency_ms}ms</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Cron Jobs Detail */}
          <button onClick={() => toggle('crons')} className="w-full text-left border border-border rounded-lg p-3 hover:bg-muted/30 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">⏰ Cron Jobs</span>
              <span className="text-xs text-muted-foreground">{expandedSection === 'crons' ? '▲' : '▼'}</span>
            </div>
          </button>
          {expandedSection === 'crons' && (
            <div className="border border-border rounded-lg overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="text-left p-2 font-mono">Job</th>
                    <th className="text-left p-2 font-mono">Status</th>
                    <th className="text-left p-2 font-mono">Schedule</th>
                  </tr>
                </thead>
                <tbody>
                  {report.details.cron_jobs.map(cj => (
                    <tr key={cj.name} className="border-t border-border">
                      <td className="p-2 font-mono text-foreground">{cj.name}</td>
                      <td className="p-2">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                          cj.status === 'found' ? 'bg-positive/10 text-positive' : 'bg-destructive/10 text-destructive'
                        }`}>{cj.status.toUpperCase()}</span>
                      </td>
                      <td className="p-2 text-muted-foreground font-mono">{cj.schedule || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Tables Detail */}
          <button onClick={() => toggle('tables')} className="w-full text-left border border-border rounded-lg p-3 hover:bg-muted/30 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">🗄️ Database Tables</span>
              <span className="text-xs text-muted-foreground">{expandedSection === 'tables' ? '▲' : '▼'}</span>
            </div>
          </button>
          {expandedSection === 'tables' && (
            <div className="border border-border rounded-lg overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="text-left p-2 font-mono">Table</th>
                    <th className="text-left p-2 font-mono">Status</th>
                    <th className="text-right p-2 font-mono">Rows</th>
                  </tr>
                </thead>
                <tbody>
                  {report.details.tables.map(t => (
                    <tr key={t.name} className="border-t border-border">
                      <td className="p-2 font-mono text-foreground">{t.name}</td>
                      <td className="p-2">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                          t.status === 'ok' ? 'bg-positive/10 text-positive' : 'bg-destructive/10 text-destructive'
                        }`}>{t.status.toUpperCase()}</span>
                      </td>
                      <td className="p-2 text-right text-muted-foreground font-mono">{t.row_count ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
