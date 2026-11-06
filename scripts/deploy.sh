#!/usr/bin/env bash
# Runs ON THE VPS (called over SSH by the deploy workflow).
# Usage: IMAGE_TAG=<sha> GHCR_USER=... GHCR_TOKEN=... ./deploy.sh
set -euo pipefail

cd /opt/fpl
: "${IMAGE_TAG:?IMAGE_TAG is required}"
export IMAGE_TAG
COMPOSE=(docker compose -f docker-compose.prod.yml)

if [[ -n "${GHCR_TOKEN:-}" ]]; then
  echo "$GHCR_TOKEN" | docker login ghcr.io -u "${GHCR_USER:-github}" --password-stdin
fi

echo "==> Pulling images ($IMAGE_TAG)"
"${COMPOSE[@]}" pull app
"${COMPOSE[@]}" --profile tools pull migrate

echo "==> Starting database"
"${COMPOSE[@]}" up -d db

# Back up before migrating (skipped on the very first deploy when the DB is empty).
if "${COMPOSE[@]}" exec -T db psql -U fantasy -d fantasy -tAc "select to_regclass('public.users')" | grep -q users; then
  mkdir -p backups
  STAMP="$(date +%Y%m%d-%H%M%S)"
  echo "==> Backing up to backups/pre-deploy-${STAMP}.sql.gz"
  "${COMPOSE[@]}" exec -T db pg_dump -U fantasy -d fantasy --no-owner --no-privileges \
    | gzip > "backups/pre-deploy-${STAMP}.sql.gz"
fi

echo "==> Running migrations"
"${COMPOSE[@]}" --profile tools run --rm migrate

echo "==> Restarting app"
"${COMPOSE[@]}" up -d app

echo "==> Waiting for /api/health"
for i in $(seq 1 30); do
  if curl -fsS http://127.0.0.1:3110/api/health >/dev/null 2>&1; then
    echo "Healthy after ~$((i * 2))s"
    # Avatar uploads need sharp's native binary (musl build inside the image).
    if "${COMPOSE[@]}" exec -T app node -e "require('sharp')" >/dev/null 2>&1; then
      echo "sharp OK"
    else
      echo "!! WARNING: sharp failed to load in the container; avatar uploads will fail." >&2
    fi
    docker image prune -f >/dev/null
    # Keep the last 10 pre-deploy backups.
    ls -1t backups/pre-deploy-*.sql.gz 2>/dev/null | tail -n +11 | xargs -r rm --
    exit 0
  fi
  sleep 2
done

echo "!! App did not become healthy. Recent logs:" >&2
"${COMPOSE[@]}" logs --tail=60 app >&2
exit 1
