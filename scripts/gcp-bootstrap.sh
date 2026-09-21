#!/usr/bin/env bash
# Bootstrap on gcp-vm. Does not touch scalepathology or ports 20201/20202 (Ops Agent).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PORT="${ATRIUM_PORT:-3080}"
DEMO_PORT="${ATRIUM_DEMO_PORT:-3081}"
NODE_VER="${ATRIUM_NODE_VER:-24.16.0}"
NODE_DIR="$ROOT/.node"
export PATH="$NODE_DIR/bin:$PATH"
export TIMEWEB_ONLY=1
unset NODE_ENV

if [[ ! -x "$NODE_DIR/bin/node" ]]; then
  echo "Node $NODE_VER → $NODE_DIR"
  tmp="$(mktemp -d)"
  curl -fsSL "https://nodejs.org/dist/v${NODE_VER}/node-v${NODE_VER}-linux-x64.tar.xz" -o "$tmp/node.tar.xz"
  mkdir -p "$NODE_DIR"
  tar -xJf "$tmp/node.tar.xz" -C "$tmp"
  rm -rf "$NODE_DIR"
  mv "$tmp/node-v${NODE_VER}-linux-x64" "$NODE_DIR"
  rm -rf "$tmp"
fi

echo "node $(node -v) npm $(npm -v)"

if ! grep -q ai-mkt-swap /proc/swaps 2>/dev/null; then
  swap="$HOME/.cache/ai-mkt.swap"
  mkdir -p "$(dirname "$swap")"
  if [[ ! -f "$swap" ]]; then
    echo "swap 1G for next build (home only, not OS disk layout)"
    sudo fallocate -l 1G "$swap" || sudo dd if=/dev/zero of="$swap" bs=1M count=1024 status=none
    sudo chmod 600 "$swap"
    sudo mkswap "$swap" >/dev/null
  fi
  sudo swapon "$swap" || true
fi

npm ci
export NODE_OPTIONS="${NODE_OPTIONS:---max-old-space-size=768}"
export NODE_PATH="$ROOT/node_modules"

echo "build market"
rm -rf .next
NEXT_PUBLIC_ATRIUM_APP=market npm run build
echo "build demo"
rm -rf .next-demo
NEXT_PUBLIC_ATRIUM_APP=demo npm run build

unit_dir="$HOME/.config/systemd/user"
mkdir -p "$unit_dir"

cat >"$unit_dir/ai-mkt.service" <<EOF
[Unit]
Description=Atrium marketplace for jury (port ${PORT})
After=network.target

[Service]
Type=simple
WorkingDirectory=${ROOT}
Environment=NODE_ENV=production
Environment=TIMEWEB_ONLY=1
Environment=NEXT_PUBLIC_ATRIUM_APP=market
Environment=PATH=${NODE_DIR}/bin:/usr/bin:/bin
EnvironmentFile=-${ROOT}/.env.local
ExecStart=${NODE_DIR}/bin/node ${ROOT}/node_modules/next/dist/bin/next start --hostname 0.0.0.0 --port ${PORT}
Restart=on-failure
RestartSec=4

[Install]
WantedBy=default.target
EOF

cat >"$unit_dir/ai-mkt-demo.service" <<EOF
[Unit]
Description=Atrium demo walkthrough for jury (port ${DEMO_PORT})
After=network.target

[Service]
Type=simple
WorkingDirectory=${ROOT}
Environment=NODE_ENV=production
Environment=TIMEWEB_ONLY=1
Environment=NEXT_PUBLIC_ATRIUM_APP=demo
Environment=PATH=${NODE_DIR}/bin:/usr/bin:/bin
EnvironmentFile=-${ROOT}/.env.local
ExecStart=${NODE_DIR}/bin/node ${ROOT}/node_modules/next/dist/bin/next start --hostname 0.0.0.0 --port ${DEMO_PORT}
Restart=on-failure
RestartSec=4

[Install]
WantedBy=default.target
EOF

sudo loginctl enable-linger "$USER"
sleep 1
export XDG_RUNTIME_DIR="${XDG_RUNTIME_DIR:-/run/user/$(id -u)}"
systemctl --user daemon-reload
systemctl --user enable --now ai-mkt.service ai-mkt-demo.service
systemctl --user restart ai-mkt.service ai-mkt-demo.service

echo "=== units ==="
systemctl --user --no-pager --full status ai-mkt.service ai-mkt-demo.service || true

echo "=== wait ports ${PORT} (market) and ${DEMO_PORT} (demo) ==="
for i in $(seq 1 30); do
  if curl -sf -o /dev/null "http://127.0.0.1:${PORT}/login" && curl -sf -o /dev/null "http://127.0.0.1:${DEMO_PORT}/demo"; then
    echo "ok market :${PORT}  demo :${DEMO_PORT}"
    ss -lntp | grep -E ":${PORT}|:${DEMO_PORT}" || true
    exit 0
  fi
  sleep 2
done
echo "services did not answer in time"
systemctl --user --no-pager --full status ai-mkt.service ai-mkt-demo.service || true
ss -lntp | grep -E ":${PORT}|:${DEMO_PORT}|20201|20202" || true
exit 1
