import { describe, expect, it, beforeEach } from "vitest";
import { getDb } from "@/server/db";
import { seedDatabase } from "@/server/db/seed";
import { matchdays, users } from "@/server/db/schema";
import { ensureAutoScheduledMatchday } from "@/server/domain/auto-schedule-matchdays";
import { resetDatabase } from "./helpers";

const hasDatabase = !!process.env.DATABASE_URL;

describe.skipIf(!hasDatabase)("auto-schedule matchdays", () => {
  beforeEach(async () => {
    await resetDatabase();
    await seedDatabase();
    const db = getDb();
    await db.insert(users).values({
      email: "auto-sched@test.local",
      displayName: "Scheduler Admin",
      passwordHash: "x",
      role: "admin",
      status: "active",
    });
  });

  it("creates the open Sunday gameweek for the active season", async () => {
    const db = getDb();
    const before = await db.select().from(matchdays);
    expect(before).toHaveLength(0);

    const result = await ensureAutoScheduledMatchday(
      db,
      new Date("2026-11-06T08:00:00+03:00"),
    );
    expect(result.status).toBe("created");
    if (result.status !== "created") return;
    expect(result.playedOn).toBe("2026-11-08");

    const again = await ensureAutoScheduledMatchday(
      db,
      new Date("2026-11-06T09:00:00+03:00"),
    );
    expect(again.status).toBe("exists");
    if (again.status !== "exists") return;
    expect(again.matchdayId).toBe(result.matchdayId);
  });

  it("targets the next Sunday after gameweek Sunday noon", async () => {
    const db = getDb();
    const first = await ensureAutoScheduledMatchday(
      db,
      new Date("2026-11-08T11:00:00+03:00"),
    );
    expect(first.status).toBe("created");
    if (first.status !== "created") return;
    expect(first.playedOn).toBe("2026-11-08");

    const second = await ensureAutoScheduledMatchday(
      db,
      new Date("2026-11-08T12:30:00+03:00"),
    );
    expect(second.status).toBe("created");
    if (second.status !== "created") return;
    expect(second.playedOn).toBe("2026-11-15");
  });
});
