
-- Drop all existing policies on user_presence
DROP POLICY IF EXISTS "Users can upsert own presence" ON public.user_presence;
DROP POLICY IF EXISTS "Users update own presence" ON public.user_presence;
DROP POLICY IF EXISTS "Users insert own presence" ON public.user_presence;
DROP POLICY IF EXISTS "Admins can read all presence" ON public.user_presence;
DROP POLICY IF EXISTS "Users delete own presence" ON public.user_presence;

-- Policy 1: INSERT
CREATE POLICY "Users insert own presence"
  ON public.user_presence
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy 2: UPDATE (critical for upsert)
CREATE POLICY "Users update own presence"
  ON public.user_presence
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy 3: SELECT — admins can read all presence data
CREATE POLICY "Admins read all presence"
  ON public.user_presence
  FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid())
  );

-- Policy 4: DELETE — users can delete their own row
CREATE POLICY "Users delete own presence"
  ON public.user_presence
  FOR DELETE
  USING (auth.uid() = user_id);

-- Ensure RLS is enabled
ALTER TABLE public.user_presence ENABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_presence TO authenticated;
