import { getDb } from "@/server/db";
import { ensureAutoScheduledMatchday } from "@/server/domain/auto-schedule-matchdays";

// With `cacheComponents`, route handlers are dynamic per request by default
// (and `export const dynamic` is rejected at build time).
function authorizeCron(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    return process.env.NODE_ENV !== "production";
  }
  const auth = request.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

/** Idempotent: creates the open Sunday gameweek when missing. Call from cron (e.g. hourly, or Sundays 08:00). */
export async function GET(request: Request) {
  if (!authorizeCron(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await ensureAutoScheduledMatchday(getDb());
  return Response.json(result, {
    headers: { "Cache-Control": "no-store" },
  });
}
