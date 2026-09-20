-- Limit both existing and future free trials to ten total leads. The database
-- remains the source of truth even if a client requests a larger result count.
UPDATE subscriptions
SET monthly_lead_limit = 10,
    updated_at = clock_timestamp()
WHERE plan = 'free';

ALTER TABLE subscriptions
  ALTER COLUMN monthly_lead_limit SET DEFAULT 10;

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
  v_plan_result_cap integer;
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
  IF NOT FOUND OR v_subscription.status NOT IN ('active', 'trial')
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

  v_plan_result_cap := CASE WHEN v_subscription.plan = 'free' THEN 10 ELSE 50 END;
  v_result_limit := least(
    p_requested_result_limit,
    v_plan_result_cap,
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
