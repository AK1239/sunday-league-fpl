import { beforeEach, describe, expect, it } from "vitest";
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
import {
  computeOpenGameweekPlayedOn,
  ensureAutoScheduledMatchday,
} from "@/server/domain/auto-schedule-matchdays";
import { getLeagueSettings } from "@/server/domain/league-settings";
import {
  getLockedUnpublishedMatchdays,
  getNextScheduledMatchday,
} from "@/server/queries/fantasy-team-view";
import { getMyTeamPageData } from "@/server/queries/manager-my-pages";
import { resetDatabase } from "./helpers";

const hasDatabase = !!process.env.DATABASE_URL;

describe.skipIf(!hasDatabase)("active gameweek after the deadline", () => {
  let seasonId: string;
  let managerId: string;
  let gw1: string;

  beforeEach(async () => {
    await resetDatabase();
    await seedDatabase();
    const db = getDb();
    const [season] = await db.select({ id: seasons.id }).from(seasons).limit(1);
    seasonId = season!.id;
    await db.insert(users).values({
      email: "sched-admin@test.local",
      displayName: "Admin",
      passwordHash: "x",
      role: "admin",
      status: "active",
    });
    const [m] = await db
      .insert(users)
      .values({
        email: "mgr@test.local",
        displayName: "Mgr",
        passwordHash: "x",
        role: "manager",
        status: "active",
      })
      .returning();
    managerId = m!.id;
  });

  async function createGw1(
    playedOn = "2026-11-15",
    deadlineAt = new Date("2026-11-14T21:00:00.000Z"),
  ) {
    // Default: deadline Sat 14 Nov 2026 21:00 UTC; plays Sun 15 Nov.
    const [md] = await getDb()
      .insert(matchdays)
      .values({
        seasonId,
        number: 1,
        playedOn,
        deadlineAt,
        status: "scheduled",
      })
      .returning();
    gw1 = md!.id;
  }

  it("keeps the current gameweek active until its deadline", async () => {
    await createGw1();
    const before = new Date("2026-11-14T20:00:00.000Z");
    const next = await getNextScheduledMatchday(getDb(), seasonId, before);
    expect(next?.id).toBe(gw1);
    expect(
      await getLockedUnpublishedMatchdays(getDb(), seasonId, before),
    ).toHaveLength(0);
  });

  it("moves to the next gameweek once the deadline passes", async () => {
    await createGw1();
    const after = new Date("2026-11-14T22:00:00.000Z");

    // GW2 does not exist yet → nothing open.
    expect(await getNextScheduledMatchday(getDb(), seasonId, after)).toBeNull();

    // Scheduler creates it automatically (no admin action).
    const ensured = await ensureAutoScheduledMatchday(getDb(), after);
    expect(ensured.status).toBe("created");
    if (ensured.status !== "created") return;
    expect(ensured.playedOn).toBe("2026-11-22");

    const next = await getNextScheduledMatchday(getDb(), seasonId, after);
    expect(next?.id).toBe(ensured.matchdayId);
    expect(next?.number).toBe(2);

    const locked = await getLockedUnpublishedMatchdays(
      getDb(),
      seasonId,
      after,
    );
    expect(locked.map((m) => m.id)).toEqual([gw1]);

    // Idempotent.
    const again = await ensureAutoScheduledMatchday(getDb(), after);
    expect(again.status).toBe("exists");
  });

  it("My Team shows the carried-over squad on GW2 and the locked GW1 squad", async () => {
    // Real-clock page data: GW1 is the open Sunday with a deadline just passed.
    const db = getDb();
    const settings = await getLeagueSettings(db);
    const playedOn = await computeOpenGameweekPlayedOn(db, settings!.timezone);
    await createGw1(playedOn, new Date(Date.now() - 60 * 60 * 1000));
    const squad = (await db.select({ id: players.id }).from(players))
      .slice(0, 5)
      .map((p) => p.id);
    await db.transaction(async (tx) => {
      const [team] = await tx
        .insert(fantasyTeams)
        .values({
          managerId,
          matchdayId: gw1,
          captainPlayerId: squad[0]!,
          viceCaptainPlayerId: squad[1]!,
          source: "manual",
        })
        .returning();
      await tx
        .insert(fantasyTeamPlayers)
        .values(
          squad.map((playerId) => ({ fantasyTeamId: team!.id, playerId })),
        );
    });

    const data = await getMyTeamPageData(db, managerId);
    expect(data?.upcoming?.number).toBe(2);
    expect(data?.upcoming?.team.visibility).toBe("visible");
    if (data?.upcoming?.team.visibility === "visible") {
      expect(data.upcoming.team.teamSource).toBe("carry_over");
      expect(data.upcoming.team.playerIds.sort()).toEqual([...squad].sort());
    }
    expect(data?.locked?.number).toBe(1);
    if (data?.locked?.team.visibility === "visible") {
      expect(data.locked.team.teamSource).toBe("manual");
      expect(data.locked.team.slots).toHaveLength(5);
    }
  });
});
