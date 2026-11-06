import { and, asc, desc, eq, gte, inArray, sql } from "drizzle-orm";
import type { AppDb, DbExecutor } from "@/server/db";
import {
  fantasyTransfers,
  managerTransferWindows,
  matchdays,
  players,
  scoringRuleSets,
  seasons,
  users,
} from "@/server/db/schema";
import { writeAuditLog } from "@/server/domain/audit-log";
import { rebuildManagerScoresFromMatchday } from "@/server/domain/recompute-manager-scores";
import { syncAdminTransferCorrection } from "@/server/domain/transfer-materialisation";
import { FantasyTeamError } from "@/server/domain/save-fantasy-team";
import { loadSubmittedTeamsForSeason } from "@/server/queries/fantasy-team-view";
import {
  hasPriorSubmittedSquadInSeason,
  resolveBaseSquadPlayerIds,
} from "@/server/fantasy/transfer-base-squad";
import {
  isTransferModeEnabled,
  transferRulesApplyToMatchday,
} from "@/server/fantasy/transfer-rules";
import { validateFantasyTeamTransferPick } from "@/server/fantasy/validate-transfers";
import type { FantasyTeamPick } from "@/server/fantasy/validate-team";
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
      w.voidedAt || w.unlimited ? 0 : Math.max(0, made - w.freeAvailable);

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

  const windowByMd = new Map(existingWindows.map((w) => [w.matchdayId, w]));

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

    if (window.freeAvailable !== freeAfter || penaltyBefore !== penaltyAfter) {
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

export type ManagerTransferAdminDetail = {
  managerId: string;
  managerName: string;
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

  const activity = await listTransferActivity(db, {
    seasonId,
  });
  const windows = activity.filter((r) => r.managerId === managerId);

  return {
    managerId,
    managerName: manager.displayName,
    windows,
  };
}

/**
 * After an admin squad override, void/replace transfer rows and rebuild windows/scores
 * when transfer rules apply. No-op in legacy pick-any-five mode.
 */
export async function applyAdminSquadTransferCorrection(
  db: AppDb,
  input: {
    adminUserId: string;
    managerId: string;
    matchdayId: string;
    pick: FantasyTeamPick;
    reason: string;
  },
): Promise<{ applied: boolean; changes: WindowRebuildChange[] }> {
  const reason = input.reason.trim();
  if (reason.length < 3) {
    throw new FantasyTeamError(
      "Provide a short reason for the correction (at least 3 characters).",
      "REASON_REQUIRED",
    );
  }

  return db.transaction(async (tx) => {
    const [md] = await tx
      .select({
        id: matchdays.id,
        number: matchdays.number,
        playedOn: matchdays.playedOn,
        seasonId: matchdays.seasonId,
      })
      .from(matchdays)
      .where(eq(matchdays.id, input.matchdayId))
      .limit(1);

    if (!md) {
      throw new FantasyTeamError("Matchday not found.", "NOT_FOUND");
    }

    const [ruleRow] = await tx
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

    const transferRules = ruleRow
      ? rulesFromEditable({
          transfersStartMatchday: ruleRow.transfersStartMatchday,
          freeTransfersPerMatchday: ruleRow.freeTransfersPerMatchday,
          maxBankedFreeTransfers: ruleRow.maxBankedFreeTransfers,
          extraTransferPenalty: ruleRow.extraTransferPenalty,
        })
      : null;

    if (
      !transferRules ||
      !isTransferModeEnabled(transferRules.transfersStartMatchday) ||
      !transferRulesApplyToMatchday(transferRules, md.number)
    ) {
      return { applied: false, changes: [] };
    }

    const [seasonRow] = await tx
      .select({ startsOn: seasons.startsOn })
      .from(seasons)
      .where(eq(seasons.id, md.seasonId))
      .limit(1);

    const submitted = await loadSubmittedTeamsForSeason(tx, md.seasonId);
    const timeline = {
      matchdayId: md.id,
      playedOn: md.playedOn,
      number: md.number,
      seasonStartsOn: seasonRow?.startsOn ?? "1970-01-01",
    };

    const initialBuild = !hasPriorSubmittedSquadInSeason(
      input.managerId,
      timeline,
      submitted,
    );
    const basePlayerIds = resolveBaseSquadPlayerIds(
      input.managerId,
      timeline,
      submitted,
    );

    if (initialBuild || !basePlayerIds || basePlayerIds.length !== 5) {
      return { applied: false, changes: [] };
    }

    const playerRows = await tx
      .select({ id: players.id, active: players.active })
      .from(players);
    const eligible = new Map(playerRows.map((p) => [p.id, p]));

    const validation = validateFantasyTeamTransferPick(
      input.pick,
      basePlayerIds,
      eligible,
    );
    if (!validation.ok) {
      throw new FantasyTeamError(validation.message, validation.code);
    }

    const previewBefore = await previewTransferWindowRebuild(tx, {
      managerId: input.managerId,
      seasonId: md.seasonId,
      fromMatchdayNumber: md.number,
      rules: {
        grant: transferRules.grant,
        cap: transferRules.cap,
        penaltyPerExtra: transferRules.penaltyPerExtra,
      },
      transfersStartMatchday: transferRules.transfersStartMatchday!,
    });

    await syncAdminTransferCorrection(tx, {
      seasonId: md.seasonId,
      managerId: input.managerId,
      matchdayId: input.matchdayId,
      basePlayerIds,
      pick: input.pick,
      adminUserId: input.adminUserId,
      reason,
    });

    const changes = await rebuildTransferWindowsForManager(tx, {
      managerId: input.managerId,
      seasonId: md.seasonId,
      fromMatchdayNumber: md.number,
      rules: {
        grant: transferRules.grant,
        cap: transferRules.cap,
        penaltyPerExtra: transferRules.penaltyPerExtra,
      },
      transfersStartMatchday: transferRules.transfersStartMatchday!,
    });

    await writeAuditLog(tx, {
      userId: input.adminUserId,
      action: "admin_correct_transfers",
      entity: "fantasy_transfers",
      entityId: input.matchdayId,
      before: { preview: previewBefore },
      after: {
        managerId: input.managerId,
        matchdayId: input.matchdayId,
        reason,
        playerIds: input.pick.playerIds,
        windowChanges: changes,
      },
    });

    await rebuildManagerScoresFromMatchday(tx, md.seasonId, md.number);

    return { applied: true, changes };
  });
}
