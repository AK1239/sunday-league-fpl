import "dotenv/config";
import { eq } from "drizzle-orm";
import { parseEnv } from "@/env";
import { SQUAD_DISPLAY_NAMES } from "@/lib/squad";
import { recomputeMatchday } from "@/server/domain/recompute-matchday";
import { getDb } from "./index";
import { seedAdminUser } from "./seed-admin";
import {
  goals,
  matchMvps,
  matchParticipants,
  matchSides,
  matchdayAttendance,
  matchdays,
  matches,
  players,
  scoringRuleSets,
  seasons,
} from "./schema";

export async function seedDatabase() {
  parseEnv(process.env);
  const db = getDb();

  const existingRules = await db.select().from(scoringRuleSets).limit(1);
  if (existingRules.length > 0) {
    console.log("Seed skipped: scoring_rule_sets already populated");
    return;
  }

  const [rules] = await db
    .insert(scoringRuleSets)
    .values({
      name: "Default · Nov 2026",
      attendancePts: 2,
      winPts: 3,
      drawPts: 1,
      goalPts: 5,
      assistPts: 3,
      mvpPts: 3,
      cleanSheetPts: 4,
    })
    .returning();

  const [season] = await db
    .insert(seasons)
    .values({
      name: "Season 1 · Nov 2026 – Jan 2027",
      startsOn: "2026-11-01",
      endsOn: "2027-01-31",
      status: "active",
      ruleSetId: rules!.id,
    })
    .returning();

  const insertedPlayers = await db
    .insert(players)
    .values(
      SQUAD_DISPLAY_NAMES.map((displayName) => ({
        displayName,
        joinedOn: "2026-11-01",
      })),
    )
    .returning();

  const byName = new Map(
    insertedPlayers.map((player) => [player.displayName, player]),
  );

  const [matchday] = await db
    .insert(matchdays)
    .values({
      seasonId: season!.id,
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
    mvp: "Akil",
    byName,
  });

  const published = await db
    .select({ id: matchdays.id })
    .from(matchdays)
    .where(eq(matchdays.status, "published"));

  for (const row of published) {
    await recomputeMatchday(row.id);
  }

  await seedAdminUser(db);

  console.log("Seed complete:", {
    seasonId: season!.id,
    matchdayId: matchday!.id,
    players: insertedPlayers.length,
  });
}

async function seedPublishedMatch(options: {
  db: ReturnType<typeof getDb>;
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
  mvp: string;
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
    mvp,
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

  await db.insert(matchMvps).values({
    matchId: match!.id,
    playerId: byName.get(mvp)!.id,
  });
}

async function main() {
  await seedDatabase();
}

if (!process.env.VITEST) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
