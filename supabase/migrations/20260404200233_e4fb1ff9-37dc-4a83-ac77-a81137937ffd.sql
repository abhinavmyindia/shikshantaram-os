
-- ═══ ISSUE 1: Upgrade privilege escalation trigger to raise exceptions ═══
CREATE OR REPLACE FUNCTION public.protect_sensitive_profile_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF is_team_member(auth.uid()) THEN
    RETURN NEW;
  END IF;

  IF NEW.access_tier IS DISTINCT FROM OLD.access_tier THEN
    RAISE EXCEPTION 'Permission denied: access_tier can only be changed by admins.';
  END IF;
  IF NEW.payment_status IS DISTINCT FROM OLD.payment_status THEN
    RAISE EXCEPTION 'Permission denied: payment_status can only be changed by admins.';
  END IF;
  IF NEW.payment_amount IS DISTINCT FROM OLD.payment_amount THEN
    RAISE EXCEPTION 'Permission denied: payment_amount can only be changed by admins.';
  END IF;
  IF NEW.credits_enforcement IS DISTINCT FROM OLD.credits_enforcement THEN
    RAISE EXCEPTION 'Permission denied: credits_enforcement can only be changed by admins.';
  END IF;
  IF NEW.is_beta_user IS DISTINCT FROM OLD.is_beta_user THEN
    RAISE EXCEPTION 'Permission denied: is_beta_user can only be changed by admins.';
  END IF;
  IF NEW.added_by IS DISTINCT FROM OLD.added_by THEN
    RAISE EXCEPTION 'Permission denied: added_by can only be changed by admins.';
  END IF;

  RETURN NEW;
END;
$function$;

-- ═══ ISSUE 2: Fix anonymous error log flooding ═══
-- Drop the anonymous insert policy
DROP POLICY IF EXISTS "Anyone can insert anonymous errors" ON public.error_logs;

-- Revoke INSERT from anon role
REVOKE INSERT ON public.error_logs FROM anon;

-- Rate limit trigger: max 20 error inserts per user per hour
CREATE OR REPLACE FUNCTION public.check_error_log_rate_limit()
RETURNS TRIGGER AS $$
DECLARE
  recent_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO recent_count
  FROM public.error_logs
  WHERE user_id = NEW.user_id
    AND created_at > NOW() - INTERVAL '1 hour';

  IF recent_count >= 20 THEN
    RETURN NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';

DROP TRIGGER IF EXISTS trg_error_log_rate_limit ON public.error_logs;

CREATE TRIGGER trg_error_log_rate_limit
  BEFORE INSERT ON public.error_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.check_error_log_rate_limit();

-- ═══ ISSUE 3: BYOK safe view clarity ═══
CREATE OR REPLACE VIEW public.user_byok_keys_safe
WITH (security_invoker = true)
AS
SELECT
  id, user_id, provider, key_hint, is_active, is_valid,
  last_validated_at, last_used_at, created_at, updated_at
FROM public.user_byok_keys;

GRANT SELECT ON public.user_byok_keys_safe TO authenticated;

REVOKE SELECT ON public.user_byok_keys FROM authenticated;
REVOKE SELECT ON public.user_byok_keys FROM anon;

COMMENT ON TABLE public.user_byok_keys IS
  'Encrypted API key storage. Direct SELECT restricted by design. Users access key metadata via user_byok_keys_safe view which excludes encrypted_key and iv columns.';

COMMENT ON VIEW public.user_byok_keys_safe IS
  'Safe read-only view of user_byok_keys. Excludes encrypted_key and iv. Intended for all authenticated read operations.';
