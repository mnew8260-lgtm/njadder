#!/bin/bash
# ════════════════════════════════════════════════════════════
# NJADDER PRO — Python Service Setup & Start
# ════════════════════════════════════════════════════════════

set -e

INSTALL_DIR="${HOME}/njadder/python-service"

cd "$INSTALL_DIR" || { echo "❌ python-service dir not found"; exit 1; }

# ─── 1) Check Python ───
if ! command -v python3 &>/dev/null; then
    echo "📦 Installing Python..."
    apt update -y && apt install -y python3 python3-pip python3-venv
fi

# ─── 2) Create venv ───
if [ ! -d "venv" ]; then
    echo "🔧 Creating virtual environment..."
    python3 -m venv venv
fi

# ─── 3) Install deps ───
echo "📦 Installing dependencies..."
./venv/bin/pip install -r requirements.txt --quiet 2>&1 | tail -3

# ─── 4) Load .env ───
if [ -f "../.env" ]; then
    export $(grep -v '^#' ../.env | xargs)
fi

# ─── 5) Kill old process ───
pkill -f "python.*app.py" 2>/dev/null || true
sleep 1

# ─── 6) Start ───
echo "🚀 Starting Pyrogram service on port 5000..."
nohup ./venv/bin/python app.py > /tmp/pyrogram-service.log 2>&1 &
sleep 3

# ─── 7) Health check ───
HEALTH=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 http://localhost:5000/health 2>/dev/null || echo "000")
if [ "$HEALTH" = "200" ]; then
    echo "✅ Python service running on port 5000"
    curl -s http://localhost:5000/health
else
    echo "⚠️ Service may need a moment. Check: tail -20 /tmp/pyrogram-service.log"
fi
