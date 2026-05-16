#!/usr/bin/env bash
# Share the running frontend via a temporary public URL.
# Tries ngrok → cloudflared → lt (localtunnel) in that order. Requires
# the frontend (port 5173) to already be running.
#
# Usage:  ./scripts/share.sh [port]
set -euo pipefail
PORT="${1:-5173}"

if command -v ngrok >/dev/null 2>&1; then
  echo "Using ngrok. The dashboard will appear at the URL printed below."
  echo "Sign up free at https://dashboard.ngrok.com/ and run 'ngrok config add-authtoken <token>' once."
  exec ngrok http "$PORT"
elif command -v cloudflared >/dev/null 2>&1; then
  echo "Using cloudflared (no signup needed)."
  exec cloudflared tunnel --url "http://localhost:$PORT"
elif command -v lt >/dev/null 2>&1; then
  echo "Using localtunnel."
  exec lt --port "$PORT"
else
  cat <<EOF
No tunnel tool found. Install one of:

  ngrok          https://ngrok.com/download
  cloudflared    https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/
  localtunnel    npm install -g localtunnel

Or run one of them manually:

  ngrok http $PORT
  cloudflared tunnel --url http://localhost:$PORT
  lt --port $PORT
EOF
  exit 1
fi
