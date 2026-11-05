import { eq } from "drizzle-orm";
import type { AppDb } from "@/server/db";
import { seasonAwards, seasons } from "@/server/db/schema";
import { getManagerStandings } from "@/server/queries/manager-standings";
import { getStandings } from "@/server/queries/standings";
import { buildSeasonAwardDrafts } from "./season-awards";

export async function closeSeasonAdmin(db: AppDb, seasonId: string) {
  return db.transaction(async (tx) => {
    const [season] = await tx
      .select()
      .from(seasons)
      .where(eq(seasons.id, seasonId))
      .limit(1);

    if (!season) throw new Error("NOT_FOUND");
    if (season.status !== "active") throw new Error("NOT_ACTIVE");

    const [managerStandings, byPoints, byGoals, byAssists, byApps] =
      await Promise.all([
        getManagerStandings(tx, seasonId),
        getStandings(tx, seasonId, "points"),
        getStandings(tx, seasonId, "goals"),
        getStandings(tx, seasonId, "assists"),
        getStandings(tx, seasonId, "appearances"),
      ]);

    const byWinsSorted = [...byPoints].sort((a, b) => {
      if (b.wins !== a.wins) return b.wins - a.wins;
      if (b.points !== a.points) return b.points - a.points;
      return a.displayName.localeCompare(b.displayName);
    });

    const drafts = buildSeasonAwardDrafts(
      managerStandings,
      byPoints,
      byGoals,
      byAssists,
      byApps,
      byWinsSorted,
    );

    await tx.delete(seasonAwards).where(eq(seasonAwards.seasonId, seasonId));

    if (drafts.length > 0) {
      await tx.insert(seasonAwards).values(
        drafts.map((draft) => ({
          seasonId,
          award: draft.award,
          playerId: draft.playerId ?? null,
          managerId: draft.managerId ?? null,
          value: draft.value,
        })),
      );
    }

    const [closed] = await tx
      .update(seasons)
      .set({ status: "closed", closedAt: new Date() })
      .where(eq(seasons.id, seasonId))
      .returning();

    return closed!;
  });
}
