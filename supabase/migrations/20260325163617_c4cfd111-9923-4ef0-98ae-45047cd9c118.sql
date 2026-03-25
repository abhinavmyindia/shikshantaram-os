
CREATE TABLE IF NOT EXISTS public.recent_work (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID NOT NULL,
  tool        TEXT NOT NULL,
  call_type   TEXT NOT NULL,
  title       TEXT NOT NULL,
  subtitle    TEXT,
  input_data  JSONB DEFAULT '{}'::jsonb,
  output_data JSONB DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  expires_at  TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days')
);

CREATE INDEX idx_recent_work_user    ON recent_work(user_id);
CREATE INDEX idx_recent_work_tool    ON recent_work(tool, user_id);
CREATE INDEX idx_recent_work_expires ON recent_work(expires_at);
CREATE INDEX idx_recent_work_created ON recent_work(created_at DESC);

ALTER TABLE public.recent_work ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own recent work"
  ON public.recent_work FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION delete_expired_recent_work()
RETURNS void AS $$
BEGIN
  DELETE FROM public.recent_work WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
