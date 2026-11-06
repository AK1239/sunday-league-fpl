import { and, eq, sql } from "drizzle-orm";
import type { DbExecutor } from "@/server/db";
import {
  fantasyTransfers,
  managerTransferWindows,
} from "@/server/db/schema";
import { diffSquads, pairTransferSlots } from "@/server/fantasy/transfer-diff";
import type { FantasyTeamPick } from "@/server/fantasy/validate-team";

async function readDbNow(tx: DbExecutor): Promise<Date> {
  const result = await tx.execute<{ now: Date }>(sql`select now() as now`);
  const row = result.rows[0];
  if (!row?.now) return new Date();
  return row.now instanceof Date ? row.now : new Date(String(row.now));
}

/** Open window: replace active transfer rows (manager submit path). */
export async function syncManagerTransferMaterialisation(
  tx: DbExecutor,
  input: {
    seasonId: string;
    managerId: string;
    matchdayId: string;
    basePlayerIds: readonly string[];
    pick: FantasyTeamPick;
    freeAvailable: number;
    penaltyPerExtra: number;
  },
) {
  await tx
    .delete(fantasyTransfers)
    .where(
      and(
        eq(fantasyTransfers.managerId, input.managerId),
        eq(fantasyTransfers.matchdayId, input.matchdayId),
        eq(fantasyTransfers.status, "active"),
      ),
    );

  const pairs = pairTransferSlots(
    diffSquads(input.basePlayerIds, input.pick.playerIds),
  );

  if (pairs.length > 0) {
    await tx.insert(fantasyTransfers).values(
      pairs.map((pair, index) => ({
        seasonId: input.seasonId,
        managerId: input.managerId,
        matchdayId: input.matchdayId,
        seq: index + 1,
        playerOutId: pair.playerOutId,
        playerInId: pair.playerInId,
        source: "manager" as const,
      })),
    );
  }

  const dbNow = await readDbNow(tx);
  await tx
    .insert(managerTransferWindows)
    .values({
      managerId: input.managerId,
      matchdayId: input.matchdayId,
      seasonId: input.seasonId,
      freeAvailable: input.freeAvailable,
      unlimited: false,
      penaltyPerExtra: input.penaltyPerExtra,
      updatedAt: dbNow,
    })
    .onConflictDoUpdate({
      target: [
        managerTransferWindows.managerId,
        managerTransferWindows.matchdayId,
      ],
      set: {
        freeAvailable: input.freeAvailable,
        penaltyPerExtra: input.penaltyPerExtra,
        updatedAt: dbNow,
        voidedAt: null,
      },
    });
}

/** Locked / admin path: void prior active rows, insert correction rows. */
export async function syncAdminTransferCorrection(
  tx: DbExecutor,
  input: {
    seasonId: string;
    managerId: string;
    matchdayId: string;
    basePlayerIds: readonly string[];
    pick: FantasyTeamPick;
    adminUserId: string;
    reason: string;
  },
) {
  const dbNow = await readDbNow(tx);

  await tx
    .update(fantasyTransfers)
    .set({
      status: "void",
      voidedAt: dbNow,
      voidReason: input.reason.trim(),
      voidedBy: input.adminUserId,
    })
    .where(
      and(
        eq(fantasyTransfers.managerId, input.managerId),
        eq(fantasyTransfers.matchdayId, input.matchdayId),
        eq(fantasyTransfers.status, "active"),
      ),
    );

  const pairs = pairTransferSlots(
    diffSquads(input.basePlayerIds, input.pick.playerIds),
  );

  if (pairs.length > 0) {
    await tx.insert(fantasyTransfers).values(
      pairs.map((pair, index) => ({
        seasonId: input.seasonId,
        managerId: input.managerId,
        matchdayId: input.matchdayId,
        seq: index + 1,
        playerOutId: pair.playerOutId,
        playerInId: pair.playerInId,
        source: "admin_correction" as const,
      })),
    );
  }
}
