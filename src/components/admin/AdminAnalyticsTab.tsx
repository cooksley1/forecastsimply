import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { Activity, Users, Clock, TrendingUp, RefreshCw, Eye, MousePointer, Search, Briefcase, Bell, Share2, Zap } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const COLORS = [
  'hsl(var(--primary))',
  'hsl(38, 92%, 50%)',
  'hsl(160, 60%, 45%)',
  'hsl(280, 60%, 55%)',
  'hsl(0, 70%, 55%)',
  'hsl(200, 70%, 50%)',
  'hsl(320, 60%, 50%)',
  'hsl(50, 80%, 50%)',
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

interface ActivityRow {
  event_type: string;
  event_data: any;
  asset_id: string | null;
  asset_type: string | null;
  page: string | null;
  user_id: string | null;
  created_at: string;
}

export default function AdminAnalyticsTab() {
  const [logins, setLogins] = useState<LoginRow[]>([]);
  const [analyses, setAnalyses] = useState<AnalysisRow[]>([]);
  const [activities, setActivities] = useState<ActivityRow[]>([]);
  const [subscriberCount, setSubscriberCount] = useState(0);
  const [watchlistCount, setWatchlistCount] = useState(0);
  const [alertCount, setAlertCount] = useState(0);
  const [portfolioCount, setPortfolioCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('7');
  const [activeSection, setActiveSection] = useState<'overview' | 'engagement' | 'features' | 'users'>('overview');

  const fetchData = async () => {
    setLoading(true);
    const since = new Date(Date.now() - parseInt(dateRange) * 86400000).toISOString();

    const [loginsRes, analysesRes, subsRes, watchRes, alertsRes, portfolioRes, activityRes] = await Promise.all([
      supabase.from('login_history').select('signed_in_at, user_id, city, country, user_agent').gte('signed_in_at', since).order('signed_in_at', { ascending: false }).limit(1000),
      supabase.from('analysis_history').select('created_at, asset_type, symbol, signal_label, user_id').gte('created_at', since).order('created_at', { ascending: false }).limit(1000),
      supabase.from('newsletter_subscribers').select('id', { count: 'exact', head: true }).is('unsubscribed_at', null),
      supabase.from('watchlist_items').select('id', { count: 'exact', head: true }),
      supabase.from('price_alerts').select('id', { count: 'exact', head: true }).eq('active', true),
      supabase.from('portfolio_holdings').select('id', { count: 'exact', head: true }),
      supabase.from('user_activity').select('event_type, event_data, asset_id, asset_type, page, user_id, created_at').gte('created_at', since).order('created_at', { ascending: false }).limit(1000),
    ]);

    setLogins((loginsRes.data as LoginRow[]) || []);
    setAnalyses((analysesRes.data as AnalysisRow[]) || []);
    setActivities((activityRes.data as ActivityRow[]) || []);
    setSubscriberCount(subsRes.count || 0);
    setWatchlistCount(watchRes.count || 0);
    setAlertCount(alertsRes.count || 0);
    setPortfolioCount(portfolioRes.count || 0);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [dateRange]);

  // === Computed metrics ===
  const uniqueUsers = useMemo(() => new Set(logins.map(l => l.user_id)).size, [logins]);
  const uniqueActiveUsers = useMemo(() => new Set([...logins.map(l => l.user_id), ...activities.filter(a => a.user_id).map(a => a.user_id!)]).size, [logins, activities]);
  const totalAnalyses = analyses.length;
  const totalLogins = logins.length;

  // Avg sessions per user
  const avgSessionsPerUser = uniqueUsers > 0 ? (totalLogins / uniqueUsers).toFixed(1) : '0';

  // Retention: users who logged in more than once
  const retentionRate = useMemo(() => {
    const userLogins: Record<string, number> = {};
    logins.forEach(l => { userLogins[l.user_id] = (userLogins[l.user_id] || 0) + 1; });
    const returning = Object.values(userLogins).filter(c => c > 1).length;
    const total = Object.keys(userLogins).length;
    return total > 0 ? Math.round((returning / total) * 100) : 0;
  }, [logins]);

  // Daily logins
  const dailyLogins = useMemo(() => {
    const days: Record<string, { logins: number; users: Set<string> }> = {};
    const numDays = parseInt(dateRange);
    for (let i = numDays - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
      days[d] = { logins: 0, users: new Set() };
    }
    logins.forEach(l => {
      const d = l.signed_in_at.slice(0, 10);
      if (days[d]) { days[d].logins++; days[d].users.add(l.user_id); }
    });
    return Object.entries(days).map(([date, v]) => ({
      date: new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      logins: v.logins,
      uniqueUsers: v.users.size,
    }));
  }, [logins, dateRange]);

  // Analysis by asset type
  const analysisByType = useMemo(() => {
    const counts: Record<string, number> = {};
    analyses.forEach(a => { counts[a.asset_type] = (counts[a.asset_type] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [analyses]);

  // Top assets
  const topAssets = useMemo(() => {
    const counts: Record<string, { count: number; type: string; users: Set<string> }> = {};
    analyses.forEach(a => {
      if (!counts[a.symbol]) counts[a.symbol] = { count: 0, type: a.asset_type, users: new Set() };
      counts[a.symbol].count++;
      counts[a.symbol].users.add(a.user_id);
    });
    return Object.entries(counts)
      .map(([symbol, { count, type, users }]) => ({ symbol, count, type, uniqueUsers: users.size }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15);
  }, [analyses]);

  // Country breakdown
  const countryBreakdown = useMemo(() => {
    const counts: Record<string, { logins: number; users: Set<string> }> = {};
    logins.forEach(l => {
      const c = l.country || 'Unknown';
      if (!counts[c]) counts[c] = { logins: 0, users: new Set() };
      counts[c].logins++;
      counts[c].users.add(l.user_id);
    });
    return Object.entries(counts)
      .map(([name, v]) => ({ name, logins: v.logins, users: v.users.size }))
      .sort((a, b) => b.logins - a.logins)
      .slice(0, 10);
  }, [logins]);

  // Signal distribution
  const signalDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    analyses.forEach(a => { counts[a.signal_label] = (counts[a.signal_label] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [analyses]);

  // Feature usage from activity tracking
  const featureUsage = useMemo(() => {
    const counts: Record<string, { count: number; users: Set<string> }> = {};
    activities.forEach(a => {
      if (!counts[a.event_type]) counts[a.event_type] = { count: 0, users: new Set() };
      counts[a.event_type].count++;
      if (a.user_id) counts[a.event_type].users.add(a.user_id);
    });
    return Object.entries(counts)
      .map(([event, v]) => ({ event: formatEventName(event), raw: event, count: v.count, users: v.users.size }))
      .sort((a, b) => b.count - a.count);
  }, [activities]);

  // Page views from activity
  const pageViews = useMemo(() => {
    const counts: Record<string, number> = {};
    activities.filter(a => a.event_type === 'page_view' && a.page).forEach(a => {
      counts[a.page!] = (counts[a.page!] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([page, count]) => ({ page, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [activities]);

  // Hourly activity heatmap
  const hourlyActivity = useMemo(() => {
    const hours = Array.from({ length: 24 }, (_, i) => ({ hour: `${i}:00`, logins: 0, activities: 0 }));
    logins.forEach(l => {
      const h = new Date(l.signed_in_at).getHours();
      hours[h].logins++;
    });
    activities.forEach(a => {
      const h = new Date(a.created_at).getHours();
      hours[h].activities++;
    });
    return hours;
  }, [logins, activities]);

  // Device breakdown from user agents
  const deviceBreakdown = useMemo(() => {
    let mobile = 0, desktop = 0, tablet = 0;
    logins.forEach(l => {
      const ua = (l.user_agent || '').toLowerCase();
      if (/ipad|tablet/i.test(ua)) tablet++;
      else if (/mobile|iphone|android/i.test(ua)) mobile++;
      else desktop++;
    });
    return [
      { name: 'Desktop', value: desktop },
      { name: 'Mobile', value: mobile },
      { name: 'Tablet', value: tablet },
    ].filter(d => d.value > 0);
  }, [logins]);

  // Power users (most active)
  const powerUsers = useMemo(() => {
    const userStats: Record<string, { logins: number; analyses: number; activities: number }> = {};
    logins.forEach(l => {
      if (!userStats[l.user_id]) userStats[l.user_id] = { logins: 0, analyses: 0, activities: 0 };
      userStats[l.user_id].logins++;
    });
    analyses.forEach(a => {
      if (!userStats[a.user_id]) userStats[a.user_id] = { logins: 0, analyses: 0, activities: 0 };
      userStats[a.user_id].analyses++;
    });
    activities.forEach(a => {
      if (!a.user_id) return;
      if (!userStats[a.user_id]) userStats[a.user_id] = { logins: 0, analyses: 0, activities: 0 };
      userStats[a.user_id].activities++;
    });
    return Object.entries(userStats)
      .map(([id, s]) => ({ id: id.slice(0, 8), ...s, total: s.logins + s.analyses + s.activities }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);
  }, [logins, analyses, activities]);

  const sections = [
    { key: 'overview' as const, label: '📊 Overview' },
    { key: 'engagement' as const, label: '📈 Engagement' },
    { key: 'features' as const, label: '⚡ Features' },
    { key: 'users' as const, label: '👥 Users' },
  ];

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
              Granular activity, feature usage, and user behavior insights
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

        {/* Sub-tabs */}
        <div className="flex gap-1 border-b border-border">
          {sections.map(s => (
            <button
              key={s.key}
              onClick={() => setActiveSection(s.key)}
              className={`px-3 py-2 text-xs font-medium border-b-2 transition-all ${
                activeSection === s.key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* === OVERVIEW === */}
        {activeSection === 'overview' && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
              <KPICard icon={<Users className="w-4 h-4" />} label="Active Users" value={uniqueActiveUsers} tooltip="Unique users with any activity" />
              <KPICard icon={<Eye className="w-4 h-4" />} label="Logins" value={totalLogins} tooltip="Total login events" />
              <KPICard icon={<TrendingUp className="w-4 h-4" />} label="Analyses" value={totalAnalyses} tooltip="Total analyses run" />
              <KPICard icon={<MousePointer className="w-4 h-4" />} label="Events" value={activities.length} tooltip="Total tracked activity events" />
              <KPICard icon={<Clock className="w-4 h-4" />} label="Subscribers" value={subscriberCount} tooltip="Newsletter subscribers" />
              <KPICard icon={<Briefcase className="w-4 h-4" />} label="Portfolios" value={portfolioCount} tooltip="Total portfolio holdings" />
              <KPICard icon={<Bell className="w-4 h-4" />} label="Alerts" value={alertCount} tooltip="Active price alerts" />
              <KPICard icon={<Zap className="w-4 h-4" />} label="Retention" value={`${retentionRate}%`} tooltip="Users who returned (>1 login)" isText />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Daily Activity (Logins & Unique Users)</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <AreaChart data={dailyLogins}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <RTooltip />
                      <Area type="monotone" dataKey="logins" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.15} strokeWidth={2} />
                      <Area type="monotone" dataKey="uniqueUsers" stroke="hsl(160, 60%, 45%)" fill="hsl(160, 60%, 45%)" fillOpacity={0.1} strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

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
                  ) : <p className="text-xs text-muted-foreground py-8">No data</p>}
                </CardContent>
              </Card>
            </div>
          </>
        )}

        {/* === ENGAGEMENT === */}
        {activeSection === 'engagement' && (
          <>
            <div className="grid grid-cols-3 gap-2">
              <KPICard icon={<TrendingUp className="w-4 h-4" />} label="Avg Sessions" value={avgSessionsPerUser} tooltip="Average logins per user" isText />
              <KPICard icon={<Activity className="w-4 h-4" />} label="Watchlist Items" value={watchlistCount} tooltip="Total watchlist items" />
              <KPICard icon={<Share2 className="w-4 h-4" />} label="Retention" value={`${retentionRate}%`} tooltip="Returning users" isText />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Activity by Hour (UTC)</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={hourlyActivity}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="hour" tick={{ fontSize: 9 }} interval={2} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <RTooltip />
                      <Bar dataKey="logins" fill="hsl(var(--primary))" radius={[2, 2, 0, 0]} stackId="a" />
                      <Bar dataKey="activities" fill="hsl(38, 92%, 50%)" radius={[2, 2, 0, 0]} stackId="a" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Device Distribution</CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-center">
                  {deviceBreakdown.length > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie data={deviceBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                          {deviceBreakdown.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Pie>
                        <RTooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : <p className="text-xs text-muted-foreground py-8">No data</p>}
                </CardContent>
              </Card>
            </div>

            {/* Signal distribution + Top assets */}
            <div className="grid md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Signal Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  {signalDistribution.length > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={signalDistribution}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <RTooltip />
                        <Bar dataKey="value" fill="hsl(38, 92%, 50%)" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : <p className="text-xs text-muted-foreground py-8 text-center">No data</p>}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Most Analysed Assets</CardTitle>
                </CardHeader>
                <CardContent>
                  {topAssets.length > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={topAssets.slice(0, 10)} layout="vertical" margin={{ left: 50 }}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis type="number" tick={{ fontSize: 10 }} />
                        <YAxis dataKey="symbol" type="category" tick={{ fontSize: 10 }} width={45} />
                        <RTooltip />
                        <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : <p className="text-xs text-muted-foreground py-8 text-center">No data</p>}
                </CardContent>
              </Card>
            </div>
          </>
        )}

        {/* === FEATURES === */}
        {activeSection === 'features' && (
          <>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Feature Usage Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                {featureUsage.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Feature</TableHead>
                        <TableHead className="text-right">Uses</TableHead>
                        <TableHead className="text-right">Unique Users</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {featureUsage.map(f => (
                        <TableRow key={f.raw}>
                          <TableCell className="text-sm">{f.event}</TableCell>
                          <TableCell className="text-right font-mono text-sm">{f.count}</TableCell>
                          <TableCell className="text-right font-mono text-sm">{f.users}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-xs text-muted-foreground py-8 text-center">
                    No activity events tracked yet. Events will appear as users interact with features.
                  </p>
                )}
              </CardContent>
            </Card>

            {pageViews.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Page Views</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={pageViews} layout="vertical" margin={{ left: 80 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis type="number" tick={{ fontSize: 10 }} />
                      <YAxis dataKey="page" type="category" tick={{ fontSize: 10 }} width={75} />
                      <RTooltip />
                      <Bar dataKey="count" fill="hsl(160, 60%, 45%)" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* === USERS === */}
        {activeSection === 'users' && (
          <>
            {/* Power users */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Most Active Users</CardTitle>
              </CardHeader>
              <CardContent>
                {powerUsers.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User ID</TableHead>
                        <TableHead className="text-right">Logins</TableHead>
                        <TableHead className="text-right">Analyses</TableHead>
                        <TableHead className="text-right">Events</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {powerUsers.map(u => (
                        <TableRow key={u.id}>
                          <TableCell className="font-mono text-xs">{u.id}…</TableCell>
                          <TableCell className="text-right font-mono text-sm">{u.logins}</TableCell>
                          <TableCell className="text-right font-mono text-sm">{u.analyses}</TableCell>
                          <TableCell className="text-right font-mono text-sm">{u.activities}</TableCell>
                          <TableCell className="text-right font-mono text-sm font-bold">{u.total}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : <p className="text-xs text-muted-foreground py-8 text-center">No data</p>}
              </CardContent>
            </Card>

            {/* Country breakdown */}
            {countryBreakdown.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">User Locations</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Country</TableHead>
                        <TableHead className="text-right">Logins</TableHead>
                        <TableHead className="text-right">Unique Users</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {countryBreakdown.map(c => (
                        <TableRow key={c.name}>
                          <TableCell className="text-sm">{c.name}</TableCell>
                          <TableCell className="text-right font-mono text-sm">{c.logins}</TableCell>
                          <TableCell className="text-right font-mono text-sm">{c.users}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </TooltipProvider>
  );
}

function KPICard({ icon, label, value, tooltip, isText }: { icon: React.ReactNode; label: string; value: number | string; tooltip: string; isText?: boolean }) {
  return (
    <Card>
      <CardContent className="pt-3 pb-2 px-3">
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1.5 text-muted-foreground text-[10px] cursor-help">
              {icon} {label}
            </div>
          </TooltipTrigger>
          <TooltipContent className="max-w-[200px]">
            <p className="text-xs">{tooltip}</p>
          </TooltipContent>
        </Tooltip>
        <p className="text-lg font-bold mt-0.5 text-foreground">{isText ? value : Number(value).toLocaleString()}</p>
      </CardContent>
    </Card>
  );
}

function formatEventName(event: string): string {
  return event
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}
