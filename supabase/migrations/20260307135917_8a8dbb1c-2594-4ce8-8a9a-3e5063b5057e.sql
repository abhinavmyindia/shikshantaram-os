
CREATE TABLE public.signup_requests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name       TEXT NOT NULL,
  email           TEXT NOT NULL UNIQUE,
  phone           TEXT NOT NULL,
  payment_type    TEXT NOT NULL CHECK (payment_type IN ('reserve', 'full')),
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  submitted_at    TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at     TIMESTAMPTZ,
  reviewed_by     UUID,
  notes           TEXT DEFAULT ''
);

ALTER TABLE public.signup_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit signup"
ON public.signup_requests FOR INSERT
WITH CHECK (true);

CREATE POLICY "Admins can view all signups"
ON public.signup_requests FOR SELECT
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update signups"
ON public.signup_requests FOR UPDATE
USING (public.is_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.get_signup_count()
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER FROM public.signup_requests WHERE status != 'rejected';
$$ LANGUAGE SQL SECURITY DEFINER SET search_path = public;
