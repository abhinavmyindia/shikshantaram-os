-- Allow 'admin_reset' as a valid transaction type so the bulk reset function
-- can write audit rows that show up in users' transaction history.
ALTER TABLE public.credit_transactions
  DROP CONSTRAINT IF EXISTS credit_transactions_type_check;

ALTER TABLE public.credit_transactions
  ADD CONSTRAINT credit_transactions_type_check
  CHECK (type = ANY (ARRAY[
    'topup'::text,
    'deduction'::text,
    'gift'::text,
    'promo'::text,
    'refund'::text,
    'shadow_deduction'::text,
    'admin_reset'::text
  ]));