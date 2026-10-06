#!/usr/bin/env bash
set -euo pipefail

# Local accounts are created inactive. This updates one local subscription so
# search can be exercised without PayU. It only talks to the local database.
EMAIL="${1:-}"
PSQL="${PSQL:-/usr/bin/psql}"
if [[ -z "${PSQL}" || ! -x "${PSQL}" ]]; then
  echo "Local psql was not found. Start Supabase first." >&2
  exit 1
fi

DB_URL="${DB_URL:-postgresql://postgres:postgres@127.0.0.1:54322/postgres}"
export PGCONNECT_TIMEOUT="${PGCONNECT_TIMEOUT:-10}"

if [[ -n "${EMAIL}" ]]; then
  "${PSQL}" "${DB_URL}" -v ON_ERROR_STOP=1 -v email="${EMAIL}" <<'SQL'
UPDATE subscriptions AS s
SET plan = 'basic',
    status = 'active',
    monthly_search_limit = 60,
    monthly_lead_limit = 3000,
    period_start = now(),
    period_end = now() + interval '30 days'
FROM auth.users AS u
WHERE s.user_id = u.id
  AND u.email = :'email';
SQL
else
  "${PSQL}" "${DB_URL}" -v ON_ERROR_STOP=1 <<'SQL'
UPDATE subscriptions AS s
SET plan = 'basic',
    status = 'active',
    monthly_search_limit = 60,
    monthly_lead_limit = 3000,
    period_start = now(),
    period_end = now() + interval '30 days'
WHERE s.user_id = (
  SELECT id FROM auth.users ORDER BY created_at DESC LIMIT 1
);
SQL
fi
