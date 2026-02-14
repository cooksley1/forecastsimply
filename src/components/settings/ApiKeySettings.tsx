import { useState, useEffect } from 'react';

const STORAGE_KEY = 'sf_coingecko_api_key';

export function getStoredApiKey(): string | null {
  try { return localStorage.getItem(STORAGE_KEY) || null; } catch { return null; }
}

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function ApiKeySettings({ open, onClose }: Props) {
  const [apiKey, setApiKey] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (open) {
      setApiKey(getStoredApiKey() || '');
      setSaved(false);
    }
  }, [open]);

  const handleSave = () => {
    const trimmed = apiKey.trim();
    if (trimmed) {
      localStorage.setItem(STORAGE_KEY, trimmed);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
    setSaved(true);
    setTimeout(() => onClose(), 1200);
  };

  const handleRemove = () => {
    localStorage.removeItem(STORAGE_KEY);
    setApiKey('');
    setSaved(true);
    setTimeout(() => onClose(), 1200);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-sf-card border border-border rounded-xl p-4 sm:p-6 max-w-md w-full space-y-4 shadow-xl" onClick={e => e.stopPropagation()}>
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
            Your key is stored locally in your browser — it never leaves your device.
          </p>

          <div className="space-y-2">
            <a
              href="https://www.coingecko.com/en/api/pricing"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] sm:text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 border border-primary/30 transition-all"
            >
              🔗 Get a free CoinGecko API key
              <span className="text-[9px] text-muted-foreground">(opens in new tab)</span>
            </a>

            <input
              type="password"
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              placeholder="Paste your CoinGecko Demo API key here..."
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs font-mono text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none"
            />

            <div className="flex gap-2">
              <button
                onClick={handleSave}
                className="flex-1 px-3 py-2 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-all"
              >
                {saved ? '✓ Saved!' : 'Save Key'}
              </button>
              {getStoredApiKey() && (
                <button
                  onClick={handleRemove}
                  className="px-3 py-2 rounded-lg text-xs font-medium text-destructive border border-destructive/30 hover:bg-destructive/10 transition-all"
                >
                  Remove
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Other APIs info */}
        <div className="border-t border-border pt-3 space-y-2">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase font-mono">Other Data Sources</p>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-[10px] sm:text-xs text-muted-foreground">
              <span className="text-positive">✓</span>
              <span><strong className="text-foreground">Stocks & ETFs</strong> (Yahoo Finance) — No key needed, works automatically</span>
            </div>
            <div className="flex items-center gap-2 text-[10px] sm:text-xs text-muted-foreground">
              <span className="text-positive">✓</span>
              <span><strong className="text-foreground">Forex</strong> (Frankfurter) — No key needed, fully open API</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
