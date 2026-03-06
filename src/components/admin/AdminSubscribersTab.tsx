import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Search, Mail, Users } from 'lucide-react';
import { toast } from 'sonner';

interface Subscriber {
  id: string;
  email: string;
  subscribed_at: string;
  unsubscribed_at: string | null;
  user_id: string | null;
  preferences: {
    crypto?: boolean;
    stocks?: boolean;
    etfs?: boolean;
    forex?: boolean;
  } | null;
}

export default function AdminSubscribersTab() {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchSubscribers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('newsletter_subscribers')
      .select('*')
      .order('subscribed_at', { ascending: false })
      .limit(500);
    if (error) {
      toast.error('Failed to load subscribers');
    } else {
      setSubscribers((data as Subscriber[]) || []);
    }
    setLoading(false);
  };

  useEffect(() => { fetchSubscribers(); }, []);

  const filtered = subscribers.filter(s => {
    if (!search) return true;
    return s.email.toLowerCase().includes(search.toLowerCase());
  });

  const active = subscribers.filter(s => !s.unsubscribed_at);
  const unsubscribed = subscribers.filter(s => !!s.unsubscribed_at);

  const prefCounts = { crypto: 0, stocks: 0, etfs: 0, forex: 0 };
  active.forEach(s => {
    const prefs = s.preferences || { crypto: true, stocks: true, etfs: true, forex: true };
    if (prefs.crypto) prefCounts.crypto++;
    if (prefs.stocks) prefCounts.stocks++;
    if (prefs.etfs) prefCounts.etfs++;
    if (prefs.forex) prefCounts.forex++;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-foreground font-semibold flex items-center gap-2">
            <Mail className="w-5 h-5 text-primary" />
            Newsletter Subscribers
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage newsletter subscribers and view preferences
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchSubscribers} disabled={loading} className="gap-1.5">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3 px-3">
            <div className="flex items-center gap-1.5 text-muted-foreground text-[11px]">
              <Users className="w-4 h-4" /> Active
            </div>
            <p className="text-xl font-bold mt-1 text-positive">{active.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-3">
            <div className="flex items-center gap-1.5 text-muted-foreground text-[11px]">
              <Users className="w-4 h-4" /> Unsubscribed
            </div>
            <p className="text-xl font-bold mt-1 text-destructive">{unsubscribed.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-3">
            <div className="text-[11px] text-muted-foreground">Preference Split</div>
            <div className="flex flex-wrap gap-1 mt-1.5">
              <Badge variant="outline" className="text-[9px]">🪙 {prefCounts.crypto}</Badge>
              <Badge variant="outline" className="text-[9px]">📈 {prefCounts.stocks}</Badge>
            </div>
            <div className="flex flex-wrap gap-1 mt-1">
              <Badge variant="outline" className="text-[9px]">📊 {prefCounts.etfs}</Badge>
              <Badge variant="outline" className="text-[9px]">💱 {prefCounts.forex}</Badge>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-3">
            <div className="text-[11px] text-muted-foreground">Churn Rate</div>
            <p className="text-xl font-bold mt-1 text-foreground">
              {subscribers.length > 0 ? `${Math.round((unsubscribed.length / subscribers.length) * 100)}%` : '0%'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by email..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-8 text-muted-foreground font-mono animate-pulse">Loading...</div>
      ) : (
        <div className="border border-border rounded-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden sm:table-cell">Preferences</TableHead>
                <TableHead className="hidden sm:table-cell">Subscribed</TableHead>
                <TableHead className="hidden sm:table-cell">Linked User</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(s => {
                const prefs = s.preferences || { crypto: true, stocks: true, etfs: true, forex: true };
                return (
                  <TableRow key={s.id}>
                    <TableCell className="text-sm font-mono">{s.email}</TableCell>
                    <TableCell>
                      {s.unsubscribed_at ? (
                        <Badge variant="destructive" className="text-[9px]">Unsubscribed</Badge>
                      ) : (
                        <Badge className="text-[9px] bg-positive/15 text-positive border-positive/30">Active</Badge>
                      )}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <div className="flex gap-1 flex-wrap">
                        {prefs.crypto && <span className="text-[9px] bg-muted px-1.5 py-0.5 rounded">🪙</span>}
                        {prefs.stocks && <span className="text-[9px] bg-muted px-1.5 py-0.5 rounded">📈</span>}
                        {prefs.etfs && <span className="text-[9px] bg-muted px-1.5 py-0.5 rounded">📊</span>}
                        {prefs.forex && <span className="text-[9px] bg-muted px-1.5 py-0.5 rounded">💱</span>}
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">
                      {new Date(s.subscribed_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-[10px] font-mono text-muted-foreground">
                      {s.user_id ? s.user_id.slice(0, 8) + '...' : '—'}
                    </TableCell>
                  </TableRow>
                );
              })}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    {search ? 'No subscribers match your search' : 'No subscribers yet'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <p className="text-[9px] text-muted-foreground/60 italic">
        Showing {filtered.length} of {subscribers.length} subscribers
      </p>
    </div>
  );
}
