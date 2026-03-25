CREATE TABLE IF NOT EXISTS public.price_change_log (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tool_module      TEXT NOT NULL,
  call_type        TEXT NOT NULL,
  display_name     TEXT,
  old_credits      INTEGER NOT NULL,
  new_credits      INTEGER NOT NULL,
  changed_by       UUID,
  changed_by_email TEXT,
  reason           TEXT,
  changed_at       TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.price_change_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage price log"
  ON public.price_change_log FOR ALL
  USING (EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid()));

INSERT INTO public.global_settings (key, value, description)
VALUES ('usd_inr_rate', '84', 'USD to INR conversion rate for cost display')
ON CONFLICT (key) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_razorpay_paid   ON razorpay_orders(status, paid_at);
CREATE INDEX IF NOT EXISTS idx_credit_tx_topup ON credit_transactions(type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_cost         ON ai_usage_logs(estimated_cost_usd, created_at DESC);