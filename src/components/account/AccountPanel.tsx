import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/integrations/supabase/client';
import { SUPPORTED_CURRENCIES } from '@/utils/currencyConversion';

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
  market_phase: string | null;
  data_source: string | null;
}

interface UserPrefs {
  risk_profile: string;
  forecast_percent: number;
  default_timeframe_days: number;
  secondary_currency: string | null;
  theme: string;
}

interface NewsletterPrefs {
  crypto: boolean;
  stocks: boolean;
  etfs: boolean;
  forex: boolean;
}

const DEFAULT_PREFS: UserPrefs = {
  risk_profile: 'moderate',
  forecast_percent: 30,
  default_timeframe_days: 90,
  secondary_currency: null,
  theme: 'dark',
};

const DIGEST_CATEGORIES: { key: keyof NewsletterPrefs; icon: string; label: string }[] = [
  { key: 'crypto', icon: '🪙', label: 'CryptoSimply Digest' },
  { key: 'stocks', icon: '📈', label: 'StockSimply Digest' },
  { key: 'etfs', icon: '📊', label: 'ETFSimply Digest' },
  { key: 'forex', icon: '💱', label: 'ForexSimply Digest' },
];

export default function AccountPanel({ open, onClose }: Props) {
  const { user, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<'profile' | 'preferences' | 'history' | 'newsletter'>('profile');
  const [history, setHistory] = useState<AnalysisRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [prefs, setPrefs] = useState<UserPrefs>(DEFAULT_PREFS);
  const [prefsLoaded, setPrefsLoaded] = useState(false);

  // Newsletter state
  const [nlSubscribed, setNlSubscribed] = useState(false);
  const [nlPrefs, setNlPrefs] = useState<NewsletterPrefs>({ crypto: true, stocks: true, etfs: true, forex: true });
  const [nlLoading, setNlLoading] = useState(false);
  const [nlMsg, setNlMsg] = useState('');

  useEffect(() => {
    if (open && user) {
      supabase.from('profiles').select('display_name').eq('user_id', user.id).maybeSingle()
        .then(({ data }) => {
          setDisplayName(data?.display_name || user.user_metadata?.full_name || '');
        });
      supabase.from('user_preferences').select('*').eq('user_id', user.id).maybeSingle()
        .then(({ data }) => {
          if (data) {
            setPrefs({
              risk_profile: data.risk_profile,
              forecast_percent: data.forecast_percent,
              default_timeframe_days: data.default_timeframe_days,
              secondary_currency: data.secondary_currency,
              theme: data.theme,
            });
          }
          setPrefsLoaded(true);
        });
      // Load newsletter subscription
      if (user.email) {
        supabase.from('newsletter_subscribers').select('*').eq('email', user.email).maybeSingle()
          .then(({ data }) => {
            if (data && !data.unsubscribed_at) {
              setNlSubscribed(true);
              if (data.preferences) {
                const p = data.preferences as any;
                setNlPrefs({
                  crypto: p.crypto !== false,
                  stocks: p.stocks !== false,
                  etfs: p.etfs !== false,
                  forex: p.forex !== false,
                });
              }
            } else {
              setNlSubscribed(false);
            }
          });
      }
    }
  }, [open, user]);

  useEffect(() => {
    if (open && activeTab === 'history' && user) {
      setLoadingHistory(true);
      supabase.from('analysis_history')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50)
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

  const handleSavePrefs = async () => {
    setSaving(true);
    setSaveMsg('');
    const { error } = await supabase.from('user_preferences')
      .upsert({
        user_id: user.id,
        ...prefs,
      }, { onConflict: 'user_id' });
    setSaving(false);
    setSaveMsg(error ? `Failed: ${error.message}` : 'Preferences saved ✓');
    if (prefs.theme !== theme) setTheme(prefs.theme as 'dark' | 'light');
    setTimeout(() => setSaveMsg(''), 2000);
  };

  const updatePref = <K extends keyof UserPrefs>(key: K, value: UserPrefs[K]) => {
    setPrefs(p => ({ ...p, [key]: value }));
  };

  const handleNewsletterToggle = async (subscribe: boolean) => {
    if (!user.email) return;
    setNlLoading(true);
    setNlMsg('');

    if (subscribe) {
      const { error } = await supabase.from('newsletter_subscribers')
        .upsert({
          email: user.email!,
          user_id: user.id,
          preferences: nlPrefs as unknown as Record<string, boolean>,
          unsubscribed_at: null,
        }, { onConflict: 'email' });
      setNlLoading(false);
      if (error) {
        setNlMsg('Failed to subscribe');
      } else {
        setNlSubscribed(true);
        setNlMsg('Subscribed! 🎉');
      }
    } else {
      const { error } = await supabase.from('newsletter_subscribers')
        .update({ unsubscribed_at: new Date().toISOString() })
        .eq('email', user.email);
      setNlLoading(false);
      if (error) {
        setNlMsg('Failed to unsubscribe');
      } else {
        setNlSubscribed(false);
        setNlMsg('Unsubscribed');
      }
    }
    setTimeout(() => setNlMsg(''), 3000);
  };

  const handleSaveNlPrefs = async () => {
    if (!user.email) return;
    setNlLoading(true);
    setNlMsg('');
    const { error } = await supabase.from('newsletter_subscribers')
      .update({ preferences: nlPrefs as unknown as Record<string, boolean> })
      .eq('email', user.email);
    setNlLoading(false);
    setNlMsg(error ? 'Failed to save' : 'Preferences saved ✓');
    setTimeout(() => setNlMsg(''), 2000);
  };

  const allSelected = Object.values(nlPrefs).every(Boolean);
  const toggleAll = () => {
    const newVal = !allSelected;
    setNlPrefs({ crypto: newVal, stocks: newVal, etfs: newVal, forex: newVal });
  };

  const handleSignOut = async () => {
    await signOut();
    onClose();
  };

  const tabs = [
    { key: 'profile' as const, label: '👤 Profile' },
    { key: 'preferences' as const, label: '⚙️ Prefs' },
    { key: 'newsletter' as const, label: '📬 Digest' },
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
              className={`px-2.5 py-2 text-[10px] sm:text-xs font-medium border-b-2 transition-all ${
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
              <label className="text-[10px] text-muted-foreground font-mono uppercase block mb-1">Member Since</label>
              <div className="text-xs text-muted-foreground bg-background border border-border rounded-lg px-3 py-2">
                {new Date(user.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={handleSaveProfile} disabled={saving} className="px-3 py-2 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-all disabled:opacity-50">
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
              <select value={prefs.theme} onChange={e => updatePref('theme', e.target.value)} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none">
                <option value="dark">Dark</option>
                <option value="light">Light</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground font-mono uppercase block mb-1">Default Risk Profile</label>
              <select value={prefs.risk_profile} onChange={e => updatePref('risk_profile', e.target.value)} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none">
                <option value="conservative">🛡️ Conservative</option>
                <option value="moderate-conservative">🔒 Mod-Conservative</option>
                <option value="moderate">⚖️ Moderate</option>
                <option value="moderate-aggressive">📈 Mod-Aggressive</option>
                <option value="aggressive">🔥 Aggressive</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground font-mono uppercase block mb-1">Default Timeframe</label>
              <select value={prefs.default_timeframe_days} onChange={e => updatePref('default_timeframe_days', Number(e.target.value))} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none">
                <option value={1}>24H</option>
                <option value={7}>7D</option>
                <option value={30}>30D</option>
                <option value={90}>90D</option>
                <option value={365}>1Y</option>
                <option value={730}>2Y</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground font-mono uppercase block mb-1">Forecast Length (%)</label>
              <div className="flex items-center gap-2">
                <input type="range" min={10} max={80} value={prefs.forecast_percent} onChange={e => updatePref('forecast_percent', Number(e.target.value))} className="flex-1 accent-primary" />
                <span className="text-xs font-mono text-foreground w-8 text-right">{prefs.forecast_percent}%</span>
              </div>
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground font-mono uppercase block mb-1">Secondary Currency</label>
              <select value={prefs.secondary_currency || 'none'} onChange={e => updatePref('secondary_currency', e.target.value === 'none' ? null : e.target.value)} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none">
                <option value="none">None</option>
                {SUPPORTED_CURRENCIES.map(c => (
                  <option key={c.code} value={c.code}>{c.symbol} {c.code}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button onClick={handleSavePrefs} disabled={saving} className="px-3 py-2 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-all disabled:opacity-50">
                {saving ? 'Saving...' : 'Save Preferences'}
              </button>
              {saveMsg && <span className="text-[10px] text-positive">{saveMsg}</span>}
            </div>
          </div>
        )}

        {/* Newsletter / Digest Tab */}
        {activeTab === 'newsletter' && (
          <div className="space-y-4">
            <div className="text-center space-y-1">
              <p className="text-xs text-foreground font-medium">📬 Weekly Market Digests</p>
              <p className="text-[10px] text-muted-foreground">AI-curated insights sent to <span className="text-primary font-mono">{user.email}</span></p>
            </div>

            {/* Subscribe / Unsubscribe toggle */}
            <div className="flex items-center justify-between bg-secondary/50 rounded-lg px-4 py-3">
              <span className="text-xs font-medium text-foreground">
                {nlSubscribed ? '✅ Subscribed' : 'Not subscribed'}
              </span>
              <button
                onClick={() => handleNewsletterToggle(!nlSubscribed)}
                disabled={nlLoading}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-50 ${
                  nlSubscribed
                    ? 'border border-destructive/30 text-destructive hover:bg-destructive/10'
                    : 'bg-primary text-primary-foreground hover:bg-primary/90'
                }`}
              >
                {nlLoading ? '...' : nlSubscribed ? 'Unsubscribe' : 'Subscribe'}
              </button>
            </div>

            {/* Per-category toggles */}
            {nlSubscribed && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground font-mono uppercase">Choose Digests</span>
                  <button
                    onClick={toggleAll}
                    className="text-[10px] text-primary hover:underline"
                  >
                    {allSelected ? 'Deselect all' : 'Select all'}
                  </button>
                </div>
                {DIGEST_CATEGORIES.map(cat => (
                  <label
                    key={cat.key}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg bg-background border border-border hover:border-primary/30 transition-all cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={nlPrefs[cat.key]}
                      onChange={e => setNlPrefs(p => ({ ...p, [cat.key]: e.target.checked }))}
                      className="accent-primary w-3.5 h-3.5"
                    />
                    <span className="text-sm">{cat.icon}</span>
                    <span className="text-xs font-medium text-foreground">{cat.label}</span>
                  </label>
                ))}
                <button
                  onClick={handleSaveNlPrefs}
                  disabled={nlLoading}
                  className="w-full px-3 py-2 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-all disabled:opacity-50"
                >
                  {nlLoading ? 'Saving...' : 'Save Digest Preferences'}
                </button>
              </div>
            )}

            {nlMsg && (
              <p className={`text-[10px] text-center ${nlMsg.includes('Failed') ? 'text-destructive' : 'text-primary'}`}>{nlMsg}</p>
            )}
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
                      <span className="text-[9px] text-muted-foreground capitalize">{h.asset_type}</span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono ${
                        h.signal_score >= 2 ? 'bg-positive/10 text-positive' :
                        h.signal_score <= -2 ? 'bg-negative/10 text-negative' :
                        'bg-muted text-muted-foreground'
                      }`}>
                        {h.signal_label}
                      </span>
                    </div>
                    <div className="text-[9px] text-muted-foreground">
                      {h.name} · ${Number(h.price).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      {h.market_phase && <span className="ml-1 text-accent">· {h.market_phase}</span>}
                    </div>
                  </div>
                  <div className="text-[9px] text-muted-foreground shrink-0 ml-2 text-right">
                    <div>{new Date(h.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</div>
                    <div>{new Date(h.created_at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Sign Out */}
        <div className="pt-2 border-t border-border">
          <button onClick={handleSignOut} className="w-full px-3 py-2 rounded-lg text-xs font-medium border border-destructive/30 text-destructive hover:bg-destructive/10 transition-all">
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
