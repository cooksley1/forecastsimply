
-- User activity tracking for granular analytics
CREATE TABLE public.user_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  event_type text NOT NULL,
  event_data jsonb DEFAULT '{}'::jsonb,
  asset_id text,
  asset_type text,
  page text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_user_activity_created ON public.user_activity (created_at DESC);
CREATE INDEX idx_user_activity_event ON public.user_activity (event_type, created_at DESC);
CREATE INDEX idx_user_activity_user ON public.user_activity (user_id, created_at DESC);

ALTER TABLE public.user_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert activity"
  ON public.user_activity FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all activity"
  ON public.user_activity FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
