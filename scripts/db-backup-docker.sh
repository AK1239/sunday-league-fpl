#!/usr/bin/env bash
# Nightly backup on the VPS. Add to crontab:
#   30 2 * * * /opt/fpl/db-backup-docker.sh >> /opt/fpl/backups/backup.log 2>&1
set -euo pipefail
cd /opt/fpl
mkdir -p backups
STAMP="$(date +%Y%m%d-%H%M%S)"
docker compose -f docker-compose.prod.yml exec -T db \
  pg_dump -U fantasy -d fantasy --no-owner --no-privileges | gzip > "backups/nightly-${STAMP}.sql.gz"
tar -czf "backups/avatars-${STAMP}.tar.gz" -C /opt/fpl avatars 2>/dev/null || true
# Keep 14 days.
find backups -name 'nightly-*.sql.gz' -mtime +14 -delete
find backups -name 'avatars-*.tar.gz' -mtime +14 -delete
echo "Backup ${STAMP} done"
