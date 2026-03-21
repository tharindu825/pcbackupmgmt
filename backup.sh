#!/bin/sh
# ─────────────────────────────────────────────────────────────
# backup.sh — Automatic backup script for data.json
# Runs inside the backup sidecar container on a cron schedule.
# Copies /data/data.json → /backups/data_TIMESTAMP.json
# ─────────────────────────────────────────────────────────────

DATA_FILE="/data/data.json"
BACKUP_DIR="/backups"
KEEP_DAYS=30        # Delete backups older than this many days

# Only back up if the source file exists and is non-empty
if [ ! -s "$DATA_FILE" ]; then
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] SKIP — data.json is missing or empty"
  exit 0
fi

# Create backup directory if needed
mkdir -p "$BACKUP_DIR"

# Generate timestamped filename
TIMESTAMP=$(date '+%Y%m%d_%H%M%S')
DEST="$BACKUP_DIR/data_${TIMESTAMP}.json"

# Copy the file
cp "$DATA_FILE" "$DEST"
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Backup saved → $DEST"

# Remove backups older than KEEP_DAYS days
find "$BACKUP_DIR" -name "data_*.json" -mtime +$KEEP_DAYS -delete
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Cleaned up backups older than ${KEEP_DAYS} days"
