#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
export NEXT_PUBLIC_ATRIUM_APP=market
echo "Atrium · маркетплейс  http://127.0.0.1:3000/login"
echo "Демо-логины на карточках: закуп 1111–1114, поставка 2222–2227, владелец 0000"
echo "Демо-прогон без входа — ./start-demo.sh → http://127.0.0.1:3001/demo"
exec npx next dev --port 3000 --hostname 127.0.0.1
