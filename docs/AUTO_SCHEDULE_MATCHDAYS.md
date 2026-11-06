# Automatic Sunday gameweeks

The app keeps **one open gameweek** (`scheduled` or `draft`) for the current Sunday window on the active season.

## Rules (league timezone)

1. **Which Sunday?** From any date, take the **upcoming Sunday** (including today if it is Sunday).
2. **Roll forward at noon:** From **12:00** on that Sunday onward, the target becomes the **next** Sunday.
   - Example: Fri 6 Nov → gameweek **8 Nov**; Sun 8 Nov 11:59 → still **8 Nov**; Sun 8 Nov 12:00 → **15 Nov**.
3. **Creation:** If no row exists for that `played_on`, a `scheduled` gameweek is inserted (default kickoff deadline from league settings).
4. **Skipped dates:** If that Sunday already has a **published** or **cancelled** gameweek, the scheduler tries the following Sunday.

## When it runs

- On **home** and **pick** page loads (lightweight, idempotent).
- **Cron (recommended for production):** `GET /api/cron/ensure-matchday` with header `Authorization: Bearer $CRON_SECRET`.

Example crontab (hourly, plus extra on Sunday morning):

```cron
0 * * * * curl -fsS -H "Authorization: Bearer YOUR_SECRET" https://your-domain/api/cron/ensure-matchday
0 8 * * 0 curl -fsS -H "Authorization: Bearer YOUR_SECRET" https://your-domain/api/cron/ensure-matchday
```

Set `CRON_SECRET` in production. In development, the route works without a secret when `NODE_ENV !== production`.

## Cancelling a gameweek (rain, etc.)

Use **Admin → Matchdays → Cancel** on the gameweek. That:

- Marks the gameweek **cancelled**
- Voids transfer windows for that week
- Recomputes scores so managers get **no points** for that gameweek

The scheduler will then pick a later Sunday when creating the next open gameweek.

## Manual create

Admins can still create or postpone gameweeks manually; auto-schedule only **adds** missing Sundays for the current window.
