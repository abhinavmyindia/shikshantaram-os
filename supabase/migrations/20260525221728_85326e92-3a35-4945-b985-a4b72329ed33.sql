REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.create_starter_credits() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.check_error_log_rate_limit() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.protect_sensitive_profile_fields() FROM PUBLIC, anon, authenticated;
