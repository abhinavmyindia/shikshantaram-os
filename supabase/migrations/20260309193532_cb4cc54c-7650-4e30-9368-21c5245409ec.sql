
-- Drop existing check constraint
ALTER TABLE public.admin_users DROP CONSTRAINT IF EXISTS admin_users_role_check;

-- Add new columns first
ALTER TABLE public.admin_users
  ADD COLUMN IF NOT EXISTS is_owner BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS invited_by UUID,
  ADD COLUMN IF NOT EXISTS invited_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS last_active TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS display_name TEXT,
  ADD COLUMN IF NOT EXISTS email TEXT;

-- Update existing super_admin to owner BEFORE adding constraint
UPDATE public.admin_users SET role = 'owner', is_owner = true WHERE role = 'super_admin';
UPDATE public.admin_users SET role = 'admin' WHERE role NOT IN ('owner', 'admin', 'manager', 'operator');

-- Now add the constraint
ALTER TABLE public.admin_users
  ADD CONSTRAINT admin_users_role_check
  CHECK (role IN ('owner', 'admin', 'manager', 'operator'));
