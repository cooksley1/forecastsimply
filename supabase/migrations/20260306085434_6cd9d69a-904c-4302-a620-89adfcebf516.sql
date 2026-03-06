
-- Tracked monthly picks - locked on the 1st of each month
CREATE TABLE public.tracked_picks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  month_start date NOT NULL,
  asset_type text NOT NULL CHECK (asset_type IN ('crypto', 'stocks', 'etfs')),
  asset_id text NOT NULL,
  symbol text NOT NULL,
  name text NOT NULL,
  entry_price numeric NOT NULL,
  signal_score integer NOT NULL DEFAULT 0,
  signal_label text NOT NULL DEFAULT 'Hold',
  confidence integer NOT NULL DEFAULT 50,
  target_price numeric,
  stop_loss numeric,
  reasoning text,
  forecast_ensemble jsonb DEFAULT '[]'::jsonb,
  forecast_linear jsonb DEFAULT '[]'::jsonb,
  forecast_holt jsonb DEFAULT '[]'::jsonb,
  forecast_ema_momentum jsonb DEFAULT '[]'::jsonb,
  forecast_monte_carlo jsonb DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  final_price numeric,
  final_return_pct numeric,
  case_study_text text,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (month_start, asset_type)
);

-- Daily price snapshots for tracked picks
CREATE TABLE public.pick_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pick_id uuid NOT NULL REFERENCES public.tracked_picks(id) ON DELETE CASCADE,
  snapshot_date date NOT NULL,
  price numeric NOT NULL,
  change_from_entry_pct numeric NOT NULL DEFAULT 0,
  forecast_ensemble_price numeric,
  forecast_linear_price numeric,
  forecast_holt_price numeric,
  forecast_ema_price numeric,
  forecast_monte_carlo_price numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (pick_id, snapshot_date)
);

-- Enable RLS
ALTER TABLE public.tracked_picks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pick_snapshots ENABLE ROW LEVEL SECURITY;

-- Public read access (proof of performance is public-facing)
CREATE POLICY "Anyone can view tracked picks"
  ON public.tracked_picks FOR SELECT
  USING (true);

CREATE POLICY "Anyone can view pick snapshots"
  ON public.pick_snapshots FOR SELECT
  USING (true);

-- Only service role / edge functions can insert/update (no user writes)
CREATE POLICY "Service role can manage tracked picks"
  ON public.tracked_picks FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role can manage pick snapshots"
  ON public.pick_snapshots FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
