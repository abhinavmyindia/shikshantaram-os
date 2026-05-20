
-- ── 1. Tables with RLS enabled but no policies ─────────────────────────

-- product_creator_configs: read-only config table; admins manage
CREATE POLICY "Authenticated read configs"
  ON public.product_creator_configs
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins manage configs"
  ON public.product_creator_configs
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- edge_function_logs: internal logs; only admins may read
CREATE POLICY "Admins read edge function logs"
  ON public.edge_function_logs
  FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

-- ── 2. Storage: restrict chat-images listing to owner ──────────────────

DROP POLICY IF EXISTS "Public read for chat images" ON storage.objects;

CREATE POLICY "Owners read own chat images"
  ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'chat-images'
    AND (auth.uid())::text = (storage.foldername(name))[1]
  );

-- ── 3. SECURITY DEFINER function execution lockdown ────────────────────

-- Revoke from PUBLIC + anon on every SECURITY DEFINER function
REVOKE EXECUTE ON FUNCTION public.get_my_admin_role() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.check_error_log_rate_limit() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_team_member(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_admin_role(uuid, text[]) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_owner(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.create_starter_credits() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.add_user_credits(uuid, integer, text, text, text, text, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.protect_sensitive_profile_fields() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.expire_trial_users() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.increment_tool_actions(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.deduct_user_credits(uuid, integer, text, text, text, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.deduct_user_credits(uuid, integer, text, text, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_signup_count() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.delete_expired_recent_work() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_admin(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.deduct_chat_credits(uuid, integer) FROM PUBLIC, anon, authenticated;

-- Re-grant to authenticated only for role-check helpers used by RLS policies.
-- (RLS evaluation needs these callable by signed-in users.)
GRANT EXECUTE ON FUNCTION public.get_my_admin_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_team_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_admin_role(uuid, text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_owner(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_tool_actions(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_signup_count() TO authenticated;

-- service_role retains EXECUTE on every function by default and is used by
-- Edge Functions to call the backend-only helpers (add/deduct credits,
-- expire trials, etc.). Triggers fire regardless of EXECUTE grants.
