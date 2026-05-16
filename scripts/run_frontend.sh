#!/usr/bin/env bash
# One-command frontend bootstrap. From repo root:  ./scripts/run_frontend.sh
set -euo pipefail
cd "$(dirname "$0")/../frontend"

if [ ! -d "node_modules" ]; then
  echo "Installing npm dependencies..."
  npm install --no-audit --no-fund
fi

echo "Starting Vite dev server on http://127.0.0.1:5173"
exec npm run dev
