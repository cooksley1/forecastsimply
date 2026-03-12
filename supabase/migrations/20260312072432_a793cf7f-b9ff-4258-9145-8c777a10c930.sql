
CREATE OR REPLACE FUNCTION public.get_cron_jobs()
RETURNS TABLE(jobname text, schedule text, command text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jobname::text, schedule::text, command::text
  FROM cron.job;
$$;
