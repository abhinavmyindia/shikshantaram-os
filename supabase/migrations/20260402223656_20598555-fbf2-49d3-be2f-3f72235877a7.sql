
-- Trigger to prevent non-admin users from escalating their own privileges
CREATE OR REPLACE FUNCTION public.protect_sensitive_profile_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- If the caller is an admin/team member, allow all changes
  IF is_team_member(auth.uid()) THEN
    RETURN NEW;
  END IF;

  -- For regular users, prevent changes to sensitive fields
  NEW.access_tier := OLD.access_tier;
  NEW.payment_status := OLD.payment_status;
  NEW.payment_amount := OLD.payment_amount;
  NEW.credits_enforcement := OLD.credits_enforcement;
  NEW.is_beta_user := OLD.is_beta_user;
  NEW.added_by := OLD.added_by;

  RETURN NEW;
END;
$$;

-- Attach trigger to user_profiles
CREATE TRIGGER trg_protect_sensitive_profile_fields
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_sensitive_profile_fields();
