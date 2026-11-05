#!/usr/bin/env sh
# Nightly Postgres backup. Run from the repo root on the VPS, e.g. via cron:
#   0 2 * * * cd /srv/fantasy && ./scripts/backup-db.sh >> backups/backup.log 2>&1
# Copy ./backups off the VPS (rclone/rsync/object storage) for a real off-box backup.
set -eu

BACKUP_DIR="${BACKUP_DIR:-./backups}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
STAMP="$(date +%Y%m%d-%H%M%S)"

mkdir -p "$BACKUP_DIR"
docker compose exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --format=custom' \
  > "$BACKUP_DIR/fantasy-$STAMP.dump"
find "$BACKUP_DIR" -name 'fantasy-*.dump' -mtime +"$RETENTION_DAYS" -delete
echo "Backup written: $BACKUP_DIR/fantasy-$STAMP.dump"
