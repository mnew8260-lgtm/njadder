#!/bin/bash
# NJADDER — Update script
# Usage: bash update.sh

INSTALL_DIR="${HOME}/njadder"
cd "$INSTALL_DIR" || { echo "Run install.sh first"; exit 1; }

echo "📦 Pulling latest changes..."
git pull origin main

echo "📦 Installing packages..."
npm install --no-optional 2>/dev/null || npm install --legacy-peer-deps

echo "🔨 Building..."
export NODE_OPTIONS="--max-old-space-size=1024"
npm run build || { echo "❌ Build failed"; exit 1; }

if command -v pm2 >/dev/null 2>&1; then
  pm2 restart njadder
  echo "✅ NJADDER updated and restarted"
else
  echo "✅ Update complete. Run: bash start.sh"
fi
