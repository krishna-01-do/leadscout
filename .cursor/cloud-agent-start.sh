#!/usr/bin/env bash
set -euo pipefail

export SUPABASE_TELEMETRY_DISABLED=1
export SUPABASE_EXPERIMENTAL_STACK=1

NODE_BIN="$(find /home/ubuntu/.nvm/versions/node -mindepth 1 -maxdepth 1 -type d -name 'v22*' | sort -V | tail -1)/bin"
if [[ ! -x "${NODE_BIN}/npm" ]]; then
  echo "Node.js 22 was not found under ~/.nvm" >&2
  exit 1
fi
export PATH="${NODE_BIN}:${PATH}"
cd /workspace

if [[ ! -f supabase/config.toml ]]; then
  echo "supabase/config.toml is missing. The install step did not finish." >&2
  exit 1
fi

if ! curl -sf -o /dev/null --max-time 3 http://127.0.0.1:54321/auth/v1/health; then
  supabase start --runtime native --eager \
    --exclude studio,realtime,storage,functions,mail,analytics,pooler
fi

if [[ -e /usr/local/bin/psql ]]; then
  sudo rm -f /usr/local/bin/psql
fi

eval "$(python3 - <<'PY'
import json, subprocess

raw = subprocess.check_output(
    ["supabase", "status", "--env", "--output-format", "json"],
    text=True,
)
data = json.loads(raw)
env = data.get("env", data)

def sh(value: str) -> str:
    return "'" + value.replace("'", "'\"'\"'") + "'"

pairs = {
    "NEXT_PUBLIC_SUPABASE_URL": env["API_URL"],
    "NEXT_PUBLIC_SUPABASE_ANON_KEY": env["ANON_KEY"],
    "SUPABASE_SERVICE_ROLE_KEY": env["SERVICE_ROLE_KEY"],
    "BUSINESS_SEARCH_PROVIDER": "mock",
    "NEXT_PUBLIC_APP_URL": "http://localhost:3000",
    "APP_ENV": "development",
    "ENABLE_BRAVE_PROSPECTING": "false",
    "OPENAI_MODEL": "gpt-5-mini",
    "CONTACT_RATE_LIMIT_SECRET": "local-dev-contact-rate-limit",
}
lines = [f"{key}={value}" for key, value in pairs.items()]
open(".env.local", "w", encoding="utf-8").write("\n".join(lines) + "\n")
for key, value in pairs.items():
    print(f"export {key}={sh(value)}")
PY
)"

# The dev server stays in the foreground on boot. On a rerun, leave the existing listener alone.
if (echo >/dev/tcp/127.0.0.1/3000) >/dev/null 2>&1; then
  exit 0
fi

exec npm run dev -- --port 3000 --hostname 0.0.0.0
