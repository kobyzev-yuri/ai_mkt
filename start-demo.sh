#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
export NEXT_PUBLIC_ATRIUM_APP=demo
echo "Atrium · демо-прогон  http://127.0.0.1:3001/demo"
echo "Без входа. Кэш: .next-demo  Маркетплейс — ./start-marketplace.sh"
exec npx next dev --port 3001 --hostname 127.0.0.1
