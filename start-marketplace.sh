#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
export NEXT_PUBLIC_ATRIUM_APP=market
echo "Atrium · маркетплейс  http://127.0.0.1:3000"
echo "Кабинеты закупки и поставки. Демо-прогон — ./start-demo.sh"
exec npx next dev --port 3000 --hostname 127.0.0.1
