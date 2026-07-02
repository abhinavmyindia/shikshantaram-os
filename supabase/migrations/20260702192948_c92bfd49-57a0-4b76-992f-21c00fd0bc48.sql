-- 1) Remove admin SELECT on user_byok_keys; only service_role should read encrypted keys.
DROP POLICY IF EXISTS "Admins read byok keys" ON public.user_byok_keys;

-- 2) Belt-and-suspenders column-level REVOKE on trial_requests OTP fields.
REVOKE SELECT (otp_code, otp_expires_at) ON public.trial_requests FROM PUBLIC;
REVOKE SELECT (otp_code, otp_expires_at) ON public.trial_requests FROM anon;
REVOKE SELECT (otp_code, otp_expires_at) ON public.trial_requests FROM authenticated;