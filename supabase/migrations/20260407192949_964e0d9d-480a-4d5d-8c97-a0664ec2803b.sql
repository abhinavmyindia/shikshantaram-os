
-- ════════════════════════════════════════════════════
-- FIX A1: user_presence RLS — allow authenticated users to read all presence
-- ════════════════════════════════════════════════════

-- Drop existing policies
DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies WHERE tablename = 'user_presence'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.user_presence', pol.policyname);
  END LOOP;
END $$;

-- Enable RLS
ALTER TABLE public.user_presence ENABLE ROW LEVEL SECURITY;

-- SELECT: all authenticated users can read all presence (needed for "who's online")
CREATE POLICY "Authenticated users read all presence"
  ON public.user_presence FOR SELECT
  TO authenticated
  USING (true);

-- INSERT: users insert own presence
CREATE POLICY "Users insert own presence"
  ON public.user_presence FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- UPDATE: users update own presence (critical for upsert)
CREATE POLICY "Users update own presence"
  ON public.user_presence FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- DELETE: users delete own presence (cleanup on logout)
CREATE POLICY "Users delete own presence"
  ON public.user_presence FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_presence TO authenticated;

-- ════════════════════════════════════════════════════
-- FIX D1: Add indexes on error_logs for performance
-- ════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_error_logs_fingerprint ON error_logs(fingerprint);
CREATE INDEX IF NOT EXISTS idx_error_logs_resolved ON error_logs(is_resolved);
