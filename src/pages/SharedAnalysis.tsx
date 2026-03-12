import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useTheme } from '@/contexts/ThemeContext';
import SEO from '@/components/SEO';
import logoStackedDark from '@/assets/logo-stacked.svg';
import logoStackedLight from '@/assets/logo-stacked-light.svg';

interface SharedData {
  id: string;
  asset_id: string;
  symbol: string;
  name: string;
  asset_type: string;
  price: number;
  signal_score: number | null;
  signal_label: string | null;
  confidence: number | null;
  market_phase: string | null;
  forecast_return_pct: number | null;
  target_price: number | null;
  stop_loss: number | null;
  analysis_summary: string | null;
  created_at: string;
}

const signalColor = (label: string | null) => {
  if (!label) return 'text-muted-foreground';
  const l = label.toLowerCase();
  if (l.includes('strong buy')) return 'text-positive';
  if (l.includes('buy')) return 'text-positive/80';
  if (l.includes('strong sell')) return 'text-destructive';
  if (l.includes('sell')) return 'text-destructive/80';
  return 'text-warning';
};

export default function SharedAnalysis() {
  const { id } = useParams<{ id: string }>();
  const { theme } = useTheme();
  const [data, setData] = useState<SharedData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const logo = theme === 'dark' ? logoStackedDark : logoStackedLight;

  useEffect(() => {
    if (!id) { setNotFound(true); setLoading(false); return; }
    (async () => {
      const { data: row, error } = await supabase
        .from('shared_analyses')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (error || !row) { setNotFound(true); } else { setData(row as SharedData); }
      setLoading(false);
    })();
  }, [id]);

  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="animate-pulse text-muted-foreground text-sm">Loading analysis…</div>
    </div>
  );

  if (notFound || !data) return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 p-6">
      <h1 className="text-lg font-semibold text-foreground">Analysis not found</h1>
      <p className="text-sm text-muted-foreground">This shared analysis may have expired or doesn't exist.</p>
      <Link to="/" className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">
        Open ForecastSimply
      </Link>
    </div>
  );

  const sharedDate = new Date(data.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <div className="min-h-screen bg-background">
      <SEO title={`${data.name} (${data.symbol}) Analysis — ForecastSimply`} description={`${data.signal_label} signal for ${data.name}. Confidence ${data.confidence}%.`} />

      <div className="max-w-lg mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Link to="/">
            <img src={logo} alt="ForecastSimply" className="h-8" style={{ transform: 'scale(1.5)', transformOrigin: 'left center' }} />
          </Link>
          <span className="text-[10px] text-muted-foreground">{sharedDate}</span>
        </div>

        {/* Analysis Card */}
        <div className="rounded-xl border border-border bg-card p-5 space-y-4 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-bold text-foreground">{data.name}</h1>
              <span className="text-xs text-muted-foreground">{data.symbol} · {data.asset_type.toUpperCase()}</span>
            </div>
            <div className="text-right">
              <div className="text-lg font-mono font-bold text-foreground">
                ${data.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {data.signal_label && (
              <div className="rounded-lg bg-muted/30 border border-border/50 p-3">
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Signal</div>
                <div className={`text-sm font-bold ${signalColor(data.signal_label)}`}>{data.signal_label}</div>
                {data.signal_score != null && <div className="text-[10px] text-muted-foreground">Score: {data.signal_score}</div>}
              </div>
            )}
            {data.confidence != null && (
              <div className="rounded-lg bg-muted/30 border border-border/50 p-3">
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Confidence</div>
                <div className="text-sm font-bold text-foreground">{data.confidence}%</div>
              </div>
            )}
            {data.forecast_return_pct != null && (
              <div className="rounded-lg bg-muted/30 border border-border/50 p-3">
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Forecast Return</div>
                <div className={`text-sm font-bold ${data.forecast_return_pct >= 0 ? 'text-positive' : 'text-destructive'}`}>
                  {data.forecast_return_pct >= 0 ? '+' : ''}{data.forecast_return_pct.toFixed(1)}%
                </div>
              </div>
            )}
            {data.market_phase && (
              <div className="rounded-lg bg-muted/30 border border-border/50 p-3">
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Market Phase</div>
                <div className="text-sm font-bold text-foreground">{data.market_phase}</div>
              </div>
            )}
          </div>

          {(data.target_price || data.stop_loss) && (
            <div className="flex items-center gap-3 text-xs">
              {data.target_price && (
                <span className="text-positive">🎯 Target: ${data.target_price.toLocaleString(undefined, { maximumFractionDigits: 4 })}</span>
              )}
              {data.stop_loss && (
                <span className="text-destructive">🛑 Stop: ${data.stop_loss.toLocaleString(undefined, { maximumFractionDigits: 4 })}</span>
              )}
            </div>
          )}

          {data.analysis_summary && (
            <div className="border-t border-border/50 pt-3">
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">Analysis Summary</div>
              <p className="text-xs text-foreground/80 leading-relaxed whitespace-pre-line">{data.analysis_summary?.replace(/\*\*/g, '')}</p>
            </div>
          )}
        </div>

        {/* CTA */}
        <div className="space-y-3 text-center">
          <Link
            to={`/?asset=${encodeURIComponent(data.asset_id)}&type=${data.asset_type}`}
            className="block w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity"
          >
            Run Live Analysis on {data.symbol}
          </Link>
          <Link to="/" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
            Explore ForecastSimply — Free Technical Analysis & Forecasting
          </Link>
        </div>

        <p className="text-[9px] text-muted-foreground text-center">
          This is a snapshot shared at a point in time. Market conditions change — always run fresh analysis before making decisions.
        </p>
      </div>
    </div>
  );
}
