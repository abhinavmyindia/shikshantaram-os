-- STEP 1: Fix access_tier constraint
ALTER TABLE public.user_profiles
  DROP CONSTRAINT IF EXISTS user_profiles_access_tier_check;

ALTER TABLE public.user_profiles
  ADD CONSTRAINT user_profiles_access_tier_check
  CHECK (access_tier IN ('trial', 'basic', 'premium', 'beta', 'revoked'));

-- STEP 3: Ensure phone column exists on user_profiles (already exists, IF NOT EXISTS is safe)
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS phone TEXT;

-- STEP 4: Standardise trial column naming + add new trial cols
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'user_profiles'
      AND column_name = 'is_trial_user'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'user_profiles'
      AND column_name = 'is_trial'
  ) THEN
    ALTER TABLE public.user_profiles
      RENAME COLUMN is_trial_user TO is_trial;
  END IF;
END $$;

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS is_trial          BOOLEAN     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS trial_ends_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS trial_started_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS trial_request_id  UUID REFERENCES public.trial_requests(id),
  ADD COLUMN IF NOT EXISTS trial_source_tier TEXT;

-- Add CHECK constraint for trial_source_tier (drop first if exists)
ALTER TABLE public.user_profiles
  DROP CONSTRAINT IF EXISTS user_profiles_trial_source_tier_check;
ALTER TABLE public.user_profiles
  ADD CONSTRAINT user_profiles_trial_source_tier_check
  CHECK (trial_source_tier IS NULL OR trial_source_tier IN ('basic', 'premium', 'beta'));

-- STEP 2: Fix starter credits trigger — 50 for trial, 500 for paid tiers
CREATE OR REPLACE FUNCTION public.create_starter_credits()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_credits INTEGER;
  v_desc    TEXT;
BEGIN
  IF NEW.access_tier = 'trial' THEN
    v_credits := 50;
    v_desc    := 'Trial starter credits — 50 of 100 total';
  ELSE
    v_credits := 500;
    v_desc    := 'Welcome bonus — 500 free starter credits';
  END IF;

  INSERT INTO public.user_credits (
    user_id, balance, lifetime_topped, free_credits_given
  )
  VALUES (NEW.id, v_credits, v_credits, v_credits)
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.credit_transactions (
    user_id, type, amount, balance_after, description, tool_module, call_type
  )
  VALUES (
    NEW.id, 'promo', v_credits, v_credits, v_desc, 'system', 'starter_allocation'
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_starter_credits ON public.user_profiles;
CREATE TRIGGER trg_starter_credits
  AFTER INSERT ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.create_starter_credits();

-- STEP 5: Refresh protect_sensitive_profile_fields trigger using new is_trial col
CREATE OR REPLACE FUNCTION public.protect_sensitive_profile_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Service role (auth.uid() is NULL) and team members bypass protection
  IF auth.uid() IS NULL OR is_team_member(auth.uid()) THEN
    RETURN NEW;
  END IF;

  IF NEW.access_tier IS DISTINCT FROM OLD.access_tier THEN
    RAISE EXCEPTION 'Permission denied: access_tier can only be changed by admins.';
  END IF;
  IF NEW.payment_status IS DISTINCT FROM OLD.payment_status THEN
    RAISE EXCEPTION 'Permission denied: payment_status can only be changed by admins.';
  END IF;
  IF NEW.payment_amount IS DISTINCT FROM OLD.payment_amount THEN
    RAISE EXCEPTION 'Permission denied: payment_amount can only be changed by admins.';
  END IF;
  IF NEW.credits_enforcement IS DISTINCT FROM OLD.credits_enforcement THEN
    RAISE EXCEPTION 'Permission denied: credits_enforcement can only be changed by admins.';
  END IF;
  IF NEW.is_beta_user IS DISTINCT FROM OLD.is_beta_user THEN
    RAISE EXCEPTION 'Permission denied: is_beta_user can only be changed by admins.';
  END IF;
  IF NEW.added_by IS DISTINCT FROM OLD.added_by THEN
    RAISE EXCEPTION 'Permission denied: added_by can only be changed by admins.';
  END IF;
  IF NEW.is_trial IS DISTINCT FROM OLD.is_trial THEN
    RAISE EXCEPTION 'Permission denied: is_trial can only be changed by admins.';
  END IF;
  IF NEW.trial_ends_at IS DISTINCT FROM OLD.trial_ends_at THEN
    RAISE EXCEPTION 'Permission denied: trial_ends_at can only be changed by admins.';
  END IF;
  IF NEW.trial_request_id IS DISTINCT FROM OLD.trial_request_id THEN
    RAISE EXCEPTION 'Permission denied: trial_request_id can only be changed by admins.';
  END IF;
  IF NEW.trial_source_tier IS DISTINCT FROM OLD.trial_source_tier THEN
    RAISE EXCEPTION 'Permission denied: trial_source_tier can only be changed by admins.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_sensitive_profile_fields ON public.user_profiles;
CREATE TRIGGER trg_protect_sensitive_profile_fields
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_sensitive_profile_fields();

-- STEP 6: Refresh handle_new_user — copy phone + access_tier from auth metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_profiles (
    id, full_name, phone, access_tier, credits_enforcement, updated_at
  )
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      split_part(NEW.email, '@', 1)
    ),
    COALESCE(
      NEW.raw_user_meta_data->>'phone',
      NEW.raw_user_meta_data->>'phone_number',
      NULL
    ),
    COALESCE(NEW.raw_user_meta_data->>'access_tier', 'basic'),
    'shadow',
    NOW()
  )
  ON CONFLICT (id) DO UPDATE
    SET
      full_name  = COALESCE(EXCLUDED.full_name, public.user_profiles.full_name),
      phone      = COALESCE(EXCLUDED.phone, public.user_profiles.phone),
      updated_at = NOW();

  RETURN NEW;
END;
$$;

-- STEP 7: Fix existing trial users
UPDATE public.user_profiles
SET access_tier = 'trial'
WHERE is_trial = true
  AND access_tier <> 'trial';

-- STEP 8: signup_requests phone
ALTER TABLE public.signup_requests
  ADD COLUMN IF NOT EXISTS phone TEXT;