import { and, asc, eq, inArray } from "drizzle-orm";
import type { AppDb } from "@/server/db";
import { users } from "@/server/db/schema";
import { getActiveSeasonId } from "@/server/domain/matchdays-admin";
import {
  getManagerTransferAdminDetail,
  listTransferActivity,
  type TransferActivityRow,
} from "@/server/domain/admin-transfers";
import { loadEditableTransferRulesForSeason } from "@/server/domain/transfer-rules-admin";
import { listMatchdaysForSeasonAdmin } from "@/server/domain/matchdays-admin";

export type AdminTransfersPageData = {
  seasonId: string;
  matchdays: { id: string; number: number; playedOn: string }[];
  managers: { id: string; displayName: string }[];
  activity: TransferActivityRow[];
  transferRules: Awaited<ReturnType<typeof loadEditableTransferRulesForSeason>>;
  penaltyReport: {
    managerId: string;
    managerName: string;
    totalPenalty: number;
    windows: number;
  }[];
};

export async function getAdminTransfersPageData(
  db: AppDb,
  filters: {
    matchdayId?: string;
    penalisedOnly?: boolean;
    managerId?: string;
  },
): Promise<AdminTransfersPageData | null> {
  const seasonId = await getActiveSeasonId(db);
  if (!seasonId) return null;

  const [matchdayList, managerRows, transferRules] = await Promise.all([
    listMatchdaysForSeasonAdmin(db, seasonId),
    db
      .select({ id: users.id, displayName: users.displayName })
      .from(users)
      .where(
        and(
          eq(users.status, "active"),
          inArray(users.role, ["manager", "admin"]),
        ),
      )
      .orderBy(asc(users.displayName)),
    loadEditableTransferRulesForSeason(db, seasonId),
  ]);

  let activity = await listTransferActivity(db, {
    seasonId,
    matchdayId: filters.matchdayId,
    penalisedOnly: filters.penalisedOnly,
  });

  if (filters.managerId) {
    activity = activity.filter((r) => r.managerId === filters.managerId);
  }

  const penaltyByManager = new Map<
    string,
    { name: string; total: number; count: number }
  >();
  const allForPenalty = await listTransferActivity(db, { seasonId });
  for (const row of allForPenalty) {
    if (row.penalty >= 0) continue;
    const cur = penaltyByManager.get(row.managerId) ?? {
      name: row.managerName,
      total: 0,
      count: 0,
    };
    cur.total += row.penalty;
    cur.count += 1;
    penaltyByManager.set(row.managerId, cur);
  }

  const penaltyReport = [...penaltyByManager.entries()]
    .map(([managerId, v]) => ({
      managerId,
      managerName: v.name,
      totalPenalty: v.total,
      windows: v.count,
    }))
    .sort((a, b) => a.totalPenalty - b.totalPenalty);

  return {
    seasonId,
    matchdays: matchdayList.map((m) => ({
      id: m.id,
      number: m.number,
      playedOn: m.playedOn,
    })),
    managers: managerRows,
    activity,
    transferRules,
    penaltyReport,
  };
}

export { getManagerTransferAdminDetail };
