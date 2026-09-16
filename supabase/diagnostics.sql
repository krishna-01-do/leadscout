-- Read-only diagnostics. Run in Supabase SQL Editor if a live flow fails.
-- No credentials, payment payloads, email addresses, or business data are selected.
SELECT s.id, s.status, s.error_code, s.error_message, s.created_at,
       p.external_run_id, p.status AS provider_status, p.metadata->>'failure' AS processing_failure
FROM public.searches s LEFT JOIN public.provider_runs p ON p.search_id = s.id
ORDER BY s.created_at DESC LIMIT 10;

SELECT txnid, plan, status, completed_at, created_at
FROM public.payments ORDER BY created_at DESC LIMIT 10;

SELECT indexname, indexdef FROM pg_indexes
WHERE schemaname = 'public' AND tablename IN ('usage', 'businesses', 'search_results', 'subscriptions');

SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS arguments
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.proname IN ('complete_payu_payment', 'create_search_with_quota', 'fail_search_and_refund');
