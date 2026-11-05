#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PORT="${PORT:-3100}"

pnpm build
mkdir -p .next/standalone/.next
cp -r .next/static .next/standalone/.next/static
cp -r public .next/standalone/public

export PORT
export HOSTNAME="${HOSTNAME:-127.0.0.1}"
exec node .next/standalone/server.js
