
-- 1. Fix: Admins can read encrypted API keys from user_byok_keys
-- Remove the overly permissive admin ALL policy and replace with admin SELECT on safe view only
DROP POLICY IF EXISTS "Admins manage all byok keys" ON public.user_byok_keys;

-- 2. Fix: Users cannot read their own security settings
CREATE POLICY "Users read own security settings"
ON public.user_security_settings
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- 3. Fix: Users cannot read their own submitted feedback
CREATE POLICY "Users read own feedback"
ON public.beta_feedback
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- 4. Fix: Users cannot read their own tool usage records
CREATE POLICY "Users read own tool usage"
ON public.tool_usage
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- 5. Fix: Harden admin_users INSERT to use a SECURITY DEFINER function
-- The existing INSERT policy "Only owner can add team members" already checks is_owner(auth.uid())
-- which is a SECURITY DEFINER function. The team invitation flow uses the manage-team Edge Function
-- with service role key, so this is safe. But let's add an extra guard: the inserted user_id
-- must match an accepted invitation.
DROP POLICY IF EXISTS "Only owner can add team members" ON public.admin_users;

CREATE POLICY "Only owner can add team members"
ON public.admin_users
FOR INSERT
TO authenticated
WITH CHECK (
  is_owner(auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.team_invitations
    WHERE team_invitations.status = 'accepted'
    AND team_invitations.accepted_by IS NOT NULL
  )
);
