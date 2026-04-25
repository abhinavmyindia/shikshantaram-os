-- ─── 1. trial_requests table ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.trial_requests (
  id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name             TEXT NOT NULL,
  email                 TEXT NOT NULL,
  phone                 TEXT NOT NULL,
  ip_address            TEXT,
  user_agent            TEXT,
  otp_code              TEXT,
  otp_verified          BOOLEAN DEFAULT false,
  otp_expires_at        TIMESTAMPTZ,
  status                TEXT NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending','approved','rejected','expired','upgraded')),
  access_duration_days  INTEGER,
  access_starts_at      TIMESTAMPTZ,
  access_ends_at        TIMESTAMPTZ,
  trial_credits         INTEGER DEFAULT 100,
  payment_amount        INTEGER DEFAULT 0,
  payment_status        TEXT DEFAULT 'trial'
                          CHECK (payment_status IN ('trial','partial','paid','pending')),
  admin_notes           TEXT,
  payment_link          TEXT DEFAULT 'https://rzp.io/rzp/osaccess',
  user_id               UUID,
  approved_by           UUID,
  approved_at           TIMESTAMPTZ,
  upgraded_at           TIMESTAMPTZ,
  upgraded_to_tier      TEXT,
  submitted_at          TIMESTAMPTZ DEFAULT NOW(),
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trial_email     ON public.trial_requests(email);
CREATE INDEX IF NOT EXISTS idx_trial_status    ON public.trial_requests(status);
CREATE INDEX IF NOT EXISTS idx_trial_ip        ON public.trial_requests(ip_address);
CREATE INDEX IF NOT EXISTS idx_trial_ends      ON public.trial_requests(access_ends_at);
CREATE INDEX IF NOT EXISTS idx_trial_submitted ON public.trial_requests(submitted_at DESC);

-- RLS — service role only writes; admins read; users read their own
ALTER TABLE public.trial_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read all trial requests"
  ON public.trial_requests FOR SELECT
  USING (is_team_member(auth.uid()));

CREATE POLICY "Users read own trial request"
  ON public.trial_requests FOR SELECT
  USING (auth.uid() = user_id);

-- updated_at trigger
CREATE TRIGGER trg_trial_requests_updated_at
  BEFORE UPDATE ON public.trial_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ─── 2. IP tracking on signup_requests ───────────────────────────────────────
ALTER TABLE public.signup_requests
  ADD COLUMN IF NOT EXISTS ip_address  TEXT,
  ADD COLUMN IF NOT EXISTS user_agent  TEXT;

CREATE INDEX IF NOT EXISTS idx_signup_ip ON public.signup_requests(ip_address);

-- Allow anon/authenticated to insert IP + user_agent on signup
DROP POLICY IF EXISTS "Anyone can submit signup" ON public.signup_requests;
CREATE POLICY "Anyone can submit signup"
  ON public.signup_requests FOR INSERT TO anon, authenticated
  WITH CHECK (
    full_name IS NOT NULL
    AND email IS NOT NULL
    AND phone IS NOT NULL
    AND payment_type IS NOT NULL
  );

-- ─── 3. Trial fields on user_profiles ────────────────────────────────────────
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS is_trial_user    BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS trial_ends_at    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS trial_request_id UUID REFERENCES public.trial_requests(id) ON DELETE SET NULL;

-- ─── 4. Extend protect_sensitive_profile_fields trigger ──────────────────────
-- Block non-admin users from self-extending their trial.
CREATE OR REPLACE FUNCTION public.protect_sensitive_profile_fields()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  IF NEW.is_trial_user IS DISTINCT FROM OLD.is_trial_user THEN
    RAISE EXCEPTION 'Permission denied: is_trial_user can only be changed by admins.';
  END IF;
  IF NEW.trial_ends_at IS DISTINCT FROM OLD.trial_ends_at THEN
    RAISE EXCEPTION 'Permission denied: trial_ends_at can only be changed by admins.';
  END IF;
  IF NEW.trial_request_id IS DISTINCT FROM OLD.trial_request_id THEN
    RAISE EXCEPTION 'Permission denied: trial_request_id can only be changed by admins.';
  END IF;

  RETURN NEW;
END;
$function$;

-- Re-attach trigger if it doesn't exist (CREATE OR REPLACE on function alone doesn't re-bind)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_protect_sensitive_profile_fields'
  ) THEN
    CREATE TRIGGER trg_protect_sensitive_profile_fields
      BEFORE UPDATE ON public.user_profiles
      FOR EACH ROW EXECUTE FUNCTION public.protect_sensitive_profile_fields();
  END IF;
END$$;

-- ─── 5. Trial credit pricing row ─────────────────────────────────────────────
INSERT INTO public.credit_pricing (tool_module, call_type, credits, display_name, is_active)
VALUES ('trial', 'starter_allocation', 100, 'Trial User Starter Credits', true)
ON CONFLICT DO NOTHING;

-- ─── 6. Cleanup function for expired trials ──────────────────────────────────
CREATE OR REPLACE FUNCTION public.expire_trial_users()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.trial_requests
  SET status = 'expired', updated_at = NOW()
  WHERE status = 'approved'
    AND access_ends_at < NOW();
END;
$$;