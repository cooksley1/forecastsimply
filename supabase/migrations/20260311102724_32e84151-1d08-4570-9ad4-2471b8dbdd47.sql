
-- =============================================
-- FIX ALL RESTRICTIVE POLICIES → PERMISSIVE
-- =============================================

-- daily_analysis_cache
DROP POLICY IF EXISTS "Anyone can read analysis cache" ON public.daily_analysis_cache;
CREATE POLICY "Anyone can read analysis cache" ON public.daily_analysis_cache FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Service role can manage analysis cache" ON public.daily_analysis_cache;
CREATE POLICY "Service role can manage analysis cache" ON public.daily_analysis_cache FOR ALL TO service_role USING (true) WITH CHECK (true);

-- user_roles
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- tracked_picks
DROP POLICY IF EXISTS "Anyone can view tracked picks" ON public.tracked_picks;
CREATE POLICY "Anyone can view tracked picks" ON public.tracked_picks FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Service role can manage tracked picks" ON public.tracked_picks;
CREATE POLICY "Service role can manage tracked picks" ON public.tracked_picks FOR ALL TO service_role USING (true) WITH CHECK (true);

-- pick_snapshots
DROP POLICY IF EXISTS "Anyone can view pick snapshots" ON public.pick_snapshots;
CREATE POLICY "Anyone can view pick snapshots" ON public.pick_snapshots FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Service role can manage pick snapshots" ON public.pick_snapshots;
CREATE POLICY "Service role can manage pick snapshots" ON public.pick_snapshots FOR ALL TO service_role USING (true) WITH CHECK (true);

-- app_config
DROP POLICY IF EXISTS "Anyone can read app config" ON public.app_config;
CREATE POLICY "Anyone can read app config" ON public.app_config FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Admins can manage app config" ON public.app_config;
CREATE POLICY "Admins can manage app config" ON public.app_config FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- unsupported_coins
DROP POLICY IF EXISTS "Anyone can read unsupported coins" ON public.unsupported_coins;
CREATE POLICY "Anyone can read unsupported coins" ON public.unsupported_coins FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Admins can manage unsupported coins" ON public.unsupported_coins;
CREATE POLICY "Admins can manage unsupported coins" ON public.unsupported_coins FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- profiles
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT TO public USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO public WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO public USING (auth.uid() = user_id);

-- user_preferences
DROP POLICY IF EXISTS "Users can view own prefs" ON public.user_preferences;
CREATE POLICY "Users can view own prefs" ON public.user_preferences FOR SELECT TO public USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own prefs" ON public.user_preferences;
CREATE POLICY "Users can insert own prefs" ON public.user_preferences FOR INSERT TO public WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own prefs" ON public.user_preferences;
CREATE POLICY "Users can update own prefs" ON public.user_preferences FOR UPDATE TO public USING (auth.uid() = user_id);

-- watchlist_items
DROP POLICY IF EXISTS "Users can manage own items" ON public.watchlist_items;
CREATE POLICY "Users can manage own items" ON public.watchlist_items FOR ALL TO public USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- watchlist_groups
DROP POLICY IF EXISTS "Users can manage own groups" ON public.watchlist_groups;
CREATE POLICY "Users can manage own groups" ON public.watchlist_groups FOR ALL TO public USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- analysis_history
DROP POLICY IF EXISTS "Users can manage own history" ON public.analysis_history;
CREATE POLICY "Users can manage own history" ON public.analysis_history FOR ALL TO public USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- login_history
DROP POLICY IF EXISTS "Users can view own login history" ON public.login_history;
CREATE POLICY "Users can view own login history" ON public.login_history FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own login" ON public.login_history;
CREATE POLICY "Users can insert own login" ON public.login_history FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all login history" ON public.login_history;
CREATE POLICY "Admins can view all login history" ON public.login_history FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- newsletter_subscribers
DROP POLICY IF EXISTS "Anyone can subscribe" ON public.newsletter_subscribers;
CREATE POLICY "Anyone can subscribe" ON public.newsletter_subscribers FOR INSERT TO public WITH CHECK ((user_id IS NULL) OR (user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can view own subscription" ON public.newsletter_subscribers;
CREATE POLICY "Users can view own subscription" ON public.newsletter_subscribers FOR SELECT TO authenticated USING ((auth.uid() = user_id) OR ((auth.jwt() ->> 'email'::text) = email));

DROP POLICY IF EXISTS "Admins can view all subscriptions" ON public.newsletter_subscribers;
CREATE POLICY "Admins can view all subscriptions" ON public.newsletter_subscribers FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Authenticated users can update own subscription" ON public.newsletter_subscribers;
CREATE POLICY "Authenticated users can update own subscription" ON public.newsletter_subscribers FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- contact_messages
DROP POLICY IF EXISTS "Anyone can submit contact messages" ON public.contact_messages;
CREATE POLICY "Anyone can submit contact messages" ON public.contact_messages FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can view contact messages" ON public.contact_messages;
CREATE POLICY "Admins can view contact messages" ON public.contact_messages FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can update contact messages" ON public.contact_messages;
CREATE POLICY "Admins can update contact messages" ON public.contact_messages FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can delete contact messages" ON public.contact_messages;
CREATE POLICY "Admins can delete contact messages" ON public.contact_messages FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- market_digests
DROP POLICY IF EXISTS "Admins can manage digests" ON public.market_digests;
CREATE POLICY "Admins can manage digests" ON public.market_digests FOR ALL TO public USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Authenticated users can view approved digests" ON public.market_digests;
CREATE POLICY "Authenticated users can view approved digests" ON public.market_digests FOR SELECT TO public USING ((status = 'approved'::text) OR has_role(auth.uid(), 'admin'::app_role));

-- price_alerts
DROP POLICY IF EXISTS "Users can manage own alerts" ON public.price_alerts;
CREATE POLICY "Users can manage own alerts" ON public.price_alerts FOR ALL TO public USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- push_subscriptions
DROP POLICY IF EXISTS "Users can manage own push subscriptions" ON public.push_subscriptions;
CREATE POLICY "Users can manage own push subscriptions" ON public.push_subscriptions FOR ALL TO public USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- watchlist_alert_settings
DROP POLICY IF EXISTS "Users can view own watchlist alert settings" ON public.watchlist_alert_settings;
CREATE POLICY "Users can view own watchlist alert settings" ON public.watchlist_alert_settings FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own watchlist alert settings" ON public.watchlist_alert_settings;
CREATE POLICY "Users can insert own watchlist alert settings" ON public.watchlist_alert_settings FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own watchlist alert settings" ON public.watchlist_alert_settings;
CREATE POLICY "Users can update own watchlist alert settings" ON public.watchlist_alert_settings FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- watchlist_alert_state
DROP POLICY IF EXISTS "Users can view own alert state" ON public.watchlist_alert_state;
CREATE POLICY "Users can view own alert state" ON public.watchlist_alert_state FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role manages watchlist alert state" ON public.watchlist_alert_state;
CREATE POLICY "Service role manages watchlist alert state" ON public.watchlist_alert_state FOR ALL TO service_role USING (true) WITH CHECK (true);
