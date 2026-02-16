-- Fix overly permissive INSERT policy on newsletter_subscribers
-- Allow anyone to subscribe, but prevent user_id spoofing
DROP POLICY "Anyone can subscribe" ON public.newsletter_subscribers;

CREATE POLICY "Anyone can subscribe"
ON public.newsletter_subscribers
FOR INSERT
WITH CHECK (
  user_id IS NULL OR user_id = auth.uid()
);