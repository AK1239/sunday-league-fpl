import { sql } from "drizzle-orm";
import type { DbExecutor } from "@/server/db";
import type { LeagueSettingsRow } from "./league-settings";

type DeadlineRow = { deadline: Date | string };

/** Kickoff in league TZ minus offset → timestamptz (matches migration backfill). */
export async function computeDefaultDeadlineAt(
  db: DbExecutor,
  playedOn: string,
  settings: Pick<
    LeagueSettingsRow,
    "timezone" | "defaultKickoffTime" | "deadlineOffsetMinutes"
  >,
): Promise<Date> {
  const result = await db.execute(sql`
    SELECT (
      (${playedOn}::date + ${settings.defaultKickoffTime}::time)
      AT TIME ZONE ${settings.timezone}
      - (${settings.deadlineOffsetMinutes} || ' minutes')::interval
    ) AS deadline
  `);
  const row = (result.rows as DeadlineRow[])[0];
  if (!row) throw new Error("DEADLINE_COMPUTE_FAILED");
  return new Date(row.deadline);
}

/** Parse `datetime-local` value as wall time in the league timezone. */
export async function parseDeadlineAtInLeagueTz(
  db: DbExecutor,
  localDateTime: string,
  timezone: string,
): Promise<Date> {
  const normalized = localDateTime.trim().replace("T", " ");
  const result = await db.execute(sql`
    SELECT (${normalized}::timestamp AT TIME ZONE ${timezone}) AS deadline
  `);
  const row = (result.rows as DeadlineRow[])[0];
  if (!row) throw new Error("DEADLINE_PARSE_FAILED");
  return new Date(row.deadline);
}

export function formatDeadlineForDateTimeLocal(
  deadline: Date,
  timezone: string,
): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(deadline);

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "";

  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}
