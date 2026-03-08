CREATE POLICY "Users can read own usage logs"
ON public.ai_usage_logs
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);