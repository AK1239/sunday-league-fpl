# Mkate Champions League — launch checklist

Use this before inviting managers to the private league.

## 1. Environment

- Copy `.env.example` → `.env` and set:
  - `DATABASE_URL`, `SESSION_SECRET` (32+ chars)
  - `ADMIN_EMAIL`, `ADMIN_PASSWORD` for bootstrap admin
  - `POSTGRES_PASSWORD` for Docker Compose
  - `SITE_ADDRESS` for Caddy (production hostname)
- Run `pnpm db:migrate` then `pnpm db:seed` (or `pnpm db:seed-admin` on an existing DB).

## 2. Smoke tests

```bash
pnpm lint && pnpm typecheck && pnpm test
pnpm build && pnpm test:e2e
```

E2E uses a production build on port **3100**, runs `db:migrate` + `db:seed` in global setup, and logs in with `ADMIN_EMAIL` / `ADMIN_PASSWORD` (or `E2E_MANAGER_*` overrides). Manager route tests fail if a **Blocking Route** / prerender overlay appears in the HTML.

## 3. Backups

```bash
chmod +x scripts/db-backup.sh scripts/db-restore.sh
pnpm db:backup
```

Store backups off the app server. Drill a restore on a scratch database:

```bash
pnpm db:restore -- ./backups/fantasy-YYYYMMDD-HHMMSS.sql.gz
```

## 4. Invite rollout

1. Admin → **Invites** — create invites as needed:
   - **Reusable league link** — check the box to share one `/join/<token>` URL with everyone until it expires (fine for a private friends league; anyone with the link can sign up).
   - **Single-use** — leave the box off for one manager per link, or use **Link to footballer** (implies single-use).
2. Share `/join/<token>` links over your usual channel (treat reusable links like a shared secret).
3. Confirm each manager can log in at `/login` and open `/pick` before the first deadline.

## 5. First gameweek

1. Admin → **Seasons** — active season with correct dates.
2. If using chips: **Enable chips** on the active season (see [`TRANSFERS_ENABLE.md`](./TRANSFERS_ENABLE.md#chips-opt-in-per-season)).
3. Schedule matchday with deadline (`Africa/Dar_es_Salaam` via league settings).
4. After Sunday: enter matches, publish, verify `/table` and `/players`.
5. At season end: **Close season** on Admin → Seasons; winners appear on `/awards`.

## 6. Performance (manual)

After `pnpm build && pnpm start`:

- Throttled 4G in Chrome DevTools: home LCP target **&lt; 2.5s**.
- First-load JS target **&lt; 150KB** (check Network → JS for document navigation).

## 7. Monitoring

- Hit **`GET /api/health`** from uptime checks (200 when DB is up, 503 otherwise).
- Watch Docker logs: `docker compose logs -f app db`.

## 8. Security reminders

- HTTPS via Caddy in production.
- Rotate `SESSION_SECRET` only with a planned logout (invalidates sessions).
- Disable manager accounts from Admin instead of sharing passwords.
