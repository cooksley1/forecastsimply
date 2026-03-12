ALTER TABLE public.tracked_picks ADD COLUMN IF NOT EXISTS timeframe_days integer NOT NULL DEFAULT 30;
ALTER TABLE public.tracked_picks ADD COLUMN IF NOT EXISTS rank integer NOT NULL DEFAULT 1;