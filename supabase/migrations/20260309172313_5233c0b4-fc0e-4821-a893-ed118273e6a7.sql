-- Drop old broken policies
DROP POLICY IF EXISTS "Users insert own errors" ON error_logs;
DROP POLICY IF EXISTS "Admins read all errors" ON error_logs;
DROP POLICY IF EXISTS "Admins update errors" ON error_logs;

-- Policy 1: Authenticated users insert own errors
CREATE POLICY "Authenticated users insert own errors"
  ON error_logs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- Policy 2: Anyone can insert anonymous errors (user_id IS NULL)
CREATE POLICY "Anyone can insert anonymous errors"
  ON error_logs FOR INSERT
  TO anon, authenticated
  WITH CHECK (user_id IS NULL);

-- Policy 3: Admins can read ALL error logs
CREATE POLICY "Admins read all error logs"
  ON error_logs FOR SELECT
  TO authenticated
  USING (is_admin(auth.uid()));

-- Policy 4: Admins can update errors (mark resolved)
CREATE POLICY "Admins update error logs"
  ON error_logs FOR UPDATE
  TO authenticated
  USING (is_admin(auth.uid()));