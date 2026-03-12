import { useState, useRef, useCallback, useMemo } from 'react';
import { Plus, Upload, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { usePortfolioHoldings, type PortfolioHolding } from '@/hooks/usePortfolioHoldings';
import { parseCSV } from '@/utils/csvPortfolioParser';
import { useAuth } from '@/contexts/AuthContext';
import PortfolioHealthScore from './PortfolioHealthScore';
import HoldingActionCard from './HoldingActionCard';
import AddHoldingForm from './AddHoldingForm';

interface CacheRow {
  asset_id: string;
  symbol: string;
  price: number;
  signal_score: number | null;
  signal_label: string | null;
  confidence: number | null;
  market_phase: string | null;
  forecast_return_pct: number | null;
  target_price: number | null;
  stop_loss: number | null;
}

interface Props {
  analysisCache: CacheRow[];
  onAnalyse?: (assetId: string, assetType: string) => void;
}

export default function PortfolioManager({ analysisCache, onAnalyse }: Props) {
  const { holdings, loading, addHolding, removeHolding, importBulk } = usePortfolioHoldings();
  const { user } = useAuth();
  const [showAdd, setShowAdd] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Enrich holdings with analysis data
  const enriched = useMemo(() => {
    return holdings.map(h => {
      const cache = analysisCache.find(c =>
        c.asset_id === h.asset_id ||
        c.symbol.toUpperCase() === h.symbol.toUpperCase()
      );
      const currentPrice = cache?.price ?? 0;
      const pnl = currentPrice && h.avg_price ? ((currentPrice - h.avg_price) / h.avg_price) * 100 : null;
      const pnlValue = currentPrice && h.quantity ? (currentPrice - h.avg_price) * h.quantity : null;
      return { ...h, cache, currentPrice, pnl, pnlValue };
    });
  }, [holdings, analysisCache]);

  const handleCSV = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const text = await file.text();
      const result = parseCSV(text);
      if (result.errors.length > 0) {
        result.errors.forEach(err => toast.error(err, { duration: 5000 }));
      }
      if (result.holdings.length > 0) {
        const items = result.holdings.map(h => ({
          asset_id: h.symbol.toLowerCase().replace('.', '-'),
          symbol: h.symbol,
          name: h.name,
          asset_type: h.asset_type,
          quantity: h.quantity,
          avg_price: h.avg_price,
          notes: `Imported from ${result.format} CSV`,
        }));
        await importBulk(items);
      }
    } catch {
      toast.error('Failed to parse CSV file');
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }, [importBulk]);

  const totalValue = enriched.reduce((sum, h) => sum + (h.currentPrice || h.avg_price) * h.quantity, 0);
  const totalCost = enriched.reduce((sum, h) => sum + h.avg_price * h.quantity, 0);
  const totalPnl = totalCost > 0 ? ((totalValue - totalCost) / totalCost) * 100 : 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-bold text-foreground flex items-center gap-2">
            📂 My Portfolio
          </h2>
          {!user && (
            <p className="text-[10px] text-muted-foreground mt-0.5">Stored locally · Sign in to sync across devices</p>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-primary text-primary-foreground text-[11px] font-semibold hover:opacity-90 transition-opacity"
          >
            <Plus className="w-3 h-3" /> Add
          </button>
          <label className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-border text-[11px] font-medium text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all cursor-pointer">
            <Upload className="w-3 h-3" />
            {importing ? <Loader2 className="w-3 h-3 animate-spin" /> : 'CSV'}
            <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleCSV} />
          </label>
        </div>
      </div>

      {/* Add form */}
      {showAdd && <AddHoldingForm onAdd={addHolding} onClose={() => setShowAdd(false)} />}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Empty state */}
      {!loading && holdings.length === 0 && (
        <div className="rounded-xl border border-dashed border-border bg-card/50 p-6 text-center space-y-2">
          <p className="text-sm text-muted-foreground">No holdings yet</p>
          <p className="text-[11px] text-muted-foreground">
            Add assets manually or import a CSV from your broker (Commsec, Stake, IBKR, etc.)
          </p>
        </div>
      )}

      {/* Portfolio summary + health */}
      {enriched.length > 0 && (
        <>
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-lg bg-card border border-border p-3">
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Value</div>
              <div className="text-sm font-bold font-mono text-foreground">${totalValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
            </div>
            <div className="rounded-lg bg-card border border-border p-3">
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Cost</div>
              <div className="text-sm font-bold font-mono text-foreground">${totalCost.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
            </div>
            <div className="rounded-lg bg-card border border-border p-3">
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider">P&L</div>
              <div className={`text-sm font-bold font-mono ${totalPnl >= 0 ? 'text-positive' : 'text-destructive'}`}>
                {totalPnl >= 0 ? '+' : ''}{totalPnl.toFixed(1)}%
              </div>
            </div>
          </div>

          <PortfolioHealthScore holdings={enriched} />

          {/* Holdings list */}
          <div className="space-y-2">
            {enriched.map(h => (
              <HoldingActionCard
                key={h.id}
                holding={h}
                onRemove={() => removeHolding(h.asset_id)}
                onAnalyse={onAnalyse ? () => onAnalyse(h.asset_id, h.asset_type) : undefined}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
