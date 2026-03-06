import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { Activity, Users, Clock, TrendingUp, RefreshCw, Eye } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const COLORS = [
  'hsl(var(--primary))',
  'hsl(38, 92%, 50%)',
  'hsl(160, 60%, 45%)',
  'hsl(280, 60%, 55%)',
  'hsl(0, 70%, 55%)',
  'hsl(200, 70%, 50%)',
];

interface LoginRow {
  signed_in_at: string;
  user_id: string;
  city: string | null;
  country: string | null;
  user_agent: string | null;
}

interface AnalysisRow {
  created_at: string;
  asset_type: string;
  symbol: string;
  signal_label: string;
  user_id: string;
}

export default function AdminAnalyticsTab() {
  const [logins, setLogins] = useState<LoginRow[]>([]);
  const [analyses, setAnalyses] = useState<AnalysisRow[]>([]);
  const [subscriberCount, setSubscriberCount] = useState(0);
  const [watchlistCount, setWatchlistCount] = useState(0);
  const [alertCount, setAlertCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('7');

  const fetchData = async () => {
    setLoading(true);
    const since = new Date(Date.now() - parseInt(dateRange) * 86400000).toISOString();

    const [loginsRes, analysesRes, subsRes, watchRes, alertsRes] = await Promise.all([
      supabase.from('login_history').select('signed_in_at, user_id, city, country, user_agent').gte('signed_in_at', since).order('signed_in_at', { ascending: false }).limit(1000),
      supabase.from('analysis_history').select('created_at, asset_type, symbol, signal_label, user_id').gte('created_at', since).order('created_at', { ascending: false }).limit(1000),
      supabase.from('newsletter_subscribers').select('id', { count: 'exact', head: true }).is('unsubscribed_at', null),
      supabase.from('watchlist_items').select('id', { count: 'exact', head: true }),
      supabase.from('price_alerts').select('id', { count: 'exact', head: true }).eq('active', true),
    ]);

    setLogins((loginsRes.data as LoginRow[]) || []);
    setAnalyses((analysesRes.data as AnalysisRow[]) || []);
    setSubscriberCount(subsRes.count || 0);
    setWatchlistCount(watchRes.count || 0);
    setAlertCount(alertsRes.count || 0);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [dateRange]);

  // Computed metrics
  const uniqueUsers = useMemo(() => new Set(logins.map(l => l.user_id)).size, [logins]);
  const totalAnalyses = analyses.length;
  const totalLogins = logins.length;

  // Logins per day
  const dailyLogins = useMemo(() => {
    const days: Record<string, number> = {};
    const numDays = parseInt(dateRange);
    for (let i = numDays - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
      days[d] = 0;
    }
    logins.forEach(l => {
      const d = l.signed_in_at.slice(0, 10);
      if (days[d] !== undefined) days[d]++;
    });
    return Object.entries(days).map(([date, count]) => ({
      date: new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      logins: count,
    }));
  }, [logins, dateRange]);

  // Analysis by asset type
  const analysisByType = useMemo(() => {
    const counts: Record<string, number> = {};
    analyses.forEach(a => { counts[a.asset_type] = (counts[a.asset_type] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [analyses]);

  // Most analysed assets
  const topAssets = useMemo(() => {
    const counts: Record<string, { count: number; type: string }> = {};
    analyses.forEach(a => {
      if (!counts[a.symbol]) counts[a.symbol] = { count: 0, type: a.asset_type };
      counts[a.symbol].count++;
    });
    return Object.entries(counts)
      .map(([symbol, { count, type }]) => ({ symbol, count, type }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15);
  }, [analyses]);

  // Country breakdown from logins
  const countryBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    logins.forEach(l => {
      const c = l.country || 'Unknown';
      counts[c] = (counts[c] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [logins]);

  // Signal distribution
  const signalDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    analyses.forEach(a => { counts[a.signal_label] = (counts[a.signal_label] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [analyses]);

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-foreground font-semibold flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              Platform Analytics
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Activity metrics from login history, analysis usage, and subscriber data
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-[130px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Last 24h</SelectItem>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="14">Last 14 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={fetchData} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <KPICard icon={<Users className="w-4 h-4" />} label="Active Users" value={uniqueUsers} tooltip="Unique users who logged in during the selected period." />
          <KPICard icon={<Eye className="w-4 h-4" />} label="Logins" value={totalLogins} tooltip="Total login events across all users." />
          <KPICard icon={<TrendingUp className="w-4 h-4" />} label="Analyses Run" value={totalAnalyses} tooltip="Total asset analyses performed by all users." />
          <KPICard icon={<Clock className="w-4 h-4" />} label="Subscribers" value={subscriberCount} tooltip="Active newsletter subscribers (not unsubscribed)." />
          <KPICard icon={<Activity className="w-4 h-4" />} label="Watchlist Items" value={watchlistCount} tooltip="Total items across all users' watchlists." />
          <KPICard icon={<Activity className="w-4 h-4" />} label="Active Alerts" value={alertCount} tooltip="Active price alerts across all users." />
        </div>

        {/* Charts */}
        <div className="grid md:grid-cols-2 gap-4">
          {/* Daily logins */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Daily Logins</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={dailyLogins}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-[10px]" tick={{ fontSize: 10 }} />
                  <YAxis className="text-[10px]" tick={{ fontSize: 10 }} />
                  <RTooltip />
                  <Line type="monotone" dataKey="logins" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Analysis by asset type */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Analyses by Asset Type</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-center">
              {analysisByType.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie data={analysisByType} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                      {analysisByType.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <RTooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-xs text-muted-foreground py-8">No analysis data yet</p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {/* Top analysed assets */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Most Analysed Assets</CardTitle>
            </CardHeader>
            <CardContent>
              {topAssets.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={topAssets} layout="vertical" margin={{ left: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis type="number" tick={{ fontSize: 10 }} />
                    <YAxis dataKey="symbol" type="category" tick={{ fontSize: 10 }} width={55} />
                    <RTooltip />
                    <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-xs text-muted-foreground py-8 text-center">No data yet</p>
              )}
            </CardContent>
          </Card>

          {/* Signal distribution */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Signal Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              {signalDistribution.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={signalDistribution}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <RTooltip />
                    <Bar dataKey="value" fill="hsl(38, 92%, 50%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-xs text-muted-foreground py-8 text-center">No data yet</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Country breakdown */}
        {countryBreakdown.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">User Locations (from logins)</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Country</TableHead>
                    <TableHead className="text-right">Logins</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {countryBreakdown.map(c => (
                    <TableRow key={c.name}>
                      <TableCell className="text-sm">{c.name}</TableCell>
                      <TableCell className="text-right font-mono text-sm">{c.value}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </TooltipProvider>
  );
}

function KPICard({ icon, label, value, tooltip }: { icon: React.ReactNode; label: string; value: number; tooltip: string }) {
  return (
    <Card>
      <CardContent className="pt-4 pb-3 px-3">
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1.5 text-muted-foreground text-[11px] cursor-help">
              {icon} {label}
            </div>
          </TooltipTrigger>
          <TooltipContent className="max-w-[200px]">
            <p className="text-xs">{tooltip}</p>
          </TooltipContent>
        </Tooltip>
        <p className="text-xl font-bold mt-1 text-foreground">{value.toLocaleString()}</p>
      </CardContent>
    </Card>
  );
}
