
ALTER TABLE public.tracked_picks DROP CONSTRAINT IF EXISTS tracked_picks_month_start_asset_type_key;
ALTER TABLE public.tracked_picks ADD CONSTRAINT tracked_picks_month_asset_tf_rank_key UNIQUE (month_start, asset_type, timeframe_days, rank);
