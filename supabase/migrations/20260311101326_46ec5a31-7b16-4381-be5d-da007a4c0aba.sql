
-- Drop the restrictive SELECT policy and recreate as PERMISSIVE
DROP POLICY IF EXISTS "Anyone can read analysis cache" ON public.daily_analysis_cache;
CREATE POLICY "Anyone can read analysis cache"
  ON public.daily_analysis_cache
  FOR SELECT
  TO public
  USING (true);
