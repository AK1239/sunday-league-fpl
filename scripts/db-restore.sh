#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <backup.sql.gz>" >&2
  exit 1
fi

BACKUP="$1"
if [[ ! -f "$BACKUP" ]]; then
  echo "File not found: $BACKUP" >&2
  exit 1
fi

if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

: "${DATABASE_URL:?Set DATABASE_URL in the environment or .env}"

echo "This will REPLACE data in the target database."
echo "DATABASE_URL=$DATABASE_URL"
read -r -p "Type RESTORE to continue: " confirm
if [[ "$confirm" != "RESTORE" ]]; then
  echo "Aborted."
  exit 1
fi

echo "Restoring from $BACKUP"
gunzip -c "$BACKUP" | psql "$DATABASE_URL" --set ON_ERROR_STOP=1 --single-transaction
echo "Restore complete. Run pnpm db:migrate if schema drift is possible."
