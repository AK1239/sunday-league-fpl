import { and, eq } from "drizzle-orm";
import type { AppDb } from "@/server/db";
import { matchdays, matches } from "@/server/db/schema";
import { writeAuditLog } from "./audit-log";
import { loadMatchdayEntry, MatchEntryError } from "./match-entry";
import { validateMatchDraft } from "./validate-match-draft";
import { recomputeMatchday } from "./recompute-matchday";

export class MatchdayPublishError extends Error {
  constructor(
    message: string,
    readonly code: string,
  ) {
    super(message);
    this.name = "MatchdayPublishError";
  }
}

async function getMatchdayRow(db: AppDb, matchdayId: string) {
  const rows = await db
    .select()
    .from(matchdays)
    .where(eq(matchdays.id, matchdayId))
    .limit(1);
  return rows[0] ?? null;
}

export async function validateMatchdayReadyToPublish(
  db: AppDb,
  matchdayId: string,
): Promise<void> {
  const entry = await loadMatchdayEntry(db, matchdayId);
  if (!entry) throw new MatchdayPublishError("Matchday not found.", "NOT_FOUND");
  if (entry.status === "cancelled") {
    throw new MatchdayPublishError("Cancelled matchdays cannot publish.", "CANCELLED");
  }
  if (entry.status === "published") {
    throw new MatchdayPublishError("Already published.", "ALREADY_PUBLISHED");
  }
  if (entry.matches.length === 0) {
    throw new MatchdayPublishError(
      "Add at least one match before publishing.",
      "NO_MATCHES",
    );
  }

  for (const match of entry.matches) {
    const validation = validateMatchDraft(
      {
        matchId: match.id,
        matchNo: match.matchNo,
        scoreA: match.scoreA,
        scoreB: match.scoreB,
        sideAPlayerIds: match.sideAPlayerIds,
        sideBPlayerIds: match.sideBPlayerIds,
        sideAGoalkeeperId: match.sideAGoalkeeperId,
        sideBGoalkeeperId: match.sideBGoalkeeperId,
        goals: match.goals,
        mvpPlayerId: match.mvpPlayerId,
      },
      entry.attendeeIds,
    );
    if (!validation.ok) {
      throw new MatchdayPublishError(
        `Match ${match.matchNo}: ${validation.message}`,
        validation.code,
      );
    }
  }
}

export async function publishMatchdayAdmin(
  db: AppDb,
  adminUserId: string,
  matchdayId: string,
): Promise<void> {
  await validateMatchdayReadyToPublish(db, matchdayId);

  const before = await getMatchdayRow(db, matchdayId);

  await db
    .update(matchdays)
    .set({
      status: "published",
      publishedAt: new Date(),
    })
    .where(eq(matchdays.id, matchdayId));

  await writeAuditLog(db, {
    userId: adminUserId,
    action: "publish",
    entity: "matchday",
    entityId: matchdayId,
    before: { status: before?.status },
    after: { status: "published" },
  });

  await recomputeMatchday(matchdayId);
}

export async function unpublishMatchdayAdmin(
  db: AppDb,
  adminUserId: string,
  matchdayId: string,
): Promise<void> {
  const before = await getMatchdayRow(db, matchdayId);
  if (!before) throw new MatchdayPublishError("Matchday not found.", "NOT_FOUND");
  if (before.status !== "published") {
    throw new MatchdayPublishError(
      "Only published matchdays can be unpublished.",
      "NOT_PUBLISHED",
    );
  }

  await db
    .update(matchdays)
    .set({
      status: "draft",
      publishedAt: null,
    })
    .where(eq(matchdays.id, matchdayId));

  await writeAuditLog(db, {
    userId: adminUserId,
    action: "unpublish",
    entity: "matchday",
    entityId: matchdayId,
    before: { status: "published" },
    after: { status: "draft" },
  });

  await recomputeMatchday(matchdayId);
}

export async function recalculateMatchdayAdmin(
  db: AppDb,
  adminUserId: string,
  matchdayId: string,
): Promise<void> {
  const md = await getMatchdayRow(db, matchdayId);
  if (!md) throw new MatchdayPublishError("Matchday not found.", "NOT_FOUND");
  if (md.status !== "published") {
    throw new MatchdayPublishError(
      "Only published matchdays can be recalculated.",
      "NOT_PUBLISHED",
    );
  }

  await writeAuditLog(db, {
    userId: adminUserId,
    action: "recalculate",
    entity: "matchday",
    entityId: matchdayId,
  });

  await recomputeMatchday(matchdayId);
}

export async function deleteMatchAdmin(
  db: AppDb,
  adminUserId: string,
  matchdayId: string,
  matchId: string,
): Promise<void> {
  const md = await getMatchdayRow(db, matchdayId);
  if (!md) throw new MatchEntryError("Matchday not found.", "NOT_FOUND");
  if (md.status === "cancelled") {
    throw new MatchEntryError("Cancelled matchdays cannot be edited.", "CANCELLED");
  }

  const match = await db
    .select({ id: matches.id })
    .from(matches)
    .where(and(eq(matches.id, matchId), eq(matches.matchdayId, matchdayId)))
    .limit(1);

  if (!match[0]) throw new MatchEntryError("Match not found.", "NOT_FOUND");

  await db.delete(matches).where(eq(matches.id, matchId));

  await writeAuditLog(db, {
    userId: adminUserId,
    action: "delete_match",
    entity: "match",
    entityId: matchId,
    before: { matchdayId },
  });

  if (md.status === "published") {
    await recomputeMatchday(matchdayId);
  }
}
