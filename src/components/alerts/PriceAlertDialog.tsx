import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { AssetInfo } from '@/types/assets';

interface Props {
  open: boolean;
  onClose: () => void;
  asset: AssetInfo | null;
  onCreated?: () => void;
}

export default function PriceAlertDialog({ open, onClose, asset, onCreated }: Props) {
  const { user } = useAuth();
  const [alertType, setAlertType] = useState<'above' | 'below' | 'pct_up' | 'pct_down'>('above');
  const [targetPrice, setTargetPrice] = useState('');
  const [targetPct, setTargetPct] = useState('5');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  if (!open || !asset) return null;

  const isPct = alertType === 'pct_up' || alertType === 'pct_down';

  const handleSave = async () => {
    if (!user) { setError('Sign in to set alerts'); return; }
    setError('');
    setSaving(true);

    try {
      const insert: any = {
        user_id: user.id,
        asset_id: asset.id,
        asset_type: asset.assetType,
        symbol: asset.symbol,
        name: asset.name,
        alert_type: alertType,
      };

      if (isPct) {
        const pct = parseFloat(targetPct);
        if (isNaN(pct) || pct <= 0) { setError('Enter a valid percentage'); setSaving(false); return; }
        insert.target_pct = pct;
        insert.reference_price = asset.price;
      } else {
        const price = parseFloat(targetPrice);
        if (isNaN(price) || price <= 0) { setError('Enter a valid price'); setSaving(false); return; }
        insert.target_price = price;
      }

      const { error: dbErr } = await supabase.from('price_alerts').insert(insert);
      if (dbErr) throw dbErr;

      onCreated?.();
      onClose();
    } catch (e: any) {
      setError(e.message || 'Failed to create alert');
    } finally {
      setSaving(false);
    }
  };

  const priceStr = asset.price < 1 ? asset.price.toPrecision(4) : asset.price.toLocaleString('en-US', { maximumFractionDigits: 2 });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-card border border-border rounded-xl p-4 sm:p-6 max-w-sm w-full space-y-4 shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">🔔 Set Price Alert</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-lg">&times;</button>
        </div>

        <div className="text-xs text-muted-foreground">
          <strong className="text-foreground">{asset.name}</strong> ({asset.symbol}) — current: ${priceStr}
        </div>

        {/* Alert type */}
        <div className="grid grid-cols-2 gap-2">
          {([
            ['above', '📈 Above price'],
            ['below', '📉 Below price'],
            ['pct_up', '📈 % increase'],
            ['pct_down', '📉 % decrease'],
          ] as const).map(([val, label]) => (
            <button
              key={val}
              onClick={() => setAlertType(val)}
              className={`px-2 py-2 rounded-lg text-[10px] sm:text-xs font-medium border transition-all ${
                alertType === val
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border text-muted-foreground hover:border-primary/50'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Value input */}
        {isPct ? (
          <div className="space-y-1">
            <label className="text-[10px] text-muted-foreground">Percentage change from ${priceStr}</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={targetPct}
                onChange={e => setTargetPct(e.target.value)}
                min="0.1"
                step="0.5"
                className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-xs font-mono text-foreground focus:border-primary focus:outline-none"
                placeholder="5"
              />
              <span className="text-xs text-muted-foreground">%</span>
            </div>
            <p className="text-[10px] text-muted-foreground">
              Target: ${(asset.price * (1 + (alertType === 'pct_up' ? 1 : -1) * (parseFloat(targetPct) || 0) / 100)).toLocaleString('en-US', { maximumFractionDigits: 4 })}
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            <label className="text-[10px] text-muted-foreground">Target price (USD)</label>
            <input
              type="number"
              value={targetPrice}
              onChange={e => setTargetPrice(e.target.value)}
              min="0"
              step="any"
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs font-mono text-foreground focus:border-primary focus:outline-none"
              placeholder={priceStr}
            />
          </div>
        )}

        {error && <p className="text-[10px] text-destructive">{error}</p>}

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full px-3 py-2.5 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-all disabled:opacity-50"
        >
          {saving ? 'Creating...' : 'Create Alert'}
        </button>

        <p className="text-[9px] text-muted-foreground text-center">
          Prices checked every 30 mins. Push notifications sent when triggered.
        </p>
      </div>
    </div>
  );
}
