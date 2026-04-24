#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"

require_cmd() {
  local cmd="$1"
  if ! command -v "${cmd}" >/dev/null 2>&1; then
    echo "Missing required command: ${cmd}"
    exit 1
  fi
}

require_cmd python3
require_cmd npm
require_cmd osascript

echo "Project root: ${ROOT_DIR}"

echo "Opening backend and frontend in separate Terminal windows..."

osascript <<EOF
tell application "Terminal"
  activate
  do script "cd \"$BACKEND_DIR\"; python3 app.py"
  do script "cd \"$FRONTEND_DIR\"; npm run dev"
end tell
EOF

echo "Backend: http://localhost:9999"
echo "Frontend: check URL shown by Vite (usually http://localhost:5173)"
echo "Use Ctrl+C in each terminal window/tab to stop each service."
