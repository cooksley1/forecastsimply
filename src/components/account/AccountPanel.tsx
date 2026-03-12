import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/integrations/supabase/client';
import { SUPPORTED_CURRENCIES } from '@/utils/currencyConversion';
import type { WatchlistItem } from '@/types/assets';
import PriceAlertsList from '@/components/alerts/PriceAlertsList';
import PushNotificationToggle from '@/components/alerts/PushNotificationToggle';
import WatchlistAlertSettings from '@/components/alerts/WatchlistAlertSettings';
import ApiKeySettings from '@/components/settings/ApiKeySettings';
import PortfolioImporter from '@/components/portfolio/PortfolioImporter';

interface Props {
  open: boolean;
  onClose: () => void;
  watchlist?: WatchlistItem[];
  onWatchlistRemove?: (id: string) => void;
  onWatchlistClear?: () => void;
  onWatchlistNoteUpdate?: (id: string, note: string) => void;
}

interface UserPrefs {
  risk_profile: string;
  forecast_percent: number;
  default_timeframe_days: number;
  secondary_currency: string | null;
  theme: string;
  country: string;
}

interface NewsletterPrefs {
  crypto: boolean;
  stocks: boolean;
  etfs: boolean;
  forex: boolean;
  markets?: string[];
}

const MARKET_OPTIONS: { key: string; label: string; flag: string }[] = [
  { key: 'AU', label: 'Australia (ASX)', flag: '🇦🇺' },
  { key: 'US', label: 'United States', flag: '🇺🇸' },
  { key: 'UK', label: 'United Kingdom (LSE)', flag: '🇬🇧' },
  { key: 'HK', label: 'Hong Kong (HKSE)', flag: '🇭🇰' },
  { key: 'EU', label: 'Europe (XETRA)', flag: '🇪🇺' },
  { key: 'CA', label: 'Canada (TSE)', flag: '🇨🇦' },
  { key: 'JP', label: 'Japan (JPX)', flag: '🇯🇵' },
];

const DEFAULT_MARKETS = ['AU'];
const WORLD_MARKETS = ['AU', 'US', 'UK', 'HK'];

const COUNTRY_OPTIONS: { code: string; label: string; flag: string; exchange: string; currency: string }[] = [
  { code: 'AU', label: 'Australia', flag: '🇦🇺', exchange: 'ASX', currency: 'AUD' },
  { code: 'US', label: 'United States', flag: '🇺🇸', exchange: 'NYSE', currency: 'USD' },
  { code: 'UK', label: 'United Kingdom', flag: '🇬🇧', exchange: 'LSE', currency: 'GBP' },
  { code: 'HK', label: 'Hong Kong', flag: '🇭🇰', exchange: 'HKG', currency: 'HKD' },
  { code: 'JP', label: 'Japan', flag: '🇯🇵', exchange: 'JPX', currency: 'JPY' },
  { code: 'CA', label: 'Canada', flag: '🇨🇦', exchange: 'NYSE', currency: 'CAD' },
  { code: 'NZ', label: 'New Zealand', flag: '🇳🇿', exchange: 'ASX', currency: 'NZD' },
  { code: 'EU', label: 'Europe', flag: '🇪🇺', exchange: 'LSE', currency: 'EUR' },
];

const DEFAULT_PREFS: UserPrefs = {
  risk_profile: 'moderate',
  forecast_percent: 30,
  default_timeframe_days: 90,
  secondary_currency: null,
  theme: 'dark',
  country: 'AU',
};

const DIGEST_CATEGORIES: { key: keyof NewsletterPrefs; icon: string; label: string }[] = [
  { key: 'crypto', icon: '🪙', label: 'CryptoSimply Digest' },
  { key: 'stocks', icon: '📈', label: 'StockSimply Digest' },
  { key: 'etfs', icon: '📊', label: 'ETFSimply Digest' },
  { key: 'forex', icon: '💱', label: 'ForexSimply Digest' },
];

const ASSET_TYPE_ICONS: Record<string, string> = {
  crypto: '🪙',
  stocks: '📈',
  etfs: '📊',
  forex: '💱',
};

export default function AccountPanel({ open, onClose, watchlist = [], onWatchlistRemove, onWatchlistClear, onWatchlistNoteUpdate }: Props) {
  const { user, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<'profile' | 'preferences' | 'watchlist' | 'newsletter' | 'alerts' | 'apikeys'>('profile');
  const [alertRefreshKey, setAlertRefreshKey] = useState(0);
  const [displayName, setDisplayName] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [prefs, setPrefs] = useState<UserPrefs>(DEFAULT_PREFS);
  const [prefsLoaded, setPrefsLoaded] = useState(false);

  // Newsletter state
  const [nlSubscribed, setNlSubscribed] = useState(false);
  const [nlPrefs, setNlPrefs] = useState<NewsletterPrefs>({ crypto: true, stocks: true, etfs: true, forex: true, markets: DEFAULT_MARKETS });
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
              country: (data as any).country || 'AU',
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
                  markets: Array.isArray(p.markets) ? p.markets : DEFAULT_MARKETS,
                });
              }
            } else {
              setNlSubscribed(false);
            }
          });
      }
    }
  }, [open, user]);

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
    // Persist country to localStorage for non-auth use (default exchange/currency)
    localStorage.setItem('sf_country', prefs.country);
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
          preferences: nlPrefs as any,
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
      .update({ preferences: nlPrefs as any })
      .eq('email', user.email);
    setNlLoading(false);
    setNlMsg(error ? 'Failed to save' : 'Preferences saved ✓');
    setTimeout(() => setNlMsg(''), 2000);
  };

  const allDigestsSelected = nlPrefs.crypto && nlPrefs.stocks && nlPrefs.etfs && nlPrefs.forex;
  const toggleAllDigests = () => {
    const newVal = !allDigestsSelected;
    setNlPrefs(p => ({ ...p, crypto: newVal, stocks: newVal, etfs: newVal, forex: newVal }));
  };

  const allMarketsSelected = nlPrefs.markets?.length === MARKET_OPTIONS.length;
  const toggleAllMarkets = () => {
    setNlPrefs(p => ({ ...p, markets: allMarketsSelected ? DEFAULT_MARKETS : MARKET_OPTIONS.map(m => m.key) }));
  };
  const toggleMarket = (key: string) => {
    setNlPrefs(p => {
      const current = p.markets || DEFAULT_MARKETS;
      const next = current.includes(key) ? current.filter(m => m !== key) : [...current, key];
      return { ...p, markets: next.length === 0 ? DEFAULT_MARKETS : next };
    });
  };
  const setWorldMarkets = () => setNlPrefs(p => ({ ...p, markets: WORLD_MARKETS }));

  const handleSignOut = async () => {
    await signOut();
    onClose();
  };

  const tabs = [
    { key: 'profile' as const, label: '👤 Profile' },
    { key: 'preferences' as const, label: '⚙️ Prefs' },
    { key: 'apikeys' as const, label: '🔑 API Keys' },
    { key: 'alerts' as const, label: '🔔 Alerts' },
    { key: 'newsletter' as const, label: '📬 Digest' },
    { key: 'watchlist' as const, label: '⭐ Watchlist' },
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
            {/* Country — drives exchange, currency, content */}
            <div>
              <label className="text-[10px] text-muted-foreground font-mono uppercase block mb-1">Your Country</label>
              <select
                value={prefs.country}
                onChange={e => {
                  const c = COUNTRY_OPTIONS.find(o => o.code === e.target.value);
                  updatePref('country', e.target.value);
                  if (c) {
                    // Auto-set currency when country changes
                    if (!prefs.secondary_currency || prefs.secondary_currency === COUNTRY_OPTIONS.find(o => o.code === prefs.country)?.currency) {
                      updatePref('secondary_currency', c.currency === 'USD' ? null : c.currency);
                    }
                  }
                }}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
              >
                {COUNTRY_OPTIONS.map(c => (
                  <option key={c.code} value={c.code}>{c.flag} {c.label}</option>
                ))}
              </select>
              <p className="text-[9px] text-muted-foreground mt-1">
                Sets your default exchange ({COUNTRY_OPTIONS.find(c => c.code === prefs.country)?.exchange}), currency ({COUNTRY_OPTIONS.find(c => c.code === prefs.country)?.currency}), and blog content region.
              </p>
            </div>
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
                    onClick={toggleAllDigests}
                    className="text-[10px] text-primary hover:underline"
                  >
                    {allDigestsSelected ? 'Deselect all' : 'Select all'}
                  </button>
                </div>
                {DIGEST_CATEGORIES.map(cat => (
                  <label
                    key={cat.key}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg bg-background border border-border hover:border-primary/30 transition-all cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={!!nlPrefs[cat.key]}
                      onChange={e => setNlPrefs(p => ({ ...p, [cat.key]: e.target.checked }))}
                      className="accent-primary w-3.5 h-3.5"
                    />
                    <span className="text-sm">{cat.icon}</span>
                    <span className="text-xs font-medium text-foreground">{cat.label}</span>
                  </label>
                ))}

                {/* Market selection */}
                <div className="mt-3 pt-3 border-t border-border">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] text-muted-foreground font-mono uppercase">Markets / Regions</span>
                    <div className="flex gap-2">
                      <button onClick={setWorldMarkets} className="text-[10px] text-primary hover:underline">World</button>
                      <button onClick={toggleAllMarkets} className="text-[10px] text-primary hover:underline">
                        {allMarketsSelected ? 'Reset' : 'All'}
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {MARKET_OPTIONS.map(m => (
                      <label
                        key={m.key}
                        className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-background border border-border hover:border-primary/30 transition-all cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={(nlPrefs.markets || DEFAULT_MARKETS).includes(m.key)}
                          onChange={() => toggleMarket(m.key)}
                          className="accent-primary w-3 h-3"
                        />
                        <span className="text-xs">{m.flag}</span>
                        <span className="text-[10px] font-medium text-foreground truncate">{m.label}</span>
                      </label>
                    ))}
                  </div>
                  <p className="text-[9px] text-muted-foreground mt-1.5">Default: 🇦🇺 Australia · World = AU, US, UK, HK</p>
                </div>

                <button
                  onClick={handleSaveNlPrefs}
                  disabled={nlLoading}
                  className="w-full px-3 py-2 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-all disabled:opacity-50 mt-2"
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

        {/* API Keys Tab */}
        {activeTab === 'apikeys' && (
          <ApiKeySettings embedded />
        )}

        {/* Alerts Tab */}
        {activeTab === 'alerts' && (
          <div className="space-y-4">
            <PushNotificationToggle />
            <div className="border-t border-border pt-3">
              <WatchlistAlertSettings />
            </div>
            <div className="border-t border-border pt-3">
              <PriceAlertsList refreshKey={alertRefreshKey} />
            </div>
          </div>
        )}

        {/* Watchlist Tab */}
        {activeTab === 'watchlist' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground font-mono uppercase">{watchlist.length} item{watchlist.length !== 1 ? 's' : ''}</span>
              {watchlist.length > 0 && onWatchlistClear && (
                <button
                  onClick={() => { if (confirm('Clear entire watchlist?')) onWatchlistClear(); }}
                  className="text-[10px] text-destructive hover:underline"
                >
                  Clear all
                </button>
              )}
            </div>

            {watchlist.length === 0 ? (
              <div className="text-center py-6 space-y-2">
                <div className="text-2xl">⭐</div>
                <p className="text-xs text-muted-foreground">Your watchlist is empty</p>
                <p className="text-[10px] text-muted-foreground">Search and analyse an asset, then click the ⭐ button to add it here.</p>
              </div>
            ) : (
              watchlist.map(item => {
                const addedPrice = item.addedPrice ?? item.price;
                const priceDiff = item.price - addedPrice;
                const pctChange = addedPrice > 0 ? (priceDiff / addedPrice) * 100 : 0;
                const addedDate = new Date(item.addedAt);
                return (
                  <div key={item.id} className="p-2.5 rounded-lg bg-background/50 border border-border/50 group space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm">{ASSET_TYPE_ICONS[item.assetType] || '📊'}</span>
                          <span className="text-xs font-medium text-foreground font-mono">{item.symbol}</span>
                          <span className="text-[9px] text-muted-foreground capitalize">{item.assetType}</span>
                        </div>
                        <div className="text-[9px] text-muted-foreground mt-0.5">{item.name}</div>
                      </div>
                      {onWatchlistRemove && (
                        <button
                          onClick={() => onWatchlistRemove(item.id)}
                          className="text-muted-foreground hover:text-destructive text-xs transition-all p-1 rounded hover:bg-destructive/10"
                          title="Remove from watchlist"
                        >
                          ✕
                        </button>
                      )}
                    </div>

                    {/* Price & performance row */}
                    <div className="flex items-center gap-3 text-[10px]">
                      <div className="text-muted-foreground">
                        <span className="font-mono">Added:</span>{' '}
                        <span className="text-foreground font-medium">${addedPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                      </div>
                      <div className="text-muted-foreground">
                        <span className="font-mono">Now:</span>{' '}
                        <span className="text-foreground font-medium">${Number(item.price).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                      </div>
                      <span className={`font-mono font-semibold ${pctChange >= 0 ? 'text-positive' : 'text-negative'}`}>
                        {pctChange >= 0 ? '▲' : '▼'} {Math.abs(pctChange).toFixed(2)}%
                      </span>
                    </div>

                    {/* Date/time */}
                    <div className="text-[9px] text-muted-foreground/70">
                      📅 {addedDate.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })} at {addedDate.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                    </div>

                    {/* Note */}
                    <div className="flex items-start gap-1.5">
                      <span className="text-[9px] text-muted-foreground mt-0.5">📝</span>
                      <input
                        type="text"
                        value={item.note || ''}
                        onChange={(e) => onWatchlistNoteUpdate?.(item.id, e.target.value)}
                        placeholder="Add a note (e.g. Buy signal, support level)…"
                        className="flex-1 text-[10px] bg-transparent border-b border-border/50 focus:border-primary/50 outline-none py-0.5 text-foreground placeholder:text-muted-foreground/50 transition-colors"
                      />
                    </div>
                  </div>
                );
              })
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
