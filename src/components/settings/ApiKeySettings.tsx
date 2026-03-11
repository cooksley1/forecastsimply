import { useState, useEffect } from 'react';
import { getAVApiKey, setAVApiKey, getAVDailyUsage } from '@/services/api/alphavantage';
import { getFMPApiKey, setFMPApiKey } from '@/services/api/fmp';
import { hasOwnApiKeys, getRemainingRefreshes, DAILY_RANK_LIMIT } from '@/utils/refreshLimit';

const CG_STORAGE_KEY = 'sf_coingecko_api_key';

export function getStoredApiKey(): string | null {
  try { return localStorage.getItem(CG_STORAGE_KEY) || null; } catch { return null; }
}

interface Props {
  embedded?: boolean; // renders inline (no modal overlay)
}

const PROVIDERS = [
  {
    key: 'av',
    name: 'Alpha Vantage',
    icon: '📈',
    badge: 'Stocks & ETFs',
    badgeCls: 'bg-positive/10 text-positive border-positive/20',
    freeLimit: '25 calls/day',
    description: 'Best free source for stock and ETF historical data. Works as a fallback when Yahoo Finance is unavailable.',
    signupUrl: 'https://www.alphavantage.co/support/#api-key',
    steps: [
      'Visit the link below — no credit card required',
      'Enter your name and email, select "Free" tier',
      'Click "GET FREE API KEY"',
      'Copy the key and paste it below',
    ],
  },
  {
    key: 'fmp',
    name: 'Financial Modeling Prep',
    icon: '🏢',
    badge: '250 calls/day',
    badgeCls: 'bg-primary/10 text-primary border-primary/20',
    freeLimit: '250 calls/day',
    description: 'Generous free tier for stock fundamentals and historical data. Used as a third fallback source.',
    signupUrl: 'https://site.financialmodelingprep.com/register',
    steps: [
      'Click the link below to create a free account',
      'Sign up with email or Google — no payment needed',
      'Go to Dashboard → API Keys after signing in',
      'Copy your API key and paste it below',
    ],
  },
  {
    key: 'cg',
    name: 'CoinGecko',
    icon: '🪙',
    badge: 'Crypto',
    badgeCls: 'bg-warning/10 text-warning border-warning/20',
    freeLimit: '30 calls/min (Demo key)',
    description: 'Optional Demo key removes crypto rate limits for faster scanning. CoinGecko works without a key but is slower.',
    signupUrl: 'https://www.coingecko.com/en/api/pricing',
    steps: [
      'Visit the CoinGecko API page below',
      'Click "Get Your Free API Key" (Demo plan)',
      'Create an account and verify your email',
      'Copy the Demo API key from your dashboard',
    ],
  },
];

export default function ApiKeySettings({ embedded = false }: Props) {
  const [keys, setKeys] = useState({ av: '', fmp: '', cg: '' });
  const [saved, setSaved] = useState(false);
  const [showKey, setShowKey] = useState<Record<string, boolean>>({});
  const [expandedGuide, setExpandedGuide] = useState<string | null>(null);
  const [avUsage, setAvUsage] = useState({ count: 0, remaining: 25 });

  useEffect(() => {
    const storedAv = getAVApiKey();
    setKeys({
      cg: getStoredApiKey() || '',
      av: storedAv === 'DDA2XK5P7Q9CO756' ? '' : storedAv,
      fmp: getFMPApiKey() || '',
    });
    setSaved(false);
    setAvUsage(getAVDailyUsage());
  }, []);

  const handleSave = () => {
    const trimmedCg = keys.cg.trim();
    if (trimmedCg) localStorage.setItem(CG_STORAGE_KEY, trimmedCg);
    else localStorage.removeItem(CG_STORAGE_KEY);
    setAVApiKey(keys.av);
    setFMPApiKey(keys.fmp);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleRemove = (key: string) => {
    if (key === 'cg') { localStorage.removeItem(CG_STORAGE_KEY); }
    else if (key === 'av') { setAVApiKey(''); }
    else if (key === 'fmp') { setFMPApiKey(''); }
    setKeys(prev => ({ ...prev, [key]: '' }));
  };

  const ownKeys = hasOwnApiKeys();
  const remaining = getRemainingRefreshes();

  return (
    <div className="space-y-4">
      {/* Refresh limit status */}
      <div className={`rounded-xl border p-3 space-y-1.5 ${ownKeys ? 'bg-positive/5 border-positive/20' : 'bg-warning/5 border-warning/20'}`}>
        <div className="flex items-center gap-2">
          <span className="text-sm">{ownKeys ? '🔓' : '🔒'}</span>
          <span className="text-xs font-semibold text-foreground">
            {ownKeys ? 'Unlimited live analysis' : `${remaining}/${DAILY_RANK_LIMIT} live rank refresh remaining today`}
          </span>
        </div>
        <p className="text-[10px] text-muted-foreground leading-relaxed">
          {ownKeys
            ? 'You have your own API keys configured — enjoy unlimited live analysis refreshes!'
            : 'To protect shared API limits, live ranking is limited to 1 per day. Add your own free API key below to unlock unlimited refreshes.'}
        </p>
      </div>

      {/* Provider cards */}
      {PROVIDERS.map(provider => {
        const value = keys[provider.key as keyof typeof keys];
        const isExpanded = expandedGuide === provider.key;
        const hasKey = value.trim().length > 0;

        return (
          <div key={provider.key} className="border border-border rounded-xl bg-card overflow-hidden">
            {/* Header */}
            <div className="px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-base">{provider.icon}</span>
                <span className="text-xs font-semibold text-foreground">{provider.name}</span>
                <span className={`text-[9px] px-1.5 py-0.5 rounded border font-medium ${provider.badgeCls}`}>
                  {provider.badge}
                </span>
                {hasKey && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-positive/10 text-positive border border-positive/20 font-medium">
                    ✓ Active
                  </span>
                )}
              </div>
              <span className="text-[9px] text-muted-foreground font-mono">{provider.freeLimit}</span>
            </div>

            <div className="px-4 pb-4 space-y-3">
              <p className="text-[10px] text-muted-foreground leading-relaxed">{provider.description}</p>

              {/* How to get a key — expandable guide */}
              <button
                onClick={() => setExpandedGuide(isExpanded ? null : provider.key)}
                className="flex items-center gap-1.5 text-[11px] font-medium text-primary hover:text-primary/80 transition-colors"
              >
                <span className="text-xs">{isExpanded ? '▾' : '▸'}</span>
                {isExpanded ? 'Hide setup guide' : 'How to get a free key (2 min)'}
              </button>

              {isExpanded && (
                <div className="bg-muted/40 rounded-lg p-3 space-y-2 border border-border/60">
                  <ol className="space-y-1.5">
                    {provider.steps.map((step, i) => (
                      <li key={i} className="flex gap-2 text-[10px] text-muted-foreground">
                        <span className="shrink-0 w-4 h-4 rounded-full bg-primary/15 text-primary text-[9px] font-bold flex items-center justify-center">
                          {i + 1}
                        </span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>
                  <a
                    href={provider.signupUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-all"
                  >
                    🔗 Open {provider.name} sign-up page
                  </a>
                </div>
              )}

              {/* Key input */}
              <div className="relative">
                <input
                  type={showKey[provider.key] ? 'text' : 'password'}
                  value={value}
                  onChange={e => setKeys(prev => ({ ...prev, [provider.key]: e.target.value }))}
                  placeholder={`Paste your ${provider.name} API key...`}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs font-mono text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none pr-20"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1.5">
                  <button
                    onClick={() => setShowKey(prev => ({ ...prev, [provider.key]: !prev[provider.key] }))}
                    className="text-[10px] text-muted-foreground hover:text-foreground"
                  >
                    {showKey[provider.key] ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>

              {/* Usage / remove */}
              <div className="flex items-center justify-between">
                {provider.key === 'av' && hasKey && (
                  <span className="text-[10px] font-mono text-muted-foreground">
                    📊 {avUsage.remaining}/25 calls remaining today
                  </span>
                )}
                {hasKey && (
                  <button
                    onClick={() => handleRemove(provider.key)}
                    className="text-[10px] text-destructive hover:underline ml-auto"
                  >
                    Remove key
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}

      {/* Free sources */}
      <div className="border border-border rounded-xl bg-card px-4 py-3 space-y-1.5">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase font-mono">Free Sources (no key needed)</p>
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          <span className="text-positive">✓</span>
          <span><strong className="text-foreground">Stocks/ETFs</strong> — Yahoo Finance (primary, always free)</span>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          <span className="text-positive">✓</span>
          <span><strong className="text-foreground">Crypto</strong> — CoinLore, DIA, CoinPaprika (fallbacks)</span>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          <span className="text-positive">✓</span>
          <span><strong className="text-foreground">Forex</strong> — Frankfurter (ECB rates)</span>
        </div>
      </div>

      {/* Security notice */}
      <div className="rounded-xl border border-warning/30 bg-warning/5 p-3 space-y-1">
        <p className="text-[10px] font-semibold text-warning">🔒 Security</p>
        <p className="text-[10px] text-muted-foreground leading-relaxed">
          Keys are stored locally in your browser only — they are <strong>never sent to our servers</strong>. Use free-tier keys only.
        </p>
      </div>

      {/* Save button */}
      <button
        onClick={handleSave}
        className="w-full px-3 py-2.5 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-all"
      >
        {saved ? '✓ All Keys Saved!' : 'Save All Keys'}
      </button>
    </div>
  );
}
