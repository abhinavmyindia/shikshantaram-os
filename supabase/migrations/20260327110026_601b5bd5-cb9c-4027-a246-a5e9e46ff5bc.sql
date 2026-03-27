
-- 1. Ensure RLS is enabled on user_byok_keys (it should already be, but confirm)
ALTER TABLE public.user_byok_keys ENABLE ROW LEVEL SECURITY;

-- 2. Fix admin_activity_log INSERT - enforce admin_id matches caller
DROP POLICY IF EXISTS "Team can insert activity log" ON public.admin_activity_log;

CREATE POLICY "Team can insert activity log"
ON public.admin_activity_log
FOR INSERT
TO authenticated
WITH CHECK (
  is_team_member(auth.uid())
  AND admin_id = auth.uid()
);
