import { and, asc, eq, max } from "drizzle-orm";
import type { AppDb, DbExecutor } from "@/server/db";
import {
  goals,
  matchIncidents,
  matchMvps,
  matchParticipants,
  matchSides,
  matchdayAttendance,
  matchdays,
  matches,
  players,
} from "@/server/db/schema";
import { writeAuditLog } from "./audit-log";
import type {
  MatchdayEntryData,
  MatchDraftInput,
  MatchEntryMatch,
} from "./match-entry-types";
import { validateMatchDraft } from "./validate-match-draft";
import { recomputeMatchday } from "./recompute-matchday";

export class MatchEntryError extends Error {
  constructor(
    message: string,
    readonly code: string,
  ) {
    super(message);
    this.name = "MatchEntryError";
  }
}

async function assertMatchdayEditable(
  tx: DbExecutor,
  matchdayId: string,
): Promise<{ id: string; seasonId: string; status: string }> {
  const rows = await tx
    .select({
      id: matchdays.id,
      seasonId: matchdays.seasonId,
      status: matchdays.status,
    })
    .from(matchdays)
    .where(eq(matchdays.id, matchdayId))
    .limit(1);

  const md = rows[0];
  if (!md) throw new MatchEntryError("Matchday not found.", "NOT_FOUND");
  if (md.status === "cancelled") {
    throw new MatchEntryError(
      "Cancelled matchdays cannot be edited.",
      "CANCELLED",
    );
  }
  return md;
}

async function recomputeIfPublished(matchdayId: string, status: string) {
  if (status === "published") {
    await recomputeMatchday(matchdayId);
  }
}

async function ensureDraftStatus(tx: DbExecutor, matchdayId: string) {
  await tx
    .update(matchdays)
    .set({ status: "draft" })
    .where(
      and(eq(matchdays.id, matchdayId), eq(matchdays.status, "scheduled")),
    );
}

export async function loadMatchdayEntry(
  db: AppDb,
  matchdayId: string,
): Promise<MatchdayEntryData | null> {
  const mdRows = await db
    .select({
      id: matchdays.id,
      seasonId: matchdays.seasonId,
      number: matchdays.number,
      playedOn: matchdays.playedOn,
      status: matchdays.status,
    })
    .from(matchdays)
    .where(eq(matchdays.id, matchdayId))
    .limit(1);

  const md = mdRows[0];
  if (!md) return null;

  const playerRows = await db
    .select({
      id: players.id,
      displayName: players.displayName,
      nickname: players.nickname,
      avatarUrl: players.avatarUrl,
    })
    .from(players)
    .where(eq(players.active, true))
    .orderBy(players.displayName);

  const attendanceRows = await db
    .select({ playerId: matchdayAttendance.playerId })
    .from(matchdayAttendance)
    .where(eq(matchdayAttendance.matchdayId, matchdayId));

  const savedAttendeeIds = attendanceRows.map((r) => r.playerId);

  const matchRows = await db
    .select({
      id: matches.id,
      matchNo: matches.matchNo,
      scoreA: matches.scoreA,
      scoreB: matches.scoreB,
    })
    .from(matches)
    .where(eq(matches.matchdayId, matchdayId))
    .orderBy(asc(matches.matchNo));

  const entryMatches: MatchEntryMatch[] = [];

  for (const matchRow of matchRows) {
    const sides = await db
      .select({
        id: matchSides.id,
        side: matchSides.side,
        goalkeeperPlayerId: matchSides.goalkeeperPlayerId,
      })
      .from(matchSides)
      .where(eq(matchSides.matchId, matchRow.id));

    const sideA = sides.find((s) => s.side === "A");
    const sideB = sides.find((s) => s.side === "B");

    const participants = await db
      .select({
        playerId: matchParticipants.playerId,
        sideId: matchParticipants.sideId,
      })
      .from(matchParticipants)
      .where(eq(matchParticipants.matchId, matchRow.id));

    const goalRows = await db
      .select({
        scorerId: goals.scorerId,
        assistId: goals.assistId,
        sideId: goals.sideId,
        kind: goals.kind,
      })
      .from(goals)
      .where(eq(goals.matchId, matchRow.id))
      .orderBy(goals.seq);

    const incidentRows = await db
      .select({
        kind: matchIncidents.kind,
        playerId: matchIncidents.playerId,
        sideId: matchIncidents.sideId,
      })
      .from(matchIncidents)
      .where(eq(matchIncidents.matchId, matchRow.id))
      .orderBy(matchIncidents.seq);

    const mvpRows = await db
      .select({ playerId: matchMvps.playerId })
      .from(matchMvps)
      .where(eq(matchMvps.matchId, matchRow.id))
      .limit(1);

    entryMatches.push({
      id: matchRow.id,
      matchNo: matchRow.matchNo,
      scoreA: matchRow.scoreA,
      scoreB: matchRow.scoreB,
      sideAPlayerIds: participants
        .filter((p) => p.sideId === sideA?.id)
        .map((p) => p.playerId),
      sideBPlayerIds: participants
        .filter((p) => p.sideId === sideB?.id)
        .map((p) => p.playerId),
      sideAGoalkeeperId: sideA?.goalkeeperPlayerId ?? null,
      sideBGoalkeeperId: sideB?.goalkeeperPlayerId ?? null,
      goals: goalRows.map((g) => ({
        scorerId: g.scorerId,
        assistId: g.assistId,
        side: g.sideId === sideA?.id ? "A" : "B",
        kind: g.kind,
      })),
      incidents: incidentRows.map((i) => ({
        kind: i.kind,
        playerId: i.playerId,
        side: i.sideId === sideA?.id ? "A" : "B",
      })),
      mvpPlayerId: mvpRows[0]?.playerId ?? null,
    });
  }

  return {
    matchdayId: md.id,
    seasonId: md.seasonId,
    number: md.number,
    playedOn: md.playedOn,
    status: md.status,
    attendeeIds:
      savedAttendeeIds.length > 0
        ? savedAttendeeIds
        : playerRows.map((p) => p.id),
    players: playerRows,
    matches: entryMatches,
  };
}

export async function saveMatchdayAttendanceAdmin(
  db: AppDb,
  adminUserId: string,
  matchdayId: string,
  attendeeIds: string[],
): Promise<void> {
  let status = "draft";
  await db.transaction(async (tx) => {
    const md = await assertMatchdayEditable(tx, matchdayId);
    status = md.status;
    await ensureDraftStatus(tx, matchdayId);

    const unique = [...new Set(attendeeIds)];
    await tx
      .delete(matchdayAttendance)
      .where(eq(matchdayAttendance.matchdayId, matchdayId));

    if (unique.length > 0) {
      await tx
        .insert(matchdayAttendance)
        .values(unique.map((playerId) => ({ matchdayId, playerId })));
    }

    await writeAuditLog(tx, {
      userId: adminUserId,
      action: "save_attendance",
      entity: "matchday",
      entityId: matchdayId,
      after: { count: unique.length },
    });
  });
  await recomputeIfPublished(matchdayId, status);
}

async function replaceMatchContents(
  tx: DbExecutor,
  matchId: string,
  draft: MatchDraftInput,
) {
  const sideRows = await tx
    .select({ id: matchSides.id, side: matchSides.side })
    .from(matchSides)
    .where(eq(matchSides.matchId, matchId));

  let sideA = sideRows.find((s) => s.side === "A");
  let sideB = sideRows.find((s) => s.side === "B");

  if (!sideA) {
    [sideA] = await tx
      .insert(matchSides)
      .values({
        matchId,
        side: "A",
        goalkeeperPlayerId: draft.sideAGoalkeeperId,
      })
      .returning({ id: matchSides.id, side: matchSides.side });
  } else {
    await tx
      .update(matchSides)
      .set({ goalkeeperPlayerId: draft.sideAGoalkeeperId })
      .where(eq(matchSides.id, sideA.id));
  }

  if (!sideB) {
    [sideB] = await tx
      .insert(matchSides)
      .values({
        matchId,
        side: "B",
        goalkeeperPlayerId: draft.sideBGoalkeeperId,
      })
      .returning({ id: matchSides.id, side: matchSides.side });
  } else {
    await tx
      .update(matchSides)
      .set({ goalkeeperPlayerId: draft.sideBGoalkeeperId })
      .where(eq(matchSides.id, sideB.id));
  }

  await tx
    .delete(matchParticipants)
    .where(eq(matchParticipants.matchId, matchId));
  await tx.delete(goals).where(eq(goals.matchId, matchId));
  await tx.delete(matchIncidents).where(eq(matchIncidents.matchId, matchId));
  await tx.delete(matchMvps).where(eq(matchMvps.matchId, matchId));

  if (draft.sideAPlayerIds.length > 0) {
    await tx.insert(matchParticipants).values(
      draft.sideAPlayerIds.map((playerId) => ({
        matchId,
        playerId,
        sideId: sideA!.id,
      })),
    );
  }
  if (draft.sideBPlayerIds.length > 0) {
    await tx.insert(matchParticipants).values(
      draft.sideBPlayerIds.map((playerId) => ({
        matchId,
        playerId,
        sideId: sideB!.id,
      })),
    );
  }

  let seq = 1;
  for (const goal of draft.goals) {
    const sideId = goal.side === "A" ? sideA!.id : sideB!.id;
    await tx.insert(goals).values({
      matchId,
      sideId,
      scorerId: goal.scorerId,
      assistId:
        goal.kind === "penalty" || goal.kind === "own_goal"
          ? null
          : goal.assistId,
      kind: goal.kind ?? "open_play",
      seq: seq++,
    });
  }

  let incidentSeq = 1;
  for (const incident of draft.incidents ?? []) {
    await tx.insert(matchIncidents).values({
      matchId,
      sideId: incident.side === "A" ? sideA!.id : sideB!.id,
      playerId: incident.playerId,
      kind: incident.kind,
      seq: incidentSeq++,
    });
  }

  if (draft.mvpPlayerId) {
    await tx.insert(matchMvps).values({
      matchId,
      playerId: draft.mvpPlayerId,
    });
  }
}

export async function saveMatchDraftAdmin(
  db: AppDb,
  adminUserId: string,
  matchdayId: string,
  draft: MatchDraftInput,
  attendeeIds: string[],
): Promise<{ matchId: string }> {
  const mergedAttendees = [
    ...new Set([
      ...attendeeIds,
      ...draft.sideAPlayerIds,
      ...draft.sideBPlayerIds,
    ]),
  ];

  const validation = validateMatchDraft(draft, mergedAttendees);
  if (!validation.ok) {
    throw new MatchEntryError(validation.message, validation.code);
  }

  let publishedStatus = "draft";
  const result = await db.transaction(async (tx) => {
    const md = await assertMatchdayEditable(tx, matchdayId);
    publishedStatus = md.status;
    await ensureDraftStatus(tx, matchdayId);

    const uniqueAttendees = mergedAttendees;
    await tx
      .delete(matchdayAttendance)
      .where(eq(matchdayAttendance.matchdayId, matchdayId));
    if (uniqueAttendees.length > 0) {
      await tx
        .insert(matchdayAttendance)
        .values(uniqueAttendees.map((playerId) => ({ matchdayId, playerId })));
    }

    let matchId = draft.matchId ?? null;

    if (matchId) {
      const existing = await tx
        .select({ id: matches.id })
        .from(matches)
        .where(and(eq(matches.id, matchId), eq(matches.matchdayId, matchdayId)))
        .limit(1);
      if (!existing[0])
        throw new MatchEntryError("Match not found.", "NOT_FOUND");

      await tx
        .update(matches)
        .set({
          matchNo: draft.matchNo,
          scoreA: draft.scoreA,
          scoreB: draft.scoreB,
        })
        .where(eq(matches.id, matchId));
    } else {
      const [created] = await tx
        .insert(matches)
        .values({
          matchdayId,
          matchNo: draft.matchNo,
          scoreA: draft.scoreA,
          scoreB: draft.scoreB,
        })
        .returning({ id: matches.id });
      matchId = created!.id;
      await tx.insert(matchSides).values([
        { matchId, side: "A", goalkeeperPlayerId: draft.sideAGoalkeeperId },
        { matchId, side: "B", goalkeeperPlayerId: draft.sideBGoalkeeperId },
      ]);
    }

    await replaceMatchContents(tx, matchId!, draft);

    await writeAuditLog(tx, {
      userId: adminUserId,
      action: "save_match_draft",
      entity: "match",
      entityId: matchId!,
      after: { matchdayId, matchNo: draft.matchNo },
    });

    return { matchId: matchId! };
  });
  await recomputeIfPublished(matchdayId, publishedStatus);
  return result;
}

export async function addEmptyMatchAdmin(
  db: AppDb,
  adminUserId: string,
  matchdayId: string,
): Promise<{ matchId: string; matchNo: number }> {
  let status = "draft";
  const result = await db.transaction(async (tx) => {
    const md = await assertMatchdayEditable(tx, matchdayId);
    status = md.status;
    await ensureDraftStatus(tx, matchdayId);

    const [{ value }] = await tx
      .select({ value: max(matches.matchNo) })
      .from(matches)
      .where(eq(matches.matchdayId, matchdayId));

    const matchNo = (value ?? 0) + 1;

    const [match] = await tx
      .insert(matches)
      .values({ matchdayId, matchNo, scoreA: 0, scoreB: 0 })
      .returning();

    await tx.insert(matchSides).values([
      { matchId: match!.id, side: "A" },
      { matchId: match!.id, side: "B" },
    ]);

    await writeAuditLog(tx, {
      userId: adminUserId,
      action: "add_match",
      entity: "matchday",
      entityId: matchdayId,
      after: { matchId: match!.id, matchNo },
    });

    return { matchId: match!.id, matchNo };
  });
  await recomputeIfPublished(matchdayId, status);
  return result;
}

export async function copyLineupFromPreviousMatchAdmin(
  db: AppDb,
  adminUserId: string,
  matchdayId: string,
  targetMatchId: string,
): Promise<void> {
  let status = "draft";
  await db.transaction(async (tx) => {
    const md = await assertMatchdayEditable(tx, matchdayId);
    status = md.status;

    const target = await tx
      .select({ id: matches.id, matchNo: matches.matchNo })
      .from(matches)
      .where(
        and(eq(matches.id, targetMatchId), eq(matches.matchdayId, matchdayId)),
      )
      .limit(1);

    if (!target[0]) throw new MatchEntryError("Match not found.", "NOT_FOUND");

    const previous = await tx
      .select({ id: matches.id })
      .from(matches)
      .where(
        and(
          eq(matches.matchdayId, matchdayId),
          eq(matches.matchNo, target[0].matchNo - 1),
        ),
      )
      .limit(1);

    if (!previous[0]) {
      throw new MatchEntryError(
        "No previous match to copy from.",
        "NO_PREVIOUS",
      );
    }

    const source = await loadMatchParts(tx, previous[0].id);

    const draft: MatchDraftInput = {
      matchId: targetMatchId,
      matchNo: target[0].matchNo,
      scoreA: 0,
      scoreB: 0,
      sideAPlayerIds: source.sideAPlayerIds,
      sideBPlayerIds: source.sideBPlayerIds,
      sideAGoalkeeperId: source.sideAGoalkeeperId,
      sideBGoalkeeperId: source.sideBGoalkeeperId,
      goals: [],
      incidents: [],
      mvpPlayerId: null,
    };

    await tx
      .update(matches)
      .set({ scoreA: 0, scoreB: 0 })
      .where(eq(matches.id, targetMatchId));

    await replaceMatchContents(tx, targetMatchId, draft);

    await writeAuditLog(tx, {
      userId: adminUserId,
      action: "copy_lineup",
      entity: "match",
      entityId: targetMatchId,
      after: { fromMatchId: previous[0].id },
    });
  });
  await recomputeIfPublished(matchdayId, status);
}

async function loadMatchParts(tx: DbExecutor, matchId: string) {
  const sides = await tx
    .select({
      id: matchSides.id,
      side: matchSides.side,
      goalkeeperPlayerId: matchSides.goalkeeperPlayerId,
    })
    .from(matchSides)
    .where(eq(matchSides.matchId, matchId));

  const sideA = sides.find((s) => s.side === "A");
  const sideB = sides.find((s) => s.side === "B");

  const participants = await tx
    .select({
      playerId: matchParticipants.playerId,
      sideId: matchParticipants.sideId,
    })
    .from(matchParticipants)
    .where(eq(matchParticipants.matchId, matchId));

  return {
    sideAPlayerIds: participants
      .filter((p) => p.sideId === sideA?.id)
      .map((p) => p.playerId),
    sideBPlayerIds: participants
      .filter((p) => p.sideId === sideB?.id)
      .map((p) => p.playerId),
    sideAGoalkeeperId: sideA?.goalkeeperPlayerId ?? null,
    sideBGoalkeeperId: sideB?.goalkeeperPlayerId ?? null,
  };
}
