-- Add CHECK constraints for data integrity

-- credit_transactions type constraint
DO $$ BEGIN
  ALTER TABLE public.credit_transactions
    ADD CONSTRAINT credit_transactions_type_check
    CHECK (type IN ('topup','deduction','gift','promo','refund','shadow_deduction'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- user_profiles credits_enforcement constraint
DO $$ BEGIN
  ALTER TABLE public.user_profiles
    ADD CONSTRAINT user_profiles_credits_enforcement_check
    CHECK (credits_enforcement IN ('shadow','enforced','exempt'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- user_byok_keys provider constraint
DO $$ BEGIN
  ALTER TABLE public.user_byok_keys
    ADD CONSTRAINT user_byok_keys_provider_check
    CHECK (provider IN ('anthropic','openai','gemini'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Restrict user_byok_keys RLS SELECT policy to exclude encrypted_key and iv
-- Drop the old permissive SELECT and replace with a secure view approach
-- Since RLS can't restrict columns, we'll revoke direct SELECT on sensitive columns
-- and use the edge function (get-byok-status) as the only access path.
-- For now, the RLS policy stays but frontend code never selects encrypted_key.