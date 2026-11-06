import { beforeEach, describe, expect, it } from "vitest";
import { getDb } from "@/server/db";
import { auditLog } from "@/server/db/schema";
import { getAdminActivityData } from "@/server/queries/admin-activity";
import { resetDatabase } from "./helpers";

const hasDatabase = !!process.env.DATABASE_URL;

describe.skipIf(!hasDatabase)("admin activity pagination", () => {
  beforeEach(async () => {
    await resetDatabase();
    const now = Date.now();
    await getDb()
      .insert(auditLog)
      .values(
        Array.from({ length: 20 }, (_, i) => ({
          action: "update_season_chips",
          entity: "season",
          // i = 0 is the newest.
          at: new Date(now - i * 60_000),
        })),
      );
  });

  it("returns the first page newest-first with totals", async () => {
    const data = await getAdminActivityData(getDb(), { days: 7, page: 1 });
    expect(data.recent).toHaveLength(15);
    expect(data.pagination).toEqual({
      page: 1,
      pageSize: 15,
      pageCount: 2,
      total: 20,
    });
    expect(data.recent[0]!.at.getTime()).toBeGreaterThan(
      data.recent[14]!.at.getTime(),
    );
  });

  it("returns the remainder on page 2 with no overlap", async () => {
    const db = getDb();
    const p1 = await getAdminActivityData(db, { days: 7, page: 1 });
    const p2 = await getAdminActivityData(db, { days: 7, page: 2 });
    expect(p2.recent).toHaveLength(5);
    const ids1 = new Set(p1.recent.map((r) => r.id));
    expect(p2.recent.some((r) => ids1.has(r.id))).toBe(false);
  });

  it("clamps an out-of-range page to the last page", async () => {
    const data = await getAdminActivityData(getDb(), { days: 7, page: 99 });
    expect(data.pagination.page).toBe(2);
    expect(data.recent).toHaveLength(5);
  });
});
