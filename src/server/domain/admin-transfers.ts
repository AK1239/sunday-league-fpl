import { and, asc, desc, eq, gte, inArray, sql } from "drizzle-orm";
import type { AppDb, DbExecutor } from "@/server/db";
import {
  fantasyTransfers,
  managerFreeTransferAdjustments,
  managerTransferWindows,
  matchdays,
  scoringRuleSets,
  seasons,
  users,
} from "@/server/db/schema";
import { writeAuditLog } from "@/server/domain/audit-log";
import { rebuildManagerScoresFromMatchday } from "@/server/domain/recompute-manager-scores";
import {
  countActiveTransfersForMatchday,
  sumAdjustmentsForMatchday,
} from "@/server/domain/transfer-balance";
import { deriveTransferPenalty } from "@/server/domain/transfer-penalty";
import { rulesFromEditable } from "@/server/domain/transfer-rules-admin";
import {
  computeBalanceChain,
  type FreeTransferRules,
  type MatchdayBalanceInput,
} from "@/server/fantasy/free-transfers";
import { isTransferModeEnabled } from "@/server/fantasy/transfer-rules";

export type TransferActivityRow = {
  managerId: string;
  managerName: string;
  matchdayId: string;
  matchdayNumber: number;
  playedOn: string;
  freeAvailable: number;
  made: number;
  extra: number;
  penalty: number;
  voided: boolean;
};

export type WindowRebuildChange = {
  matchdayId: string;
  matchdayNumber: number;
  freeAvailableBefore: number | null;
  freeAvailableAfter: number;
  penaltyBefore: number;
  penaltyAfter: number;
};

export async function listTransferActivity(
  db: AppDb,
  input: {
    seasonId: string;
    matchdayId?: string;
    penalisedOnly?: boolean;
  },
): Promise<TransferActivityRow[]> {
  const conditions = [eq(managerTransferWindows.seasonId, input.seasonId)];
  if (input.matchdayId) {
    conditions.push(eq(managerTransferWindows.matchdayId, input.matchdayId));
  }

  const windows = await db
    .select({
      managerId: managerTransferWindows.managerId,
      managerName: users.displayName,
      matchdayId: managerTransferWindows.matchdayId,
      matchdayNumber: matchdays.number,
      playedOn: matchdays.playedOn,
      freeAvailable: managerTransferWindows.freeAvailable,
      penaltyPerExtra: managerTransferWindows.penaltyPerExtra,
      unlimited: managerTransferWindows.unlimited,
      voidedAt: managerTransferWindows.voidedAt,
    })
    .from(managerTransferWindows)
    .innerJoin(users, eq(managerTransferWindows.managerId, users.id))
    .innerJoin(matchdays, eq(managerTransferWindows.matchdayId, matchdays.id))
    .where(and(...conditions))
    .orderBy(desc(matchdays.number), asc(users.displayName));

  if (windows.length === 0) return [];

  const matchdayIds = [...new Set(windows.map((w) => w.matchdayId))];
  const managerIds = [...new Set(windows.map((w) => w.managerId))];

  const transferCounts = await db
    .select({
      managerId: fantasyTransfers.managerId,
      matchdayId: fantasyTransfers.matchdayId,
      count: sql<number>`count(*)::int`,
    })
    .from(fantasyTransfers)
    .where(
      and(
        eq(fantasyTransfers.status, "active"),
        inArray(fantasyTransfers.matchdayId, matchdayIds),
        inArray(fantasyTransfers.managerId, managerIds),
      ),
    )
    .groupBy(fantasyTransfers.managerId, fantasyTransfers.matchdayId);

  const madeKey = (m: string, d: string) => `${m}:${d}`;
  const madeMap = new Map(
    transferCounts.map((r) => [madeKey(r.managerId, r.matchdayId), r.count]),
  );

  const rows: TransferActivityRow[] = [];
  for (const w of windows) {
    const made = madeMap.get(madeKey(w.managerId, w.matchdayId)) ?? 0;
    const penalty = w.voidedAt
      ? 0
      : deriveTransferPenalty({
          transfersMade: made,
          freeAvailable: w.freeAvailable,
          penaltyPerExtra: w.penaltyPerExtra,
          unlimited: w.unlimited,
        });
    const extra =
      w.voidedAt || w.unlimited
        ? 0
        : Math.max(0, made - w.freeAvailable);

    if (input.penalisedOnly && penalty >= 0) continue;

    rows.push({
      managerId: w.managerId,
      managerName: w.managerName,
      matchdayId: w.matchdayId,
      matchdayNumber: w.matchdayNumber,
      playedOn: w.playedOn,
      freeAvailable: w.freeAvailable,
      made,
      extra,
      penalty,
      voided: w.voidedAt != null,
    });
  }

  return rows;
}

async function loadTransferEligibleMatchdays(
  tx: DbExecutor,
  seasonId: string,
  transfersStartMatchday: number,
) {
  return tx
    .select({
      id: matchdays.id,
      number: matchdays.number,
      status: matchdays.status,
    })
    .from(matchdays)
    .where(
      and(
        eq(matchdays.seasonId, seasonId),
        gte(matchdays.number, transfersStartMatchday),
      ),
    )
    .orderBy(asc(matchdays.number));
}

export async function previewTransferWindowRebuild(
  tx: DbExecutor,
  input: {
    managerId: string;
    seasonId: string;
    fromMatchdayNumber: number;
    rules: FreeTransferRules;
    transfersStartMatchday: number;
  },
): Promise<WindowRebuildChange[]> {
  const matchdayRows = await loadTransferEligibleMatchdays(
    tx,
    input.seasonId,
    input.transfersStartMatchday,
  );
  if (matchdayRows.length === 0) return [];
  const matchdayIds = matchdayRows.map((m) => m.id);
  const existingWindows = await tx
    .select({
      matchdayId: managerTransferWindows.matchdayId,
      freeAvailable: managerTransferWindows.freeAvailable,
      penaltyPerExtra: managerTransferWindows.penaltyPerExtra,
      unlimited: managerTransferWindows.unlimited,
      voidedAt: managerTransferWindows.voidedAt,
    })
    .from(managerTransferWindows)
    .where(
      and(
        eq(managerTransferWindows.managerId, input.managerId),
        inArray(managerTransferWindows.matchdayId, matchdayIds),
      ),
    );

  const windowByMd = new Map(
    existingWindows.map((w) => [w.matchdayId, w]),
  );

  const chainInputs: MatchdayBalanceInput[] = [];
  for (const md of matchdayRows) {
    if (md.status === "cancelled") {
      chainInputs.push({
        key: md.id,
        cancelled: true,
        transfersMade: 0,
      });
      continue;
    }
    const transfersMade = await countActiveTransfersForMatchday(
      tx,
      input.managerId,
      md.id,
    );
    const adjustment = await sumAdjustmentsForMatchday(
      tx,
      input.managerId,
      md.id,
    );
    const window = windowByMd.get(md.id);
    chainInputs.push({
      key: md.id,
      transfersMade,
      adjustment,
      unlimited: window?.unlimited ?? false,
    });
  }

  const steps = computeBalanceChain(chainInputs, input.rules, 0);
  const changes: WindowRebuildChange[] = [];

  for (let i = 0; i < matchdayRows.length; i++) {
    const md = matchdayRows[i]!;
    if (md.number < input.fromMatchdayNumber) continue;
    const step = steps[i]!;
    const window = windowByMd.get(md.id);
    if (!window || window.voidedAt) continue;

    const made = step.made;
    const freeAfter = step.available;
    const penaltyAfter = deriveTransferPenalty({
      transfersMade: made,
      freeAvailable: freeAfter,
      penaltyPerExtra: window.penaltyPerExtra,
      unlimited: window.unlimited,
    });
    const penaltyBefore = deriveTransferPenalty({
      transfersMade: made,
      freeAvailable: window.freeAvailable,
      penaltyPerExtra: window.penaltyPerExtra,
      unlimited: window.unlimited,
    });

    if (
      window.freeAvailable !== freeAfter ||
      penaltyBefore !== penaltyAfter
    ) {
      changes.push({
        matchdayId: md.id,
        matchdayNumber: md.number,
        freeAvailableBefore: window.freeAvailable,
        freeAvailableAfter: freeAfter,
        penaltyBefore,
        penaltyAfter,
      });
    }
  }

  return changes;
}

export async function rebuildTransferWindowsForManager(
  tx: DbExecutor,
  input: {
    managerId: string;
    seasonId: string;
    fromMatchdayNumber: number;
    rules: FreeTransferRules;
    transfersStartMatchday: number;
  },
): Promise<WindowRebuildChange[]> {
  const changes = await previewTransferWindowRebuild(tx, input);
  const dbNow = new Date();

  for (const change of changes) {
    await tx
      .update(managerTransferWindows)
      .set({
        freeAvailable: change.freeAvailableAfter,
        updatedAt: dbNow,
      })
      .where(
        and(
          eq(managerTransferWindows.managerId, input.managerId),
          eq(managerTransferWindows.matchdayId, change.matchdayId),
        ),
      );
  }

  return changes;
}

export async function grantFreeTransferAdjustment(
  db: AppDb,
  input: {
    adminId: string;
    managerId: string;
    matchdayId: string;
    delta: number;
    reason: string;
  },
): Promise<{ changes: WindowRebuildChange[]; seasonId: string; fromNumber: number }> {
  if (input.delta === 0) {
    throw new Error("DELTA_ZERO");
  }
  if (input.reason.trim().length < 3) {
    throw new Error("REASON_REQUIRED");
  }

  return db.transaction(async (tx) => {
    const [md] = await tx
      .select({
        id: matchdays.id,
        number: matchdays.number,
        seasonId: matchdays.seasonId,
      })
      .from(matchdays)
      .where(eq(matchdays.id, input.matchdayId))
      .limit(1);

    if (!md) throw new Error("NOT_FOUND");

    const editable = await tx
      .select({
        transfersStartMatchday: scoringRuleSets.transfersStartMatchday,
        freeTransfersPerMatchday: scoringRuleSets.freeTransfersPerMatchday,
        maxBankedFreeTransfers: scoringRuleSets.maxBankedFreeTransfers,
        extraTransferPenalty: scoringRuleSets.extraTransferPenalty,
      })
      .from(seasons)
      .innerJoin(scoringRuleSets, eq(seasons.ruleSetId, scoringRuleSets.id))
      .where(eq(seasons.id, md.seasonId))
      .limit(1);

    const ruleRow = editable[0];
    if (
      !ruleRow ||
      !isTransferModeEnabled(ruleRow.transfersStartMatchday) ||
      md.number < ruleRow.transfersStartMatchday!
    ) {
      throw new Error("TRANSFERS_OFF");
    }

    const rules = rulesFromEditable({
      transfersStartMatchday: ruleRow.transfersStartMatchday,
      freeTransfersPerMatchday: ruleRow.freeTransfersPerMatchday,
      maxBankedFreeTransfers: ruleRow.maxBankedFreeTransfers,
      extraTransferPenalty: ruleRow.extraTransferPenalty,
    });

    const [inserted] = await tx
      .insert(managerFreeTransferAdjustments)
      .values({
        managerId: input.managerId,
        matchdayId: input.matchdayId,
        delta: input.delta,
        reason: input.reason.trim(),
        createdBy: input.adminId,
      })
      .returning({ id: managerFreeTransferAdjustments.id });

    const changes = await rebuildTransferWindowsForManager(tx, {
      managerId: input.managerId,
      seasonId: md.seasonId,
      fromMatchdayNumber: md.number,
      rules: {
        grant: rules.grant,
        cap: rules.cap,
        penaltyPerExtra: rules.penaltyPerExtra,
      },
      transfersStartMatchday: rules.transfersStartMatchday!,
    });

    await writeAuditLog(tx, {
      userId: input.adminId,
      action: "grant_free_transfer_adjustment",
      entity: "manager_free_transfer_adjustments",
      entityId: inserted!.id,
      before: null,
      after: {
        managerId: input.managerId,
        matchdayId: input.matchdayId,
        delta: input.delta,
        reason: input.reason.trim(),
        windowChanges: changes,
      },
    });

    if (changes.length > 0) {
      const earliest = Math.min(...changes.map((c) => c.matchdayNumber));
      await rebuildManagerScoresFromMatchday(tx, md.seasonId, earliest);
    }

    return {
      changes,
      seasonId: md.seasonId,
      fromNumber: md.number,
    };
  });
}

export type ManagerTransferAdminDetail = {
  managerId: string;
  managerName: string;
  adjustments: {
    id: string;
    matchdayNumber: number;
    delta: number;
    reason: string;
    createdAt: Date;
  }[];
  windows: TransferActivityRow[];
};

export async function getManagerTransferAdminDetail(
  db: AppDb,
  seasonId: string,
  managerId: string,
): Promise<ManagerTransferAdminDetail | null> {
  const [manager] = await db
    .select({ displayName: users.displayName })
    .from(users)
    .where(eq(users.id, managerId))
    .limit(1);
  if (!manager) return null;

  const adjustmentRows = await db
    .select({
      id: managerFreeTransferAdjustments.id,
      delta: managerFreeTransferAdjustments.delta,
      reason: managerFreeTransferAdjustments.reason,
      createdAt: managerFreeTransferAdjustments.createdAt,
      number: matchdays.number,
    })
    .from(managerFreeTransferAdjustments)
    .innerJoin(
      matchdays,
      eq(managerFreeTransferAdjustments.matchdayId, matchdays.id),
    )
    .where(
      and(
        eq(managerFreeTransferAdjustments.managerId, managerId),
        eq(matchdays.seasonId, seasonId),
      ),
    )
    .orderBy(desc(managerFreeTransferAdjustments.createdAt));

  const activity = await listTransferActivity(db, {
    seasonId,
  });
  const windows = activity.filter((r) => r.managerId === managerId);

  return {
    managerId,
    managerName: manager.displayName,
    adjustments: adjustmentRows.map((r) => ({
      id: r.id,
      matchdayNumber: r.number,
      delta: r.delta,
      reason: r.reason,
      createdAt: r.createdAt,
    })),
    windows,
  };
}
