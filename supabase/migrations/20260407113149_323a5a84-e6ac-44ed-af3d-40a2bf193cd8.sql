
ALTER TABLE public.ai_usage_logs
  ADD COLUMN IF NOT EXISTS logged_from TEXT DEFAULT 'frontend',
  ADD COLUMN IF NOT EXISTS byok BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_ai_usage_logged_from ON ai_usage_logs(logged_from);
CREATE INDEX IF NOT EXISTS idx_ai_usage_byok ON ai_usage_logs(byok);
