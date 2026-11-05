import { and, asc, eq, gte, inArray, sql } from "drizzle-orm";
import type { DbExecutor } from "@/server/db";
import {
  fantasyTeamPlayers,
  fantasyTeams,
  managerMatchdayScores,
  managerRankSnapshots,
  managerScoreLines,
  matchdayAttendance,
  matchdays,
  pointLedger,
  seasons,
  users,
} from "@/server/db/schema";
import {
  resolveEffectiveTeam,
  type MatchdayTimelineEntry,
  type SubmittedFantasyTeam,
} from "@/server/fantasy/effective-team";
import {
  scoreManagerWithNoTeam,
  scoreManagers,
} from "@/server/scoring/manager-score";
import type { ManagerScoringRules } from "@/server/scoring/manager-types";
import { loadScoringRulesForMatchday } from "./load-matchday-scoring";

type Tx = DbExecutor;

export async function rebuildManagerScoresFromMatchday(
  tx: Tx,
  seasonId: string,
  fromMatchdayNumber: number,
): Promise<void> {
  const cascadeMatchdays = await tx
    .select({ id: matchdays.id })
    .from(matchdays)
    .where(
      and(
        eq(matchdays.seasonId, seasonId),
        gte(matchdays.number, fromMatchdayNumber),
      ),
    );

  const cascadeIds = cascadeMatchdays.map((row) => row.id);
  if (cascadeIds.length === 0) return;

  await tx
    .delete(managerScoreLines)
    .where(inArray(managerScoreLines.matchdayId, cascadeIds));
  await tx
    .delete(managerMatchdayScores)
    .where(inArray(managerMatchdayScores.matchdayId, cascadeIds));

  const published = await tx
    .select({
      id: matchdays.id,
      number: matchdays.number,
      playedOn: matchdays.playedOn,
      seasonStartsOn: seasons.startsOn,
    })
    .from(matchdays)
    .innerJoin(seasons, eq(matchdays.seasonId, seasons.id))
    .where(
      and(
        eq(matchdays.seasonId, seasonId),
        eq(matchdays.status, "published"),
        gte(matchdays.number, fromMatchdayNumber),
      ),
    )
    .orderBy(asc(matchdays.number));

  if (published.length === 0) {
    await rebuildManagerRankSnapshots(tx, seasonId, fromMatchdayNumber);
    return;
  }

  const managers = await tx
    .select({
      id: users.id,
      displayName: users.displayName,
    })
    .from(users)
    .where(inArray(users.role, ["manager", "admin"]));

  if (managers.length === 0) {
    await rebuildManagerRankSnapshots(tx, seasonId, fromMatchdayNumber);
    return;
  }

  const managerIds = managers.map((m) => m.id);

  const teamHeaders = await tx
    .select({
      id: fantasyTeams.id,
      managerId: fantasyTeams.managerId,
      matchdayId: fantasyTeams.matchdayId,
      source: fantasyTeams.source,
      captainPlayerId: fantasyTeams.captainPlayerId,
      viceCaptainPlayerId: fantasyTeams.viceCaptainPlayerId,
      playedOn: matchdays.playedOn,
      number: matchdays.number,
      seasonStartsOn: seasons.startsOn,
    })
    .from(fantasyTeams)
    .innerJoin(matchdays, eq(fantasyTeams.matchdayId, matchdays.id))
    .innerJoin(seasons, eq(matchdays.seasonId, seasons.id))
    .where(inArray(fantasyTeams.managerId, managerIds));

  const teamIds = teamHeaders.map((t) => t.id);
  const squadRows =
    teamIds.length === 0
      ? []
      : await tx
          .select({
            fantasyTeamId: fantasyTeamPlayers.fantasyTeamId,
            playerId: fantasyTeamPlayers.playerId,
          })
          .from(fantasyTeamPlayers)
          .where(inArray(fantasyTeamPlayers.fantasyTeamId, teamIds));

  const playersByTeam = new Map<string, string[]>();
  for (const row of squadRows) {
    const list = playersByTeam.get(row.fantasyTeamId) ?? [];
    list.push(row.playerId);
    playersByTeam.set(row.fantasyTeamId, list);
  }

  let submittedTeams: SubmittedFantasyTeam[] = teamHeaders.map((team) => ({
    managerId: team.managerId,
    source: team.source,
    captainPlayerId: team.captainPlayerId,
    viceCaptainPlayerId: team.viceCaptainPlayerId,
    playerIds: playersByTeam.get(team.id) ?? [],
    matchday: {
      matchdayId: team.matchdayId,
      playedOn: team.playedOn,
      number: team.number,
      seasonStartsOn: team.seasonStartsOn,
    },
  }));

  for (const md of published) {
    const target: MatchdayTimelineEntry = {
      matchdayId: md.id,
      playedOn: md.playedOn,
      number: md.number,
      seasonStartsOn: md.seasonStartsOn,
    };

    const rulesMeta = await loadScoringRulesForMatchday(tx, md.id);
    if (!rulesMeta) continue;

    const rules: ManagerScoringRules = rulesMeta.rules;

    const pointRows = await tx
      .select({
        playerId: pointLedger.playerId,
        total: sql<number>`coalesce(sum(${pointLedger.points}), 0)::int`.as(
          "total",
        ),
      })
      .from(pointLedger)
      .where(eq(pointLedger.matchdayId, md.id))
      .groupBy(pointLedger.playerId);

    const playerPoints = new Map(
      pointRows.map((row) => [row.playerId, row.total]),
    );

    const attendanceRows = await tx
      .select({ playerId: matchdayAttendance.playerId })
      .from(matchdayAttendance)
      .where(eq(matchdayAttendance.matchdayId, md.id));

    const attended = new Set(attendanceRows.map((row) => row.playerId));

    const scored = [];

    for (const manager of managers) {
      const effective = resolveEffectiveTeam(
        manager.id,
        target,
        submittedTeams,
      );

      await tx
        .delete(fantasyTeams)
        .where(
          and(
            eq(fantasyTeams.managerId, manager.id),
            eq(fantasyTeams.matchdayId, md.id),
            eq(fantasyTeams.source, "carry_over"),
          ),
        );

      if (!effective) {
        scored.push(scoreManagerWithNoTeam(manager.id));
        continue;
      }

      if (effective.teamSource === "carry_over") {
        const [carryTeam] = await tx
          .insert(fantasyTeams)
          .values({
            managerId: manager.id,
            matchdayId: md.id,
            captainPlayerId: effective.captainPlayerId,
            viceCaptainPlayerId: effective.viceCaptainPlayerId,
            source: "carry_over",
          })
          .returning({ id: fantasyTeams.id });

        await tx.insert(fantasyTeamPlayers).values(
          effective.playerIds.map((playerId) => ({
            fantasyTeamId: carryTeam!.id,
            playerId,
          })),
        );

        submittedTeams.push({
          managerId: manager.id,
          source: "carry_over",
          captainPlayerId: effective.captainPlayerId,
          viceCaptainPlayerId: effective.viceCaptainPlayerId,
          playerIds: [...effective.playerIds],
          matchday: target,
        });
      }

      const [entry] = scoreManagers(rules, playerPoints, attended, [
        {
          managerId: manager.id,
          captainPlayerId: effective.captainPlayerId,
          viceCaptainPlayerId: effective.viceCaptainPlayerId,
          playerIds: effective.playerIds,
          teamSource: effective.teamSource,
        },
      ]);
      scored.push(entry);
    }

    if (scored.some((s) => s.lines.length > 0)) {
      await tx.insert(managerScoreLines).values(
        scored.flatMap((entry) =>
          entry.lines.map((line) => ({
            managerId: line.managerId,
            matchdayId: md.id,
            seasonId,
            playerId: line.playerId,
            role: line.role,
            basePoints: line.basePoints,
            multiplier: line.multiplier,
            points: line.points,
            attended: line.attended,
            teamSource: line.teamSource,
          })),
        ),
      );
    }

    await tx.insert(managerMatchdayScores).values(
      scored.map((entry) => ({
        managerId: entry.managerId,
        matchdayId: md.id,
        seasonId,
        totalPoints: entry.totalPoints,
        multiplierPlayerId: entry.multiplierPlayerId,
        teamSource: entry.teamSource,
      })),
    );
  }

  await rebuildManagerRankSnapshots(tx, seasonId, fromMatchdayNumber);
}

async function rebuildManagerRankSnapshots(
  tx: Tx,
  seasonId: string,
  fromMatchdayNumber: number,
) {
  const published = await tx
    .select({ id: matchdays.id, number: matchdays.number })
    .from(matchdays)
    .where(
      and(
        eq(matchdays.seasonId, seasonId),
        eq(matchdays.status, "published"),
        gte(matchdays.number, fromMatchdayNumber),
      ),
    )
    .orderBy(asc(matchdays.number));

  if (published.length === 0) return;

  const publishedIds = published.map((row) => row.id);
  await tx
    .delete(managerRankSnapshots)
    .where(inArray(managerRankSnapshots.matchdayId, publishedIds));

  const managers = await tx
    .select({
      id: users.id,
      displayName: users.displayName,
    })
    .from(users)
    .where(inArray(users.role, ["manager", "admin"]));

  for (const md of published) {
    const totals = await tx
      .select({
        managerId: managerMatchdayScores.managerId,
        total: sql<number>`coalesce(sum(${managerMatchdayScores.totalPoints}), 0)::int`.as(
          "total",
        ),
      })
      .from(managerMatchdayScores)
      .innerJoin(matchdays, eq(managerMatchdayScores.matchdayId, matchdays.id))
      .where(
        and(
          eq(managerMatchdayScores.seasonId, seasonId),
          eq(matchdays.status, "published"),
          sql`${matchdays.number} <= ${md.number}`,
        ),
      )
      .groupBy(managerMatchdayScores.managerId);

    const totalsMap = new Map(
      totals.map((row) => [row.managerId, row.total]),
    );

    const ranked = managers
      .map((manager) => ({
        managerId: manager.id,
        displayName: manager.displayName,
        points: totalsMap.get(manager.id) ?? 0,
      }))
      .filter((row) => row.points > 0)
      .sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        return a.displayName.localeCompare(b.displayName);
      });

    if (ranked.length === 0) continue;

    await tx.insert(managerRankSnapshots).values(
      ranked.map((row, index) => ({
        matchdayId: md.id,
        managerId: row.managerId,
        rankAfter: index + 1,
        pointsAfter: row.points,
      })),
    );
  }
}
