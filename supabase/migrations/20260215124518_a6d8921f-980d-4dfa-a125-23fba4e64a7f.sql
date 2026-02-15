
-- Fix login_history: Drop restrictive SELECT policies and recreate as permissive
DROP POLICY IF EXISTS "Users can view own login history" ON public.login_history;
DROP POLICY IF EXISTS "Admins can view all login history" ON public.login_history;
DROP POLICY IF EXISTS "Users can insert own login" ON public.login_history;

-- Recreate as permissive policies (default)
CREATE POLICY "Users can view own login history"
ON public.login_history FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all login history"
ON public.login_history FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can insert own login"
ON public.login_history FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Fix newsletter_subscribers: Drop restrictive policies and recreate as permissive
DROP POLICY IF EXISTS "Anyone can subscribe" ON public.newsletter_subscribers;
DROP POLICY IF EXISTS "Users can view own subscription" ON public.newsletter_subscribers;
DROP POLICY IF EXISTS "Authenticated users can update own subscription" ON public.newsletter_subscribers;

-- Recreate as permissive policies
CREATE POLICY "Anyone can subscribe"
ON public.newsletter_subscribers FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users can view own subscription"
ON public.newsletter_subscribers FOR SELECT TO authenticated
USING (auth.uid() = user_id OR (auth.jwt()->>'email')::text = email);

CREATE POLICY "Admins can view all subscriptions"
ON public.newsletter_subscribers FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can update own subscription"
ON public.newsletter_subscribers FOR UPDATE TO authenticated
USING (auth.uid() = user_id);
