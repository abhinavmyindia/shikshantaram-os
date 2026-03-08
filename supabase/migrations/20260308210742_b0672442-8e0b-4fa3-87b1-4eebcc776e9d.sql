
CREATE TABLE IF NOT EXISTS public.user_presence (
  user_id UUID PRIMARY KEY,
  user_email TEXT,
  user_name TEXT,
  last_seen TIMESTAMPTZ DEFAULT NOW(),
  current_page TEXT DEFAULT 'dashboard',
  session_start TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.user_presence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can upsert own presence"
  ON public.user_presence FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can read all presence"
  ON public.user_presence FOR SELECT
  USING (public.is_admin(auth.uid()));
