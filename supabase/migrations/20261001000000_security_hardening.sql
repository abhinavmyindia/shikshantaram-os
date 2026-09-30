-- Security hardening (2026-10-01)

-- 1) Limit wrong OTP guesses on trial requests (used by verify-trial-otp).
ALTER TABLE public.trial_requests
  ADD COLUMN IF NOT EXISTS otp_attempts integer NOT NULL DEFAULT 0;
REVOKE SELECT (otp_attempts) ON public.trial_requests FROM PUBLIC;
REVOKE SELECT (otp_attempts) ON public.trial_requests FROM anon;
REVOKE SELECT (otp_attempts) ON public.trial_requests FROM authenticated;

-- 2) Product Creator agent links must not be readable by every signed-in user.
-- The app reads them only through the manage-product-creator function (service role);
-- admins keep access through the existing "Admins manage configs" policy.
DROP POLICY IF EXISTS "Authenticated read configs" ON public.product_creator_configs;
