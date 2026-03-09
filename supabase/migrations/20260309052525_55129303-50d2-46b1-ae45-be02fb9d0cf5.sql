
-- TABLE 1: ERROR LOGS
CREATE TABLE IF NOT EXISTS error_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  user_email TEXT,
  error_type TEXT NOT NULL,
  severity TEXT DEFAULT 'error',
  message TEXT NOT NULL,
  stack_trace TEXT,
  module TEXT,
  page_url TEXT,
  browser TEXT,
  os TEXT,
  device_type TEXT,
  additional_data JSONB DEFAULT '{}',
  is_resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_error_logs_user ON error_logs(user_id);
CREATE INDEX idx_error_logs_created ON error_logs(created_at DESC);
CREATE INDEX idx_error_logs_module ON error_logs(module);
CREATE INDEX idx_error_logs_severity ON error_logs(severity);

-- TABLE 2: ACTIVITY LOGS
CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  user_email TEXT,
  event_type TEXT NOT NULL,
  module TEXT,
  event_data JSONB DEFAULT '{}',
  session_id TEXT,
  ip_address TEXT,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_activity_user ON activity_logs(user_id);
CREATE INDEX idx_activity_created ON activity_logs(created_at DESC);
CREATE INDEX idx_activity_event_type ON activity_logs(event_type);
CREATE INDEX idx_activity_module ON activity_logs(module);

-- TABLE 3: LOGIN SESSIONS
CREATE TABLE IF NOT EXISTS login_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  user_email TEXT,
  session_token TEXT UNIQUE NOT NULL,
  ip_address TEXT NOT NULL,
  ip_city TEXT,
  ip_state TEXT,
  ip_country TEXT DEFAULT 'IN',
  ip_isp TEXT,
  ip_org TEXT,
  ip_timezone TEXT,
  ip_lat DECIMAL(9,6),
  ip_lon DECIMAL(9,6),
  device_type TEXT,
  browser TEXT,
  browser_version TEXT,
  os TEXT,
  os_version TEXT,
  user_agent TEXT,
  is_active BOOLEAN DEFAULT true,
  last_seen TIMESTAMPTZ DEFAULT NOW(),
  logged_out_at TIMESTAMPTZ,
  logout_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sessions_user ON login_sessions(user_id);
CREATE INDEX idx_sessions_active ON login_sessions(is_active);
CREATE INDEX idx_sessions_ip ON login_sessions(ip_address);
CREATE INDEX idx_sessions_created ON login_sessions(created_at DESC);

-- TABLE 4: USER SECURITY SETTINGS
CREATE TABLE IF NOT EXISTS user_security_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID UNIQUE,
  user_email TEXT,
  is_blocked BOOLEAN DEFAULT false,
  block_reason TEXT,
  blocked_at TIMESTAMPTZ,
  blocked_by UUID,
  max_concurrent_sessions INTEGER DEFAULT 1,
  max_unique_ips INTEGER DEFAULT 2,
  ip_whitelist JSONB DEFAULT '[]',
  trusted_ips JSONB DEFAULT '[]',
  violation_count INTEGER DEFAULT 0,
  last_violation_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_security_user ON user_security_settings(user_id);
CREATE INDEX idx_security_blocked ON user_security_settings(is_blocked);

-- TABLE 5: SECURITY EVENTS
CREATE TABLE IF NOT EXISTS security_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  user_email TEXT,
  event_type TEXT NOT NULL,
  severity TEXT DEFAULT 'medium',
  description TEXT,
  ip_address TEXT,
  ip_location TEXT,
  device_info TEXT,
  metadata JSONB DEFAULT '{}',
  is_reviewed BOOLEAN DEFAULT false,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_security_events_user ON security_events(user_id);
CREATE INDEX idx_security_events_created ON security_events(created_at DESC);
CREATE INDEX idx_security_events_type ON security_events(event_type);
CREATE INDEX idx_security_events_reviewed ON security_events(is_reviewed);

-- RLS POLICIES
ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users insert own errors" ON error_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins read all errors" ON error_logs FOR SELECT USING (is_admin(auth.uid()));
CREATE POLICY "Admins update errors" ON error_logs FOR UPDATE USING (is_admin(auth.uid()));

ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users insert own activity" ON activity_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins read all activity" ON activity_logs FOR SELECT USING (is_admin(auth.uid()));

ALTER TABLE login_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own sessions" ON login_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own sessions" ON login_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins manage all sessions" ON login_sessions FOR ALL USING (is_admin(auth.uid()));

ALTER TABLE user_security_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage security settings" ON user_security_settings FOR ALL USING (is_admin(auth.uid()));

ALTER TABLE security_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage security events" ON security_events FOR ALL USING (is_admin(auth.uid()));
