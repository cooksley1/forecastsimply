
-- Table: watchlist alert preferences per user
CREATE TABLE public.watchlist_alert_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  enabled boolean NOT NULL DEFAULT false,
  frequency text NOT NULL DEFAULT 'daily',
  signal_change boolean NOT NULL DEFAULT true,
  forecast_deviation boolean NOT NULL DEFAULT true,
  deviation_threshold_pct numeric NOT NULL DEFAULT 10,
  last_checked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.watchlist_alert_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own watchlist alert settings"
  ON public.watchlist_alert_settings FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own watchlist alert settings"
  ON public.watchlist_alert_settings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own watchlist alert settings"
  ON public.watchlist_alert_settings FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Table: track last-known signal per watchlist item so we can detect changes
CREATE TABLE public.watchlist_alert_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  asset_id text NOT NULL,
  last_signal_label text,
  last_signal_score integer,
  last_price numeric,
  last_forecast_price numeric,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, asset_id)
);

ALTER TABLE public.watchlist_alert_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages watchlist alert state"
  ON public.watchlist_alert_state FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can view own alert state"
  ON public.watchlist_alert_state FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
