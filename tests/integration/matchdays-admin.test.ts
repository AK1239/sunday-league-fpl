import { describe, expect, it, beforeEach } from "vitest";
import { eq } from "drizzle-orm";
import { isLocked } from "@/server/fantasy/lock";
import { getDb } from "@/server/db";
import { seedDatabase } from "@/server/db/seed";
import {
  cancelMatchdayAdmin,
  createMatchdayAdmin,
  updateMatchdayDeadlineAdmin,
} from "@/server/domain/matchdays-admin";
import {
  managerMatchdayScores,
  matchdays,
  seasons,
  users,
} from "@/server/db/schema";
import { getActiveSeasonId, seedPublishedDemoMatchday } from "./seed-fixture";
import { resetDatabase } from "./helpers";

const hasDatabase = !!process.env.DATABASE_URL;

describe.skipIf(!hasDatabase)("matchdays admin", () => {
  let adminId: string;
  let seasonId: string;

  beforeEach(async () => {
    await resetDatabase();
    await seedDatabase();
    const db = getDb();
    const [admin] = await db
      .insert(users)
      .values({
        email: "admin-md@test.local",
        displayName: "Admin",
        passwordHash: "x",
        role: "admin",
        status: "active",
      })
      .returning();
    adminId = admin!.id;
    const [season] = await db.select({ id: seasons.id }).from(seasons).limit(1);
    seasonId = season!.id;
  });

  it("creates a scheduled matchday with default deadline", async () => {
    const db = getDb();
    const row = await createMatchdayAdmin(db, adminId, {
      seasonId,
      playedOn: "2026-11-09",
    });
    expect(row.status).toBe("scheduled");
    expect(row.deadlineAt).toBeInstanceOf(Date);
  });

  it("applies deadline changes for lock checks", async () => {
    const db = getDb();
    const created = await createMatchdayAdmin(db, adminId, {
      seasonId,
      playedOn: "2026-11-16",
    });

    await updateMatchdayDeadlineAdmin(
      db,
      adminId,
      created.id,
      "2026-11-16T10:00",
    );

    const [updated] = await db
      .select()
      .from(matchdays)
      .where(eq(matchdays.id, created.id));

    expect(
      isLocked(
        { status: "scheduled", deadlineAt: updated!.deadlineAt },
        new Date(updated!.deadlineAt.getTime() + 1),
      ),
    ).toBe(true);
    expect(
      isLocked(
        { status: "scheduled", deadlineAt: updated!.deadlineAt },
        new Date(updated!.deadlineAt.getTime() - 60_000),
      ),
    ).toBe(false);
  });

  it("excludes cancelled matchdays from manager scoring rows", async () => {
    const db = getDb();
    const publishedId = await seedPublishedDemoMatchday(
      db,
      await getActiveSeasonId(db),
    );
    await cancelMatchdayAdmin(db, adminId, publishedId);

    const [md] = await db
      .select()
      .from(matchdays)
      .where(eq(matchdays.id, publishedId));
    expect(md!.status).toBe("cancelled");

    const scores = await db
      .select()
      .from(managerMatchdayScores)
      .where(eq(managerMatchdayScores.matchdayId, publishedId));
    expect(scores).toHaveLength(0);
  });
});
