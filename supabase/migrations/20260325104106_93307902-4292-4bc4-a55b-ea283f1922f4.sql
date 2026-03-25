
-- TABLE 1: user_byok_keys
CREATE TABLE IF NOT EXISTS public.user_byok_keys (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id           UUID NOT NULL,
  provider          TEXT NOT NULL CHECK (provider IN ('anthropic', 'openai', 'gemini')),
  encrypted_key     TEXT NOT NULL,
  iv                TEXT NOT NULL,
  key_hint          TEXT NOT NULL,
  is_active         BOOLEAN DEFAULT true,
  is_valid          BOOLEAN DEFAULT false,
  last_validated_at TIMESTAMPTZ,
  last_used_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_byok_user ON user_byok_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_byok_provider ON user_byok_keys(provider);
CREATE INDEX IF NOT EXISTS idx_byok_active ON user_byok_keys(is_active);

ALTER TABLE public.user_byok_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own byok status"
  ON public.user_byok_keys FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own byok keys"
  ON public.user_byok_keys FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own byok keys"
  ON public.user_byok_keys FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users delete own byok keys"
  ON public.user_byok_keys FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins manage all byok keys"
  ON public.user_byok_keys FOR ALL
  USING (EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid()));

-- TABLE 2: byok_usage_logs
CREATE TABLE IF NOT EXISTS public.byok_usage_logs (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID NOT NULL,
  user_email    TEXT,
  provider      TEXT NOT NULL,
  model         TEXT NOT NULL,
  module        TEXT NOT NULL,
  call_type     TEXT NOT NULL,
  input_tokens  INTEGER DEFAULT 0,
  output_tokens INTEGER DEFAULT 0,
  success       BOOLEAN DEFAULT true,
  error_message TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_byok_logs_user ON byok_usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_byok_logs_created ON byok_usage_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_byok_logs_provider ON byok_usage_logs(provider);

ALTER TABLE public.byok_usage_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own byok logs"
  ON public.byok_usage_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins read all byok logs"
  ON public.byok_usage_logs FOR SELECT
  USING (EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid()));

-- Add BYOK preference to user_profiles
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS byok_preferred_provider TEXT DEFAULT NULL;
