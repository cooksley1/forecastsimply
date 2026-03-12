import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface PortfolioHolding {
  id: string;
  asset_id: string;
  symbol: string;
  name: string;
  asset_type: string;
  quantity: number;
  avg_price: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

const LOCAL_KEY = 'fs-portfolio-holdings';

function getLocal(): PortfolioHolding[] {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]');
  } catch { return []; }
}
function setLocal(h: PortfolioHolding[]) {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(h));
}

export function usePortfolioHoldings() {
  const { user } = useAuth();
  const [holdings, setHoldings] = useState<PortfolioHolding[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchHoldings = useCallback(async () => {
    setLoading(true);
    if (user) {
      const { data, error } = await supabase
        .from('portfolio_holdings')
        .select('*')
        .order('created_at', { ascending: true });
      if (!error && data) {
        setHoldings(data as PortfolioHolding[]);
        setLocal(data as PortfolioHolding[]);
      }
    } else {
      setHoldings(getLocal());
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchHoldings(); }, [fetchHoldings]);

  const addHolding = useCallback(async (h: Omit<PortfolioHolding, 'id' | 'created_at' | 'updated_at' | 'notes'> & { notes?: string }) => {
    if (user) {
      const { data, error } = await supabase
        .from('portfolio_holdings')
        .upsert({
          user_id: user.id,
          asset_id: h.asset_id,
          symbol: h.symbol,
          name: h.name,
          asset_type: h.asset_type,
          quantity: h.quantity,
          avg_price: h.avg_price,
          notes: h.notes || null,
        } as any, { onConflict: 'user_id,asset_id' })
        .select()
        .single();
      if (error) { toast.error('Failed to save holding'); return; }
      await fetchHoldings();
    } else {
      const existing = getLocal();
      const idx = existing.findIndex(x => x.asset_id === h.asset_id);
      const entry: PortfolioHolding = {
        id: idx >= 0 ? existing[idx].id : crypto.randomUUID(),
        asset_id: h.asset_id,
        symbol: h.symbol,
        name: h.name,
        asset_type: h.asset_type,
        quantity: h.quantity,
        avg_price: h.avg_price,
        notes: h.notes || null,
        created_at: idx >= 0 ? existing[idx].created_at : new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      if (idx >= 0) existing[idx] = entry; else existing.push(entry);
      setLocal(existing);
      setHoldings([...existing]);
    }
  }, [user, fetchHoldings]);

  const removeHolding = useCallback(async (assetId: string) => {
    if (user) {
      await supabase.from('portfolio_holdings').delete().eq('asset_id', assetId).eq('user_id', user.id);
      await fetchHoldings();
    } else {
      const updated = getLocal().filter(x => x.asset_id !== assetId);
      setLocal(updated);
      setHoldings(updated);
    }
  }, [user, fetchHoldings]);

  const importBulk = useCallback(async (items: Array<Omit<PortfolioHolding, 'id' | 'created_at' | 'updated_at'>>) => {
    let count = 0;
    for (const item of items) {
      await addHolding(item);
      count++;
    }
    toast.success(`Imported ${count} holding${count !== 1 ? 's' : ''}`);
  }, [addHolding]);

  return { holdings, loading, addHolding, removeHolding, importBulk, refresh: fetchHoldings };
}
