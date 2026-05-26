-- Hide trial OTP codes from RLS-visible reads.
-- otp_code/otp_expires_at are sensitive; only the service role (edge functions)
-- needs to read them. Revoke column-level SELECT from anon/authenticated so
-- neither end users nor team admins can read the plaintext OTP via PostgREST.
REVOKE SELECT (otp_code, otp_expires_at) ON public.trial_requests FROM anon, authenticated;