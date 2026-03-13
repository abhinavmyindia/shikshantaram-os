-- Fix ai_usage_logs: only authenticated users can insert their own logs
DROP POLICY IF EXISTS "Service role and edge functions can insert logs" ON public.ai_usage_logs;
CREATE POLICY "Authenticated users insert own usage logs"
  ON public.ai_usage_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Fix signup_requests: allow anon inserts but restrict to non-null required fields only
DROP POLICY IF EXISTS "Anyone can submit signup" ON public.signup_requests;
CREATE POLICY "Anyone can submit signup"
  ON public.signup_requests
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    full_name IS NOT NULL AND 
    email IS NOT NULL AND 
    phone IS NOT NULL AND 
    payment_type IS NOT NULL
  );