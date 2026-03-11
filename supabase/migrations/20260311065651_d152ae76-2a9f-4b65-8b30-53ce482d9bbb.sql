
CREATE TABLE public.unsupported_coins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coin_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  reason TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.unsupported_coins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read unsupported coins"
  ON public.unsupported_coins FOR SELECT TO public
  USING (true);

CREATE POLICY "Admins can manage unsupported coins"
  ON public.unsupported_coins FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Seed with the previously hardcoded entries
INSERT INTO public.unsupported_coins (coin_id, name, reason) VALUES
  ('pi-network', 'Pi Network (PI)', 'Pi Network is not listed on any of our supported free data sources (CoinGecko, CoinPaprika, Yahoo Finance).'),
  ('world-liberty-financial', 'World Liberty Financial (WLFI)', 'World Liberty Financial is not available on supported free data APIs.'),
  ('pax-gold', 'PAX Gold (PAXG)', 'PAX Gold historical data is unavailable on our free data sources. Try searching for "paxos-standard" or "tether-gold" instead.');
