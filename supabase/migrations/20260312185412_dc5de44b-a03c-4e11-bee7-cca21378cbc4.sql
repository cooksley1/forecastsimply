
SELECT cron.schedule(
  'cleanup-expired-shared-analyses',
  '0 3 * * *',
  $$DELETE FROM public.shared_analyses WHERE created_at < now() - interval '30 days'$$
);
