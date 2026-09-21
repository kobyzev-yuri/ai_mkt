#!/usr/bin/env bash
# Regular deploy of Atrium to Host gcp-vm, next to scalepathology.
# Does not install Ollama. LLM is Timeweb AI Gateway only.
# Does not bind 20201/20202 (Google Ops Agent).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
HOST="${DEPLOY_HOST:-gcp-vm}"
REMOTE_DIR="${DEPLOY_REMOTE_DIR:-ai_mkt}"
PORT="${ATRIUM_PORT:-3080}"
DEMO_PORT="${ATRIUM_DEMO_PORT:-3081}"
KEY_FILE="${TIMEWEB_KEY_FILE:-$HOME/keys/tw_sandkrit.txt}"

ssh -o BatchMode=yes "$HOST" "mkdir -p ~/${REMOTE_DIR}; command -v rsync >/dev/null || sudo DEBIAN_FRONTEND=noninteractive apt-get install -y rsync"

rsync -az --delete \
  --exclude '.git/' \
  --exclude 'node_modules/' \
  --exclude '.next/' \
  --exclude '.next-demo/' \
  --exclude 'data/*.sqlite' \
  --exclude 'data/*.sqlite-*' \
  --exclude '.node/' \
  --exclude '.env*' \
  --exclude '.swap' \
  --exclude 'tsconfig.tsbuildinfo' \
  --exclude '.cursor/' \
  --exclude 'AGENTS.md' \
  --exclude 'CLAUDE.md' \
  --exclude '.next/dev/' \
  "$ROOT/" "$HOST:$REMOTE_DIR/"

if ssh -o BatchMode=yes "$HOST" "test -s ~/${REMOTE_DIR}/.env.local"; then
  echo "Timeweb key on VM: keep existing .env.local"
else
  python3 - "$KEY_FILE" <<'PY' | ssh -o BatchMode=yes "$HOST" "cat > ~/${REMOTE_DIR}/.env.local && chmod 600 ~/${REMOTE_DIR}/.env.local"
import pathlib, sys
p = pathlib.Path(sys.argv[1])
lines = [ln.strip() for ln in p.read_text().splitlines() if ln.strip()]
if len(lines) < 2:
    raise SystemExit("need base url and key in " + str(p))
base, key = lines[0].rstrip("/"), lines[1]
print("TIMEWEB_BASE_URL=" + base)
print("TIMEWEB_API_KEY=" + key)
print("TIMEWEB_ONLY=1")
PY
  echo "Timeweb key copied to VM .env.local (chmod 600)"
fi

ssh -o BatchMode=yes "$HOST" "chmod +x ~/${REMOTE_DIR}/scripts/gcp-bootstrap.sh ~/${REMOTE_DIR}/scripts/gcp-firewall.sh; ATRIUM_PORT=${PORT} ATRIUM_DEMO_PORT=${DEMO_PORT} ~/${REMOTE_DIR}/scripts/gcp-bootstrap.sh"

ssh -o BatchMode=yes "$HOST" "ATRIUM_PORT=${PORT} ATRIUM_DEMO_PORT=${DEMO_PORT} ~/${REMOTE_DIR}/scripts/gcp-firewall.sh" || true

echo
echo "Marketplace  http://${HOST}: wait —"
ssh -o BatchMode=yes "$HOST" 'curl -s -H "Metadata-Flavor: Google" http://metadata.google.internal/computeMetadata/v1/instance/network-interfaces/0/access-configs/0/external-ip'
echo
echo "  market  http://136.116.116.95:${PORT}/login"
echo "  demo    http://136.116.116.95:${DEMO_PORT}/demo"
echo "  SSH     ssh -L ${PORT}:127.0.0.1:${PORT} -L ${DEMO_PORT}:127.0.0.1:${DEMO_PORT} ${HOST}"
