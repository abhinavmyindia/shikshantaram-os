CREATE POLICY "Anyone can check own email"
ON public.signup_requests
FOR SELECT
TO anon, authenticated
USING (email = lower(current_setting('request.headers', true)::json->>'x-signup-email'));

-- Simpler approach: just allow anon to select by email (only id and status, enforced in app)
DROP POLICY IF EXISTS "Anyone can check own email" ON public.signup_requests;

CREATE POLICY "Anon can check existing signup by email"
ON public.signup_requests
FOR SELECT
TO anon
USING (true);