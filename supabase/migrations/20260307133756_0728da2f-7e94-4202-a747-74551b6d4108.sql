ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS username        TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS bio             TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS instagram       TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS linkedin        TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS twitter         TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS facebook        TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS website         TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS avatar_initials TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS avatar_gradient TEXT DEFAULT 'linear-gradient(135deg,#7c3aed,#ec4899)';