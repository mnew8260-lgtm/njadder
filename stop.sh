#!/bin/bash
# NJADDER — Stop script
# Usage: bash stop.sh

if command -v pm2 >/dev/null 2>&1; then
  pm2 stop njadder 2>/dev/null && echo "✅ NJADDER stopped" || echo "NJADDER not running"
else
  pkill -f "next start" 2>/dev/null && echo "✅ NJADDER stopped" || echo "NJADDER not running"
fi
