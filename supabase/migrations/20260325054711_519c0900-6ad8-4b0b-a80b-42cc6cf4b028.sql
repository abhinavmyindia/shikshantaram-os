
-- Add social + bio columns (some may already exist)
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS instagram_url TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS twitter_url   TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS linkedin_url  TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS youtube_url   TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS website_url   TEXT DEFAULT '';

-- Account deletion requests table
CREATE TABLE IF NOT EXISTS public.deletion_requests (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      UUID,
  user_email   TEXT NOT NULL,
  user_name    TEXT,
  reason       TEXT,
  status       TEXT DEFAULT 'pending',
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at  TIMESTAMPTZ,
  reviewed_by  UUID,
  admin_notes  TEXT
);

ALTER TABLE public.deletion_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users insert own deletion request"
  ON public.deletion_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users read own deletion request"
  ON public.deletion_requests FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins manage deletion requests"
  ON public.deletion_requests FOR ALL
  USING (EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid()));
