
-- Fix: user_byok_keys_safe view - ensure it uses security_invoker so RLS from base table applies
DROP VIEW IF EXISTS public.user_byok_keys_safe;

CREATE VIEW public.user_byok_keys_safe
WITH (security_invoker = true)
AS
SELECT
  id, user_id, provider, key_hint,
  is_active, is_valid,
  last_validated_at, last_used_at,
  created_at, updated_at
FROM public.user_byok_keys;
