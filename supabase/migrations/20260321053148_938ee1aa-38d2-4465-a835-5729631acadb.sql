
-- Global settings key-value store
CREATE TABLE IF NOT EXISTS public.global_settings (
  key         TEXT PRIMARY KEY,
  value       TEXT NOT NULL,
  description TEXT,
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_by  UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE public.global_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users read settings"
  ON public.global_settings FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins manage settings"
  ON public.global_settings FOR ALL
  USING (EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid()));

INSERT INTO public.global_settings (key, value, description)
VALUES (
  'credits_enforcement_mode',
  'shadow',
  'shadow = track only, no gates | enforced = full credit gates active'
) ON CONFLICT (key) DO NOTHING;

INSERT INTO public.global_settings (key, value, description)
VALUES (
  'new_user_default_enforcement',
  'shadow',
  'Enforcement mode assigned to newly approved users'
) ON CONFLICT (key) DO NOTHING;

-- Add enforcement column to user_profiles
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS credits_enforcement TEXT DEFAULT 'shadow';

-- Set all existing users to shadow
UPDATE public.user_profiles
SET credits_enforcement = 'shadow'
WHERE credits_enforcement IS NULL;

-- Exempt all admin team members
UPDATE public.user_profiles
SET credits_enforcement = 'exempt'
WHERE id IN (SELECT user_id FROM public.admin_users);
