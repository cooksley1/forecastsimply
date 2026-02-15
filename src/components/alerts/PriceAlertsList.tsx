import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Alert {
  id: string;
  symbol: string;
  name: string;
  alert_type: string;
  target_price: number | null;
  target_pct: number | null;
  reference_price: number | null;
  active: boolean;
  triggered_at: string | null;
  created_at: string;
}

interface Props {
  refreshKey?: number;
}

export default function PriceAlertsList({ refreshKey }: Props) {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAlerts = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from('price_alerts')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);
    setAlerts(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchAlerts(); }, [user, refreshKey]);

  const deleteAlert = async (id: string) => {
    await supabase.from('price_alerts').delete().eq('id', id);
    setAlerts(prev => prev.filter(a => a.id !== id));
  };

  if (!user) return null;
  if (loading) return <p className="text-[10px] text-muted-foreground py-2">Loading alerts...</p>;
  if (alerts.length === 0) return <p className="text-[10px] text-muted-foreground py-2">No alerts set yet.</p>;

  return (
    <div className="space-y-2 max-h-60 overflow-y-auto">
      {alerts.map(a => {
        const typeLabel = a.alert_type === 'above' ? '📈 Above' : a.alert_type === 'below' ? '📉 Below' : a.alert_type === 'pct_up' ? '📈 +%' : '📉 -%';
        const value = a.target_price != null
          ? `$${a.target_price.toLocaleString()}`
          : `${a.target_pct}% from $${a.reference_price?.toLocaleString()}`;

        return (
          <div key={a.id} className={`flex items-center justify-between gap-2 p-2 rounded-lg border text-xs ${
            a.active ? 'border-border bg-background' : 'border-positive/30 bg-positive/5'
          }`}>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-foreground">{a.symbol}</span>
                <span className="text-muted-foreground">{typeLabel}</span>
                <span className="font-mono text-foreground">{value}</span>
              </div>
              {a.triggered_at && (
                <p className="text-[9px] text-positive mt-0.5">✅ Triggered {new Date(a.triggered_at).toLocaleDateString()}</p>
              )}
            </div>
            <button
              onClick={() => deleteAlert(a.id)}
              className="text-muted-foreground hover:text-destructive text-sm shrink-0"
              title="Delete alert"
            >
              🗑
            </button>
          </div>
        );
      })}
    </div>
  );
}
