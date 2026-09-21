#!/usr/bin/env bash
# Open 3080/3081 for jury via instance service account. Never touches 20201/20202.
set -euo pipefail

PORT="${ATRIUM_PORT:-3080}"
DEMO_PORT="${ATRIUM_DEMO_PORT:-3081}"
NAME="allow-ai-mkt-jury"

token_json="$(curl -sf -H "Metadata-Flavor: Google" \
  "http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token" || true)"
if [[ -z "$token_json" ]]; then
  echo "no instance token — open tcp:${PORT},${DEMO_PORT} in GCP VPC firewall if the jury is outside"
  exit 0
fi
token="$(python3 -c 'import json,sys; print(json.load(sys.stdin)["access_token"])' <<<"$token_json")"
project="$(curl -sf -H "Metadata-Flavor: Google" http://metadata.google.internal/computeMetadata/v1/project/project-id)"
api="https://compute.googleapis.com/compute/v1/projects/${project}/global/firewalls"

code="$(curl -s -o /tmp/fw.json -w "%{http_code}" -H "Authorization: Bearer ${token}" "${api}/${NAME}")"
if [[ "$code" == "200" ]]; then
  echo "firewall $NAME already exists"
  exit 0
fi

echo "create firewall $NAME tcp:${PORT},${DEMO_PORT}"
payload="$(python3 - "$NAME" "$PORT" "$DEMO_PORT" <<'PY'
import json, sys
name, port, demo = sys.argv[1], sys.argv[2], sys.argv[3]
print(json.dumps({
    "name": name,
    "description": "Atrium jury demo next to scalepathology. Not Ops Agent 20201/20202.",
    "network": "global/networks/default",
    "direction": "INGRESS",
    "priority": 1000,
    "allowed": [{"IPProtocol": "tcp", "ports": [port, demo]}],
    "sourceRanges": ["0.0.0.0/0"],
}))
PY
)"
curl -sS -X POST "$api" \
  -H "Authorization: Bearer ${token}" \
  -H "Content-Type: application/json" \
  -d "$payload" | python3 -c 'import json,sys; d=json.load(sys.stdin); print(d.get("name") or d.get("error", d))'
