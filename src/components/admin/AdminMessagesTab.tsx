import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Mail, MailOpen, Trash2, Reply, Clock, Search } from 'lucide-react';

interface Message {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: string;
  admin_reply: string | null;
  replied_at: string | null;
  created_at: string;
}

export default function AdminMessagesTab() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'unread' | 'read' | 'replied'>('all');

  const fetchMessages = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('contact_messages' as any)
      .select('*')
      .order('created_at', { ascending: false });
    if (error) toast.error(error.message);
    else setMessages((data as any) || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchMessages(); }, [fetchMessages]);

  const handleMarkRead = async (id: string) => {
    await supabase.from('contact_messages' as any).update({ status: 'read' } as any).eq('id', id);
    fetchMessages();
  };

  const handleReply = async (msg: Message) => {
    if (!replyText.trim()) return;
    const { error } = await supabase.from('contact_messages' as any).update({
      admin_reply: replyText,
      replied_at: new Date().toISOString(),
      status: 'replied',
    } as any).eq('id', msg.id);
    if (error) toast.error(error.message);
    else {
      toast.success(`Reply saved for ${msg.email}`);
      setReplyText('');
      fetchMessages();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this message permanently?')) return;
    await supabase.from('contact_messages' as any).delete().eq('id', id);
    toast.success('Message deleted');
    if (expandedId === id) setExpandedId(null);
    fetchMessages();
  };

  const filtered = messages.filter(m => {
    if (filter !== 'all' && m.status !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      return m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q) || m.subject.toLowerCase().includes(q) || m.message.toLowerCase().includes(q);
    }
    return true;
  });

  const unreadCount = messages.filter(m => m.status === 'unread').length;

  const formatDate = (d: string) => {
    const date = new Date(d);
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + ' ' + date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) return <div className="text-center py-8 text-muted-foreground font-mono animate-pulse">Loading messages...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <h2 className="text-foreground font-semibold">Contact Messages</h2>
          {unreadCount > 0 && (
            <span className="text-[10px] bg-destructive/10 text-destructive px-2 py-0.5 rounded font-mono">{unreadCount} unread</span>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={fetchMessages} className="text-xs gap-1.5">🔄 Refresh</Button>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search messages..." className="pl-8 h-8 text-xs" />
        </div>
        {(['all', 'unread', 'read', 'replied'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-2.5 py-1 rounded text-[10px] font-medium transition-all ${
              filter === f ? 'bg-primary/15 text-primary border border-primary/30' : 'bg-muted border border-border text-muted-foreground'
            }`}
          >
            {f === 'all' ? `All (${messages.length})` : `${f.charAt(0).toUpperCase() + f.slice(1)} (${messages.filter(m => m.status === f).length})`}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 space-y-2">
          <Mail className="w-8 h-8 text-muted-foreground mx-auto" />
          <p className="text-sm text-muted-foreground">No messages {filter !== 'all' ? `with status "${filter}"` : 'yet'}.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(msg => {
            const isExpanded = expandedId === msg.id;
            return (
              <div key={msg.id} className={`border rounded-xl transition-all ${
                msg.status === 'unread' ? 'border-primary/30 bg-primary/5' : 'border-border bg-card'
              }`}>
                <button
                  onClick={() => {
                    setExpandedId(isExpanded ? null : msg.id);
                    if (msg.status === 'unread') handleMarkRead(msg.id);
                    setReplyText(msg.admin_reply || '');
                  }}
                  className="w-full text-left p-3 sm:p-4 cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {msg.status === 'unread' ? <Mail className="w-3.5 h-3.5 text-primary" /> : <MailOpen className="w-3.5 h-3.5 text-muted-foreground" />}
                        <span className="text-xs font-semibold text-foreground">{msg.name}</span>
                        <span className="text-[10px] text-muted-foreground">&lt;{msg.email}&gt;</span>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${
                          msg.subject === 'Bug Report' ? 'bg-destructive/10 text-destructive' :
                          msg.subject === 'Feature Request' ? 'bg-positive/10 text-positive' :
                          'bg-muted text-muted-foreground'
                        }`}>{msg.subject}</span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{msg.message}</p>
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                        <Clock className="w-3 h-3" /> {formatDate(msg.created_at)}
                        {msg.status === 'replied' && <span className="text-positive">✓ Replied</span>}
                      </div>
                    </div>
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-3 sm:px-4 pb-4 border-t border-border pt-3 space-y-3">
                    <div className="bg-muted/50 rounded-lg p-3">
                      <p className="text-xs text-foreground whitespace-pre-wrap">{msg.message}</p>
                    </div>

                    {msg.admin_reply && (
                      <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 space-y-1">
                        <span className="text-[10px] text-primary font-mono uppercase">Your Reply</span>
                        <p className="text-xs text-foreground whitespace-pre-wrap">{msg.admin_reply}</p>
                        {msg.replied_at && <span className="text-[10px] text-muted-foreground">{formatDate(msg.replied_at)}</span>}
                      </div>
                    )}

                    <div className="space-y-2">
                      <label className="text-[10px] text-muted-foreground font-mono uppercase flex items-center gap-1"><Reply className="w-3 h-3" /> Reply</label>
                      <Textarea
                        value={replyText}
                        onChange={e => setReplyText(e.target.value)}
                        placeholder="Type your reply..."
                        className="text-xs min-h-[80px]"
                      />
                      <div className="flex items-center gap-2">
                        <Button size="sm" onClick={() => handleReply(msg)} disabled={!replyText.trim()} className="gap-1.5">
                          <Reply className="w-3 h-3" /> {msg.admin_reply ? 'Update Reply' : 'Send Reply'}
                        </Button>
                        <Button size="sm" variant="ghost" className="text-destructive gap-1.5" onClick={() => handleDelete(msg.id)}>
                          <Trash2 className="w-3 h-3" /> Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
