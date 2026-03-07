
-- Fix increment_tool_actions search_path
CREATE OR REPLACE FUNCTION public.increment_tool_actions(row_id UUID)
RETURNS VOID AS $$
  UPDATE public.tool_usage SET actions_count = actions_count + 1 WHERE id = row_id;
$$ LANGUAGE SQL SECURITY DEFINER SET search_path = public;
