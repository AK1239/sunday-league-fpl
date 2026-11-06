import { getDb } from "@/server/db";
import { ensureAutoScheduledMatchday } from "@/server/domain/auto-schedule-matchdays";

export const dynamic = "force-dynamic";

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
