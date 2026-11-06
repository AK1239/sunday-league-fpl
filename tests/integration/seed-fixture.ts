import { eq } from "drizzle-orm";
import { recomputeMatchday } from "@/server/domain/recompute-matchday";
import type { AppDb } from "@/server/db";
import {
  goals,
  matchParticipants,
  matchSides,
  matchdayAttendance,
  matchdays,
  matches,
  players,
} from "@/server/db/schema";

/** Published gameweek with one match — for integration tests only, not `pnpm db:seed`. */
export async function seedPublishedDemoMatchday(db: AppDb, seasonId: string) {
  const squad = await db.select().from(players);
  const byName = new Map(squad.map((player) => [player.displayName, player]));

  const [matchday] = await db
    .insert(matchdays)
    .values({
      seasonId,
      number: 1,
      playedOn: "2026-11-02",
      deadlineAt: new Date("2026-11-02T13:00:00.000Z"),
      status: "published",
      publishedAt: new Date(),
    })
    .returning();

  const attendees = ["Akil", "Murti", "Yusuf", "Lolo", "Ajam"];
  await db.insert(matchdayAttendance).values(
    attendees.map((name) => ({
      matchdayId: matchday!.id,
      playerId: byName.get(name)!.id,
    })),
  );

  await seedPublishedMatch({
    db,
    matchdayId: matchday!.id,
    matchNo: 1,
    scoreA: 3,
    scoreB: 2,
    sideA: ["Akil", "Murti", "Yusuf"],
    sideB: ["Lolo", "Ajam"],
    sideAGk: "Yusuf",
    sideBGk: null,
    goalEvents: [
      { side: "A" as const, scorer: "Akil", assist: "Murti" },
      { side: "A" as const, scorer: "Akil", assist: null },
      { side: "A" as const, scorer: "Yusuf", assist: null },
      { side: "B" as const, scorer: "Lolo", assist: null },
      { side: "B" as const, scorer: "Ajam", assist: null },
    ],
    byName,
  });

  await recomputeMatchday(matchday!.id);
  return matchday!.id;
}

async function seedPublishedMatch(options: {
  db: AppDb;
  matchdayId: string;
  matchNo: number;
  scoreA: number;
  scoreB: number;
  sideA: string[];
  sideB: string[];
  sideAGk: string | null;
  sideBGk?: string | null;
  goalEvents: {
    side: "A" | "B";
    scorer: string;
    assist: string | null;
  }[];
  byName: Map<string, { id: string }>;
}) {
  const {
    db,
    matchdayId,
    matchNo,
    scoreA,
    scoreB,
    sideA,
    sideB,
    sideAGk,
    sideBGk = null,
    goalEvents,
    byName,
  } = options;

  const [match] = await db
    .insert(matches)
    .values({ matchdayId, matchNo, scoreA, scoreB })
    .returning();

  const [sideARow] = await db
    .insert(matchSides)
    .values({
      matchId: match!.id,
      side: "A",
      goalkeeperPlayerId: sideAGk ? byName.get(sideAGk)!.id : null,
    })
    .returning();

  const [sideBRow] = await db
    .insert(matchSides)
    .values({
      matchId: match!.id,
      side: "B",
      goalkeeperPlayerId: sideBGk ? byName.get(sideBGk)!.id : null,
    })
    .returning();

  for (const name of sideA) {
    await db.insert(matchParticipants).values({
      matchId: match!.id,
      playerId: byName.get(name)!.id,
      sideId: sideARow!.id,
    });
  }
  for (const name of sideB) {
    await db.insert(matchParticipants).values({
      matchId: match!.id,
      playerId: byName.get(name)!.id,
      sideId: sideBRow!.id,
    });
  }

  let seq = 1;
  for (const event of goalEvents) {
    const scorer = byName.get(event.scorer);
    if (!scorer) continue;
    const assist = event.assist ? byName.get(event.assist) : undefined;

    await db.insert(goals).values({
      matchId: match!.id,
      sideId: event.side === "A" ? sideARow!.id : sideBRow!.id,
      scorerId: scorer.id,
      assistId: assist?.id ?? null,
      seq: seq++,
    });
  }

}

export async function getActiveSeasonId(db: AppDb): Promise<string> {
  const { seasons } = await import("@/server/db/schema");
  const [season] = await db
    .select({ id: seasons.id })
    .from(seasons)
    .where(eq(seasons.status, "active"))
    .limit(1);
  if (!season) throw new Error("No active season");
  return season.id;
}
