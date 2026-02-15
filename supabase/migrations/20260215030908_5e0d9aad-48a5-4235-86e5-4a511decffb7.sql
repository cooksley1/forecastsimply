-- Remove API key columns from user_preferences to prevent credential exposure
ALTER TABLE public.user_preferences DROP COLUMN IF EXISTS cg_api_key;
ALTER TABLE public.user_preferences DROP COLUMN IF EXISTS av_api_key;
ALTER TABLE public.user_preferences DROP COLUMN IF EXISTS fmp_api_key;