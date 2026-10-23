#!/bin/bash
# NJADDER — Start script
# Usage: bash start.sh

INSTALL_DIR="${HOME}/njadder"
cd "$INSTALL_DIR" || { echo "Run install.sh first"; exit 1; }

if command -v pm2 >/dev/null 2>&1; then
  pm2 restart njadder 2>/dev/null || pm2 start npm --name "njadder" -- start
  pm2 status njadder
  echo ""
  echo "✅ NJADDER running"
  echo "🌐 http://localhost:3000"
  echo "📋 Logs: pm2 logs njadder"
else
  echo "Starting with npm..."
  nohup npm run start > /tmp/njadder.log 2>&1 &
  echo "✅ NJADDER started (PID: $!)"
  echo "🌐 http://localhost:3000"
  echo "📋 Logs: tail -f /tmp/njadder.log"
fi
