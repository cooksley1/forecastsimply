
-- Daily pre-computed analysis cache for all screened assets
CREATE TABLE public.daily_analysis_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id text NOT NULL,
  symbol text NOT NULL,
  name text NOT NULL,
  asset_type text NOT NULL,
  exchange text,
  price numeric NOT NULL DEFAULT 0,
  change_pct numeric DEFAULT 0,
  dividend_yield numeric DEFAULT 0,
  signal_score integer DEFAULT 0,
  signal_label text DEFAULT 'Hold',
  confidence integer DEFAULT 50,
  market_phase text,
  target_price numeric,
  stop_loss numeric,
  forecast_return_pct numeric DEFAULT 0,
  rsi numeric,
  sma20 numeric,
  sma50 numeric,
  macd_histogram numeric,
  bb_position numeric,
  stochastic_k numeric,
  analyzed_at timestamptz NOT NULL DEFAULT now(),
  timeframe_days integer NOT NULL DEFAULT 90,
  UNIQUE(asset_id, timeframe_days)
);

-- Index for fast lookups by asset type and exchange
CREATE INDEX idx_dac_asset_type_exchange ON public.daily_analysis_cache(asset_type, exchange);
CREATE INDEX idx_dac_signal ON public.daily_analysis_cache(signal_label, signal_score DESC);
CREATE INDEX idx_dac_analyzed_at ON public.daily_analysis_cache(analyzed_at);

-- RLS: Anyone can read (public data), only service role can write
ALTER TABLE public.daily_analysis_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read analysis cache"
ON public.daily_analysis_cache
FOR SELECT
TO public
USING (true);

CREATE POLICY "Service role can manage analysis cache"
ON public.daily_analysis_cache
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
