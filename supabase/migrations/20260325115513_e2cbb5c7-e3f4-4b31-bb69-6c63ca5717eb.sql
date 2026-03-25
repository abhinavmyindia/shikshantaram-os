
-- Add idempotency_key column to credit_transactions
ALTER TABLE public.credit_transactions
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

-- Unique index: one deduction per idempotency key per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_credit_tx_idempotency
  ON credit_transactions(user_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL AND type = 'deduction';

-- Replace deduct_user_credits with idempotency support
CREATE OR REPLACE FUNCTION deduct_user_credits(
  p_user_id         UUID,
  p_amount          INTEGER,
  p_description     TEXT,
  p_tool_module     TEXT,
  p_call_type       TEXT,
  p_idempotency_key TEXT DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
  v_current_balance INTEGER;
  v_new_balance     INTEGER;
  v_existing_tx     UUID;
BEGIN
  -- Idempotency check BEFORE acquiring row lock
  IF p_idempotency_key IS NOT NULL THEN
    SELECT id INTO v_existing_tx
    FROM credit_transactions
    WHERE user_id         = p_user_id
      AND idempotency_key = p_idempotency_key
      AND type            = 'deduction'
    LIMIT 1;

    IF v_existing_tx IS NOT NULL THEN
      SELECT balance INTO v_current_balance
      FROM user_credits WHERE user_id = p_user_id;
      RETURN json_build_object(
        'success',    true,
        'new_balance', v_current_balance,
        'deducted',   0,
        'idempotent', true
      );
    END IF;
  END IF;

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
  SET balance        = v_new_balance,
      lifetime_spent = lifetime_spent + p_amount,
      updated_at     = NOW()
  WHERE user_id = p_user_id;

  INSERT INTO credit_transactions (
    user_id, type, amount, balance_after,
    description, tool_module, call_type, idempotency_key
  ) VALUES (
    p_user_id, 'deduction', -p_amount, v_new_balance,
    p_description, p_tool_module, p_call_type, p_idempotency_key
  );

  RETURN json_build_object('success', true, 'new_balance', v_new_balance, 'deducted', p_amount);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';

-- Create safe view for BYOK keys (no encrypted_key, no iv)
CREATE OR REPLACE VIEW public.user_byok_keys_safe AS
SELECT
  id, user_id, provider, key_hint, is_active, is_valid,
  last_validated_at, last_used_at, created_at, updated_at
FROM public.user_byok_keys;

-- Revoke direct table access from authenticated/anon users
REVOKE SELECT ON public.user_byok_keys FROM authenticated;
REVOKE SELECT ON public.user_byok_keys FROM anon;
