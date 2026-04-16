-- Fix: Allow authenticated users to insert their own BYOK keys
CREATE POLICY "Users insert own byok keys"
ON public.user_byok_keys
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Mark all old unresolved error logs as resolved (transient network errors and already-fixed issues)
UPDATE public.error_logs
SET is_resolved = true, resolved_at = NOW()
WHERE is_resolved = false;