#!/usr/bin/env bash
# One-command backend bootstrap. From repo root:  ./scripts/run_backend.sh
set -euo pipefail
cd "$(dirname "$0")/../backend"

if [ ! -d ".venv" ]; then
  echo "Creating virtualenv..."
  python3 -m venv .venv
fi
# shellcheck disable=SC1091
source .venv/bin/activate

pip install --quiet --upgrade pip
pip install --quiet -r requirements.txt

if [ ! -f ".env" ]; then
  cp .env.example .env
  echo "Created backend/.env from .env.example (FRED key optional)"
fi

echo "Starting FastAPI on http://127.0.0.1:8000"
exec uvicorn main:app --reload --port 8000 --host 0.0.0.0
