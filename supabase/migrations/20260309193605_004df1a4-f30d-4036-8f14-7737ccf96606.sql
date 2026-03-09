
-- Create team_invitations table
CREATE TABLE IF NOT EXISTS public.team_invitations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'manager', 'operator')),
  invited_by UUID,
  invited_by_name TEXT,
  token TEXT UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days',
  accepted_at TIMESTAMPTZ,
  accepted_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invitations_email ON team_invitations(email);
CREATE INDEX IF NOT EXISTS idx_invitations_token ON team_invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_status ON team_invitations(status);

ALTER TABLE public.team_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can manage invitations"
  ON team_invitations FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid() AND is_owner = true)
  );

-- Update RLS on admin_users
DROP POLICY IF EXISTS "Admins can view admin table" ON public.admin_users;
DROP POLICY IF EXISTS "Team members can view team table" ON public.admin_users;

CREATE POLICY "Team members can view team table"
  ON public.admin_users FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.admin_users au WHERE au.user_id = auth.uid())
  );

CREATE POLICY "Only owner can add team members"
  ON public.admin_users FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid() AND is_owner = true)
  );

CREATE POLICY "Only owner can update roles"
  ON public.admin_users FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid() AND is_owner = true)
  );

CREATE POLICY "Only owner can remove team members"
  ON public.admin_users FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid() AND is_owner = true)
    AND is_owner = false
  );

-- Helper function
CREATE OR REPLACE FUNCTION get_my_admin_role()
RETURNS TEXT AS $$
  SELECT role FROM public.admin_users WHERE user_id = auth.uid() LIMIT 1;
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- user_profiles RLS
DROP POLICY IF EXISTS "Admins can do all on profiles" ON public.user_profiles;

CREATE POLICY "Team can view all profiles"
  ON public.user_profiles FOR SELECT
  TO authenticated
  USING (
    auth.uid() = id OR
    EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'manager'))
  );

CREATE POLICY "Team can update profiles"
  ON public.user_profiles FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = id OR
    EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'manager'))
  );

CREATE POLICY "Team can insert profiles"
  ON public.user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'manager'))
  );

CREATE POLICY "Team can delete profiles"
  ON public.user_profiles FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
  );

-- signup_requests
DROP POLICY IF EXISTS "Admins can update signups" ON public.signup_requests;
DROP POLICY IF EXISTS "Admins can view all signups" ON public.signup_requests;

CREATE POLICY "All team can view signups"
  ON public.signup_requests FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid())
  );

CREATE POLICY "All team can update signup status"
  ON public.signup_requests FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid())
  );

-- ai_usage_logs: Owner only (keep user own read)
DROP POLICY IF EXISTS "Admins can view all usage logs" ON public.ai_usage_logs;
CREATE POLICY "Only owner can view all usage logs"
  ON public.ai_usage_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid() AND role = 'owner')
    OR auth.uid() = user_id
  );

-- security_events: Owner only
DROP POLICY IF EXISTS "Admins manage security events" ON public.security_events;
CREATE POLICY "Only owner can manage security events"
  ON public.security_events FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid() AND role = 'owner')
  );

-- error_logs read/update: Owner only
DROP POLICY IF EXISTS "Admins read all error logs" ON public.error_logs;
DROP POLICY IF EXISTS "Only owner can read error logs" ON public.error_logs;
CREATE POLICY "Only owner can read error logs"
  ON public.error_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid() AND role = 'owner')
  );

DROP POLICY IF EXISTS "Admins update error logs" ON public.error_logs;
DROP POLICY IF EXISTS "Only owner can update error logs" ON public.error_logs;
CREATE POLICY "Only owner can update error logs"
  ON public.error_logs FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid() AND role = 'owner')
  );

-- login_sessions: Owner can manage all
DROP POLICY IF EXISTS "Admins manage all sessions" ON public.login_sessions;
DROP POLICY IF EXISTS "Only owner can manage all sessions" ON public.login_sessions;
CREATE POLICY "Only owner can manage all sessions"
  ON public.login_sessions FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid() AND role = 'owner')
    OR auth.uid() = user_id
  );

-- admin_activity_log
DROP POLICY IF EXISTS "Admins can insert activity log" ON public.admin_activity_log;
DROP POLICY IF EXISTS "Admins can view activity log" ON public.admin_activity_log;

CREATE POLICY "Team can insert activity log"
  ON public.admin_activity_log FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid())
  );

CREATE POLICY "Team can view activity log"
  ON public.admin_activity_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
  );
