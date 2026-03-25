
CREATE OR REPLACE FUNCTION delete_expired_recent_work()
RETURNS void AS $$
BEGIN
  DELETE FROM public.recent_work WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';
