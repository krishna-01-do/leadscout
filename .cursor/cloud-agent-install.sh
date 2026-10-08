#!/usr/bin/env bash
set -euo pipefail

export DEBIAN_FRONTEND=noninteractive
export SUPABASE_TELEMETRY_DISABLED=1
export SUPABASE_EXPERIMENTAL_STACK=1

NODE_BIN="$(find /home/ubuntu/.nvm/versions/node -mindepth 1 -maxdepth 1 -type d -name 'v22*' | sort -V | tail -1)/bin"
if [[ ! -x "${NODE_BIN}/npm" ]]; then
  echo "Node.js 22 was not found under ~/.nvm" >&2
  exit 1
fi
export PATH="${NODE_BIN}:${PATH}"

cd /workspace
npm ci

SUPABASE_VERSION="2.120.0-beta.12"
if ! command -v supabase >/dev/null 2>&1 || [[ "$(supabase --version | tr -d '[:space:]')" != "${SUPABASE_VERSION}" ]]; then
  tmp="$(mktemp --suffix .deb)"
  curl -fsSL -o "$tmp" "https://github.com/supabase/cli/releases/download/v${SUPABASE_VERSION}/supabase_${SUPABASE_VERSION}_linux_amd64.deb"
  sudo dpkg -i "$tmp"
  rm -f "$tmp"
fi

if [[ ! -f supabase/config.toml ]]; then
  supabase init --yes
fi

python3 - <<'PY'
import re
from pathlib import Path

path = Path("supabase/config.toml")
text = path.read_text()
original = text
if not Path("supabase/seed.sql").exists():
    text, _ = re.subn(r"(\[db\.seed\][^\[]*?enabled = )true", r"\1false", text, count=1)

def ensure_port(src: str, section: str, port: int) -> str:
    match = re.search(rf"\[{section}\][^\[]*", src)
    if not match:
        raise SystemExit(f"missing [{section}] in supabase/config.toml")
    body = match.group(0)
    if re.search(r"(?m)^port\s*=", body):
        return src
    updated = re.sub(rf"(\[{section}\]\n)", rf"\1port = {port}\n", body, count=1)
    return src[: match.start()] + updated + src[match.end() :]

text = ensure_port(text, "api", 54321)
text = ensure_port(text, "db", 54322)
if text != original:
    path.write_text(text)
PY

# Download the native Postgres, Auth, and REST artifacts. Services stay stopped.
supabase stack prepare --runtime native \
  --capability database \
  --capability rest \
  --capability auth

# A previous local experiment replaced the portable psql launcher with a script
# that execs itself. Database migrations then hang. Restore the upstream launcher
# when the real binary is still beside it.
python3 - <<'PY'
from pathlib import Path

root = Path.home() / ".supabase/cache/stack/slim-services/postgres"
for psql in root.glob("*/linux-amd64/bin/psql"):
    bindir = psql.parent
    real = bindir / ".psql-portable-real"
    initdb = bindir / "initdb"
    if not real.is_file() or not initdb.is_file():
        continue
    text = psql.read_text(errors="replace")
    if ".psql-portable-real" in text:
        continue
    template = initdb.read_text()
    if ".initdb-portable-real" not in template:
        raise SystemExit(f"cannot restore psql launcher from {initdb}")
    psql.write_text(template.replace(".initdb-portable-real", ".psql-portable-real"))
    psql.chmod(0o755)
PY

sudo apt-get update
sudo apt-get install -y postgresql-client
hash -r
if [[ -e /usr/local/bin/psql ]]; then
  sudo rm -f /usr/local/bin/psql
fi
