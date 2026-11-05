import { and, desc, eq, max, ne, sql } from "drizzle-orm";
import type { AppDb } from "@/server/db";
import { matchdays, seasons } from "@/server/db/schema";
import { writeAuditLog } from "./audit-log";
import {
  computeDefaultDeadlineAt,
  parseDeadlineAtInLeagueTz,
} from "./deadline";
import { getLeagueSettings } from "./league-settings";
import { recomputeMatchday } from "./recompute-matchday";

export type MatchdayAdminRow = {
  id: string;
  seasonId: string;
  number: number;
  playedOn: string;
  deadlineAt: Date;
  status: "scheduled" | "draft" | "published" | "cancelled";
  publishedAt: Date | null;
  notes: string | null;
};

export async function listMatchdaysForSeasonAdmin(
  db: AppDb,
  seasonId: string,
): Promise<MatchdayAdminRow[]> {
  return db
    .select({
      id: matchdays.id,
      seasonId: matchdays.seasonId,
      number: matchdays.number,
      playedOn: matchdays.playedOn,
      deadlineAt: matchdays.deadlineAt,
      status: matchdays.status,
      publishedAt: matchdays.publishedAt,
      notes: matchdays.notes,
    })
    .from(matchdays)
    .where(eq(matchdays.seasonId, seasonId))
    .orderBy(desc(matchdays.number));
}

export async function getActiveSeasonId(db: AppDb): Promise<string | null> {
  const rows = await db
    .select({ id: seasons.id })
    .from(seasons)
    .where(eq(seasons.status, "active"))
    .limit(1);
  return rows[0]?.id ?? null;
}

async function assertPlayedOnInSeason(
  db: AppDb,
  seasonId: string,
  playedOn: string,
) {
  const season = await db
    .select({
      startsOn: seasons.startsOn,
      endsOn: seasons.endsOn,
      status: seasons.status,
    })
    .from(seasons)
    .where(eq(seasons.id, seasonId))
    .limit(1);
  const s = season[0];
  if (!s) throw new Error("SEASON_NOT_FOUND");
  if (s.status === "closed") throw new Error("SEASON_CLOSED");
  if (playedOn < s.startsOn || playedOn > s.endsOn) {
    throw new Error("PLAYED_ON_OUT_OF_SEASON");
  }
}

export async function createMatchdayAdmin(
  db: AppDb,
  adminUserId: string,
  input: {
    seasonId: string;
    playedOn: string;
    number?: number;
    deadlineAtLocal?: string;
  },
): Promise<MatchdayAdminRow> {
  const settings = await getLeagueSettings(db);
  if (!settings) throw new Error("NO_SETTINGS");

  await assertPlayedOnInSeason(db, input.seasonId, input.playedOn);

  let number = input.number;
  if (number === undefined) {
    const [{ value }] = await db
      .select({ value: max(matchdays.number) })
      .from(matchdays)
      .where(eq(matchdays.seasonId, input.seasonId));
    number = (value ?? 0) + 1;
  }

  const deadlineAt = input.deadlineAtLocal
    ? await parseDeadlineAtInLeagueTz(
        db,
        input.deadlineAtLocal,
        settings.timezone,
      )
    : await computeDefaultDeadlineAt(db, input.playedOn, settings);

  const [row] = await db
    .insert(matchdays)
    .values({
      seasonId: input.seasonId,
      number,
      playedOn: input.playedOn,
      deadlineAt,
      status: "scheduled",
    })
    .returning();

  await writeAuditLog(db, {
    userId: adminUserId,
    action: "create",
    entity: "matchday",
    entityId: row!.id,
    after: row,
  });

  return row as MatchdayAdminRow;
}

export async function updateMatchdayDeadlineAdmin(
  db: AppDb,
  adminUserId: string,
  matchdayId: string,
  deadlineAtLocal: string,
): Promise<MatchdayAdminRow> {
  const settings = await getLeagueSettings(db);
  if (!settings) throw new Error("NO_SETTINGS");

  const existing = await db
    .select()
    .from(matchdays)
    .where(eq(matchdays.id, matchdayId))
    .limit(1);
  const before = existing[0];
  if (!before) throw new Error("NOT_FOUND");
  if (before.status === "cancelled") throw new Error("CANCELLED");

  const deadlineAt = await parseDeadlineAtInLeagueTz(
    db,
    deadlineAtLocal,
    settings.timezone,
  );

  const [row] = await db
    .update(matchdays)
    .set({ deadlineAt })
    .where(eq(matchdays.id, matchdayId))
    .returning();

  await writeAuditLog(db, {
    userId: adminUserId,
    action: "update_deadline",
    entity: "matchday",
    entityId: matchdayId,
    before: { deadlineAt: before.deadlineAt },
    after: { deadlineAt: row!.deadlineAt },
  });

  return row as MatchdayAdminRow;
}

export async function postponeMatchdayAdmin(
  db: AppDb,
  adminUserId: string,
  matchdayId: string,
  input: { playedOn: string; deadlineAtLocal?: string },
): Promise<MatchdayAdminRow> {
  const settings = await getLeagueSettings(db);
  if (!settings) throw new Error("NO_SETTINGS");

  const existing = await db
    .select()
    .from(matchdays)
    .where(eq(matchdays.id, matchdayId))
    .limit(1);
  const before = existing[0];
  if (!before) throw new Error("NOT_FOUND");
  if (before.status === "cancelled") throw new Error("CANCELLED");
  if (before.status === "published") throw new Error("PUBLISHED");

  await assertPlayedOnInSeason(db, before.seasonId, input.playedOn);

  const deadlineAt = input.deadlineAtLocal
    ? await parseDeadlineAtInLeagueTz(
        db,
        input.deadlineAtLocal,
        settings.timezone,
      )
    : await computeDefaultDeadlineAt(db, input.playedOn, settings);

  const [row] = await db
    .update(matchdays)
    .set({
      playedOn: input.playedOn,
      deadlineAt,
    })
    .where(eq(matchdays.id, matchdayId))
    .returning();

  await writeAuditLog(db, {
    userId: adminUserId,
    action: "postpone",
    entity: "matchday",
    entityId: matchdayId,
    before: {
      playedOn: before.playedOn,
      deadlineAt: before.deadlineAt,
      status: before.status,
    },
    after: {
      playedOn: row!.playedOn,
      deadlineAt: row!.deadlineAt,
      status: row!.status,
    },
  });

  return row as MatchdayAdminRow;
}

export async function cancelMatchdayAdmin(
  db: AppDb,
  adminUserId: string,
  matchdayId: string,
): Promise<MatchdayAdminRow> {
  const existing = await db
    .select()
    .from(matchdays)
    .where(eq(matchdays.id, matchdayId))
    .limit(1);
  const before = existing[0];
  if (!before) throw new Error("NOT_FOUND");
  if (before.status === "cancelled") throw new Error("ALREADY_CANCELLED");

  const [row] = await db
    .update(matchdays)
    .set({ status: "cancelled" })
    .where(eq(matchdays.id, matchdayId))
    .returning();

  await writeAuditLog(db, {
    userId: adminUserId,
    action: "cancel",
    entity: "matchday",
    entityId: matchdayId,
    before: { status: before.status },
    after: { status: row!.status },
  });

  await recomputeMatchday(matchdayId);

  return row as MatchdayAdminRow;
}

export async function ensureMatchdayNumberUnique(
  db: AppDb,
  seasonId: string,
  number: number,
  excludeId?: string,
): Promise<boolean> {
  const rows = await db
    .select({ id: matchdays.id })
    .from(matchdays)
    .where(
      and(
        eq(matchdays.seasonId, seasonId),
        eq(matchdays.number, number),
        excludeId ? ne(matchdays.id, excludeId) : sql`true`,
      ),
    )
    .limit(1);
  return rows.length === 0;
}
