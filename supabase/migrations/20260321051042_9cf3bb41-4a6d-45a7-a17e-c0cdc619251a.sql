
-- ─── TABLE 1: user_credits ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_credits (
  user_id           UUID PRIMARY KEY,
  balance           INTEGER NOT NULL DEFAULT 0,
  lifetime_topped   INTEGER NOT NULL DEFAULT 0,
  lifetime_spent    INTEGER NOT NULL DEFAULT 0,
  free_credits_given INTEGER NOT NULL DEFAULT 0,
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.user_credits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own credits"
  ON public.user_credits FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins read all credits"
  ON public.user_credits FOR SELECT
  USING (EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid()));

-- ─── TABLE 2: credit_transactions ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.credit_transactions (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id           UUID NOT NULL,
  user_email        TEXT,
  type              TEXT NOT NULL,
  amount            INTEGER NOT NULL,
  balance_after     INTEGER NOT NULL,
  description       TEXT,
  tool_module       TEXT,
  call_type         TEXT,
  ai_usage_log_id   UUID,
  razorpay_order_id TEXT,
  razorpay_payment_id TEXT,
  gifted_by         UUID,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_credit_tx_user    ON credit_transactions(user_id);
CREATE INDEX idx_credit_tx_type    ON credit_transactions(type);
CREATE INDEX idx_credit_tx_created ON credit_transactions(created_at DESC);

ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own transactions"
  ON public.credit_transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins read all transactions"
  ON public.credit_transactions FOR SELECT
  USING (EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid()));

-- ─── TABLE 3: credit_pricing ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.credit_pricing (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tool_module TEXT NOT NULL,
  call_type   TEXT NOT NULL,
  credits     INTEGER NOT NULL,
  display_name TEXT NOT NULL,
  is_active   BOOLEAN DEFAULT true,
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tool_module, call_type)
);

ALTER TABLE public.credit_pricing ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users read pricing"
  ON public.credit_pricing FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins manage pricing"
  ON public.credit_pricing FOR ALL
  USING (EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid()));

-- ─── TABLE 4: razorpay_orders ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.razorpay_orders (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id           UUID NOT NULL,
  user_email        TEXT,
  razorpay_order_id TEXT UNIQUE NOT NULL,
  amount_inr        INTEGER NOT NULL,
  credits_to_add    INTEGER NOT NULL,
  bonus_credits     INTEGER DEFAULT 0,
  status            TEXT DEFAULT 'created',
  razorpay_payment_id TEXT,
  paid_at           TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.razorpay_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own orders"
  ON public.razorpay_orders FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins read all orders"
  ON public.razorpay_orders FOR SELECT
  USING (EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid()));
