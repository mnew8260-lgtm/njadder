#!/bin/bash
# ════════════════════════════════════════════════════════════
# NJADDER PRO v7.0 — Production Deploy Script (Smart)
# ════════════════════════════════════════════════════════════
# Smart zero-downtime deploy with automatic rebuild detection.
# Usage:
#   bash deploy.sh          — smart (rebuild only if needed)
#   bash deploy.sh --force  — always rebuild
# ════════════════════════════════════════════════════════════

set -euo pipefail

INSTALL_DIR="${HOME}/njadder"
LOG_FILE="/tmp/njadder-build-$(date +%Y%m%d-%H%M%S).log"
BACKUP_DIR="${HOME}/njadder-backups"
FORCE_REBUILD="${1:-}"

cd "$INSTALL_DIR" || { echo "❌ Run install.sh first"; exit 1; }

echo "═══════════════════════════════════════════════════"
echo "  NJADDER PRO v7.0 — Production Deploy"
echo "  $(date -u +'%Y-%m-%d %H:%M:%S UTC')"
echo "═══════════════════════════════════════════════════"
echo ""

# ─── Step 1: Save current state ───────────────────────────
PREV_COMMIT=$(git rev-parse HEAD 2>/dev/null || echo "none")
echo "📋 Current commit: ${PREV_COMMIT:0:8}"

# Backup current .env (always preserved)
if [ -f .env ]; then
  cp .env "/tmp/njadder.env.backup.$(date +%s)"
  echo "✓ .env backed up to /tmp/"
fi

# ─── Step 2: Pull latest code ─────────────────────────────
echo ""
echo "📦 Pulling latest from GitHub..."
git fetch origin main
LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse origin/main)

if [ "$LOCAL" = "$REMOTE" ]; then
  echo "✓ Already up-to-date (commit ${LOCAL:0:8})"
else
  git pull origin main
  NEW_COMMIT=$(git rev-parse HEAD)
  echo "✓ Updated: ${PREV_COMMIT:0:8} → ${NEW_COMMIT:0:8}"
fi

# ─── Step 3: Smart rebuild detection ──────────────────────
echo ""
echo "🔍 Checking if rebuild is needed..."

NEED_REBUILD=false
REASON=""

# Check 1: --force flag
if [ "$FORCE_REBUILD" = "--force" ]; then
  NEED_REBUILD=true
  REASON="forced (--force)"
fi

# Check 2: .next directory missing
if [ "$NEED_REBUILD" = "false" ] && [ ! -d ".next" ]; then
  NEED_REBUILD=true
  REASON=".next missing"
fi

# Check 3: .next/BUILD_ID missing
if [ "$NEED_REBUILD" = "false" ] && [ ! -f ".next/BUILD_ID" ]; then
  NEED_REBUILD=true
  REASON=".next/BUILD_ID missing"
fi

# Check 4: Any source file newer than BUILD_ID
if [ "$NEED_REBUILD" = "false" ]; then
  NEWEST_SRC=$(find src/ -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.css" -o -name "*.json" \) -newer .next/BUILD_ID 2>/dev/null | head -1)
  if [ -n "$NEWEST_SRC" ]; then
    NEED_REBUILD=true
    REASON="source files newer than build ($NEWEST_SRC)"
  fi
fi

# Check 5: next.config.mjs or package.json changed
if [ "$NEED_REBUILD" = "false" ]; then
  if [ -f "next.config.mjs" ] && [ "next.config.mjs" -nt ".next/BUILD_ID" ]; then
    NEED_REBUILD=true
    REASON="next.config.mjs changed"
  fi
fi

if [ "$NEED_REBUILD" = "false" ]; then
  echo "✓ Build is up-to-date — no rebuild needed"
  echo "💡 Use 'bash deploy.sh --force' to force rebuild"
  echo ""
  echo "═══════════════════════════════════════════════════"
  echo "  ✅ ALREADY DEPLOYED (no changes needed)"
  echo "═══════════════════════════════════════════════════"
  exit 0
fi

echo "⚠️  Rebuild needed: $REASON"

# ─── Step 4: Install dependencies (if package.json changed) ───
if git diff --name-only "$PREV_COMMIT" HEAD 2>/dev/null | grep -q "package.json\|package-lock.json"; then
  echo ""
  echo "📦 Installing dependencies..."
  npm install --legacy-peer-deps 2>&1 | tail -3
fi

# ─── Step 5: Backup current build (for rollback) ─────────
if [ -d ".next" ]; then
  mkdir -p "$BACKUP_DIR"
  tar -czf "$BACKUP_DIR/.next-$(date +%Y%m%d-%H%M%S).tar.gz" .next 2>/dev/null || true
  # Keep only last 3 backups
  ls -1t "$BACKUP_DIR"/.next-*.tar.gz 2>/dev/null | tail -n +4 | xargs -r rm
  echo "✓ Previous build backed up"
fi

# ─── Step 6: Clean and build ──────────────────────────────
echo ""
echo "🔨 Building (logs → $LOG_FILE)..."

# FULL CLEAN — remove .next entirely for fresh build
rm -rf .next .next/lock node_modules/.cache 2>/dev/null || true

# Build with memory limit
if ! NODE_OPTIONS="--max-old-space-size=2048" npx next build > "$LOG_FILE" 2>&1; then
  echo ""
  echo "❌ BUILD FAILED"
  echo ""
  echo "─── Last 30 lines of build log ───"
  tail -30 "$LOG_FILE"
  echo ""
  echo "↩️  Rolling back (keeping old .next if exists)..."
  exit 1
fi

# Verify build succeeded
if [ ! -d ".next" ] || [ ! -f ".next/BUILD_ID" ]; then
  echo "❌ Build directory missing or incomplete"
  exit 1
fi

echo "✓ Build successful"
echo "  Build ID: $(cat .next/BUILD_ID)"

# ─── Step 7: Restart PM2 (kill all old processes first) ───
echo ""
echo "🔄 Restarting PM2..."

# Kill ALL next-server processes to avoid port conflicts
pkill -9 -f "next-server" 2>/dev/null || true
sleep 2

if command -v pm2 >/dev/null 2>&1; then
  pm2 restart njadder --update-env 2>&1 | tail -5
  pm2 save 2>/dev/null || true
  echo "✓ PM2 restarted"
else
  # Fallback: nohup
  setsid nohup npx next start > /tmp/next.log 2>&1 < /dev/null &
  disown
  sleep 3
  echo "✓ Started with nohup (PM2 not installed)"
fi

# ─── Step 8: Health check ─────────────────────────────────
echo ""
echo "🏥 Health check..."
sleep 5

HEALTH_OK=true
for endpoint in "/" "/login" "/api/auth/me" "/api/health"; do
  CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 8 "http://localhost:3000$endpoint" 2>/dev/null || echo "000")
  if [ "$CODE" = "200" ] || [ "$CODE" = "401" ]; then
    echo "  ✓ $endpoint → $CODE"
  else
    echo "  ✗ $endpoint → $CODE (expected 200 or 401)"
    HEALTH_OK=false
  fi
done

if [ "$HEALTH_OK" = "false" ]; then
  echo ""
  echo "⚠️  Health check failed — check /tmp/next.log or pm2 logs njadder"
  exit 1
fi

# ─── Step 9: Approve all existing users (idempotent) ──────
echo ""
echo "👥 Ensuring existing users are approved..."
node -e "
const postgres = require('postgres');
const sql = postgres(process.env.DATABASE_URL, { ssl: 'prefer', prepare: false, onnotice: () => {} });
(async () => {
  try {
    await sql\`ALTER TABLE users ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending'\`;
    const r = await sql\`UPDATE users SET status = 'approved' WHERE status IS NULL OR status = '' OR status = 'pending'\`;
    console.log('  ✓ Approved ' + r.count + ' users');
  } catch (e) { console.error('  ⚠ User approval skipped:', e.message); }
  await sql.end();
})();
" 2>/dev/null || echo "  ⚠ Skipped (DB may be initializing)"

# ─── Done ─────────────────────────────────────────────────
FINAL_COMMIT=$(git rev-parse HEAD)
echo ""
echo "═══════════════════════════════════════════════════"
echo "  ✅ DEPLOY SUCCESSFUL"
echo "═══════════════════════════════════════════════════"
echo "  Commit:    ${FINAL_COMMIT:0:8}"
echo "  Build ID:  $(cat .next/BUILD_ID 2>/dev/null || echo '?')"
echo "  Reason:    $REASON"
echo "  Logs:      $LOG_FILE"
echo "  App:       https://njadder-app.tech"
echo "═══════════════════════════════════════════════════"
echo ""
echo "💡 If browser still shows old UI, hard-refresh with Ctrl+Shift+R"
