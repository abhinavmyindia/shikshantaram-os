-- ─── STEP 1: Ensure 'trial' (and 'revoked') are valid access_tier values ───
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'user_profiles_access_tier_check'
      AND pg_get_constraintdef(oid) LIKE '%trial%'
  ) THEN
    ALTER TABLE public.user_profiles
      DROP CONSTRAINT IF EXISTS user_profiles_access_tier_check;
    ALTER TABLE public.user_profiles
      ADD CONSTRAINT user_profiles_access_tier_check
      CHECK (access_tier IN ('trial','basic','premium','beta','revoked'));
  END IF;
END $$;

-- ─── STEP 2: Backfill access_tier = 'trial' for existing trial users ───
UPDATE public.user_profiles
SET access_tier = 'trial',
    updated_at  = NOW()
WHERE is_trial = true
  AND access_tier <> 'trial';

-- ─── STEP 3: Normalize credits to exactly 100 for all trial users ───
INSERT INTO public.user_credits (user_id, balance, free_credits_given, updated_at)
SELECT up.id, 100, 100, NOW()
FROM public.user_profiles up
WHERE up.is_trial = true
ON CONFLICT (user_id) DO UPDATE
  SET balance            = 100,
      free_credits_given = 100,
      updated_at         = NOW();

-- Log a correction transaction for each trial user
INSERT INTO public.credit_transactions (
  user_id, type, amount, balance_after, description, tool_module, call_type
)
SELECT
  up.id,
  'promo',
  100,
  100,
  'Trial access — 100 credits allocated (system correction)',
  'system',
  'trial_correction'
FROM public.user_profiles up
WHERE up.is_trial = true;

-- ─── STEP 4: Update starter credits trigger to skip trial users ───
CREATE OR REPLACE FUNCTION public.create_starter_credits()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Trial users get credits via the approve-trial-user edge function (100 total).
  -- Skip the standard 50-credit welcome allocation for them.
  IF NEW.access_tier = 'trial' OR NEW.is_trial = true THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.user_credits (
    user_id, balance, lifetime_topped, free_credits_given
  )
  VALUES (NEW.id, 50, 50, 50)
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.credit_transactions (
    user_id, type, amount, balance_after, description, tool_module, call_type
  ) VALUES (
    NEW.id, 'promo', 50, 50, 'Welcome bonus — 50 free starter credits', 'system', 'starter_allocation'
  );

  RETURN NEW;
END;
$$;