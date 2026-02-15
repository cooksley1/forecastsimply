
-- Login history table to track user sign-ins
CREATE TABLE public.login_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  signed_in_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ip_address TEXT,
  user_agent TEXT,
  city TEXT,
  country TEXT
);

-- Enable RLS
ALTER TABLE public.login_history ENABLE ROW LEVEL SECURITY;

-- Users can insert their own login records
CREATE POLICY "Users can insert own login" 
ON public.login_history 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Users can view their own login history
CREATE POLICY "Users can view own login history" 
ON public.login_history 
FOR SELECT 
USING (auth.uid() = user_id);

-- Admins can view all login history
CREATE POLICY "Admins can view all login history" 
ON public.login_history 
FOR SELECT 
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Index for fast lookups
CREATE INDEX idx_login_history_user_id ON public.login_history(user_id, signed_in_at DESC);
