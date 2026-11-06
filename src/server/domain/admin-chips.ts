import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import type { AppDb, DbExecutor } from "@/server/db";
import {
  fantasyTeams,
  managerChipPlays,
  matchdays,
  scoringRuleSets,
  seasonChips,
  seasons,
  users,
} from "@/server/db/schema";
import type { ChipCode } from "@/server/chips/registry";
import {
  CHIP_REGISTRY,
  isChipCode,
} from "@/server/chips/registry";
import { isLocked } from "@/server/fantasy/lock";
import {
  seasonTransferRulesFromRow,
  transferRulesApplyToMatchday,
} from "@/server/fantasy/transfer-rules";
import { writeAuditLog } from "./audit-log";
import {
  loadManagerActiveChipPlays,
  loadSeasonChipConfigs,
  syncTransferWindowChipMirror,
} from "./chip-plays";
import { rebuildManagerScoresFromMatchday } from "./recompute-manager-scores";
import { computeFreeAvailableForMatchday } from "./transfer-balance";

export class AdminChipsError extends Error {
  constructor(
    message: string,
    readonly code: string,
  ) {
    super(message);
    this.name = "AdminChipsError";
  }
}

export type ChipUsageRow = {
  playId: string;
  managerId: string;
  managerName: string;
  matchdayId: string;
  matchdayNumber: number;
  chipCode: string;
  status: string;
  source: string;
  activatedAt: Date;
  voidedAt: Date | null;
  voidReason: string | null;
};

export async function listChipUsageForSeason(
  db: AppDb,
  seasonId: string,
  filters?: {
    chipCode?: string;
    matchdayId?: string;
    managerId?: string;
    status?: "active" | "void";
  },
): Promise<ChipUsageRow[]> {
  const conditions = [eq(managerChipPlays.seasonId, seasonId)];
  if (filters?.chipCode) {
    conditions.push(eq(managerChipPlays.chipCode, filters.chipCode));
  }
  if (filters?.matchdayId) {
    conditions.push(eq(managerChipPlays.matchdayId, filters.matchdayId));
  }
  if (filters?.managerId) {
    conditions.push(eq(managerChipPlays.managerId, filters.managerId));
  }
  if (filters?.status) {
    conditions.push(eq(managerChipPlays.status, filters.status));
  }

  const rows = await db
    .select({
      playId: managerChipPlays.id,
      managerId: managerChipPlays.managerId,
      managerName: users.displayName,
      matchdayId: managerChipPlays.matchdayId,
      matchdayNumber: matchdays.number,
      chipCode: managerChipPlays.chipCode,
      status: managerChipPlays.status,
      source: managerChipPlays.source,
      activatedAt: managerChipPlays.activatedAt,
      voidedAt: managerChipPlays.voidedAt,
      voidReason: managerChipPlays.voidReason,
    })
    .from(managerChipPlays)
    .innerJoin(users, eq(managerChipPlays.managerId, users.id))
    .innerJoin(matchdays, eq(managerChipPlays.matchdayId, matchdays.id))
    .where(and(...conditions))
    .orderBy(
      desc(matchdays.number),
      asc(users.displayName),
      asc(managerChipPlays.activatedAt),
    );

  return rows;
}

export async function isSeasonChipConfigLocked(
  db: AppDb,
  seasonId: string,
  now = new Date(),
): Promise<boolean> {
  const mds = await db
    .select({
      status: matchdays.status,
      deadlineAt: matchdays.deadlineAt,
    })
    .from(matchdays)
    .where(eq(matchdays.seasonId, seasonId));

  return mds.some((md) => isLocked(md, now));
}

export type SeasonChipAdminRow = {
  chipCode: string;
  enabled: boolean;
  availableFromMatchday: number;
  params: Record<string, unknown>;
};

export async function loadSeasonChipsAdmin(
  db: AppDb | DbExecutor,
  seasonId: string,
): Promise<SeasonChipAdminRow[]> {
  const rows = await db
    .select({
      chipCode: seasonChips.chipCode,
      enabled: seasonChips.enabled,
      availableFromMatchday: seasonChips.availableFromMatchday,
      params: seasonChips.params,
    })
    .from(seasonChips)
    .where(eq(seasonChips.seasonId, seasonId))
    .orderBy(asc(seasonChips.chipCode));

  return rows.map((row) => ({
    chipCode: row.chipCode,
    enabled: row.enabled,
    availableFromMatchday: row.availableFromMatchday,
    params:
      row.params &&
      typeof row.params === "object" &&
      !Array.isArray(row.params)
        ? (row.params as Record<string, unknown>)
        : {},
  }));
}

async function loadTransferContext(
  tx: DbExecutor,
  seasonId: string,
  managerId: string,
  matchdayId: string,
  matchdayNumber: number,
) {
  const [seasonRow] = await tx
    .select({
      transfersStartMatchday: scoringRuleSets.transfersStartMatchday,
      freeTransfersPerMatchday: scoringRuleSets.freeTransfersPerMatchday,
      maxBankedFreeTransfers: scoringRuleSets.maxBankedFreeTransfers,
      extraTransferPenalty: scoringRuleSets.extraTransferPenalty,
    })
    .from(seasons)
    .innerJoin(scoringRuleSets, eq(seasons.ruleSetId, scoringRuleSets.id))
    .where(eq(seasons.id, seasonId))
    .limit(1);

  if (!seasonRow) {
    throw new AdminChipsError("Season not found.", "NOT_FOUND");
  }

  const transferRules = seasonTransferRulesFromRow(seasonRow);
  const transferMode = transferRulesApplyToMatchday(
    transferRules,
    matchdayNumber,
  );

  const freeRules = {
    grant: transferRules.grant,
    cap: transferRules.cap,
    penaltyPerExtra: transferRules.penaltyPerExtra,
  };

  const freeAvailable = transferMode
    ? await computeFreeAvailableForMatchday(tx, {
        managerId,
        seasonId,
        matchdayId,
        matchdayNumber,
        transfersStartMatchday: transferRules.transfersStartMatchday!,
        rules: freeRules,
      })
    : 0;

  return {
    freeAvailable,
    penaltyPerExtra: transferRules.penaltyPerExtra,
  };
}

async function clearChipMirrorAndSquadArtifacts(
  tx: DbExecutor,
  input: {
    seasonId: string;
    managerId: string;
    matchdayId: string;
    matchdayNumber: number;
    chipCode: ChipCode;
    dbNow: Date;
  },
): Promise<void> {
  const { freeAvailable, penaltyPerExtra } = await loadTransferContext(
    tx,
    input.seasonId,
    input.managerId,
    input.matchdayId,
    input.matchdayNumber,
  );

  await syncTransferWindowChipMirror(tx, {
    managerId: input.managerId,
    matchdayId: input.matchdayId,
    seasonId: input.seasonId,
    chipCode: null,
    freeAvailable,
    penaltyPerExtra,
    dbNow: input.dbNow,
  });

  if (input.chipCode === "bench_boost") {
    await tx
      .update(fantasyTeams)
      .set({
        reservePlayerId: null,
        reservePlayerId2: null,
        updatedAt: input.dbNow,
      })
      .where(
        and(
          eq(fantasyTeams.managerId, input.managerId),
          eq(fantasyTeams.matchdayId, input.matchdayId),
        ),
      );
  }

  if (input.chipCode === "free_hit") {
    await tx
      .delete(fantasyTeams)
      .where(
        and(
          eq(fantasyTeams.managerId, input.managerId),
          eq(fantasyTeams.matchdayId, input.matchdayId),
          inArray(fantasyTeams.source, ["manual", "admin"]),
        ),
      );
  }
}

async function readDbNow(tx: DbExecutor): Promise<Date> {
  const result = await tx.execute<{ now: Date }>(sql`select now() as now`);
  const row = result.rows[0];
  if (!row?.now) {
    throw new AdminChipsError("Could not read server time.", "DB_TIME");
  }
  return row.now instanceof Date ? row.now : new Date(String(row.now));
}

export async function voidChipPlayAdmin(
  db: AppDb,
  adminUserId: string,
  playId: string,
  reason: string,
): Promise<{ matchdayNumber: number; seasonId: string; recompute: boolean }> {
  const trimmed = reason.trim();
  if (trimmed.length < 3) {
    throw new AdminChipsError(
      "A reason of at least 3 characters is required.",
      "VALIDATION",
    );
  }

  return db.transaction(async (tx) => {
    const [play] = await tx
      .select({
        id: managerChipPlays.id,
        seasonId: managerChipPlays.seasonId,
        managerId: managerChipPlays.managerId,
        matchdayId: managerChipPlays.matchdayId,
        chipCode: managerChipPlays.chipCode,
        status: managerChipPlays.status,
        source: managerChipPlays.source,
        activatedAt: managerChipPlays.activatedAt,
      })
      .from(managerChipPlays)
      .where(eq(managerChipPlays.id, playId))
      .limit(1);

    if (!play) {
      throw new AdminChipsError("Chip play not found.", "NOT_FOUND");
    }
    if (play.status !== "active") {
      throw new AdminChipsError("Only active chip plays can be voided.", "INVALID");
    }
    if (!isChipCode(play.chipCode)) {
      throw new AdminChipsError("Unknown chip on play record.", "CHIP_UNKNOWN");
    }

    const [md] = await tx
      .select({
        number: matchdays.number,
        status: matchdays.status,
      })
      .from(matchdays)
      .where(eq(matchdays.id, play.matchdayId))
      .limit(1);

    if (!md) {
      throw new AdminChipsError("Matchday not found.", "NOT_FOUND");
    }

    const dbNow = await readDbNow(tx);

    await tx
      .update(managerChipPlays)
      .set({
        status: "void",
        voidedAt: dbNow,
        voidReason: trimmed,
        voidedBy: adminUserId,
      })
      .where(eq(managerChipPlays.id, playId));

    await clearChipMirrorAndSquadArtifacts(tx, {
      seasonId: play.seasonId,
      managerId: play.managerId,
      matchdayId: play.matchdayId,
      matchdayNumber: md.number,
      chipCode: play.chipCode,
      dbNow,
    });

    await writeAuditLog(tx, {
      userId: adminUserId,
      action: "void_chip_play",
      entity: "manager_chip_plays",
      entityId: playId,
      before: {
        managerId: play.managerId,
        matchdayId: play.matchdayId,
        chipCode: play.chipCode,
        status: play.status,
        source: play.source,
        activatedAt: play.activatedAt,
      },
      after: {
        status: "void",
        voidReason: trimmed,
      },
    });

    const recompute = md.status === "published";
    if (recompute) {
      await rebuildManagerScoresFromMatchday(tx, play.seasonId, md.number);
    }

    return {
      matchdayNumber: md.number,
      seasonId: play.seasonId,
      recompute,
    };
  });
}

export async function forceActivateChipAdmin(
  db: AppDb,
  adminUserId: string,
  input: {
    managerId: string;
    matchdayId: string;
    chipCode: string;
    reason: string;
  },
): Promise<{ playId: string }> {
  const trimmed = input.reason.trim();
  if (trimmed.length < 3) {
    throw new AdminChipsError(
      "A reason of at least 3 characters is required.",
      "VALIDATION",
    );
  }
  const chipCodeRaw = input.chipCode;
  if (!isChipCode(chipCodeRaw)) {
    throw new AdminChipsError("Unknown chip.", "CHIP_UNKNOWN");
  }
  const chipCode = chipCodeRaw;

  return db.transaction(async (tx) => {
    const [md] = await tx
      .select({
        id: matchdays.id,
        seasonId: matchdays.seasonId,
        number: matchdays.number,
        status: matchdays.status,
        deadlineAt: matchdays.deadlineAt,
      })
      .from(matchdays)
      .where(eq(matchdays.id, input.matchdayId))
      .limit(1);

    if (!md) {
      throw new AdminChipsError("Matchday not found.", "NOT_FOUND");
    }

    const [manager] = await tx
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, input.managerId))
      .limit(1);

    if (!manager) {
      throw new AdminChipsError("Manager not found.", "NOT_FOUND");
    }

    const seasonChipsConfig = await loadSeasonChipConfigs(tx, md.seasonId);
    const config = seasonChipsConfig.find((c) => c.chipCode === chipCode);
    if (!config?.enabled) {
      throw new AdminChipsError(
        "This chip is not enabled for the season.",
        "CHIP_NOT_ENABLED",
      );
    }
    if (md.number < config.availableFromMatchday) {
      throw new AdminChipsError(
        "This chip is not available for this gameweek yet.",
        "CHIP_NOT_APPLICABLE",
      );
    }

    const activePlays = await loadManagerActiveChipPlays(
      tx,
      md.seasonId,
      input.managerId,
    );

    const otherOnMatchday = activePlays.find(
      (p) => p.matchdayId === input.matchdayId,
    );
    if (otherOnMatchday && otherOnMatchday.chipCode !== chipCode) {
      throw new AdminChipsError(
        "Manager already has a different chip active this gameweek.",
        "CHIP_MATCHDAY_TAKEN",
      );
    }

    const usedSameChip = activePlays.find(
      (p) => p.chipCode === chipCode,
    );
    if (
      usedSameChip &&
      usedSameChip.matchdayId !== input.matchdayId
    ) {
      throw new AdminChipsError(
        "This chip is already active on another gameweek.",
        "CHIP_ALREADY_USED",
      );
    }

    const [seasonChipRow] = await tx
      .select({ params: seasonChips.params })
      .from(seasonChips)
      .where(
        and(
          eq(seasonChips.seasonId, md.seasonId),
          eq(seasonChips.chipCode, chipCode),
        ),
      )
      .limit(1);

    const params = {
      ...CHIP_REGISTRY[chipCode].defaultParams,
      ...(seasonChipRow?.params &&
      typeof seasonChipRow.params === "object" &&
      !Array.isArray(seasonChipRow.params)
        ? (seasonChipRow.params as Record<string, unknown>)
        : {}),
    };

    const dbNow = await readDbNow(tx);

    await tx
      .delete(managerChipPlays)
      .where(
        and(
          eq(managerChipPlays.seasonId, md.seasonId),
          eq(managerChipPlays.managerId, input.managerId),
          eq(managerChipPlays.matchdayId, input.matchdayId),
          eq(managerChipPlays.status, "active"),
        ),
      );

    const [inserted] = await tx
      .insert(managerChipPlays)
      .values({
        seasonId: md.seasonId,
        managerId: input.managerId,
        matchdayId: input.matchdayId,
        chipCode,
        params,
        source: "admin",
        activatedAt: dbNow,
      })
      .returning({ id: managerChipPlays.id });

    const { freeAvailable, penaltyPerExtra } = await loadTransferContext(
      tx,
      md.seasonId,
      input.managerId,
      input.matchdayId,
      md.number,
    );

    await syncTransferWindowChipMirror(tx, {
      managerId: input.managerId,
      matchdayId: input.matchdayId,
      seasonId: md.seasonId,
      chipCode,
      freeAvailable,
      penaltyPerExtra,
      dbNow,
    });

    await writeAuditLog(tx, {
      userId: adminUserId,
      action: "force_activate_chip",
      entity: "manager_chip_plays",
      entityId: inserted!.id,
      before: { activePlays },
      after: {
        managerId: input.managerId,
        matchdayId: input.matchdayId,
        chipCode,
        reason: trimmed,
        source: "admin",
      },
    });

    if (md.status === "published") {
      await rebuildManagerScoresFromMatchday(tx, md.seasonId, md.number);
    }

    return { playId: inserted!.id };
  });
}

export async function updateSeasonChipsAdmin(
  db: AppDb,
  adminUserId: string,
  seasonId: string,
  rows: {
    chipCode: string;
    enabled?: boolean;
    availableFromMatchday?: number;
  }[],
): Promise<void> {
  const locked = await isSeasonChipConfigLocked(db, seasonId);
  if (locked) {
    throw new AdminChipsError(
      "Chip configuration is locked after the first locked gameweek.",
      "LOCKED",
    );
  }

  const existing = await loadSeasonChipsAdmin(db, seasonId);
  if (existing.length === 0) {
    throw new AdminChipsError(
      "Enable chips for this season before editing configuration.",
      "NOT_ENABLED",
    );
  }

  await db.transaction(async (tx) => {
    const before = existing;

    for (const patch of rows) {
      if (!isChipCode(patch.chipCode)) continue;
      const updates: Record<string, unknown> = {};
      if (patch.enabled !== undefined) updates.enabled = patch.enabled;
      if (patch.availableFromMatchday !== undefined) {
        if (patch.availableFromMatchday < 1) {
          throw new AdminChipsError(
            "Available-from gameweek must be at least 1.",
            "VALIDATION",
          );
        }
        updates.availableFromMatchday = patch.availableFromMatchday;
      }
      if (Object.keys(updates).length === 0) continue;

      await tx
        .update(seasonChips)
        .set(updates)
        .where(
          and(
            eq(seasonChips.seasonId, seasonId),
            eq(seasonChips.chipCode, patch.chipCode),
          ),
        );
    }

    const after = await loadSeasonChipsAdmin(tx, seasonId);

    await writeAuditLog(tx, {
      userId: adminUserId,
      action: "update_season_chips",
      entity: "season",
      entityId: seasonId,
      before: { chips: before },
      after: { chips: after, patches: rows },
    });
  });
}

export async function countSeasonChipsEnabled(
  db: AppDb,
  seasonId: string,
): Promise<number> {
  const rows = await db
    .select({ chipCode: seasonChips.chipCode })
    .from(seasonChips)
    .where(eq(seasonChips.seasonId, seasonId));
  return rows.length;
}
