import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useAdminCheck } from '@/hooks/useAdminCheck';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

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
}

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
    if (!roleLoading && !isAdmin) {
      navigate('/');
      return;
    }
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
    } catch (err: any) {
      toast.error(err.message);
    }
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
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleDelete = async (userId: string) => {
    if (!confirm('Permanently delete this user? This cannot be undone.')) return;
    try {
      await adminApi('delete', { user_id: userId });
      toast.success('User deleted');
      fetchUsers();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleBan = async (userId: string, isBanned: boolean) => {
    try {
      await adminApi('ban', { user_id: userId, duration: isBanned ? 0 : 87600 }); // 10 years
      toast.success(isBanned ? 'User unbanned' : 'User banned');
      fetchUsers();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleSetRole = async (userId: string, role: string) => {
    try {
      await adminApi('set_role', { user_id: userId, role });
      toast.success(`Role set to ${role}`);
      fetchUsers();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleImpersonate = async (userId: string) => {
    try {
      const data = await adminApi('impersonate', { user_id: userId });
      if (data.link) {
        window.open(data.link, '_blank');
        toast.success(`Magic link generated for ${data.email}`);
      }
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const filtered = users.filter(u => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      u.email?.toLowerCase().includes(q) ||
      u.phone?.includes(q) ||
      u.profile?.display_name?.toLowerCase().includes(q) ||
      u.id.includes(q)
    );
  });

  if (roleLoading) {
    return <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground font-mono">Checking access...</div>;
  }

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
          <Button size="sm" onClick={() => { setForm({ email: '', password: '', phone: '', display_name: '' }); setCreateOpen(true); }}>
            + Create User
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-4">
        <div className="flex items-center gap-3">
          <Input
            placeholder="Search by email, phone, name, or ID..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="max-w-md"
          />
          <span className="text-xs text-muted-foreground font-mono">{filtered.length} users</span>
        </div>

        {loading ? (
          <div className="text-center py-12 text-muted-foreground font-mono animate-pulse">Loading users...</div>
        ) : (
          <div className="border border-border rounded-xl overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead className="hidden md:table-cell">Role</TableHead>
                  <TableHead className="hidden sm:table-cell">Status</TableHead>
                  <TableHead className="hidden lg:table-cell">Last Sign In</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(u => (
                  <TableRow key={u.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium text-foreground text-sm">
                          {u.profile?.display_name || u.email?.split('@')[0] || u.phone || 'Unknown'}
                        </div>
                        <div className="text-xs text-muted-foreground">{u.email || u.phone}</div>
                        <div className="text-[10px] text-muted-foreground/60 font-mono">{u.id.slice(0, 8)}...</div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Select value={u.role} onValueChange={val => handleSetRole(u.id, val)}>
                        <SelectTrigger className="w-28 h-7 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="user">User</SelectItem>
                          <SelectItem value="moderator">Moderator</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {isBanned(u) ? (
                        <span className="text-xs bg-destructive/10 text-destructive px-2 py-0.5 rounded">Banned</span>
                      ) : u.email_confirmed_at ? (
                        <span className="text-xs bg-positive/10 text-positive px-2 py-0.5 rounded">Active</span>
                      ) : (
                        <span className="text-xs bg-warning/10 text-warning px-2 py-0.5 rounded">Unverified</span>
                      )}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                      {u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleDateString() : 'Never'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center gap-1 justify-end flex-wrap">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => {
                            setEditUser(u);
                            setForm({
                              email: u.email || '',
                              password: '',
                              phone: u.phone || '',
                              display_name: u.profile?.display_name || '',
                            });
                          }}
                        >
                          ✏️
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => handleImpersonate(u.id)}
                          title="Impersonate"
                        >
                          👤
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => handleBan(u.id, isBanned(u))}
                        >
                          {isBanned(u) ? '🔓' : '🔒'}
                        </Button>
                        {u.id !== user?.id && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs text-destructive hover:text-destructive"
                            onClick={() => handleDelete(u.id)}
                          >
                            🗑️
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </main>

      {/* Create User Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create User</DialogTitle>
          </DialogHeader>
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
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
          </DialogHeader>
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
