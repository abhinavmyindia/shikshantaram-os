CREATE OR REPLACE FUNCTION public.expire_trial_users()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Step 1: Mark trial_requests as expired
  UPDATE public.trial_requests
  SET status = 'expired', updated_at = NOW()
  WHERE status = 'approved'
    AND access_ends_at < NOW();

  -- Step 2: Touch user_profiles for expired trial users so updated_at reflects expiry.
  -- We intentionally keep is_trial_user = true; the popup fires from trial_ends_at < NOW().
  -- is_trial_user is only flipped to false on a real upgrade.
  UPDATE public.user_profiles
  SET updated_at = NOW()
  WHERE is_trial_user = true
    AND trial_ends_at IS NOT NULL
    AND trial_ends_at < NOW();
END;
$$;