-- Ensure cron jobs exist for daily analysis (idempotent)
-- These populate the daily_analysis_cache table used by Best Pick Finder

-- Unschedule if already exists (safe to call even if not present)
DO $$ BEGIN
  PERFORM cron.unschedule('daily-analysis-stocks-asx-90');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  PERFORM cron.unschedule('daily-analysis-crypto-90');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  PERFORM cron.unschedule('daily-analysis-stocks-asx-30');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  PERFORM cron.unschedule('daily-analysis-stocks-us-90');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Recreate cron jobs
SELECT cron.schedule(
  'daily-analysis-stocks-asx-90',
  '0 16 * * *',
  $$
  SELECT net.http_post(
    url := 'https://xusgljsdrntbqzxkmlcu.supabase.co/functions/v1/run-daily-analysis?asset_type=stocks&exchange=ASX&offset=0&batch_size=40&timeframe=90',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh1c2dsanNkcm50YnF6eGttbGN1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzExMTkxODAsImV4cCI6MjA4NjY5NTE4MH0.dx5fu2Z1W4HUxw8WzB1RuF5EN9Cg2TIBgakkJn5b0c0"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

SELECT cron.schedule(
  'daily-analysis-crypto-90',
  '30 16 * * *',
  $$
  SELECT net.http_post(
    url := 'https://xusgljsdrntbqzxkmlcu.supabase.co/functions/v1/run-daily-analysis?asset_type=crypto&offset=0&batch_size=40&timeframe=90',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh1c2dsanNkcm50YnF6eGttbGN1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzExMTkxODAsImV4cCI6MjA4NjY5NTE4MH0.dx5fu2Z1W4HUxw8WzB1RuF5EN9Cg2TIBgakkJn5b0c0"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

SELECT cron.schedule(
  'daily-analysis-stocks-asx-30',
  '0 17 * * *',
  $$
  SELECT net.http_post(
    url := 'https://xusgljsdrntbqzxkmlcu.supabase.co/functions/v1/run-daily-analysis?asset_type=stocks&exchange=ASX&offset=0&batch_size=40&timeframe=30',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh1c2dsanNkcm50YnF6eGttbGN1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzExMTkxODAsImV4cCI6MjA4NjY5NTE4MH0.dx5fu2Z1W4HUxw8WzB1RuF5EN9Cg2TIBgakkJn5b0c0"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

SELECT cron.schedule(
  'daily-analysis-stocks-us-90',
  '30 17 * * *',
  $$
  SELECT net.http_post(
    url := 'https://xusgljsdrntbqzxkmlcu.supabase.co/functions/v1/run-daily-analysis?asset_type=stocks&exchange=US&offset=0&batch_size=40&timeframe=90',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh1c2dsanNkcm50YnF6eGttbGN1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzExMTkxODAsImV4cCI6MjA4NjY5NTE4MH0.dx5fu2Z1W4HUxw8WzB1RuF5EN9Cg2TIBgakkJn5b0c0"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);