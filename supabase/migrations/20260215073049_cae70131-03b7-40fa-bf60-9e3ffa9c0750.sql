
-- Create storage bucket for email assets
INSERT INTO storage.buckets (id, name, public) VALUES ('email-assets', 'email-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Public read policy
CREATE POLICY "Email assets are publicly accessible"
ON storage.objects
FOR SELECT
USING (bucket_id = 'email-assets');

-- Admin upload policy
CREATE POLICY "Admins can upload email assets"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'email-assets');

-- Enable pg_cron and pg_net extensions for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
