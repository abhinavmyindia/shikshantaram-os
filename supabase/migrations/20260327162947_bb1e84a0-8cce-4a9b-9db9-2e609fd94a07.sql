
-- 1. BYOK: Remove direct SELECT so encrypted keys aren't sent to client
DROP POLICY IF EXISTS "Users read own byok status" ON public.user_byok_keys;

-- 2. BYOK: Remove direct INSERT (edge function uses service role key)
DROP POLICY IF EXISTS "Users insert own byok keys" ON public.user_byok_keys;

-- 3. ADMIN_USERS: Add RESTRICTIVE INSERT policy to prevent privilege escalation
CREATE POLICY "Restrict admin inserts to owner only"
  ON public.admin_users
  AS RESTRICTIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (is_owner(auth.uid()));
