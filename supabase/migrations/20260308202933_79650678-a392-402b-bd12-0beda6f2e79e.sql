CREATE TABLE public.ai_usage_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  user_email TEXT,
  user_name TEXT,
  module TEXT NOT NULL,
  call_type TEXT NOT NULL,
  model TEXT NOT NULL,
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  total_tokens INTEGER NOT NULL DEFAULT 0,
  estimated_cost_usd DECIMAL(10,6) NOT NULL DEFAULT 0,
  session_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ai_usage_user ON public.ai_usage_logs(user_id);
CREATE INDEX idx_ai_usage_module ON public.ai_usage_logs(module);
CREATE INDEX idx_ai_usage_created ON public.ai_usage_logs(created_at DESC);

ALTER TABLE public.ai_usage_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all usage logs"
  ON public.ai_usage_logs FOR SELECT
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Service role and edge functions can insert logs"
  ON public.ai_usage_logs FOR INSERT
  WITH CHECK (true);