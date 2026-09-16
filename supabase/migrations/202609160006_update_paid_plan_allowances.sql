-- Align existing subscriptions and future PayU activations with the final plan
-- allowances. The per-search cap remains enforced separately at 50 results.
UPDATE subscriptions
SET monthly_search_limit = 30,
    monthly_lead_limit = 1500,
    updated_at = clock_timestamp()
WHERE plan = 'starter' AND status = 'active';

UPDATE subscriptions
SET monthly_search_limit = 60,
    monthly_lead_limit = 3000,
    updated_at = clock_timestamp()
WHERE plan = 'pro' AND status = 'active';

CREATE OR REPLACE FUNCTION complete_payu_payment(
  p_txnid text,
  p_payu_payment_id text,
  p_raw_response jsonb
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_payment payments%ROWTYPE;
  v_searches integer;
  v_leads integer;
BEGIN
  SELECT * INTO v_payment FROM payments WHERE txnid = p_txnid FOR UPDATE;
  IF NOT FOUND THEN RETURN false; END IF;
  IF v_payment.status = 'success' THEN RETURN true; END IF;
  IF v_payment.plan = 'starter' THEN v_searches := 30; v_leads := 1500;
  ELSIF v_payment.plan = 'pro' THEN v_searches := 60; v_leads := 3000;
  ELSE RAISE EXCEPTION 'invalid_payment_plan';
  END IF;

  UPDATE payments SET status = 'success', payu_payment_id = p_payu_payment_id,
    raw_response = p_raw_response, completed_at = clock_timestamp()
  WHERE id = v_payment.id;

  UPDATE subscriptions SET plan = v_payment.plan, status = 'active',
    monthly_search_limit = v_searches, monthly_lead_limit = v_leads,
    period_start = clock_timestamp(), period_end = clock_timestamp() + interval '30 days',
    updated_at = clock_timestamp()
  WHERE user_id = v_payment.user_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'subscription_not_found'; END IF;
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION complete_payu_payment(text, text, jsonb)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION complete_payu_payment(text, text, jsonb)
  TO service_role;
