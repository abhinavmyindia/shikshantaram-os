ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS notif_credits  BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS notif_security BOOLEAN DEFAULT true;