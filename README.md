# Mkate Champions League

Private fantasy league for Sunday football: managers pick five real players plus captain and vice; admin publishes match results and gameweek scores.

## Stack

Next.js 16, React 19, Tailwind v4, Drizzle ORM, PostgreSQL, Docker Compose + Caddy.

## Local development

```bash
cp .env.example .env   # set DATABASE_URL, SESSION_SECRET, admin credentials
docker compose up -d db
pnpm install
pnpm db:migrate
pnpm db:seed           # season, scoring rules, squad players (no gameweeks/results)
pnpm db:seed-admin     # admin user only when users table is empty
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command | Purpose |
|--------|---------|
| `pnpm dev` | Development server |
| `pnpm build` / `pnpm start` | Production build |
| `pnpm test` | Unit + integration (needs `DATABASE_URL`) |
| `pnpm test:e2e` | Playwright smoke + a11y (mobile viewport) |
| `pnpm db:migrate` | Apply SQL migrations |
| `pnpm db:backup` | `pg_dump` gzip to `./backups/` |
| `pnpm db:restore` | Restore from a backup (interactive confirm) |

## Production

```bash
docker compose up -d
```

See **[docs/LAUNCH.md](docs/LAUNCH.md)** for invite rollout, backups, and go-live checks.

## Health

`GET /api/health` — `{ "status": "ok" | "degraded", "db": boolean }` for monitoring.
