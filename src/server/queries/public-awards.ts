import { desc, eq, inArray } from "drizzle-orm";
import type { AppDb } from "@/server/db";
import { players, seasonAwards, seasons, users } from "@/server/db/schema";
import {
  AWARD_LABELS,
  awardValueLabel,
  type SeasonAwardKind,
} from "@/server/domain/season-awards";

export type PublicAwardRow = {
  award: SeasonAwardKind;
  label: string;
  winnerName: string;
  valueLabel: string;
  href: string;
};

export type PublicSeasonArchive = {
  seasonId: string;
  seasonName: string;
  closedAt: string | null;
  awards: PublicAwardRow[];
};

const AWARD_ORDER: SeasonAwardKind[] = [
  "manager_champion",
  "champion",
  "golden_boot",
  "playmaker",
  "most_appearances",
  "most_wins",
];

export async function getAwardsHall(db: AppDb): Promise<PublicSeasonArchive[]> {
  const closed = await db
    .select({
      id: seasons.id,
      name: seasons.name,
      closedAt: seasons.closedAt,
    })
    .from(seasons)
    .where(eq(seasons.status, "closed"))
    .orderBy(desc(seasons.closedAt));

  if (closed.length === 0) return [];

  const seasonIds = closed.map((s) => s.id);
  const awardRows = await db
    .select({
      seasonId: seasonAwards.seasonId,
      award: seasonAwards.award,
      value: seasonAwards.value,
      playerName: players.displayName,
      playerId: seasonAwards.playerId,
      managerName: users.displayName,
      managerId: seasonAwards.managerId,
    })
    .from(seasonAwards)
    .leftJoin(players, eq(seasonAwards.playerId, players.id))
    .leftJoin(users, eq(seasonAwards.managerId, users.id))
    .where(inArray(seasonAwards.seasonId, seasonIds));

  const bySeason = new Map<string, PublicAwardRow[]>();
  for (const row of awardRows) {
    const kind = row.award as SeasonAwardKind;
    const winnerName =
      row.managerId != null
        ? (row.managerName ?? "Manager")
        : (row.playerName ?? "Player");
    const href =
      row.managerId != null
        ? `/managers/${row.managerId}`
        : `/players/${row.playerId}`;

    const list = bySeason.get(row.seasonId) ?? [];
    list.push({
      award: kind,
      label: AWARD_LABELS[kind] ?? kind,
      winnerName,
      valueLabel: awardValueLabel(kind, row.value),
      href,
    });
    bySeason.set(row.seasonId, list);
  }

  return closed.map((season) => {
    const awards = (bySeason.get(season.id) ?? []).sort(
      (a, b) =>
        AWARD_ORDER.indexOf(a.award) - AWARD_ORDER.indexOf(b.award) ||
        a.label.localeCompare(b.label),
    );
    return {
      seasonId: season.id,
      seasonName: season.name,
      closedAt: season.closedAt?.toISOString().slice(0, 10) ?? null,
      awards,
    };
  });
}
