import { sql } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import { getDb } from "@/server/db";
import { seedDatabase } from "@/server/db/seed";
import { requireDatabaseUrl, resetDatabase } from "./helpers";

const hasDatabase = !!process.env.DATABASE_URL;

describe.skipIf(!hasDatabase)("transfers schema (0008)", () => {
  beforeAll(async () => {
    requireDatabaseUrl();
    await resetDatabase();
    await seedDatabase();
  });

  it("has transfer rule columns with defaults on scoring_rule_sets", async () => {
    const db = getDb();
    const result = await db.execute<{
      free_transfers_per_matchday: number;
      max_banked_free_transfers: number;
      extra_transfer_penalty: number;
      transfers_start_matchday: number | null;
    }>(sql`
      select free_transfers_per_matchday,
             max_banked_free_transfers,
             extra_transfer_penalty,
             transfers_start_matchday
      from scoring_rule_sets
      limit 1
    `);
    const row = result.rows[0];
    expect(row).toMatchObject({
      free_transfers_per_matchday: 2,
      max_banked_free_transfers: 3,
      extra_transfer_penalty: 4,
      transfers_start_matchday: 1,
    });
  });
});
