import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Alert {
  id: string;
  symbol: string;
  name: string;
  asset_type: string;
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

const ASSET_ICONS: Record<string, string> = { crypto: '🪙', stocks: '📈', etfs: '📊', forex: '💱' };

export default function PriceAlertsList({ refreshKey }: Props) {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

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

  const toggleActive = async (id: string, currentActive: boolean) => {
    const newActive = !currentActive;
    await supabase.from('price_alerts').update({ active: newActive, triggered_at: newActive ? null : undefined }).eq('id', id);
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, active: newActive, triggered_at: newActive ? null : a.triggered_at } : a));
  };

  const startEdit = (alert: Alert) => {
    setEditingId(alert.id);
    const isPct = alert.alert_type === 'pct_up' || alert.alert_type === 'pct_down';
    setEditValue(isPct ? String(alert.target_pct || '') : String(alert.target_price || ''));
  };

  const saveEdit = async (alert: Alert) => {
    const num = parseFloat(editValue);
    if (isNaN(num) || num <= 0) { setEditingId(null); return; }

    const isPct = alert.alert_type === 'pct_up' || alert.alert_type === 'pct_down';
    const update = isPct ? { target_pct: num } : { target_price: num };

    await supabase.from('price_alerts').update(update).eq('id', alert.id);
    setAlerts(prev => prev.map(a => a.id === alert.id ? { ...a, ...update } : a));
    setEditingId(null);
  };

  if (!user) return null;
  if (loading) return <p className="text-[10px] text-muted-foreground py-2">Loading alerts...</p>;
  if (alerts.length === 0) {
    return (
      <div className="text-center py-6 space-y-2">
        <div className="text-2xl">🔔</div>
        <p className="text-xs text-muted-foreground">No price alerts set</p>
        <p className="text-[10px] text-muted-foreground">Analyse an asset and tap the 🔔 Alert button to create one.</p>
      </div>
    );
  }

  const activeAlerts = alerts.filter(a => a.active);
  const inactiveAlerts = alerts.filter(a => !a.active);

  return (
    <div className="space-y-3">
      {activeAlerts.length > 0 && (
        <div className="space-y-2">
          <span className="text-[10px] text-muted-foreground font-mono uppercase">Active ({activeAlerts.length})</span>
          {activeAlerts.map(a => <AlertRow key={a.id} alert={a} editingId={editingId} editValue={editValue} setEditValue={setEditValue} onToggle={toggleActive} onDelete={deleteAlert} onStartEdit={startEdit} onSaveEdit={saveEdit} onCancelEdit={() => setEditingId(null)} />)}
        </div>
      )}
      {inactiveAlerts.length > 0 && (
        <div className="space-y-2">
          <span className="text-[10px] text-muted-foreground font-mono uppercase">Triggered / Paused ({inactiveAlerts.length})</span>
          {inactiveAlerts.map(a => <AlertRow key={a.id} alert={a} editingId={editingId} editValue={editValue} setEditValue={setEditValue} onToggle={toggleActive} onDelete={deleteAlert} onStartEdit={startEdit} onSaveEdit={saveEdit} onCancelEdit={() => setEditingId(null)} />)}
        </div>
      )}
    </div>
  );
}

function AlertRow({ alert: a, editingId, editValue, setEditValue, onToggle, onDelete, onStartEdit, onSaveEdit, onCancelEdit }: {
  alert: any;
  editingId: string | null;
  editValue: string;
  setEditValue: (v: string) => void;
  onToggle: (id: string, active: boolean) => void;
  onDelete: (id: string) => void;
  onStartEdit: (a: any) => void;
  onSaveEdit: (a: any) => void;
  onCancelEdit: () => void;
}) {
  const typeLabel = a.alert_type === 'above' ? '📈 Above' : a.alert_type === 'below' ? '📉 Below' : a.alert_type === 'pct_up' ? '📈 +%' : '📉 -%';
  const isPct = a.alert_type === 'pct_up' || a.alert_type === 'pct_down';
  const isEditing = editingId === a.id;
  const icon = ASSET_ICONS[a.asset_type] || '📊';

  const value = isPct
    ? `${a.target_pct}% from $${a.reference_price?.toLocaleString()}`
    : `$${a.target_price?.toLocaleString()}`;

  return (
    <div className={`p-2.5 rounded-lg border text-xs transition-all ${
      a.active ? 'border-border bg-background/50' : 'border-border/50 bg-muted/30 opacity-70'
    }`}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-sm">{icon}</span>
            <span className="font-semibold text-foreground font-mono">{a.symbol}</span>
            <span className="text-muted-foreground">{typeLabel}</span>
          </div>
          <div className="text-[10px] text-muted-foreground mt-0.5">{a.name}</div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {/* Enable/Disable toggle */}
          <button
            onClick={() => onToggle(a.id, a.active)}
            className={`px-2 py-1 rounded text-[9px] font-medium border transition-all ${
              a.active
                ? 'border-positive/30 text-positive bg-positive/10 hover:bg-positive/20'
                : 'border-border text-muted-foreground hover:text-foreground hover:border-primary/30'
            }`}
            title={a.active ? 'Pause alert' : 'Re-enable alert'}
          >
            {a.active ? '✓ On' : '○ Off'}
          </button>
          {/* Edit */}
          <button
            onClick={() => isEditing ? onCancelEdit() : onStartEdit(a)}
            className="px-1.5 py-1 rounded text-[10px] text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all"
            title="Edit target"
          >
            ✏️
          </button>
          {/* Delete */}
          <button
            onClick={() => onDelete(a.id)}
            className="px-1.5 py-1 rounded text-[10px] text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
            title="Delete alert"
          >
            🗑
          </button>
        </div>
      </div>

      {/* Value / Edit row */}
      {isEditing ? (
        <div className="flex items-center gap-2 mt-2">
          <span className="text-[10px] text-muted-foreground">{isPct ? 'Target %:' : 'Target $:'}</span>
          <input
            type="number"
            value={editValue}
            onChange={e => setEditValue(e.target.value)}
            className="flex-1 bg-background border border-primary/50 rounded px-2 py-1 text-xs font-mono text-foreground focus:outline-none"
            autoFocus
            onKeyDown={e => { if (e.key === 'Enter') onSaveEdit(a); if (e.key === 'Escape') onCancelEdit(); }}
          />
          <button onClick={() => onSaveEdit(a)} className="px-2 py-1 rounded text-[10px] font-semibold bg-primary text-primary-foreground hover:bg-primary/90">Save</button>
        </div>
      ) : (
        <div className="flex items-center gap-2 mt-1">
          <span className="font-mono text-foreground text-[11px]">{value}</span>
          {a.triggered_at && (
            <span className="text-[9px] text-positive">✅ Triggered {new Date(a.triggered_at).toLocaleDateString()}</span>
          )}
        </div>
      )}

      <div className="text-[9px] text-muted-foreground/60 mt-1">
        Created {new Date(a.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
      </div>
    </div>
  );
}

