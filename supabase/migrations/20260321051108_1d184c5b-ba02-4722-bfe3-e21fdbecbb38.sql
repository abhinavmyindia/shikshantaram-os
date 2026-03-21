
-- ─── ATOMIC FUNCTION: deduct credits ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.deduct_user_credits(
  p_user_id UUID,
  p_amount INTEGER,
  p_description TEXT,
  p_tool_module TEXT,
  p_call_type TEXT
) RETURNS JSON AS $$
DECLARE
  v_current_balance INTEGER;
  v_new_balance INTEGER;
BEGIN
  SELECT balance INTO v_current_balance
  FROM user_credits WHERE user_id = p_user_id FOR UPDATE;

  IF v_current_balance IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'No credits account found');
  END IF;

  IF v_current_balance < p_amount THEN
    RETURN json_build_object('success', false, 'error', 'Insufficient credits', 'balance', v_current_balance);
  END IF;

  v_new_balance := v_current_balance - p_amount;

  UPDATE user_credits
  SET balance = v_new_balance,
      lifetime_spent = lifetime_spent + p_amount,
      updated_at = NOW()
  WHERE user_id = p_user_id;

  INSERT INTO credit_transactions (
    user_id, type, amount, balance_after, description, tool_module, call_type
  ) VALUES (
    p_user_id, 'deduction', -p_amount, v_new_balance, p_description, p_tool_module, p_call_type
  );

  RETURN json_build_object('success', true, 'new_balance', v_new_balance, 'deducted', p_amount);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ─── ATOMIC FUNCTION: add credits ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.add_user_credits(
  p_user_id UUID,
  p_amount INTEGER,
  p_type TEXT,
  p_description TEXT,
  p_razorpay_order_id TEXT DEFAULT NULL,
  p_razorpay_payment_id TEXT DEFAULT NULL,
  p_gifted_by UUID DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
  v_new_balance INTEGER;
BEGIN
  INSERT INTO user_credits (user_id, balance, lifetime_topped)
  VALUES (p_user_id, p_amount, p_amount)
  ON CONFLICT (user_id) DO UPDATE
    SET balance = user_credits.balance + p_amount,
        lifetime_topped = CASE WHEN p_type = 'topup'
          THEN user_credits.lifetime_topped + p_amount
          ELSE user_credits.lifetime_topped END,
        free_credits_given = CASE WHEN p_type IN ('gift','promo')
          THEN user_credits.free_credits_given + p_amount
          ELSE user_credits.free_credits_given END,
        updated_at = NOW()
  RETURNING balance INTO v_new_balance;

  INSERT INTO credit_transactions (
    user_id, type, amount, balance_after, description,
    razorpay_order_id, razorpay_payment_id, gifted_by
  ) VALUES (
    p_user_id, p_type, p_amount, v_new_balance, p_description,
    p_razorpay_order_id, p_razorpay_payment_id, p_gifted_by
  );

  RETURN json_build_object('success', true, 'new_balance', v_new_balance);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ─── TRIGGER: 50 free starter credits for every new user ─────────────────────
CREATE OR REPLACE FUNCTION public.create_starter_credits()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_credits (user_id, balance, free_credits_given)
  VALUES (NEW.id, 50, 50)
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.credit_transactions (
    user_id, type, amount, balance_after, description
  ) VALUES (
    NEW.id, 'promo', 50, 50, 'Welcome bonus — 50 free starter credits'
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_starter_credits ON public.user_profiles;
CREATE TRIGGER trg_starter_credits
  AFTER INSERT ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.create_starter_credits();

-- ─── SEED: credit pricing ────────────────────────────────────────────────────
INSERT INTO public.credit_pricing (tool_module, call_type, credits, display_name) VALUES
  ('product_navigator', 'generate_30_ideas',           5,  'Generate 30 Product Ideas'),
  ('product_navigator', 'deep_research_report',        15, 'Deep Research Report'),
  ('product_navigator', 'idea_analysis',               4,  'Raw Idea Analysis'),
  ('product_navigator', 'generate_more_ideas',         3,  'Generate More Ideas'),
  ('niche_clarity',     'generate_niches',             8,  'Niche Research'),
  ('offer_creation',    'generate_offer_structures',   5,  'Offer Structures'),
  ('offer_creation',    'build_full_offer',            12, 'Full Offer Build'),
  ('funnel_builder',    'generate_funnel_architecture', 8, 'Funnel Architecture'),
  ('funnel_builder',    'generate_step_copy',          6,  'Funnel Step Copy'),
  ('funnel_builder',    'generate_email_sequence',     8,  'Email Sequence'),
  ('copywriting_suite', 'generate_copy',               8,  'Copy Generation')
ON CONFLICT (tool_module, call_type) DO NOTHING;
