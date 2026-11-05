import { describe, expect, it, beforeEach } from "vitest";
import { eq } from "drizzle-orm";
import { recomputeMatchday } from "@/server/domain/recompute-matchday";
import { getDb } from "@/server/db";
import { seedDatabase } from "@/server/db/seed";
import {
  fantasyTeamPlayers,
  fantasyTeams,
  managerMatchdayScores,
  managerScoreLines,
  matchdays,
  players,
  users,
} from "@/server/db/schema";
import { getManagerStandings } from "@/server/queries/manager-standings";
import { resetDatabase } from "./helpers";

const hasDatabase = !!process.env.DATABASE_URL;

describe.skipIf(!hasDatabase)("manager scoring integration", () => {
  beforeEach(async () => {
    await resetDatabase();
    await seedDatabase();
  });

  it("scores a manager team with captain multiplier on recompute", async () => {
    const db = getDb();
    const [matchday] = await db.select().from(matchdays).limit(1);
    const squad = await db.select().from(players).limit(5);
    expect(squad.length).toBe(5);

    const [manager] = await db
      .insert(users)
      .values({
        email: "scorer@test.local",
        displayName: "Scorer",
        passwordHash: "x",
        role: "manager",
        status: "active",
      })
      .returning();

    await db.transaction(async (tx) => {
      const [team] = await tx
        .insert(fantasyTeams)
        .values({
          managerId: manager!.id,
          matchdayId: matchday!.id,
          captainPlayerId: squad[0]!.id,
          viceCaptainPlayerId: squad[1]!.id,
          source: "manual",
        })
        .returning();
      await tx.insert(fantasyTeamPlayers).values(
        squad.map((p) => ({
          fantasyTeamId: team!.id,
          playerId: p.id,
        })),
      );
    });

    await recomputeMatchday(matchday!.id);

    const [total] = await db
      .select()
      .from(managerMatchdayScores)
      .where(eq(managerMatchdayScores.managerId, manager!.id));

    expect(total).toBeDefined();
    expect(total!.teamSource).toBe("manual");
    expect(total!.totalPoints).toBeGreaterThan(0);

    const lines = await db
      .select()
      .from(managerScoreLines)
      .where(eq(managerScoreLines.managerId, manager!.id));

    expect(lines.length).toBe(5);
    const captainLine = lines.find((l) => l.role === "captain");
    expect(captainLine?.multiplier).toBe(2);
    expect(captainLine!.points).toBe(captainLine!.basePoints * 2);

    const standings = await getManagerStandings(db, matchday!.seasonId);
    expect(standings.some((s) => s.managerId === manager!.id)).toBe(true);
  });
});
