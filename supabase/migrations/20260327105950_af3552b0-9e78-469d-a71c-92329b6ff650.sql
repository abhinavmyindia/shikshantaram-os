
-- 1. Fix: user_byok_keys_safe view RLS
-- The view uses security_invoker=true, so it inherits RLS from user_byok_keys.
-- But we need RLS enabled on the view itself too.
ALTER VIEW public.user_byok_keys_safe SET (security_invoker = true);

-- Enable RLS on the view (required for views with security_invoker)
-- Actually views can't have RLS directly in PostgreSQL - security_invoker makes them
-- use the caller's permissions on the underlying table. Let's verify the base table has proper policies.
-- The base table user_byok_keys already has "Users read own byok status" SELECT policy.
-- With security_invoker=true, the view should enforce those policies.
-- The scanner may not recognize security_invoker. Let's acknowledge it.

-- 2. Fix: login_sessions INSERT - tighten to authenticated only and enforce email match
DROP POLICY IF EXISTS "Users insert own sessions" ON public.login_sessions;

CREATE POLICY "Users insert own sessions"
ON public.login_sessions
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND user_email = (auth.jwt() ->> 'email')
);

-- 3. Fix: activity_logs INSERT - enforce email match
DROP POLICY IF EXISTS "Users insert own activity" ON public.activity_logs;

CREATE POLICY "Users insert own activity"
ON public.activity_logs
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND (user_email IS NULL OR user_email = (auth.jwt() ->> 'email'))
);
