import { eq } from "drizzle-orm";
import type { DbExecutor } from "@/server/db";
import {
  goals,
  matchIncidents,
  matchMvps,
  matchParticipants,
  matchSides,
  matchdayAttendance,
  matchdays,
  matches,
  scoringRuleSets,
  seasons,
} from "@/server/db/schema";
import type { ManagerScoringRules } from "@/server/scoring/manager-types";
import type { ScoreMatch, ScoreMatchdayInput } from "@/server/scoring/types";

export async function loadScoringRulesForMatchday(
  db: DbExecutor,
  matchdayId: string,
): Promise<{
  rules: ManagerScoringRules;
  ruleSetId: string;
  seasonId: string;
} | null> {
  const rows = await db
    .select({
      ruleSetId: scoringRuleSets.id,
      seasonId: seasons.id,
      attendancePts: scoringRuleSets.attendancePts,
      winPts: scoringRuleSets.winPts,
      drawPts: scoringRuleSets.drawPts,
      goalPts: scoringRuleSets.goalPts,
      assistPts: scoringRuleSets.assistPts,
      mvpPts: scoringRuleSets.mvpPts,
      cleanSheetPts: scoringRuleSets.cleanSheetPts,
      penaltyGoalPts: scoringRuleSets.penaltyGoalPts,
      penaltySavedPts: scoringRuleSets.penaltySavedPts,
      ownGoalPts: scoringRuleSets.ownGoalPts,
      handballPts: scoringRuleSets.handballPts,
      penaltyMissedPts: scoringRuleSets.penaltyMissedPts,
      hatTrickPts: scoringRuleSets.hatTrickPts,
      captainMultiplier: scoringRuleSets.captainMultiplier,
      viceCaptainMultiplier: scoringRuleSets.viceCaptainMultiplier,
      transfersStartMatchday: scoringRuleSets.transfersStartMatchday,
      freeTransfersPerMatchday: scoringRuleSets.freeTransfersPerMatchday,
      maxBankedFreeTransfers: scoringRuleSets.maxBankedFreeTransfers,
      extraTransferPenalty: scoringRuleSets.extraTransferPenalty,
    })
    .from(matchdays)
    .innerJoin(seasons, eq(matchdays.seasonId, seasons.id))
    .innerJoin(scoringRuleSets, eq(seasons.ruleSetId, scoringRuleSets.id))
    .where(eq(matchdays.id, matchdayId))
    .limit(1);

  const row = rows[0];
  if (!row) return null;

  return {
    seasonId: row.seasonId,
    ruleSetId: row.ruleSetId,
    rules: {
      attendancePts: row.attendancePts,
      winPts: row.winPts,
      drawPts: row.drawPts,
      goalPts: row.goalPts,
      assistPts: row.assistPts,
      mvpPts: row.mvpPts,
      cleanSheetPts: row.cleanSheetPts,
      penaltyGoalPts: row.penaltyGoalPts,
      penaltySavedPts: row.penaltySavedPts,
      ownGoalPts: row.ownGoalPts,
      handballPts: row.handballPts,
      penaltyMissedPts: row.penaltyMissedPts,
      hatTrickPts: row.hatTrickPts,
      captainMultiplier: row.captainMultiplier,
      viceCaptainMultiplier: row.viceCaptainMultiplier,
    },
  };
}

export async function loadScoreMatchdayInput(
  db: DbExecutor,
  matchdayId: string,
): Promise<ScoreMatchdayInput | null> {
  const meta = await loadScoringRulesForMatchday(db, matchdayId);
  if (!meta) return null;

  const attendanceRows = await db
    .select({ playerId: matchdayAttendance.playerId })
    .from(matchdayAttendance)
    .where(eq(matchdayAttendance.matchdayId, matchdayId));

  const matchRows = await db
    .select({
      id: matches.id,
      scoreA: matches.scoreA,
      scoreB: matches.scoreB,
    })
    .from(matches)
    .where(eq(matches.matchdayId, matchdayId))
    .orderBy(matches.matchNo);

  const scoreMatches: ScoreMatch[] = [];

  for (const matchRow of matchRows) {
    const sides = await db
      .select({
        id: matchSides.id,
        side: matchSides.side,
        goalkeeperPlayerId: matchSides.goalkeeperPlayerId,
      })
      .from(matchSides)
      .where(eq(matchSides.matchId, matchRow.id));

    const participants = await db
      .select({
        playerId: matchParticipants.playerId,
        sideId: matchParticipants.sideId,
      })
      .from(matchParticipants)
      .where(eq(matchParticipants.matchId, matchRow.id));

    const sideA = sides.find((side) => side.side === "A");
    const sideB = sides.find((side) => side.side === "B");

    const sideAPlayers = participants
      .filter((participant) => participant.sideId === sideA?.id)
      .map((participant) => participant.playerId);
    const sideBPlayers = participants
      .filter((participant) => participant.sideId === sideB?.id)
      .map((participant) => participant.playerId);

    const goalRows = await db
      .select({
        id: goals.id,
        scorerId: goals.scorerId,
        assistId: goals.assistId,
        kind: goals.kind,
      })
      .from(goals)
      .where(eq(goals.matchId, matchRow.id))
      .orderBy(goals.seq);

    const incidentRows = await db
      .select({
        id: matchIncidents.id,
        playerId: matchIncidents.playerId,
        kind: matchIncidents.kind,
      })
      .from(matchIncidents)
      .where(eq(matchIncidents.matchId, matchRow.id))
      .orderBy(matchIncidents.seq);

    const mvpRows = await db
      .select({ playerId: matchMvps.playerId })
      .from(matchMvps)
      .where(eq(matchMvps.matchId, matchRow.id))
      .limit(1);

    scoreMatches.push({
      id: matchRow.id,
      scoreA: matchRow.scoreA,
      scoreB: matchRow.scoreB,
      sideA: {
        side: "A",
        playerIds: sideAPlayers,
        goalkeeperId: sideA?.goalkeeperPlayerId ?? null,
      },
      sideB: {
        side: "B",
        playerIds: sideBPlayers,
        goalkeeperId: sideB?.goalkeeperPlayerId ?? null,
      },
      goals: goalRows.map((goal) => ({
        id: goal.id,
        scorerId: goal.scorerId,
        assistId: goal.assistId,
        kind: goal.kind,
      })),
      incidents: incidentRows.map((row) => ({
        id: row.id,
        playerId: row.playerId,
        kind: row.kind,
      })),
      mvpPlayerId: mvpRows[0]?.playerId ?? null,
    });
  }

  return {
    matchdayId,
    seasonId: meta.seasonId,
    ruleSetId: meta.ruleSetId,
    attendeePlayerIds: attendanceRows.map((row) => row.playerId),
    matches: scoreMatches,
  };
}
