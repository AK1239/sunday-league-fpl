import { beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { getDb } from "@/server/db";
import { seedDatabase } from "@/server/db/seed";
import {
  fantasyTeamPlayers,
  fantasyTeams,
  matchdays,
  players,
  seasons,
  users,
} from "@/server/db/schema";
import { buildPublicGameweekPickStats } from "@/server/queries/gameweek-pick-stats";
import { resetDatabase } from "./helpers";

const hasDatabase = !!process.env.DATABASE_URL;

describe.skipIf(!hasDatabase)("gameweek pick stats", () => {
  let seasonId: string;
  let matchday: { id: string; number: number; playedOn: string };
  let managerIds: string[];
  let squad: string[];

  async function saveTeam(
    managerId: string,
    ids: string[],
    captain: string,
    vice: string,
  ) {
    await getDb().transaction(async (tx) => {
      const [team] = await tx
        .insert(fantasyTeams)
        .values({
          managerId,
          matchdayId: matchday.id,
          captainPlayerId: captain,
          viceCaptainPlayerId: vice,
          source: "manual",
        })
        .returning();
      await tx
        .insert(fantasyTeamPlayers)
        .values(ids.map((playerId) => ({ fantasyTeamId: team!.id, playerId })));
    });
  }

  beforeEach(async () => {
    await resetDatabase();
    await seedDatabase();
    const db = getDb();
    const [season] = await db.select({ id: seasons.id }).from(seasons).limit(1);
    seasonId = season!.id;
    const [md] = await db
      .insert(matchdays)
      .values({
        seasonId,
        number: 2,
        playedOn: "2099-01-04",
        deadlineAt: new Date("2099-01-04T13:00:00.000Z"),
        status: "scheduled",
      })
      .returning();
    matchday = { id: md!.id, number: 2, playedOn: "2099-01-04" };

    squad = (
      await db
        .select({ id: players.id })
        .from(players)
        .where(eq(players.active, true))
    )
      .slice(0, 6)
      .map((p) => p.id);

    managerIds = [];
    for (const n of [1, 2, 3, 4]) {
      const [u] = await db
        .insert(users)
        .values({
          email: `m${n}@test.local`,
          displayName: `Manager ${n}`,
          passwordHash: "x",
          role: "manager",
          status: "active",
        })
        .returning();
      managerIds.push(u!.id);
    }
  });

  it("keeps each card's own count when one player leads several lists", async () => {
    // squad[0] is in all 4 squads (most selected) but captain in only 1
    // team and vice-captain in only 2. Regression: the selected count used
    // to overwrite the captain / vice-captain counts.
    const ids = squad.slice(0, 5);
    await saveTeam(managerIds[0]!, ids, squad[0]!, squad[1]!);
    await saveTeam(managerIds[1]!, ids, squad[1]!, squad[0]!);
    await saveTeam(managerIds[2]!, ids, squad[1]!, squad[0]!);
    await saveTeam(managerIds[3]!, ids, squad[1]!, squad[2]!);

    const stats = await buildPublicGameweekPickStats(
      getDb(),
      seasonId,
      matchday,
    );
    expect(stats).not.toBeNull();
    expect(stats!.teamsCount).toBe(4);

    // squad[1]: captain 3/4, vice 1/4, selected 4/4.
    expect(stats!.topCaptain).toMatchObject({
      playerId: squad[1],
      count: 3,
      percent: 75,
    });
    // squad[0]: vice 2/4, selected 4/4.
    expect(stats!.topViceCaptain).toMatchObject({
      playerId: squad[0],
      count: 2,
      percent: 50,
    });
    expect(stats!.topSelected[0]).toMatchObject({ count: 4, percent: 100 });
  });
});
