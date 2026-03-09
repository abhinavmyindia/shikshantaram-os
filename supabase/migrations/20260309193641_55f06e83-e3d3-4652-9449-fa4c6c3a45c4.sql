
CREATE OR REPLACE FUNCTION get_my_admin_role()
RETURNS TEXT AS $$
  SELECT role FROM public.admin_users WHERE user_id = auth.uid() LIMIT 1;
$$ LANGUAGE SQL SECURITY DEFINER STABLE SET search_path = public;
