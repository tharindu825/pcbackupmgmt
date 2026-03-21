#!/bin/sh
# ─────────────────────────────────────────────────────────────────
# restore.sh — Restore data.json from the most recent backup
#
# Usage (from your Ubuntu server):
#   docker exec pc-backup-manager sh /app/restore.sh
#
#   Or restore from a specific backup file:
#   docker exec pc-backup-manager sh /app/restore.sh data_20260321_120000.json
# ─────────────────────────────────────────────────────────────────

DATA_FILE="/data/data.json"
BACKUP_DIR="/backups"

if [ -n "$1" ]; then
  # Restore from specific file
  TARGET="$BACKUP_DIR/$1"
  if [ ! -f "$TARGET" ]; then
    echo "ERROR: Backup file not found: $TARGET"
    exit 1
  fi
else
  # Restore from the most recent backup
  TARGET=$(ls -t "$BACKUP_DIR"/data_*.json 2>/dev/null | head -1)
  if [ -z "$TARGET" ]; then
    echo "ERROR: No backup files found in $BACKUP_DIR"
    exit 1
  fi
fi

# Make a safety copy of current data before restoring
if [ -f "$DATA_FILE" ]; then
  cp "$DATA_FILE" "$BACKUP_DIR/data_pre_restore_$(date '+%Y%m%d_%H%M%S').json"
  echo "Safety copy of current data saved."
fi

cp "$TARGET" "$DATA_FILE"
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Restored from: $TARGET"
