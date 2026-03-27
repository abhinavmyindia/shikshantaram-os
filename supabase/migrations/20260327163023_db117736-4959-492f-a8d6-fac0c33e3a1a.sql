
-- Add admin SELECT policy on user_byok_keys_safe view
-- The view has security_invoker = true, so RLS on the base table applies.
-- We need a SELECT policy on the BASE table for admins only.
CREATE POLICY "Admins read byok keys"
  ON public.user_byok_keys
  FOR SELECT
  TO authenticated
  USING (is_admin(auth.uid()));
