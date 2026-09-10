#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
export LANGFLOW_COMPONENTS_PATH="$ROOT/langflow/components"
export LANGFLOW_LOAD_FLOWS_PATH="$ROOT/langflow/flows"
export LANGFLOW_LOAD_FLOWS_OVERWRITE_ON_NAME_MATCH=true
echo "components: $LANGFLOW_COMPONENTS_PATH"
echo "flows:      $LANGFLOW_LOAD_FLOWS_PATH"
echo "overwrite:  LANGFLOW_LOAD_FLOWS_OVERWRITE_ON_NAME_MATCH=true"
exec langflow run --components-path "$LANGFLOW_COMPONENTS_PATH"
