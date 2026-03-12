
CREATE TABLE public.shared_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id text NOT NULL,
  symbol text NOT NULL,
  name text NOT NULL,
  asset_type text NOT NULL,
  price numeric NOT NULL,
  signal_score integer,
  signal_label text,
  confidence integer,
  market_phase text,
  forecast_return_pct numeric,
  target_price numeric,
  stop_loss numeric,
  analysis_summary text,
  shared_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.shared_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view shared analyses"
  ON public.shared_analyses FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Authenticated users can create shared analyses"
  ON public.shared_analyses FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = shared_by);

CREATE POLICY "Anon users can create shared analyses"
  ON public.shared_analyses FOR INSERT
  TO anon
  WITH CHECK (shared_by IS NULL);
