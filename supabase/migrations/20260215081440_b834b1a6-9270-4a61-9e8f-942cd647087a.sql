
-- Fix 1: Newsletter subscribers - restrict SELECT to own records only
DROP POLICY IF EXISTS "Users can view own subscription" ON public.newsletter_subscribers;
CREATE POLICY "Users can view own subscription"
ON public.newsletter_subscribers
FOR SELECT
USING (auth.uid() = user_id);

-- Fix 2: Storage - restrict uploads to admins only
DROP POLICY IF EXISTS "Admins can upload email assets" ON storage.objects;
CREATE POLICY "Admins can upload email assets"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'email-assets' AND public.has_role(auth.uid(), 'admin'));
