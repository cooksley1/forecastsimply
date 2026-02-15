
-- Newsletter subscribers table
CREATE TABLE public.newsletter_subscribers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  user_id UUID,
  preferences JSONB DEFAULT '{"crypto": true, "stocks": true, "etfs": true, "forex": true}'::jsonb,
  subscribed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  unsubscribed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;

-- Anyone can subscribe (insert their email)
CREATE POLICY "Anyone can subscribe"
ON public.newsletter_subscribers
FOR INSERT
WITH CHECK (true);

-- Users can view their own subscription
CREATE POLICY "Users can view own subscription"
ON public.newsletter_subscribers
FOR SELECT
USING (email IS NOT NULL);

-- Users can update their own subscription (unsubscribe)
CREATE POLICY "Authenticated users can update own subscription"
ON public.newsletter_subscribers
FOR UPDATE
USING (auth.uid() = user_id);

-- Index for fast email lookup
CREATE INDEX idx_newsletter_email ON public.newsletter_subscribers(email);
