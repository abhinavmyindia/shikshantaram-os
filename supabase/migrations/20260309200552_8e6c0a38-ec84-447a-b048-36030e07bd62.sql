
-- Fix infinite recursion: admin_users SELECT policy references itself
-- Solution: Use security definer functions that bypass RLS

-- 1. Create a security definer function to check if user is in admin_users
CREATE OR REPLACE FUNCTION public.is_team_member(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users WHERE user_id = _user_id
  )
$$;

-- 2. Create a security definer function to check admin role
CREATE OR REPLACE FUNCTION public.has_admin_role(_user_id uuid, _roles text[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users WHERE user_id = _user_id AND role = ANY(_roles)
  )
$$;

-- 3. Create a security definer function to check if user is owner
CREATE OR REPLACE FUNCTION public.is_owner(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users WHERE user_id = _user_id AND is_owner = true
  )
$$;

-- 4. Fix admin_users SELECT policy (the root cause of recursion)
DROP POLICY IF EXISTS "Team members can view team table" ON public.admin_users;
CREATE POLICY "Team members can view team table"
  ON public.admin_users FOR SELECT
  USING (public.is_team_member(auth.uid()));

-- 5. Fix admin_users INSERT policy
DROP POLICY IF EXISTS "Only owner can add team members" ON public.admin_users;
CREATE POLICY "Only owner can add team members"
  ON public.admin_users FOR INSERT
  WITH CHECK (public.is_owner(auth.uid()));

-- 6. Fix admin_users UPDATE policy
DROP POLICY IF EXISTS "Only owner can update roles" ON public.admin_users;
CREATE POLICY "Only owner can update roles"
  ON public.admin_users FOR UPDATE
  USING (public.is_owner(auth.uid()));

-- 7. Fix admin_users DELETE policy
DROP POLICY IF EXISTS "Only owner can remove team members" ON public.admin_users;
CREATE POLICY "Only owner can remove team members"
  ON public.admin_users FOR DELETE
  USING (public.is_owner(auth.uid()) AND is_owner = false);

-- 8. Fix user_profiles policies that reference admin_users
DROP POLICY IF EXISTS "Team can view all profiles" ON public.user_profiles;
CREATE POLICY "Team can view all profiles"
  ON public.user_profiles FOR SELECT
  USING (
    auth.uid() = id
    OR public.has_admin_role(auth.uid(), ARRAY['owner', 'admin', 'manager'])
  );

DROP POLICY IF EXISTS "Team can update profiles" ON public.user_profiles;
CREATE POLICY "Team can update profiles"
  ON public.user_profiles FOR UPDATE
  USING (
    auth.uid() = id
    OR public.has_admin_role(auth.uid(), ARRAY['owner', 'admin', 'manager'])
  );

DROP POLICY IF EXISTS "Team can insert profiles" ON public.user_profiles;
CREATE POLICY "Team can insert profiles"
  ON public.user_profiles FOR INSERT
  WITH CHECK (public.has_admin_role(auth.uid(), ARRAY['owner', 'admin', 'manager']));

DROP POLICY IF EXISTS "Team can delete profiles" ON public.user_profiles;
CREATE POLICY "Team can delete profiles"
  ON public.user_profiles FOR DELETE
  USING (public.has_admin_role(auth.uid(), ARRAY['owner', 'admin']));

-- 9. Fix signup_requests policies
DROP POLICY IF EXISTS "All team can view signups" ON public.signup_requests;
CREATE POLICY "All team can view signups"
  ON public.signup_requests FOR SELECT
  USING (public.is_team_member(auth.uid()));

DROP POLICY IF EXISTS "All team can update signup status" ON public.signup_requests;
CREATE POLICY "All team can update signup status"
  ON public.signup_requests FOR UPDATE
  USING (public.is_team_member(auth.uid()));

-- 10. Fix ai_usage_logs policy
DROP POLICY IF EXISTS "Only owner can view all usage logs" ON public.ai_usage_logs;
CREATE POLICY "Only owner can view all usage logs"
  ON public.ai_usage_logs FOR SELECT
  USING (public.has_admin_role(auth.uid(), ARRAY['owner']) OR auth.uid() = user_id);

-- 11. Fix security_events policy
DROP POLICY IF EXISTS "Only owner can manage security events" ON public.security_events;
CREATE POLICY "Only owner can manage security events"
  ON public.security_events FOR ALL
  USING (public.has_admin_role(auth.uid(), ARRAY['owner']));

-- 12. Fix error_logs policies
DROP POLICY IF EXISTS "Only owner can read error logs" ON public.error_logs;
CREATE POLICY "Only owner can read error logs"
  ON public.error_logs FOR SELECT
  USING (public.has_admin_role(auth.uid(), ARRAY['owner']));

DROP POLICY IF EXISTS "Only owner can update error logs" ON public.error_logs;
CREATE POLICY "Only owner can update error logs"
  ON public.error_logs FOR UPDATE
  USING (public.has_admin_role(auth.uid(), ARRAY['owner']));

-- 13. Fix login_sessions policy
DROP POLICY IF EXISTS "Only owner can manage all sessions" ON public.login_sessions;
CREATE POLICY "Only owner can manage all sessions"
  ON public.login_sessions FOR ALL
  USING (public.has_admin_role(auth.uid(), ARRAY['owner']) OR auth.uid() = user_id);

-- 14. Fix team_invitations policy
DROP POLICY IF EXISTS "Owners can manage invitations" ON public.team_invitations;
CREATE POLICY "Owners can manage invitations"
  ON public.team_invitations FOR ALL
  USING (public.is_owner(auth.uid()));

-- 15. Fix admin_activity_log policies
DROP POLICY IF EXISTS "Team can view activity log" ON public.admin_activity_log;
CREATE POLICY "Team can view activity log"
  ON public.admin_activity_log FOR SELECT
  USING (public.has_admin_role(auth.uid(), ARRAY['owner', 'admin']));

DROP POLICY IF EXISTS "Team can insert activity log" ON public.admin_activity_log;
CREATE POLICY "Team can insert activity log"
  ON public.admin_activity_log FOR INSERT
  WITH CHECK (public.is_team_member(auth.uid()));
