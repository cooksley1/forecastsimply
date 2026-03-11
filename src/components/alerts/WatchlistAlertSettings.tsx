import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Bell, BellOff, TrendingUp, BarChart3 } from 'lucide-react';

interface AlertSettings {
  enabled: boolean;
  frequency: string;
  signal_change: boolean;
  forecast_deviation: boolean;
  deviation_threshold_pct: number;
}

const FREQUENCY_OPTIONS = [
  { value: 'hourly', label: 'Every hour', desc: 'Most responsive' },
  { value: '6h', label: 'Every 6 hours', desc: '4× per day' },
  { value: '12h', label: 'Every 12 hours', desc: '2× per day' },
  { value: 'daily', label: 'Once daily', desc: 'Morning summary' },
];

const THRESHOLD_OPTIONS = [5, 10, 15, 20, 25];

export default function WatchlistAlertSettings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<AlertSettings>({
    enabled: false,
    frequency: 'daily',
    signal_change: true,
    forecast_deviation: true,
    deviation_threshold_pct: 10,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (!user) return;
    supabase
      .from('watchlist_alert_settings')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setSettings({
            enabled: data.enabled,
            frequency: data.frequency,
            signal_change: data.signal_change,
            forecast_deviation: data.forecast_deviation,
            deviation_threshold_pct: Number(data.deviation_threshold_pct),
          });
        }
        setLoading(false);
      });
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    setMsg('');

    const { error } = await supabase
      .from('watchlist_alert_settings')
      .upsert(
        {
          user_id: user.id,
          ...settings,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      );

    setSaving(false);
    setMsg(error ? `Failed: ${error.message}` : 'Saved ✓');
    setTimeout(() => setMsg(''), 3000);
  };

  const update = <K extends keyof AlertSettings>(key: K, value: AlertSettings[K]) => {
    setSettings(s => ({ ...s, [key]: value }));
  };

  if (loading) {
    return <div className="text-xs text-muted-foreground animate-pulse py-4 text-center">Loading alert settings…</div>;
  }

  return (
    <div className="space-y-3">
      <div className="text-center space-y-1">
        <p className="text-xs text-foreground font-medium">📡 Watchlist Alerts</p>
        <p className="text-[10px] text-muted-foreground">
          Get notified when your watchlist assets have signal changes or price deviations from forecasts.
        </p>
      </div>

      {/* Enable toggle */}
      <div className="flex items-center justify-between bg-secondary/50 rounded-lg px-4 py-3">
        <div className="flex items-center gap-2">
          {settings.enabled ? (
            <Bell className="w-4 h-4 text-primary" />
          ) : (
            <BellOff className="w-4 h-4 text-muted-foreground" />
          )}
          <span className="text-xs font-medium text-foreground">
            {settings.enabled ? 'Alerts enabled' : 'Alerts disabled'}
          </span>
        </div>
        <button
          onClick={() => update('enabled', !settings.enabled)}
          className={`relative w-10 h-5 rounded-full transition-all ${
            settings.enabled ? 'bg-primary' : 'bg-border'
          }`}
        >
          <span
            className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
              settings.enabled ? 'translate-x-5' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>

      {settings.enabled && (
        <>
          {/* Frequency */}
          <div>
            <label className="text-[10px] text-muted-foreground font-mono uppercase block mb-1.5">
              Check Frequency
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {FREQUENCY_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => update('frequency', opt.value)}
                  className={`px-3 py-2 rounded-lg border text-left transition-all ${
                    settings.frequency === opt.value
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border text-muted-foreground hover:border-primary/30'
                  }`}
                >
                  <div className="text-[11px] font-medium">{opt.label}</div>
                  <div className="text-[9px] opacity-70">{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Alert types */}
          <div className="space-y-2">
            <label className="text-[10px] text-muted-foreground font-mono uppercase block">
              Alert Types
            </label>

            {/* Signal change */}
            <label className="flex items-start gap-3 px-3 py-2.5 rounded-lg bg-background border border-border hover:border-primary/30 transition-all cursor-pointer">
              <input
                type="checkbox"
                checked={settings.signal_change}
                onChange={e => update('signal_change', e.target.checked)}
                className="accent-primary w-3.5 h-3.5 mt-0.5"
              />
              <div className="flex-1">
                <div className="flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-primary" />
                  <span className="text-xs font-medium text-foreground">Signal Changes</span>
                </div>
                <p className="text-[9px] text-muted-foreground mt-0.5">
                  When a watchlist asset's signal flips (e.g. Hold → Buy, Buy → Sell)
                </p>
              </div>
            </label>

            {/* Forecast deviation */}
            <label className="flex items-start gap-3 px-3 py-2.5 rounded-lg bg-background border border-border hover:border-primary/30 transition-all cursor-pointer">
              <input
                type="checkbox"
                checked={settings.forecast_deviation}
                onChange={e => update('forecast_deviation', e.target.checked)}
                className="accent-primary w-3.5 h-3.5 mt-0.5"
              />
              <div className="flex-1">
                <div className="flex items-center gap-1.5">
                  <BarChart3 className="w-3.5 h-3.5 text-primary" />
                  <span className="text-xs font-medium text-foreground">Forecast Deviation</span>
                </div>
                <p className="text-[9px] text-muted-foreground mt-0.5">
                  When actual price diverges significantly from the forecasted price
                </p>
              </div>
            </label>

            {/* Threshold */}
            {settings.forecast_deviation && (
              <div className="ml-6 pl-3 border-l-2 border-primary/20">
                <label className="text-[10px] text-muted-foreground font-mono uppercase block mb-1">
                  Deviation Threshold
                </label>
                <div className="flex gap-1.5">
                  {THRESHOLD_OPTIONS.map(pct => (
                    <button
                      key={pct}
                      onClick={() => update('deviation_threshold_pct', pct)}
                      className={`px-2.5 py-1.5 rounded-md text-[10px] font-mono font-medium transition-all ${
                        settings.deviation_threshold_pct === pct
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-secondary/50 text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      ±{pct}%
                    </button>
                  ))}
                </div>
                <p className="text-[9px] text-muted-foreground mt-1">
                  Alert when price moves more than {settings.deviation_threshold_pct}% from forecast
                </p>
              </div>
            )}
          </div>

          {/* At least one type required */}
          {!settings.signal_change && !settings.forecast_deviation && (
            <p className="text-[10px] text-destructive text-center">
              Please enable at least one alert type
            </p>
          )}
        </>
      )}

      {/* Save button */}
      <button
        onClick={handleSave}
        disabled={saving || (settings.enabled && !settings.signal_change && !settings.forecast_deviation)}
        className="w-full px-3 py-2 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-all disabled:opacity-50"
      >
        {saving ? 'Saving…' : 'Save Alert Settings'}
      </button>

      {msg && (
        <p className={`text-[10px] text-center ${msg.includes('Failed') ? 'text-destructive' : 'text-primary'}`}>
          {msg}
        </p>
      )}
    </div>
  );
}
