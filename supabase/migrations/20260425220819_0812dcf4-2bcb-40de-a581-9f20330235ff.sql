-- Drop and recreate the constraint to include 'trial'
ALTER TABLE public.user_profiles
  DROP CONSTRAINT IF EXISTS user_profiles_access_tier_check;

ALTER TABLE public.user_profiles
  ADD CONSTRAINT user_profiles_access_tier_check
  CHECK (access_tier IN ('trial', 'basic', 'premium', 'beta', 'revoked'));

-- Update all existing trial users to have access_tier = 'trial'
UPDATE public.user_profiles
SET access_tier = 'trial'
WHERE is_trial_user = true
  AND trial_ends_at IS NOT NULL;