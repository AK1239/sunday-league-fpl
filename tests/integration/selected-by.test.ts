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
import { getPickTeamData } from "@/server/queries/pick-team-data";
import { resetDatabase } from "./helpers";

const hasDatabase = !!process.env.DATABASE_URL;

describe.skipIf(!hasDatabase)("selected-by percentage", () => {
  let matchdayId: string;
  let managerIds: string[];
  let squad: string[];

  /** Team + players in one transaction (captain-in-squad is a deferred constraint). */
  async function saveTeam(
    managerId: string,
    ids: string[],
    forMatchday = matchdayId,
  ) {
    await getDb().transaction(async (tx) => {
      const [team] = await tx
        .insert(fantasyTeams)
        .values({
          managerId,
          matchdayId: forMatchday,
          captainPlayerId: ids[0]!,
          viceCaptainPlayerId: ids[1]!,
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
    const [md] = await db
      .insert(matchdays)
      .values({
        seasonId: season!.id,
        number: 2,
        playedOn: "2099-01-04",
        deadlineAt: new Date("2099-01-04T13:00:00.000Z"),
        status: "scheduled",
      })
      .returning();
    matchdayId = md!.id;

    squad = (
      await db
        .select({ id: players.id })
        .from(players)
        .where(eq(players.active, true))
    )
      .slice(0, 7)
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

  const pct = (
    data: NonNullable<Awaited<ReturnType<typeof getPickTeamData>>>,
    id: string,
  ) => data.players.find((p) => p.id === id)!.selectedByPercent;

  it("is hidden while fewer than 3 teams exist", async () => {
    await saveTeam(managerIds[0]!, squad.slice(0, 5));
    await saveTeam(managerIds[1]!, squad.slice(0, 5));
    const data = await getPickTeamData(getDb(), managerIds[0]!, matchdayId);
    expect(data!.players.every((p) => p.selectedByPercent === null)).toBe(true);
  });

  it("shows the share of teams once 3 teams exist", async () => {
    // 4 teams: squad[0] in all four, squad[5] in one, squad[6] in none.
    await saveTeam(managerIds[0]!, [
      squad[0]!,
      squad[1]!,
      squad[2]!,
      squad[3]!,
      squad[4]!,
    ]);
    await saveTeam(managerIds[1]!, [
      squad[0]!,
      squad[1]!,
      squad[2]!,
      squad[3]!,
      squad[4]!,
    ]);
    await saveTeam(managerIds[2]!, [
      squad[0]!,
      squad[1]!,
      squad[2]!,
      squad[3]!,
      squad[4]!,
    ]);
    await saveTeam(managerIds[3]!, [
      squad[0]!,
      squad[1]!,
      squad[2]!,
      squad[3]!,
      squad[5]!,
    ]);

    const data = await getPickTeamData(getDb(), managerIds[0]!, matchdayId);
    expect(pct(data!, squad[0]!)).toBe(100);
    expect(pct(data!, squad[4]!)).toBe(75);
    expect(pct(data!, squad[5]!)).toBe(25);
    expect(pct(data!, squad[6]!)).toBe(0);
  });

  it("counts a carried-over team from an earlier gameweek", async () => {
    // Two managers saved this GW; a third only has a team saved earlier.
    const db = getDb();
    const [season] = await db.select({ id: seasons.id }).from(seasons).limit(1);
    const [gw1] = await db
      .insert(matchdays)
      .values({
        seasonId: season!.id,
        number: 1,
        playedOn: "2098-12-28",
        deadlineAt: new Date("2098-12-28T13:00:00.000Z"),
        status: "published",
      })
      .returning();
    const first = squad.slice(0, 5);
    await saveTeam(managerIds[2]!, first, gw1!.id);

    await saveTeam(managerIds[0]!, first);
    await saveTeam(managerIds[1]!, first);

    const data = await getPickTeamData(getDb(), managerIds[0]!, matchdayId);
    // 3 teams (two saved + one carried over) → shown.
    expect(pct(data!, squad[0]!)).toBe(100);
  });
});
