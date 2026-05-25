-- 1) user_presence: drop overly-permissive SELECT and replace with self+admin
DROP POLICY IF EXISTS "Authenticated users read all presence" ON public.user_presence;

CREATE POLICY "Users read own presence"
ON public.user_presence
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins read all presence"
ON public.user_presence
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

-- 2) Realtime channel authorization: only allow subscribing to topics matching own uid
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users subscribe to own topics" ON realtime.messages;
CREATE POLICY "Users subscribe to own topics"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  realtime.topic() IN (
    'credits-'        || auth.uid()::text,
    'low-balance-'    || auth.uid()::text
  )
);

-- 3) Storage UPDATE policies for owner-scoped folders
DROP POLICY IF EXISTS "Users update own chat-images" ON storage.objects;
CREATE POLICY "Users update own chat-images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'chat-images' AND (auth.uid())::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'chat-images' AND (auth.uid())::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users update own knowledge-documents" ON storage.objects;
CREATE POLICY "Users update own knowledge-documents"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'knowledge-documents' AND (auth.uid())::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'knowledge-documents' AND (auth.uid())::text = (storage.foldername(name))[1]);

-- 4) Revoke EXECUTE on internal SECURITY DEFINER helpers from end users.
-- These are intended to be called by RLS policies (which run as definer) or
-- by service-role edge functions, never directly by signed-in clients.
REVOKE EXECUTE ON FUNCTION public.add_user_credits(uuid, integer, text, text, text, text, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.deduct_user_credits(uuid, integer, text, text, text, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.deduct_user_credits(uuid, integer, text, text, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.deduct_chat_credits(uuid, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.expire_trial_users() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.delete_expired_recent_work() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_signup_count() FROM PUBLIC, anon, authenticated;
