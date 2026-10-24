#!/bin/bash
# ════════════════════════════════════════════════════════════
# NJADDER PRO v7.0 — Cron Setup Script
# ════════════════════════════════════════════════════════════
# Installs cron jobs for: daily backups, health checks, log rotation
# Run once on the VPS: bash setup-cron.sh
# ════════════════════════════════════════════════════════════

set -euo pipefail

INSTALL_DIR="${HOME}/njadder"
CRON_FILE="/tmp/njadder-cron-$$"

echo "📅 Setting up NJADDER cron jobs..."
echo "   Install dir: $INSTALL_DIR"
echo ""

# ─── Build cron entries ───────────────────────────────────
cat > "$CRON_FILE" << EOF
# ═══ NJADDER PRO v7.0 — Cron Jobs ═══
# Daily DB backup at 03:00 AM
0 3 * * * cd $INSTALL_DIR && bash backup.sh >> /tmp/njadder-backup.log 2>&1

# Health check every 5 minutes (restart if down)
*/5 * * * * curl -fs -o /dev/null --max-time 5 http://localhost:3000/login || (cd $INSTALL_DIR && pm2 restart njadder >> /tmp/njadder-health.log 2>&1)

# Rotate logs weekly (keep last 4 weeks)
0 4 * * 0 find /tmp -name "njadder-*.log" -mtime +28 -delete 2>/dev/null

# Cleanup old build backups weekly (keep last 4)
0 5 * * 0 ls -1t $INSTALL_DIR-backups/.next-*.tar.gz 2>/dev/null | tail -n +5 | xargs -r rm
EOF

# ─── Merge with existing crontab ─────────────────────────
if crontab -l 2>/dev/null | grep -q "NJADDER PRO v7.0"; then
  echo "ℹ️  NJADDER cron jobs already exist — replacing..."
  # Remove old NJADDER section
  crontab -l 2>/dev/null | sed '/# ═══ NJADDER PRO v7.0 — Cron Jobs ═══/,/^$/d' > /tmp/njadder-existing-cron
  cat /tmp/njadder-existing-cron "$CRON_FILE" | crontab -
  rm /tmp/njadder-existing-cron
else
  # Append to existing crontab
  (crontab -l 2>/dev/null; cat "$CRON_FILE") | crontab -
fi

rm "$CRON_FILE"

# ─── Verify ───────────────────────────────────────────────
echo "✓ Cron jobs installed:"
echo ""
crontab -l | grep -A 1 "NJADDER PRO v7.0" | head -10
echo ""
echo "═══════════════════════════════════════"
echo "  ✅ CRON SETUP COMPLETE"
echo "═══════════════════════════════════════"
echo "  Backup:     daily at 03:00 AM"
echo "  Health:     every 5 minutes"
echo "  Log rotate: weekly (Sundays 04:00 AM)"
echo ""
echo "To view: crontab -l"
echo "To edit: crontab -e"
echo "═══════════════════════════════════════"
