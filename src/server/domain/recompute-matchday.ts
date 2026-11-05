import { and, asc, eq, gte, inArray, sql } from "drizzle-orm";
import { getDb } from "@/server/db";
import {
  matchdaySnapshots,
  matchdays,
  players,
  pointLedger,
} from "@/server/db/schema";
import {
  loadScoreMatchdayInput,
  loadScoringRulesForMatchday,
} from "./load-matchday-scoring";
import { scoreMatchday } from "@/server/scoring/score";
import { rebuildManagerScoresFromMatchday } from "./recompute-manager-scores";

export async function recomputeMatchday(matchdayId: string): Promise<void> {
  const db = getDb();

  await db.transaction(async (tx) => {
    const locked = await tx
      .select({
        id: matchdays.id,
        seasonId: matchdays.seasonId,
        status: matchdays.status,
        number: matchdays.number,
      })
      .from(matchdays)
      .where(eq(matchdays.id, matchdayId))
      .for("update")
      .limit(1);

    const matchday = locked[0];
    if (!matchday) {
      throw new Error(`Matchday not found: ${matchdayId}`);
    }

    await tx.delete(pointLedger).where(eq(pointLedger.matchdayId, matchdayId));

    if (matchday.status !== "published") {
      await rebuildSnapshotsFromMatchday(
        tx,
        matchday.seasonId,
        matchday.number,
      );
      await rebuildManagerScoresFromMatchday(
        tx,
        matchday.seasonId,
        matchday.number,
      );
      return;
    }

    const input = await loadScoreMatchdayInput(tx, matchdayId);
    const meta = await loadScoringRulesForMatchday(tx, matchdayId);
    if (!input || !meta) {
      throw new Error(
        `Unable to load scoring input for matchday ${matchdayId}`,
      );
    }

    const computed = scoreMatchday(meta.rules, input);
    if (computed.length > 0) {
      await tx.insert(pointLedger).values(
        computed.map((row) => ({
          seasonId: row.seasonId,
          matchdayId: row.matchdayId,
          matchId: row.matchId,
          playerId: row.playerId,
          kind: row.kind,
          points: row.points,
          sourceRef: row.sourceRef,
          ruleSetId: row.ruleSetId,
          generation: 1,
        })),
      );
    }

    await rebuildSnapshotsFromMatchday(tx, matchday.seasonId, matchday.number);
    await rebuildManagerScoresFromMatchday(
      tx,
      matchday.seasonId,
      matchday.number,
    );
  });
}

async function rebuildSnapshotsFromMatchday(
  tx: Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0],
  seasonId: string,
  fromMatchdayNumber: number,
) {
  const published = await tx
    .select({
      id: matchdays.id,
      number: matchdays.number,
    })
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
    .delete(matchdaySnapshots)
    .where(inArray(matchdaySnapshots.matchdayId, publishedIds));

  const activePlayers = await tx
    .select({ id: players.id, displayName: players.displayName })
    .from(players)
    .where(eq(players.active, true));

  for (const md of published) {
    const totals = await tx
      .select({
        playerId: pointLedger.playerId,
        total: sql<number>`coalesce(sum(${pointLedger.points}), 0)::int`.as(
          "total",
        ),
      })
      .from(pointLedger)
      .innerJoin(matchdays, eq(pointLedger.matchdayId, matchdays.id))
      .where(
        and(
          eq(pointLedger.seasonId, seasonId),
          eq(matchdays.status, "published"),
          sql`${matchdays.number} <= ${md.number}`,
        ),
      )
      .groupBy(pointLedger.playerId);

    const totalsMap = new Map(totals.map((row) => [row.playerId, row.total]));

    const ranked = activePlayers
      .map((player) => ({
        playerId: player.id,
        displayName: player.displayName,
        points: totalsMap.get(player.id) ?? 0,
      }))
      .filter((row) => row.points > 0)
      .sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        return a.displayName.localeCompare(b.displayName);
      });

    if (ranked.length === 0) continue;

    await tx.insert(matchdaySnapshots).values(
      ranked.map((row, index) => ({
        matchdayId: md.id,
        playerId: row.playerId,
        rankAfter: index + 1,
        pointsAfter: row.points,
      })),
    );
  }
}
