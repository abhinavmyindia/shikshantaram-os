
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS avatar_color TEXT DEFAULT '#7c3aed',
  ADD COLUMN IF NOT EXISTS notif_new_tools BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS notif_tips BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS deletion_requested BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS deletion_requested_at TIMESTAMPTZ;
