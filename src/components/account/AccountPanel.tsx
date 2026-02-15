import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  open: boolean;
  onClose: () => void;
}

interface AnalysisRecord {
  id: string;
  symbol: string;
  name: string;
  signal_label: string;
  signal_score: number;
  price: number;
  asset_type: string;
  created_at: string;
}

export default function AccountPanel({ open, onClose }: Props) {
  const { user, signOut } = useAuth();
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState<'profile' | 'preferences' | 'history'>('profile');
  const [history, setHistory] = useState<AnalysisRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  useEffect(() => {
    if (open && user) {
      // Load profile
      supabase.from('profiles').select('display_name').eq('user_id', user.id).maybeSingle()
        .then(({ data }) => {
          setDisplayName(data?.display_name || user.user_metadata?.full_name || '');
        });
    }
  }, [open, user]);

  useEffect(() => {
    if (open && activeTab === 'history' && user) {
      setLoadingHistory(true);
      supabase.from('analysis_history')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20)
        .then(({ data }) => {
          setHistory((data as AnalysisRecord[]) || []);
          setLoadingHistory(false);
        });
    }
  }, [open, activeTab, user]);

  if (!open || !user) return null;

  const handleSaveProfile = async () => {
    setSaving(true);
    setSaveMsg('');
    const { error } = await supabase.from('profiles')
      .update({ display_name: displayName })
      .eq('user_id', user.id);
    setSaving(false);
    setSaveMsg(error ? 'Failed to save' : 'Saved ✓');
    setTimeout(() => setSaveMsg(''), 2000);
  };

  const handleSignOut = async () => {
    await signOut();
    onClose();
  };

  const tabs = [
    { key: 'profile' as const, label: '👤 Profile' },
    { key: 'preferences' as const, label: '⚙️ Preferences' },
    { key: 'history' as const, label: '📊 History' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-card border border-border rounded-xl p-4 sm:p-5 max-w-md w-full space-y-4 shadow-xl max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {user.user_metadata?.avatar_url ? (
              <img src={user.user_metadata.avatar_url} alt="" className="w-8 h-8 rounded-full border border-border" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm">👤</div>
            )}
            <div>
              <div className="text-sm font-medium text-foreground">{user.user_metadata?.full_name || user.email?.split('@')[0]}</div>
              <div className="text-[10px] text-muted-foreground">{user.email}</div>
            </div>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-lg">&times;</button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-border">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`px-3 py-2 text-[10px] sm:text-xs font-medium border-b-2 transition-all ${
                activeTab === t.key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div className="space-y-3">
            <div>
              <label className="text-[10px] text-muted-foreground font-mono uppercase block mb-1">Display Name</label>
              <input
                type="text"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground font-mono uppercase block mb-1">Email</label>
              <div className="text-xs text-muted-foreground bg-background border border-border rounded-lg px-3 py-2">{user.email}</div>
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground font-mono uppercase block mb-1">Provider</label>
              <div className="text-xs text-muted-foreground bg-background border border-border rounded-lg px-3 py-2 capitalize">
                {user.app_metadata?.provider || 'email'}
              </div>
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground font-mono uppercase block mb-1">Member Since</label>
              <div className="text-xs text-muted-foreground bg-background border border-border rounded-lg px-3 py-2">
                {new Date(user.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleSaveProfile}
                disabled={saving}
                className="px-3 py-2 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-all disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Profile'}
              </button>
              {saveMsg && <span className="text-[10px] text-positive">{saveMsg}</span>}
            </div>
          </div>
        )}

        {/* Preferences Tab */}
        {activeTab === 'preferences' && (
          <div className="space-y-3">
            <div>
              <label className="text-[10px] text-muted-foreground font-mono uppercase block mb-1">Theme</label>
              <div className="text-xs text-foreground bg-background border border-border rounded-lg px-3 py-2 capitalize">{theme}</div>
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground font-mono uppercase block mb-1">Default Timeframe</label>
              <div className="text-xs text-muted-foreground bg-background border border-border rounded-lg px-3 py-2">90 days (set via controls)</div>
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground font-mono uppercase block mb-1">Data Sync</label>
              <div className="text-xs text-muted-foreground bg-background border border-border rounded-lg px-3 py-2">
                Watchlist and analysis history sync automatically when signed in.
              </div>
            </div>
            <p className="text-[9px] text-muted-foreground/70 italic">
              💡 Risk profile, timeframes, and forecast settings are controlled from the main analysis view.
            </p>
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="space-y-2">
            {loadingHistory ? (
              <div className="text-xs text-muted-foreground text-center py-4 animate-pulse">Loading history...</div>
            ) : history.length === 0 ? (
              <div className="text-xs text-muted-foreground text-center py-4">No analysis history yet. Analyse an asset to get started.</div>
            ) : (
              history.map(h => (
                <div key={h.id} className="flex items-center justify-between p-2.5 rounded-lg bg-background/50 border border-border/50">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-medium text-foreground font-mono">{h.symbol}</span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono ${
                        h.signal_score >= 2 ? 'bg-positive/10 text-positive' :
                        h.signal_score <= -2 ? 'bg-negative/10 text-negative' :
                        'bg-muted text-muted-foreground'
                      }`}>
                        {h.signal_label}
                      </span>
                    </div>
                    <div className="text-[9px] text-muted-foreground">{h.name} · ${h.price.toLocaleString()}</div>
                  </div>
                  <div className="text-[9px] text-muted-foreground shrink-0 ml-2">
                    {new Date(h.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Sign Out */}
        <div className="pt-2 border-t border-border">
          <button
            onClick={handleSignOut}
            className="w-full px-3 py-2 rounded-lg text-xs font-medium border border-destructive/30 text-destructive hover:bg-destructive/10 transition-all"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
