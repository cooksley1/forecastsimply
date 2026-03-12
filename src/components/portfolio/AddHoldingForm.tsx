import { useState } from 'react';
import { X } from 'lucide-react';

interface Props {
  onAdd: (holding: { asset_id: string; symbol: string; name: string; asset_type: string; quantity: number; avg_price: number }) => Promise<void>;
  onClose: () => void;
}

export default function AddHoldingForm({ onAdd, onClose }: Props) {
  const [symbol, setSymbol] = useState('');
  const [name, setName] = useState('');
  const [assetType, setAssetType] = useState('crypto');
  const [quantity, setQuantity] = useState('');
  const [avgPrice, setAvgPrice] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!symbol.trim() || !quantity || !avgPrice) return;
    setSaving(true);
    await onAdd({
      asset_id: symbol.trim().toLowerCase().replace(/[.\s]/g, '-'),
      symbol: symbol.trim().toUpperCase(),
      name: name.trim() || symbol.trim().toUpperCase(),
      asset_type: assetType,
      quantity: parseFloat(quantity),
      avg_price: parseFloat(avgPrice),
    });
    setSaving(false);
    setSymbol(''); setName(''); setQuantity(''); setAvgPrice('');
    onClose();
  };

  const inputClass = 'w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary';

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-foreground">Add Holding</span>
        <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <input value={symbol} onChange={e => setSymbol(e.target.value)} placeholder="Symbol (e.g. BTC)" className={inputClass} required />
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Name (optional)" className={inputClass} />
      </div>

      <div className="flex gap-1.5 flex-wrap">
        {(['crypto', 'stocks', 'etfs', 'forex'] as const).map(t => (
          <button
            key={t}
            type="button"
            onClick={() => setAssetType(t)}
            className={`px-2.5 py-1 rounded-md text-[11px] font-medium border transition-all ${
              assetType === t
                ? 'bg-primary text-primary-foreground border-primary'
                : 'border-border text-muted-foreground hover:text-foreground hover:border-primary/40'
            }`}
          >
            {t === 'etfs' ? 'ETFs' : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <input value={quantity} onChange={e => setQuantity(e.target.value)} type="number" step="any" min="0" placeholder="Quantity" className={inputClass} required />
        <input value={avgPrice} onChange={e => setAvgPrice(e.target.value)} type="number" step="any" min="0" placeholder="Avg buy price ($)" className={inputClass} required />
      </div>

      <button
        type="submit"
        disabled={saving || !symbol.trim() || !quantity || !avgPrice}
        className="w-full py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
      >
        {saving ? 'Saving...' : 'Add to Portfolio'}
      </button>
    </form>
  );
}
