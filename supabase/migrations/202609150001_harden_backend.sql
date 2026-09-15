-- Server-owned writes, atomic quota reservation, idempotency, and API rate limits.

ALTER TABLE searches ADD COLUMN IF NOT EXISTS idempotency_key uuid;
UPDATE searches SET idempotency_key = gen_random_uuid() WHERE idempotency_key IS NULL;
ALTER TABLE searches ALTER COLUMN idempotency_key SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_one_per_user ON subscriptions(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS searches_user_idempotency ON searches(user_id, idempotency_key);
CREATE UNIQUE INDEX IF NOT EXISTS usage_one_type_per_search
  ON usage(search_id, type) WHERE search_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS search_results_one_business_per_search
  ON search_results(search_id, business_id);
CREATE UNIQUE INDEX IF NOT EXISTS provider_runs_external_run_unique
  ON provider_runs(external_run_id) WHERE external_run_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS provider_runs_one_per_search ON provider_runs(search_id);

-- Authenticated clients may read their own records, but only the backend may mutate
-- billing, quota, search execution, provider, business, and result state.
DROP POLICY IF EXISTS "insert_own_subscription" ON subscriptions;
DROP POLICY IF EXISTS "update_own_subscription" ON subscriptions;
DROP POLICY IF EXISTS "insert_own_searches" ON searches;
DROP POLICY IF EXISTS "update_own_searches" ON searches;
DROP POLICY IF EXISTS "insert_own_usage" ON usage;
DROP POLICY IF EXISTS "update_own_usage" ON usage;
DROP POLICY IF EXISTS "insert_businesses" ON businesses;
DROP POLICY IF EXISTS "update_businesses" ON businesses;
DROP POLICY IF EXISTS "insert_own_search_results" ON search_results;
DROP POLICY IF EXISTS "update_own_search_results" ON search_results;
DROP POLICY IF EXISTS "insert_own_provider_runs" ON provider_runs;
DROP POLICY IF EXISTS "update_own_provider_runs" ON provider_runs;

CREATE TABLE IF NOT EXISTS rate_limit_buckets (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action text NOT NULL,
  bucket_start timestamptz NOT NULL,
  request_count integer NOT NULL DEFAULT 1 CHECK (request_count > 0),
  PRIMARY KEY (user_id, action, bucket_start)
);
ALTER TABLE rate_limit_buckets ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION check_rate_limit(
  p_user_id uuid,
  p_action text,
  p_limit integer,
  p_window_seconds integer
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_bucket timestamptz;
  v_count integer;
BEGIN
  IF p_user_id IS NULL OR length(p_action) NOT BETWEEN 1 AND 80
     OR p_limit NOT BETWEEN 1 AND 1000 OR p_window_seconds NOT BETWEEN 1 AND 86400 THEN
    RAISE EXCEPTION 'invalid_rate_limit_parameters';
  END IF;
  v_bucket := to_timestamp(
    floor(extract(epoch FROM clock_timestamp()) / p_window_seconds) * p_window_seconds
  );
  INSERT INTO rate_limit_buckets(user_id, action, bucket_start, request_count)
  VALUES (p_user_id, p_action, v_bucket, 1)
  ON CONFLICT (user_id, action, bucket_start)
  DO UPDATE SET request_count = rate_limit_buckets.request_count + 1
  RETURNING request_count INTO v_count;
  RETURN v_count <= p_limit;
END;
$$;

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
  v_used integer;
BEGIN
  IF p_user_id IS NULL OR p_idempotency_key IS NULL
     OR length(trim(p_prompt)) NOT BETWEEN 8 AND 500
     OR p_requested_result_limit NOT BETWEEN 1 AND 100 THEN
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

  -- A concurrent request with the same key may have completed while this call
  -- waited for the subscription lock.
  SELECT id INTO v_search_id FROM searches
  WHERE user_id = p_user_id AND idempotency_key = p_idempotency_key;
  IF v_search_id IS NOT NULL THEN RETURN v_search_id; END IF;

  SELECT count(*) INTO v_used FROM usage
  WHERE user_id = p_user_id AND type = 'search'
    AND created_at BETWEEN v_subscription.period_start AND v_subscription.period_end;
  IF v_used >= v_subscription.monthly_search_limit THEN
    RAISE EXCEPTION 'search_quota_exceeded';
  END IF;

  INSERT INTO searches(
    user_id, prompt, parsed_query, provider, status,
    requested_result_limit, idempotency_key
  ) VALUES (
    p_user_id, trim(p_prompt), p_parsed_query, p_provider, 'QUEUED',
    p_requested_result_limit, p_idempotency_key
  ) RETURNING id INTO v_search_id;

  INSERT INTO usage(user_id, search_id, type, amount)
  VALUES (p_user_id, v_search_id, 'search', 1);
  RETURN v_search_id;
END;
$$;

CREATE OR REPLACE FUNCTION fail_search_and_refund(
  p_search_id uuid,
  p_error_code text,
  p_error_message text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_status text;
BEGIN
  SELECT status INTO v_status FROM searches WHERE id = p_search_id FOR UPDATE;
  IF NOT FOUND OR v_status IN ('COMPLETED', 'FAILED') THEN RETURN; END IF;
  UPDATE searches SET
    status = 'FAILED', error_code = left(p_error_code, 80),
    error_message = left(p_error_message, 500), completed_at = now()
  WHERE id = p_search_id;
  DELETE FROM search_results WHERE search_id = p_search_id;
  DELETE FROM usage WHERE search_id = p_search_id AND type IN ('search', 'leads');
END;
$$;

REVOKE ALL ON FUNCTION check_rate_limit(uuid, text, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION create_search_with_quota(uuid, text, jsonb, text, integer, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION fail_search_and_refund(uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION check_rate_limit(uuid, text, integer, integer) TO service_role;
GRANT EXECUTE ON FUNCTION create_search_with_quota(uuid, text, jsonb, text, integer, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION fail_search_and_refund(uuid, text, text) TO service_role;

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name')
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO subscriptions (
    user_id, plan, status, monthly_search_limit, monthly_lead_limit, period_start, period_end
  ) VALUES (NEW.id, 'free', 'trial', 1, 20, now(), now() + interval '30 days')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;
