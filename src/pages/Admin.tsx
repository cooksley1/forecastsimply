import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useAdminCheck } from '@/hooks/useAdminCheck';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import AdminAnalyticsTab from '@/components/admin/AdminAnalyticsTab';
import AdminSubscribersTab from '@/components/admin/AdminSubscribersTab';
import AdminMessagesTab from '@/components/admin/AdminMessagesTab';
import AdminAnalysisTab from '@/components/admin/AdminAnalysisTab';
import AdminHealthTab from '@/components/admin/AdminHealthTab';

// ── Types ──
interface LoginRecord {
  id: string;
  signed_in_at: string;
  ip_address?: string;
  user_agent?: string;
  city?: string;
  country?: string;
}

interface AdminUser {
  id: string;
  email?: string;
  phone?: string;
  created_at: string;
  last_sign_in_at?: string;
  email_confirmed_at?: string;
  banned_until?: string;
  user_metadata?: Record<string, any>;
  role: string;
  profile?: { display_name?: string; avatar_url?: string; banned_at?: string } | null;
  login_history: LoginRecord[];
}

interface DigestInsight {
  asset: string;
  name: string;
  type: string;
  insight: string;
  sentiment: 'bullish' | 'bearish' | 'neutral';
}

interface DigestRecord {
  id: string;
  asset_type: string;
  status: string;
  greeting: string | null;
  market_summary: string | null;
  insights: DigestInsight[];
  recommendations: string[];
  watchlist_alerts: string[];
  generated_at: string;
  approved_at: string | null;
  updated_at: string;
}

const ASSET_TYPES = [
  { key: 'crypto', label: 'Crypto', icon: '🪙' },
  { key: 'stocks', label: 'Stocks', icon: '📈' },
  { key: 'etfs', label: 'ETFs', icon: '📊' },
  { key: 'forex', label: 'Forex', icon: '💱' },
];

// ── Admin API helper ──
async function adminApi(action: string, body?: any, method = 'POST') {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-users?action=${action}`;
  const res = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

// ── Digest Editor Component ──
function DigestEditor({ digest, onSave, onDelete }: { digest: DigestRecord; onSave: (d: DigestRecord) => void; onDelete: (id: string) => void }) {
  const [form, setForm] = useState(digest);
  const [insightText, setInsightText] = useState(JSON.stringify(digest.insights, null, 2));
  const [recsText, setRecsText] = useState(JSON.stringify(digest.recommendations, null, 2));
  const [alertsText, setAlertsText] = useState(JSON.stringify(digest.watchlist_alerts, null, 2));

  const handleSave = () => {
    try {
      const parsed = {
        ...form,
        insights: JSON.parse(insightText),
        recommendations: JSON.parse(recsText),
        watchlist_alerts: JSON.parse(alertsText),
      };
      onSave(parsed);
    } catch {
      toast.error('Invalid JSON in one of the fields');
    }
  };

  const brand = ASSET_TYPES.find(a => a.key === form.asset_type);

  return (
    <div className="border border-border rounded-xl bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span>{brand?.icon}</span>
          <span className="text-sm font-semibold text-foreground">{brand?.label} Digest</span>
          <span className={`text-[10px] px-2 py-0.5 rounded font-mono ${
            form.status === 'approved' ? 'bg-positive/10 text-positive' :
            form.status === 'paused' ? 'bg-destructive/10 text-destructive' :
            'bg-muted text-muted-foreground'
          }`}>{form.status.toUpperCase()}</span>
        </div>
        <div className="flex items-center gap-1">
          <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive" onClick={() => onDelete(form.id)}>🗑️</Button>
        </div>
      </div>

      <div className="space-y-2">
        <div>
          <label className="text-[10px] text-muted-foreground font-mono uppercase">Greeting</label>
          <Input value={form.greeting || ''} onChange={e => setForm(f => ({ ...f, greeting: e.target.value }))} className="h-8 text-xs" />
        </div>
        <div>
          <label className="text-[10px] text-muted-foreground font-mono uppercase">Market Summary</label>
          <Textarea value={form.market_summary || ''} onChange={e => setForm(f => ({ ...f, market_summary: e.target.value }))} className="text-xs min-h-[80px]" />
        </div>
        <div>
          <label className="text-[10px] text-muted-foreground font-mono uppercase">Insights (JSON)</label>
          <Textarea value={insightText} onChange={e => setInsightText(e.target.value)} className="text-xs font-mono min-h-[100px]" />
        </div>
        <div>
          <label className="text-[10px] text-muted-foreground font-mono uppercase">Recommendations (JSON array of strings)</label>
          <Textarea value={recsText} onChange={e => setRecsText(e.target.value)} className="text-xs font-mono min-h-[60px]" />
        </div>
        <div>
          <label className="text-[10px] text-muted-foreground font-mono uppercase">Alerts (JSON array of strings)</label>
          <Textarea value={alertsText} onChange={e => setAlertsText(e.target.value)} className="text-xs font-mono min-h-[60px]" />
        </div>
      </div>

      <div className="flex items-center gap-2 pt-2 border-t border-border">
        <Button size="sm" onClick={handleSave}>💾 Save</Button>
        <Button size="sm" variant="outline" onClick={() => onSave({ ...form, status: 'approved', approved_at: new Date().toISOString() } as any)}>
          ✅ Approve & Publish
        </Button>
        <Button size="sm" variant="outline" className="text-destructive" onClick={() => onSave({ ...form, status: 'paused' } as any)}>
          ⏸️ Pause
        </Button>
      </div>
    </div>
  );
}

// ── Digest Management Tab ──
function DigestManagement() {
  const { user } = useAuth();
  const [digests, setDigests] = useState<DigestRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<string | null>(null);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [sendingTest, setSendingTest] = useState(false);

  const fetchDigests = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('market_digests')
      .select('*')
      .order('updated_at', { ascending: false });
    setDigests((data as any) || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchDigests(); }, [fetchDigests]);

  const handleGenerate = async (assetType: string) => {
    if (!user) return;
    setGenerating(assetType);
    try {
      const { data, error } = await supabase.functions.invoke('curated-digest');
      if (error) throw error;

      const { error: insertErr } = await supabase.from('market_digests').insert({
        asset_type: assetType,
        status: 'draft',
        greeting: data.greeting,
        market_summary: data.market_summary,
        insights: data.insights,
        recommendations: data.recommendations,
        watchlist_alerts: data.watchlist_alerts,
        created_by: user.id,
      } as any);
      if (insertErr) throw insertErr;
      toast.success(`${assetType} digest generated`);
      fetchDigests();
    } catch (e: any) {
      toast.error(e.message || 'Generation failed');
    } finally {
      setGenerating(null);
    }
  };

  const handleSave = async (d: DigestRecord) => {
    const update: any = {
      greeting: d.greeting,
      market_summary: d.market_summary,
      insights: d.insights,
      recommendations: d.recommendations,
      watchlist_alerts: d.watchlist_alerts,
      status: d.status,
    };
    if (d.status === 'approved') {
      update.approved_at = new Date().toISOString();
      update.approved_by = user?.id;
      // Unpublish other approved digests of same type
      await supabase
        .from('market_digests')
        .update({ status: 'draft' } as any)
        .eq('asset_type', d.asset_type)
        .eq('status', 'approved')
        .neq('id', d.id);
    }
    const { error } = await supabase.from('market_digests').update(update as any).eq('id', d.id);
    if (error) toast.error(error.message);
    else toast.success('Digest saved');
    fetchDigests();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this digest?')) return;
    await supabase.from('market_digests').delete().eq('id', id);
    toast.success('Deleted');
    fetchDigests();
  };

  const handlePreview = async (id: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-digest`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ action: 'preview', digest_id: id }),
      });
      const data = await res.json();
      if (data.html) setPreviewHtml(data.html);
      else toast.error(data.error || 'Preview failed');
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleSendTest = async () => {
    setSendingTest(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-digest`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ action: 'send_test' }),
      });
      const data = await res.json();
      if (data.digests) {
        // Open each digest HTML in a new tab for preview
        for (const d of data.digests) {
          const blob = new Blob([d.html], { type: 'text/html' });
          const url = URL.createObjectURL(blob);
          window.open(url, `_blank_${d.asset_type}`);
        }
        toast.success(`${data.digests.length} digest(s) opened for preview → ${data.sent_to}`);
      } else {
        toast.error(data.error || 'Failed');
      }
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSendingTest(false);
    }
  };

  const grouped = ASSET_TYPES.map(at => ({
    ...at,
    digests: digests.filter(d => d.asset_type === at.key),
    hasApproved: digests.some(d => d.asset_type === at.key && d.status === 'approved'),
  }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-foreground font-semibold">Market Digests</h2>
        <Button size="sm" onClick={handleSendTest} disabled={sendingTest}>
          {sendingTest ? '⏳ Generating…' : '📧 Preview All Approved Digests'}
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground font-mono animate-pulse">Loading digests...</div>
      ) : (
        <div className="space-y-6">
          {grouped.map(group => (
            <div key={group.key} className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span>{group.icon}</span>
                  <span className="text-sm font-semibold text-foreground">{group.label}</span>
                  {group.hasApproved && <span className="text-[10px] bg-positive/10 text-positive px-2 py-0.5 rounded font-mono">LIVE</span>}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs"
                  onClick={() => handleGenerate(group.key)}
                  disabled={generating === group.key}
                >
                  {generating === group.key ? '⏳ Generating…' : '🤖 Generate with AI'}
                </Button>
              </div>

              {group.digests.length === 0 ? (
                <div className="border border-dashed border-border rounded-lg p-4 text-center text-xs text-muted-foreground">
                  No digests yet. Click "Generate with AI" to create one.
                </div>
              ) : (
                group.digests.map(d => (
                  <div key={d.id}>
                    <DigestEditor digest={d} onSave={handleSave} onDelete={handleDelete} />
                    <div className="mt-1">
                      <Button size="sm" variant="ghost" className="text-xs" onClick={() => handlePreview(d.id)}>
                        👁️ Preview Email
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          ))}
        </div>
      )}

      {/* Email Preview Dialog */}
      <Dialog open={!!previewHtml} onOpenChange={() => setPreviewHtml(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Email Preview</DialogTitle>
          </DialogHeader>
          {previewHtml && (
            <iframe
              srcDoc={previewHtml}
              className="w-full h-[60vh] rounded-lg border border-border"
              title="Email Preview"
            />
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewHtml(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Status Indicator ──
function StatusIndicator({ lastSignIn }: { lastSignIn?: string }) {
  if (!lastSignIn) return <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded">⚪ Inactive</span>;
  const diffMs = Date.now() - new Date(lastSignIn).getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  if (diffHours < 1) return <span className="text-xs bg-positive/10 text-positive px-2 py-0.5 rounded">🟢 Online</span>;
  if (diffHours < 24) return <span className="text-xs bg-positive/10 text-positive px-2 py-0.5 rounded">🟢 Today</span>;
  if (diffHours < 168) return <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">🔵 This week</span>;
  if (diffHours < 720) return <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded">🟡 This month</span>;
  return <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded">⚫ Dormant</span>;
}

// ── Login History Cell ──
function LoginHistoryCell({ logins, lastSignIn }: { logins: LoginRecord[]; lastSignIn?: string }) {
  const [expanded, setExpanded] = useState(false);

  const formatDate = (d: string) => {
    const date = new Date(d);
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + ' ' + date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  };

  if (logins.length === 0) {
    return (
      <span className="text-xs text-muted-foreground">
        {lastSignIn ? formatDate(lastSignIn) : 'Never'}
      </span>
    );
  }

  const latest = logins[0];
  const rest = logins.slice(1);

  return (
    <div className="space-y-0.5">
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-foreground font-mono">{formatDate(latest.signed_in_at)}</span>
        {latest.country && <span className="text-[9px] text-muted-foreground">{latest.city ? `${latest.city}, ` : ''}{latest.country}</span>}
        {rest.length > 0 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-[9px] text-primary hover:underline ml-1"
          >
            {expanded ? 'hide' : `+${rest.length} more`}
          </button>
        )}
      </div>
      {expanded && rest.map((l) => (
        <div key={l.id} className="flex items-center gap-1.5 pl-1 border-l border-border ml-1">
          <span className="text-[10px] text-muted-foreground font-mono">{formatDate(l.signed_in_at)}</span>
          {l.country && <span className="text-[9px] text-muted-foreground/60">{l.city ? `${l.city}, ` : ''}{l.country}</span>}
        </div>
      ))}
    </div>
  );
}

// ── Main Admin Page ──
export default function Admin() {
  const { user } = useAuth();
  const { isAdmin, loading: roleLoading } = useAdminCheck();
  const navigate = useNavigate();

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editUser, setEditUser] = useState<AdminUser | null>(null);
  const [form, setForm] = useState({ email: '', password: '', phone: '', display_name: '' });
  const [searchQuery, setSearchQuery] = useState('');

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const data = await adminApi('list', undefined, 'GET');
      setUsers(data.users || []);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!roleLoading && !isAdmin) { navigate('/'); return; }
    if (isAdmin) fetchUsers();
  }, [isAdmin, roleLoading, navigate, fetchUsers]);

  const handleCreate = async () => {
    try {
      await adminApi('create', {
        email: form.email || undefined,
        password: form.password || undefined,
        phone: form.phone || undefined,
        user_metadata: form.display_name ? { full_name: form.display_name } : undefined,
      });
      toast.success('User created');
      setCreateOpen(false);
      setForm({ email: '', password: '', phone: '', display_name: '' });
      fetchUsers();
    } catch (err: any) { toast.error(err.message); }
  };

  const handleUpdate = async () => {
    if (!editUser) return;
    try {
      const body: any = { user_id: editUser.id };
      if (form.email) body.email = form.email;
      if (form.password) body.password = form.password;
      if (form.phone) body.phone = form.phone;
      if (form.display_name) body.user_metadata = { full_name: form.display_name };
      await adminApi('update', body);
      toast.success('User updated');
      setEditUser(null);
      setForm({ email: '', password: '', phone: '', display_name: '' });
      fetchUsers();
    } catch (err: any) { toast.error(err.message); }
  };

  const handleDelete = async (userId: string) => {
    if (!confirm('Permanently delete this user? This cannot be undone.')) return;
    try {
      await adminApi('delete', { user_id: userId });
      toast.success('User deleted');
      fetchUsers();
    } catch (err: any) { toast.error(err.message); }
  };

  const handleBan = async (userId: string, isBanned: boolean) => {
    try {
      await adminApi('ban', { user_id: userId, duration: isBanned ? 0 : 87600 });
      toast.success(isBanned ? 'User unbanned' : 'User banned');
      fetchUsers();
    } catch (err: any) { toast.error(err.message); }
  };

  const handleSetRole = async (userId: string, role: string) => {
    try {
      await adminApi('set_role', { user_id: userId, role });
      toast.success(`Role set to ${role}`);
      fetchUsers();
    } catch (err: any) { toast.error(err.message); }
  };

  const handleImpersonate = async (userId: string) => {
    try {
      const data = await adminApi('impersonate', { user_id: userId });
      if (data.link) {
        window.open(data.link, '_blank');
        toast.success(`Magic link generated for ${data.email}`);
      }
    } catch (err: any) { toast.error(err.message); }
  };

  const filtered = users.filter(u => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return u.email?.toLowerCase().includes(q) || u.phone?.includes(q) || u.profile?.display_name?.toLowerCase().includes(q) || u.id.includes(q);
  });

  if (roleLoading) return <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground font-mono">Checking access...</div>;
  if (!isAdmin) return null;

  const isBanned = (u: AdminUser) => {
    if (!u.banned_until) return false;
    return new Date(u.banned_until) > new Date();
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate('/')}>← Back</Button>
            <h1 className="text-foreground font-bold text-lg">Admin Panel</h1>
            <span className="text-xs font-mono bg-destructive/10 text-destructive px-2 py-0.5 rounded">ADMIN</span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <Tabs defaultValue="analytics" className="space-y-4">
          <TabsList className="flex flex-wrap h-auto gap-1 p-1">
            <TabsTrigger value="analytics">📊 Analytics</TabsTrigger>
            <TabsTrigger value="messages">✉️ Messages</TabsTrigger>
            <TabsTrigger value="users">👥 Users</TabsTrigger>
            <TabsTrigger value="subscribers">📧 Subscribers</TabsTrigger>
            <TabsTrigger value="digests">📰 Digests</TabsTrigger>
            <TabsTrigger value="analysis">🔬 Analysis</TabsTrigger>
          </TabsList>

          {/* ── Analytics Tab ── */}
          <TabsContent value="analytics">
            <AdminAnalyticsTab />
          </TabsContent>

          {/* ── Messages Tab ── */}
          <TabsContent value="messages">
            <AdminMessagesTab />
          </TabsContent>

          {/* ── Users Tab ── */}
          <TabsContent value="users" className="space-y-4">
            <div className="flex items-center gap-3 flex-wrap">
              <Input placeholder="Search by email, phone, name, or ID..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="max-w-md" />
              <span className="text-xs text-muted-foreground font-mono">{filtered.length} users</span>
              <Button variant="outline" size="sm" onClick={() => fetchUsers()} disabled={loading} className="gap-1.5">
                {loading ? '⏳' : '🔄'} Refresh
              </Button>
              <Button size="sm" className="ml-auto" onClick={() => { setForm({ email: '', password: '', phone: '', display_name: '' }); setCreateOpen(true); }}>
                + Create User
              </Button>
            </div>
            {/* Status summary */}
            {!loading && (
              <div className="flex items-center gap-3 flex-wrap text-xs text-muted-foreground">
                {(() => {
                  const now = Date.now();
                  let online = 0, today = 0, week = 0, month = 0, dormant = 0, banned = 0, unverified = 0;
                  for (const u of filtered) {
                    if (isBanned(u)) { banned++; continue; }
                    if (!u.email_confirmed_at) { unverified++; continue; }
                    if (!u.last_sign_in_at) { dormant++; continue; }
                    const h = (now - new Date(u.last_sign_in_at).getTime()) / 36e5;
                    if (h < 1) online++;
                    else if (h < 24) today++;
                    else if (h < 168) week++;
                    else if (h < 720) month++;
                    else dormant++;
                  }
                  return (
                    <>
                      {online > 0 && <span>🟢 Online: {online}</span>}
                      {today > 0 && <span>🟢 Today: {today}</span>}
                      {week > 0 && <span>🔵 This week: {week}</span>}
                      {month > 0 && <span>🟡 This month: {month}</span>}
                      {dormant > 0 && <span>⚫ Dormant: {dormant}</span>}
                      {banned > 0 && <span>🔴 Banned: {banned}</span>}
                      {unverified > 0 && <span>⚪ Unverified: {unverified}</span>}
                    </>
                  );
                })()}
              </div>
            )}

            {loading ? (
              <div className="text-center py-12 text-muted-foreground font-mono animate-pulse">Loading users...</div>
            ) : (
              <div className="border border-border rounded-xl overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead className="hidden md:table-cell">Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="hidden md:table-cell">Last Login</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map(u => (
                      <TableRow key={u.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium text-foreground text-sm">{u.profile?.display_name || u.email?.split('@')[0] || u.phone || 'Unknown'}</div>
                            <div className="text-xs text-muted-foreground">{u.email || u.phone}</div>
                            <div className="text-[10px] text-muted-foreground/60 font-mono">{u.id.slice(0, 8)}...</div>
                            {/* Show last login inline on small screens */}
                            <div className="md:hidden mt-0.5">
                              <LoginHistoryCell logins={u.login_history} lastSignIn={u.last_sign_in_at} />
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <Select value={u.role} onValueChange={val => handleSetRole(u.id, val)}>
                            <SelectTrigger className="w-28 h-7 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="user">User</SelectItem>
                              <SelectItem value="moderator">Moderator</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          {isBanned(u) ? (
                            <span className="text-xs bg-destructive/10 text-destructive px-2 py-0.5 rounded">🔴 Banned</span>
                          ) : u.email_confirmed_at ? (
                            <StatusIndicator lastSignIn={u.last_sign_in_at} />
                          ) : (
                            <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded">⚪ Unverified</span>
                          )}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <LoginHistoryCell logins={u.login_history} lastSignIn={u.last_sign_in_at} />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center gap-1 justify-end flex-wrap">
                            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => { setEditUser(u); setForm({ email: u.email || '', password: '', phone: u.phone || '', display_name: u.profile?.display_name || '' }); }}>✏️</Button>
                            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => handleImpersonate(u.id)} title="Impersonate">👤</Button>
                            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => handleBan(u.id, isBanned(u))}>{isBanned(u) ? '🔓' : '🔒'}</Button>
                            {u.id !== user?.id && (
                              <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive hover:text-destructive" onClick={() => handleDelete(u.id)}>🗑️</Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>

          {/* ── Subscribers Tab ── */}
          <TabsContent value="subscribers">
            <AdminSubscribersTab />
          </TabsContent>

          {/* ── Digests Tab ── */}
          <TabsContent value="digests">
            <DigestManagement />
          </TabsContent>

          {/* ── Analysis Tab ── */}
          <TabsContent value="analysis">
            <AdminAnalysisTab />
          </TabsContent>
        </Tabs>
      </main>

      {/* Create User Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create User</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            <Input placeholder="Password" type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
            <Input placeholder="Phone (optional)" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
            <Input placeholder="Display name (optional)" value={form.display_name} onChange={e => setForm(f => ({ ...f, display_name: e.target.value }))} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={!!editUser} onOpenChange={() => setEditUser(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit User</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            <Input placeholder="New password (leave blank to keep)" type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
            <Input placeholder="Phone" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
            <Input placeholder="Display name" value={form.display_name} onChange={e => setForm(f => ({ ...f, display_name: e.target.value }))} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditUser(null)}>Cancel</Button>
            <Button onClick={handleUpdate}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
