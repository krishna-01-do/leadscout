-- Atomic PayU completion and abuse-resistant contact submission.

ALTER TABLE contact_messages ADD COLUMN IF NOT EXISTS ip_hash text;
ALTER TABLE contact_messages ADD COLUMN IF NOT EXISTS notification_status text NOT NULL DEFAULT 'pending'
  CHECK (notification_status IN ('pending', 'sent', 'failed'));

CREATE INDEX IF NOT EXISTS contact_messages_ip_created_at_idx
  ON contact_messages(ip_hash, created_at DESC);
CREATE INDEX IF NOT EXISTS contact_messages_email_created_at_idx
  ON contact_messages(lower(email), created_at DESC);

CREATE OR REPLACE FUNCTION submit_contact_message(
  p_name text,
  p_email text,
  p_subject text,
  p_message text,
  p_ip_hash text,
  p_user_id uuid DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF length(trim(p_name)) NOT BETWEEN 2 AND 100
    OR length(trim(p_email)) NOT BETWEEN 3 AND 254
    OR length(trim(p_subject)) NOT BETWEEN 3 AND 150
    OR length(trim(p_message)) NOT BETWEEN 10 AND 5000
    OR length(p_ip_hash) < 32 THEN
    RAISE EXCEPTION 'invalid_contact_message';
  END IF;

  -- Serialize submissions from the same anonymized source so concurrent requests
  -- cannot race past the limits below.
  PERFORM pg_advisory_xact_lock(hashtext(p_ip_hash));

  IF (SELECT count(*) FROM contact_messages
      WHERE ip_hash = p_ip_hash AND created_at >= clock_timestamp() - interval '1 hour') >= 3
    OR (SELECT count(*) FROM contact_messages
        WHERE lower(email) = lower(trim(p_email)) AND created_at >= clock_timestamp() - interval '1 day') >= 5 THEN
    RAISE EXCEPTION 'contact_rate_limit_exceeded';
  END IF;

  INSERT INTO contact_messages(name, email, subject, message, ip_hash, user_id)
  VALUES (trim(p_name), lower(trim(p_email)), trim(p_subject), trim(p_message), p_ip_hash, p_user_id)
  RETURNING id INTO v_id;
  RETURN v_id;
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
  IF v_payment.plan = 'starter' THEN v_searches := 50; v_leads := 500;
  ELSIF v_payment.plan = 'pro' THEN v_searches := 200; v_leads := 2000;
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

REVOKE ALL ON FUNCTION submit_contact_message(text, text, text, text, text, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION complete_payu_payment(text, text, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION submit_contact_message(text, text, text, text, text, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION complete_payu_payment(text, text, jsonb) TO service_role;
