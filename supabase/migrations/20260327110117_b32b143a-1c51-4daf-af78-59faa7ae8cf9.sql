
-- 1. Fix admin_users bootstrap: The owner row is seeded via service role during setup.
-- The INSERT policy with is_owner() is correct because only existing owners can add members.
-- On fresh deploy, the owner is created by setup Edge Function using service role key.
-- No change needed - this is architecturally correct.

-- 2. Add user SELECT for activity_logs
CREATE POLICY "Users read own activity logs"
ON public.activity_logs
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);
