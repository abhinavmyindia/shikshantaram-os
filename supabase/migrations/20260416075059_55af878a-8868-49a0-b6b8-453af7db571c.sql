CREATE OR REPLACE FUNCTION public.protect_sensitive_profile_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Service role (auth.uid() is NULL) and team members bypass protection
  IF auth.uid() IS NULL OR is_team_member(auth.uid()) THEN
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