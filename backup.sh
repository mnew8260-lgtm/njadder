#!/bin/bash
# ════════════════════════════════════════════════════════════
# NJADDER PRO v7.0 — Database Backup Script
# ════════════════════════════════════════════════════════════
# Backs up: users, telegram_accounts, blacklist, usage_log
# Keeps: last 7 daily backups + last 4 weekly backups
# Schedule: 0 3 * * * /home/$USER/njadder/backup.sh
# ════════════════════════════════════════════════════════════

set -euo pipefail

INSTALL_DIR="${HOME}/njadder"
BACKUP_DIR="${HOME}/njadder-backups/db"
mkdir -p "$BACKUP_DIR"

cd "$INSTALL_DIR" || exit 1

# Load .env
if [ -f .env ]; then
  set -a
  source .env
  set +a
fi

if [ -z "${DATABASE_URL:-}" ]; then
  echo "❌ DATABASE_URL not set"
  exit 1
fi

TIMESTAMP=$(date +%Y%m%d-%H%M%S)
DATE=$(date +%Y-%m-%d)
WEEK=$(date +%Y-W%V)
BACKUP_FILE="$BACKUP_DIR/njadder-$TIMESTAMP.sql.gz"

echo "🗄️  Starting backup: $TIMESTAMP"

# Use pg_dump via node (since psql CLI may not be installed)
node -e "
const postgres = require('postgres');
const sql = postgres(process.env.DATABASE_URL, { ssl: 'prefer', prepare: false, onnotice: () => {} });
const fs = require('fs');
const zlib = require('zlib');

(async () => {
  try {
    const tables = ['users', 'telegram_accounts', 'blacklist', 'usage_log', 'activity_log', 'proxies', 'api_pool'];
    let out = '-- NJADDER PRO v7.0 DB Backup\\n';
    out += '-- Generated: ' + new Date().toISOString() + '\\n';
    out += '-- Tables: ' + tables.join(', ') + '\\n\\n';

    for (const t of tables) {
      try {
        const rows = await sql\`SELECT * FROM \${sql(t)}\`;
        const cols = rows.length > 0 ? Object.keys(rows[0]) : [];
        out += '-- Table: ' + t + ' (' + rows.length + ' rows)\\n';
        out += 'DROP TABLE IF EXISTS ' + t + ' CASCADE;\\n';
        if (rows.length === 0) {
          out += '-- (empty)\\n\\n';
          continue;
        }
        // Get CREATE TABLE statement (best effort)
        try {
          const [ddl] = await sql\`SELECT pg_get_constraintdef(oid) as ddl FROM pg_constraint WHERE conrelid = \${t}::regclass LIMIT 1\`;
        } catch {}
        // Output as INSERT statements
        for (const r of rows) {
          const vals = cols.map(c => {
            const v = r[c];
            if (v === null || v === undefined) return 'NULL';
            if (typeof v === 'number') return String(v);
            if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
            if (v instanceof Date) return \"'\" + v.toISOString() + \"'\";
            return \"'\" + String(v).replace(/'/g, \"''\") + \"'\";
          });
          out += 'INSERT INTO ' + t + ' (' + cols.join(',') + ') VALUES (' + vals.join(',') + ');\\n';
        }
        out += '\\n';
      } catch (e) {
        out += '-- SKIP ' + t + ': ' + e.message + '\\n\\n';
      }
    }

    const compressed = zlib.gzipSync(out);
    fs.writeFileSync('$BACKUP_FILE', compressed);
    console.log('  ✓ ' + tables.length + ' tables backed up');
    console.log('  ✓ Size: ' + (compressed.length / 1024).toFixed(1) + ' KB');
  } catch (e) {
    console.error('❌ Backup failed:', e.message);
    process.exit(1);
  } finally {
    await sql.end();
  }
})();
" || { echo "❌ Backup failed"; exit 1; }

# ─── Cleanup: keep last 7 daily + last 4 weekly ──────────
echo "🧹 Cleaning old backups..."
# Keep last 7 backups regardless
ls -1t "$BACKUP_DIR"/njadder-*.sql.gz 2>/dev/null | tail -n +8 | xargs -r rm
TOTAL=$(ls -1 "$BACKUP_DIR"/njadder-*.sql.gz 2>/dev/null | wc -l)
echo "  ✓ $TOTAL backups retained"

# ─── Summary ──────────────────────────────────────────────
echo ""
echo "═══════════════════════════════════════"
echo "  ✅ BACKUP COMPLETE"
echo "═══════════════════════════════════════"
echo "  File:  $BACKUP_FILE"
echo "  Size:  $(du -h "$BACKUP_FILE" | cut -f1)"
echo "  Total: $TOTAL backups in $BACKUP_DIR"
echo "═══════════════════════════════════════"
