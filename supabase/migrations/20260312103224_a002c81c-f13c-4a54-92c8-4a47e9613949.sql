CREATE OR REPLACE FUNCTION public.get_cache_stats()
RETURNS TABLE(asset_type text, exchange text, timeframe_days int, count bigint, newest timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    d.asset_type::text,
    COALESCE(d.exchange, 'global')::text,
    d.timeframe_days::int,
    COUNT(*)::bigint,
    MAX(d.analyzed_at)::timestamptz as newest
  FROM public.daily_analysis_cache d
  GROUP BY d.asset_type, d.exchange, d.timeframe_days
  ORDER BY d.asset_type, d.timeframe_days;
$$;