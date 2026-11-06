import { describe, expect, it, beforeEach } from "vitest";
import { eq } from "drizzle-orm";
import { getDb } from "@/server/db";
import { seedDatabase } from "@/server/db/seed";
import {
  FantasyTeamError,
  saveFantasyTeam,
} from "@/server/domain/save-fantasy-team";
import { getManagerFantasyTeamForViewer } from "@/server/queries/fantasy-team-view";
import { getPickTeamData } from "@/server/queries/pick-team-data";
import {
  fantasyTeams,
  matchdays,
  players,
  seasons,
  users,
} from "@/server/db/schema";
import { resetDatabase } from "./helpers";

const hasDatabase = !!process.env.DATABASE_URL;

describe.skipIf(!hasDatabase)("fantasy team save", () => {
  let managerId: string;
  let otherManagerId: string;
  let adminId: string;
  let matchdayId: string;
  let playerIds: string[];

  beforeEach(async () => {
    await resetDatabase();
    await seedDatabase();
    const db = getDb();

    const [manager] = await db
      .insert(users)
      .values({
        email: "picker@test.local",
        displayName: "Picker",
        passwordHash: "x",
        role: "manager",
        status: "active",
      })
      .returning();
    managerId = manager!.id;

    const [other] = await db
      .insert(users)
      .values({
        email: "other@test.local",
        displayName: "Other",
        passwordHash: "x",
        role: "manager",
        status: "active",
      })
      .returning();
    otherManagerId = other!.id;

    const [admin] = await db
      .insert(users)
      .values({
        email: "override-admin@test.local",
        displayName: "Override Admin",
        passwordHash: "x",
        role: "admin",
        status: "active",
      })
      .returning();
    adminId = admin!.id;

    const [season] = await db.select({ id: seasons.id }).from(seasons).limit(1);
    const [md] = await db
      .insert(matchdays)
      .values({
        seasonId: season!.id,
        number: 50,
        playedOn: "2026-12-07",
        deadlineAt: new Date("2099-12-07T13:00:00.000Z"),
        status: "scheduled",
      })
      .returning();
    matchdayId = md!.id;

    playerIds = (
      await db
        .select({ id: players.id })
        .from(players)
        .where(eq(players.active, true))
        .limit(5)
    ).map((p) => p.id);
  });

  function validPick() {
    const [p1, p2, p3, p4, p5] = playerIds;
    return {
      playerIds: [p1!, p2!, p3!, p4!, p5!],
      captainPlayerId: p1!,
      viceCaptainPlayerId: p2!,
    };
  }

  it("saves a manager team while selection is open", async () => {
    const db = getDb();
    const { teamId } = await saveFantasyTeam(db, matchdayId, validPick(), {
      mode: "manager",
      managerId,
    });

    const [row] = await db
      .select()
      .from(fantasyTeams)
      .where(eq(fantasyTeams.id, teamId));
    expect(row!.source).toBe("manual");
    expect(row!.managerId).toBe(managerId);

    const pickData = await getPickTeamData(db, managerId, matchdayId);
    expect(pickData!.myTeam?.captainPlayerId).toBe(validPick().captainPlayerId);
    expect(pickData!.selectionOpen).toBe(true);
  });

  it("rejects manager save after deadline", async () => {
    const db = getDb();
    await db
      .update(matchdays)
      .set({ deadlineAt: new Date("2000-01-01T00:00:00.000Z") })
      .where(eq(matchdays.id, matchdayId));

    await expect(
      saveFantasyTeam(db, matchdayId, validPick(), {
        mode: "manager",
        managerId,
      }),
    ).rejects.toThrow(FantasyTeamError);
  });

  it("allows admin override after lock with audit trail source", async () => {
    const db = getDb();
    await db
      .update(matchdays)
      .set({ deadlineAt: new Date("2000-01-01T00:00:00.000Z") })
      .where(eq(matchdays.id, matchdayId));

    const { teamId } = await saveFantasyTeam(db, matchdayId, validPick(), {
      mode: "admin_override",
      adminUserId: adminId,
      targetManagerId: managerId,
      reason: "Phone died before deadline",
    });

    const [row] = await db
      .select()
      .from(fantasyTeams)
      .where(eq(fantasyTeams.id, teamId));
    expect(row!.source).toBe("admin");
  });

  it("hides other managers teams before deadline", async () => {
    const db = getDb();
    await saveFantasyTeam(db, matchdayId, validPick(), {
      mode: "manager",
      managerId,
    });

    const hidden = await getManagerFantasyTeamForViewer(
      db,
      matchdayId,
      managerId,
      {
        viewerUserId: otherManagerId,
        viewerRole: "manager",
        targetManagerId: managerId,
      },
    );
    expect(hidden.visibility).toBe("hidden");

    await db
      .update(matchdays)
      .set({ deadlineAt: new Date("2000-01-01T00:00:00.000Z") })
      .where(eq(matchdays.id, matchdayId));

    const visible = await getManagerFantasyTeamForViewer(
      db,
      matchdayId,
      managerId,
      {
        viewerUserId: otherManagerId,
        viewerRole: "manager",
        targetManagerId: managerId,
      },
    );
    expect(visible.visibility).toBe("visible");
    if (visible.visibility === "visible") {
      expect(visible.playerIds.length).toBe(5);
    }
  });
});
