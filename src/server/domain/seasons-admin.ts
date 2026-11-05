import { and, eq, ne } from "drizzle-orm";
import type { AppDb } from "@/server/db";
import { scoringRuleSets, seasons } from "@/server/db/schema";

export async function listSeasonsAdmin(db: AppDb) {
  return db.select().from(seasons).orderBy(seasons.startsOn);
}

export async function createSeasonAdmin(
  db: AppDb,
  input: {
    name: string;
    startsOn: string;
    endsOn: string;
    ruleSetId?: string;
  },
) {
  let ruleSetId = input.ruleSetId;
  if (!ruleSetId) {
    const defaultRules = await db
      .select({ id: scoringRuleSets.id })
      .from(scoringRuleSets)
      .orderBy(scoringRuleSets.createdAt)
      .limit(1);
    ruleSetId = defaultRules[0]?.id;
    if (!ruleSetId) throw new Error("NO_RULE_SET");
  }

  const [row] = await db
    .insert(seasons)
    .values({
      name: input.name.trim(),
      startsOn: input.startsOn,
      endsOn: input.endsOn,
      status: "upcoming",
      ruleSetId,
    })
    .returning();

  return row!;
}

export async function activateSeasonAdmin(db: AppDb, seasonId: string) {
  return db.transaction(async (tx) => {
    const target = await tx
      .select()
      .from(seasons)
      .where(eq(seasons.id, seasonId))
      .limit(1);

    if (!target[0]) throw new Error("NOT_FOUND");
    if (target[0].status === "closed") throw new Error("SEASON_CLOSED");

    await tx
      .update(seasons)
      .set({ status: "closed", closedAt: new Date() })
      .where(and(eq(seasons.status, "active"), ne(seasons.id, seasonId)));

    const [active] = await tx
      .update(seasons)
      .set({ status: "active", closedAt: null })
      .where(eq(seasons.id, seasonId))
      .returning();

    return active!;
  });
}
