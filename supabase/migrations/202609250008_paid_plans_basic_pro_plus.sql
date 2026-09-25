-- Replace the free trial with paid Basic / Pro / Plus plans.
-- Lead caps stay at 50 per search; monthly leads = searches × 50.

-- Remap existing paid subscriptions before rewriting payment plan values.
UPDATE subscriptions
SET plan = 'plus',
    monthly_search_limit = 60,
    monthly_lead_limit = 3000,
    updated_at = clock_timestamp()
WHERE plan = 'pro' AND status = 'active';

UPDATE subscriptions
SET plan = 'pro',
    monthly_search_limit = 30,
    monthly_lead_limit = 1500,
    updated_at = clock_timestamp()
WHERE plan = 'starter' AND status = 'active';

UPDATE subscriptions
SET plan = 'none',
    status = 'inactive',
    monthly_search_limit = 0,
    monthly_lead_limit = 0,
    updated_at = clock_timestamp()
WHERE plan = 'free' OR status = 'trial';

UPDATE payments SET plan = 'plus' WHERE plan = 'pro';
UPDATE payments SET plan = 'pro' WHERE plan = 'starter';

ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_plan_check;
ALTER TABLE payments
  ADD CONSTRAINT payments_plan_check CHECK (plan IN ('basic', 'pro', 'plus'));

ALTER TABLE subscriptions
  ALTER COLUMN plan SET DEFAULT 'none',
  ALTER COLUMN status SET DEFAULT 'inactive',
  ALTER COLUMN monthly_search_limit SET DEFAULT 0,
  ALTER COLUMN monthly_lead_limit SET DEFAULT 0;

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    coalesce(NEW.raw_user_meta_data->>'full_name', '')
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO subscriptions (
    user_id, plan, status, monthly_search_limit, monthly_lead_limit, period_start, period_end
  ) VALUES (
    NEW.id, 'none', 'inactive', 0, 0, now(), now()
  )
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

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

  IF v_payment.plan = 'basic' THEN
    v_searches := 10;
    v_leads := 500;
  ELSIF v_payment.plan = 'pro' THEN
    v_searches := 30;
    v_leads := 1500;
  ELSIF v_payment.plan = 'plus' THEN
    v_searches := 60;
    v_leads := 3000;
  ELSE
    RAISE EXCEPTION 'invalid_payment_plan';
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

CREATE OR REPLACE FUNCTION create_search_with_quota(
  p_user_id uuid,
  p_prompt text,
  p_parsed_query jsonb,
  p_provider text,
  p_requested_result_limit integer,
  p_idempotency_key uuid
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_subscription subscriptions%ROWTYPE;
  v_search_id uuid;
  v_searches_used integer;
  v_leads_used integer;
  v_leads_reserved integer;
  v_result_limit integer;
  v_query jsonb;
BEGIN
  IF p_user_id IS NULL OR p_idempotency_key IS NULL
     OR length(trim(p_prompt)) NOT BETWEEN 8 AND 500
     OR p_requested_result_limit NOT BETWEEN 1 AND 50 THEN
    RAISE EXCEPTION 'invalid_search_parameters';
  END IF;

  SELECT id INTO v_search_id FROM searches
  WHERE user_id = p_user_id AND idempotency_key = p_idempotency_key;
  IF v_search_id IS NOT NULL THEN RETURN v_search_id; END IF;

  SELECT * INTO v_subscription FROM subscriptions
  WHERE user_id = p_user_id FOR UPDATE;
  IF NOT FOUND OR v_subscription.status <> 'active'
     OR clock_timestamp() NOT BETWEEN v_subscription.period_start AND v_subscription.period_end THEN
    RAISE EXCEPTION 'subscription_inactive';
  END IF;

  SELECT id INTO v_search_id FROM searches
  WHERE user_id = p_user_id AND idempotency_key = p_idempotency_key;
  IF v_search_id IS NOT NULL THEN RETURN v_search_id; END IF;

  SELECT count(*) INTO v_searches_used FROM usage
  WHERE user_id = p_user_id AND type = 'search'
    AND created_at BETWEEN v_subscription.period_start AND v_subscription.period_end;
  IF v_searches_used >= v_subscription.monthly_search_limit THEN
    RAISE EXCEPTION 'search_quota_exceeded';
  END IF;

  SELECT coalesce(sum(amount), 0)::integer INTO v_leads_used FROM usage
  WHERE user_id = p_user_id AND type = 'leads'
    AND created_at BETWEEN v_subscription.period_start AND v_subscription.period_end;

  SELECT coalesce(sum(requested_result_limit), 0)::integer INTO v_leads_reserved
  FROM searches
  WHERE user_id = p_user_id
    AND status IN ('QUEUED', 'SEARCHING', 'PROCESSING', 'SCORING')
    AND created_at BETWEEN v_subscription.period_start AND v_subscription.period_end;

  v_result_limit := least(
    p_requested_result_limit,
    50,
    v_subscription.monthly_lead_limit - v_leads_used - v_leads_reserved
  );
  IF v_result_limit < 1 THEN RAISE EXCEPTION 'lead_quota_exceeded'; END IF;

  v_query := jsonb_set(
    coalesce(p_parsed_query, '{}'::jsonb),
    '{resultLimit}',
    to_jsonb(v_result_limit),
    true
  );

  INSERT INTO searches(
    user_id, prompt, parsed_query, provider, status,
    requested_result_limit, idempotency_key
  ) VALUES (
    p_user_id, trim(p_prompt), v_query, p_provider, 'QUEUED',
    v_result_limit, p_idempotency_key
  ) RETURNING id INTO v_search_id;

  INSERT INTO usage(user_id, search_id, type, amount)
  VALUES (p_user_id, v_search_id, 'search', 1);
  RETURN v_search_id;
END;
$$;

REVOKE ALL ON FUNCTION create_search_with_quota(uuid, text, jsonb, text, integer, uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION create_search_with_quota(uuid, text, jsonb, text, integer, uuid)
  TO service_role;
