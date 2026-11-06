import { and, eq } from "drizzle-orm";
import { sql } from "drizzle-orm";
import type { AppDb } from "@/server/db";
import { matchdays, users } from "@/server/db/schema";
import {
  createMatchdayAdmin,
  getActiveSeasonId,
} from "./matchdays-admin";
import { getLeagueSettings } from "./league-settings";

/** After this local time on gameweek Sunday, the scheduler targets the following Sunday. */
export const GAMEWEEK_ROLLOVER_LOCAL_HOUR = 12;

export type EnsureAutoScheduleResult =
  | { status: "no_season" }
  | { status: "no_settings" }
  | { status: "no_admin" }
  | { status: "out_of_season"; playedOn: string }
  | { status: "exists"; matchdayId: string; playedOn: string }
  | { status: "created"; matchdayId: string; playedOn: string };

/** Calendar date arithmetic in UTC (date-only strings). */
export function addDaysToIsoDate(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const dt = new Date(Date.UTC(y!, m! - 1, d!));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

/** Sunday gameweek date from league-local calendar date and clock time. */
export function openGameweekSundayFromLocal(
  localDate: string,
  localHour: number,
  localMinute: number,
): string {
  const [y, m, d] = localDate.split("-").map(Number);
  const dow = new Date(Date.UTC(y!, m! - 1, d!)).getUTCDay();
  const daysUntilSunday = dow === 0 ? 0 : 7 - dow;
  let sunday = addDaysToIsoDate(localDate, daysUntilSunday);

  const pastRollover =
    localDate > sunday ||
    (localDate === sunday &&
      (localHour > GAMEWEEK_ROLLOVER_LOCAL_HOUR ||
        (localHour === GAMEWEEK_ROLLOVER_LOCAL_HOUR && localMinute >= 0)));

  if (pastRollover) {
    sunday = addDaysToIsoDate(sunday, 7);
  }
  return sunday;
}

type LocalParts = {
  date: string;
  hour: number;
  minute: number;
};

async function leagueLocalParts(
  db: AppDb,
  timezone: string,
  now: Date,
): Promise<LocalParts> {
  const result = await db.execute<{
    d: string;
    hour: number;
    minute: number;
  }>(sql`
    SELECT
      to_char((${now.toISOString()}::timestamptz AT TIME ZONE ${timezone}), 'YYYY-MM-DD') AS d,
      EXTRACT(HOUR FROM (${now.toISOString()}::timestamptz AT TIME ZONE ${timezone}))::int AS hour,
      EXTRACT(MINUTE FROM (${now.toISOString()}::timestamptz AT TIME ZONE ${timezone}))::int AS minute
  `);
  const row = result.rows[0];
  if (!row) throw new Error("LOCAL_TIME_FAILED");
  return { date: row.d, hour: row.hour, minute: row.minute };
}

export async function computeOpenGameweekPlayedOn(
  db: AppDb,
  timezone: string,
  now = new Date(),
): Promise<string> {
  const local = await leagueLocalParts(db, timezone, now);
  return openGameweekSundayFromLocal(local.date, local.hour, local.minute);
}

async function resolveSystemAdminId(db: AppDb): Promise<string | null> {
  const [row] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.role, "admin"))
    .limit(1);
  return row?.id ?? null;
}

async function findMatchdayByPlayedOn(
  db: AppDb,
  seasonId: string,
  playedOn: string,
) {
  const [row] = await db
    .select({
      id: matchdays.id,
      status: matchdays.status,
    })
    .from(matchdays)
    .where(
      and(eq(matchdays.seasonId, seasonId), eq(matchdays.playedOn, playedOn)),
    )
    .limit(1);
  return row ?? null;
}

/**
 * Ensures the active season has a scheduled gameweek for the current open Sunday
 * window (rolls to the next Sunday after 12:00 league time on gameweek Sunday).
 * Skips dates that already have a published or cancelled gameweek.
 */
export async function ensureAutoScheduledMatchday(
  db: AppDb,
  now = new Date(),
): Promise<EnsureAutoScheduleResult> {
  const seasonId = await getActiveSeasonId(db);
  if (!seasonId) return { status: "no_season" };

  const settings = await getLeagueSettings(db);
  if (!settings) return { status: "no_settings" };

  const adminId = await resolveSystemAdminId(db);
  if (!adminId) return { status: "no_admin" };

  let playedOn = await computeOpenGameweekPlayedOn(
    db,
    settings.timezone,
    now,
  );

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const existing = await findMatchdayByPlayedOn(db, seasonId, playedOn);
    if (!existing) {
      try {
        const row = await createMatchdayAdmin(db, adminId, {
          seasonId,
          playedOn,
        });
        return {
          status: "created",
          matchdayId: row.id,
          playedOn: row.playedOn,
        };
      } catch (error) {
        if (
          error instanceof Error &&
          error.message === "PLAYED_ON_OUT_OF_SEASON"
        ) {
          return { status: "out_of_season", playedOn };
        }
        throw error;
      }
    }

    if (existing.status === "scheduled" || existing.status === "draft") {
      return {
        status: "exists",
        matchdayId: existing.id,
        playedOn,
      };
    }

    playedOn = addDaysToIsoDate(playedOn, 7);
  }

  return { status: "out_of_season", playedOn };
}
