import { useState, useEffect } from 'react';
import { getAVApiKey, setAVApiKey, getAVDailyUsage } from '@/services/api/alphavantage';
import { getFMPApiKey, setFMPApiKey } from '@/services/api/fmp';

const CG_STORAGE_KEY = 'sf_coingecko_api_key';

export function getStoredApiKey(): string | null {
  try { return localStorage.getItem(CG_STORAGE_KEY) || null; } catch { return null; }
}

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function ApiKeySettings({ open, onClose }: Props) {
  const [cgKey, setCgKey] = useState('');
  const [avKey, setAvKey] = useState('');
  const [fmpKey, setFmpKey] = useState('');
  const [saved, setSaved] = useState(false);
  const [showCg, setShowCg] = useState(false);
  const [showAv, setShowAv] = useState(false);
  const [showFmp, setShowFmp] = useState(false);
  const [avUsage, setAvUsage] = useState({ count: 0, remaining: 25 });

  useEffect(() => {
    if (open) {
      setCgKey(getStoredApiKey() || '');
      const storedAv = getAVApiKey();
      setAvKey(storedAv === '22SQ92JY3AWFQBJ8' ? '' : storedAv);
      setFmpKey(getFMPApiKey() || '');
      setSaved(false);
      setAvUsage(getAVDailyUsage());
    }
  }, [open]);

  const handleSave = () => {
    const trimmedCg = cgKey.trim();
    if (trimmedCg) localStorage.setItem(CG_STORAGE_KEY, trimmedCg);
    else localStorage.removeItem(CG_STORAGE_KEY);

    setAVApiKey(avKey);
    setFMPApiKey(fmpKey);

    setSaved(true);
    setTimeout(() => onClose(), 1200);
  };

  const handleRemoveCg = () => {
    localStorage.removeItem(CG_STORAGE_KEY);
    setCgKey('');
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-sf-card border border-border rounded-xl p-4 sm:p-6 max-w-md w-full space-y-4 shadow-xl max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-sm sm:text-base font-semibold text-foreground">⚙️ API Settings</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-lg leading-none">&times;</button>
        </div>

        {/* CoinGecko */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-foreground">🪙 CoinGecko API Key</span>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-positive/10 text-positive border border-positive/20">Recommended</span>
          </div>
          <p className="text-[10px] sm:text-xs text-muted-foreground leading-relaxed">
            Adding a free CoinGecko Demo key removes rate limits and makes scanning much faster.
          </p>
          <a href="https://www.coingecko.com/en/api/pricing" target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] sm:text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 border border-primary/30 transition-all">
            🔗 Get free CoinGecko key
          </a>
          <div className="relative">
            <input type={showCg ? 'text' : 'password'} value={cgKey} onChange={e => setCgKey(e.target.value)}
              placeholder="Paste CoinGecko Demo API key..."
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs font-mono text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none pr-16" />
            <button onClick={() => setShowCg(!showCg)} className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground hover:text-foreground">
              {showCg ? 'Hide' : 'Show'}
            </button>
          </div>
          {getStoredApiKey() && (
            <button onClick={handleRemoveCg} className="text-[10px] text-destructive hover:underline">Remove CoinGecko key</button>
          )}
        </div>

        {/* Alpha Vantage */}
        <div className="space-y-2 border-t border-border pt-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-foreground">📈 Alpha Vantage API Key</span>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-accent/10 text-accent border border-accent/20">Stocks fallback</span>
          </div>
          <p className="text-[10px] sm:text-xs text-muted-foreground leading-relaxed">
            Free fallback for stocks/ETFs when Yahoo Finance fails. 25 calls/day.
          </p>
          <a href="https://www.alphavantage.co/support/#api-key" target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] sm:text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 border border-primary/30 transition-all">
            🔗 Get free Alpha Vantage key
          </a>
          <div className="relative">
            <input type={showAv ? 'text' : 'password'} value={avKey} onChange={e => setAvKey(e.target.value)}
              placeholder="Paste Alpha Vantage key (optional)..."
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs font-mono text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none pr-16" />
            <button onClick={() => setShowAv(!showAv)} className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground hover:text-foreground">
              {showAv ? 'Hide' : 'Show'}
            </button>
          </div>
          <div className="text-[10px] font-mono text-muted-foreground">
            📊 {avUsage.remaining}/25 AV calls remaining today
          </div>
        </div>

        {/* FMP */}
        <div className="space-y-2 border-t border-border pt-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-foreground">🏢 Financial Modeling Prep Key</span>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-border">Optional</span>
          </div>
          <p className="text-[10px] sm:text-xs text-muted-foreground leading-relaxed">
            Third fallback for stocks. 250 calls/day. Only used if Yahoo and AV both fail.
          </p>
          <a href="https://financialmodelingprep.com/developer" target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] sm:text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 border border-primary/30 transition-all">
            🔗 Get free FMP key
          </a>
          <div className="relative">
            <input type={showFmp ? 'text' : 'password'} value={fmpKey} onChange={e => setFmpKey(e.target.value)}
              placeholder="Paste FMP key (optional)..."
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs font-mono text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none pr-16" />
            <button onClick={() => setShowFmp(!showFmp)} className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground hover:text-foreground">
              {showFmp ? 'Hide' : 'Show'}
            </button>
          </div>
        </div>

        {/* Other APIs info */}
        <div className="border-t border-border pt-3 space-y-1.5">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase font-mono">Free Sources (no key needed)</p>
          <div className="flex items-center gap-2 text-[10px] sm:text-xs text-muted-foreground">
            <span className="text-positive">✓</span>
            <span><strong className="text-foreground">Stocks/ETFs</strong> — Yahoo Finance (primary)</span>
          </div>
          <div className="flex items-center gap-2 text-[10px] sm:text-xs text-muted-foreground">
            <span className="text-positive">✓</span>
            <span><strong className="text-foreground">Crypto</strong> — CoinLore, DIA, CoinPaprika (fallbacks)</span>
          </div>
          <div className="flex items-center gap-2 text-[10px] sm:text-xs text-muted-foreground">
            <span className="text-positive">✓</span>
            <span><strong className="text-foreground">Forex</strong> — Frankfurter (ECB rates)</span>
          </div>
        </div>

        {/* Save */}
        <button onClick={handleSave}
          className="w-full px-3 py-2.5 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-all">
          {saved ? '✓ All Keys Saved!' : 'Save All Keys'}
        </button>
      </div>
    </div>
  );
}
