
-- Table to store admin-curated digests per asset type
CREATE TABLE public.market_digests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  asset_type TEXT NOT NULL CHECK (asset_type IN ('crypto', 'stocks', 'etfs', 'forex')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'paused')),
  greeting TEXT,
  market_summary TEXT,
  insights JSONB DEFAULT '[]'::jsonb,
  recommendations JSONB DEFAULT '[]'::jsonb,
  watchlist_alerts JSONB DEFAULT '[]'::jsonb,
  generated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  approved_at TIMESTAMP WITH TIME ZONE,
  approved_by UUID,
  created_by UUID NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (asset_type, status) -- only one approved digest per asset type at a time handled in app logic
);

-- Enable RLS
ALTER TABLE public.market_digests ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read approved digests
CREATE POLICY "Authenticated users can view approved digests"
ON public.market_digests
FOR SELECT
USING (status = 'approved' OR has_role(auth.uid(), 'admin'));

-- Only admins can insert/update/delete
CREATE POLICY "Admins can manage digests"
ON public.market_digests
FOR ALL
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Remove the unique constraint since we want history, add index instead
ALTER TABLE public.market_digests DROP CONSTRAINT market_digests_asset_type_status_key;
CREATE INDEX idx_market_digests_type_status ON public.market_digests (asset_type, status);

-- Trigger for updated_at
CREATE TRIGGER update_market_digests_updated_at
BEFORE UPDATE ON public.market_digests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
