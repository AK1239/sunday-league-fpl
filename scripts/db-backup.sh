#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

: "${DATABASE_URL:?Set DATABASE_URL in the environment or .env}"

STAMP="$(date +%Y%m%d-%H%M%S)"
OUT_DIR="${1:-./backups}"
mkdir -p "$OUT_DIR"
OUT_FILE="$OUT_DIR/fantasy-${STAMP}.sql.gz"

echo "Writing $OUT_FILE"
pg_dump "$DATABASE_URL" --no-owner --no-privileges | gzip > "$OUT_FILE"
echo "Done ($(du -h "$OUT_FILE" | cut -f1))"
