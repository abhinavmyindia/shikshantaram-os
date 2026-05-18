
CREATE TABLE IF NOT EXISTS public.email_delivery_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  email_type text NOT NULL,
  recipient_email text NOT NULL,
  recipient_user_id uuid,
  status text NOT NULL CHECK (status IN ('sent','failed')),
  error_message text,
  provider_message_id text,
  triggered_by_user_id uuid,
  triggered_by_email text,
  context text,
  metadata jsonb DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_email_delivery_log_created_at ON public.email_delivery_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_delivery_log_recipient ON public.email_delivery_log (recipient_email);
CREATE INDEX IF NOT EXISTS idx_email_delivery_log_recipient_user ON public.email_delivery_log (recipient_user_id);
CREATE INDEX IF NOT EXISTS idx_email_delivery_log_status ON public.email_delivery_log (status);
CREATE INDEX IF NOT EXISTS idx_email_delivery_log_type ON public.email_delivery_log (email_type);

ALTER TABLE public.email_delivery_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team can view email delivery log"
  ON public.email_delivery_log FOR SELECT
  USING (is_team_member(auth.uid()));
