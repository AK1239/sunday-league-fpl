import { and, eq } from "drizzle-orm";
import type { DbExecutor } from "@/server/db";
import {
  managerChipPlays,
  managerTransferWindows,
  seasonChips,
} from "@/server/db/schema";
import type { ChipCode } from "@/server/chips/registry";
import {
  CHIP_REGISTRY,
  chipSetsUnlimitedTransfers,
  isChipCode,
} from "@/server/chips/registry";
import type {
  ActiveChipPlay,
  SeasonChipConfig,
} from "@/server/chips/validate-chip";

export async function loadSeasonChipConfigs(
  tx: DbExecutor,
  seasonId: string,
): Promise<SeasonChipConfig[]> {
  const rows = await tx
    .select({
      chipCode: seasonChips.chipCode,
      enabled: seasonChips.enabled,
      availableFromMatchday: seasonChips.availableFromMatchday,
      params: seasonChips.params,
    })
    .from(seasonChips)
    .where(eq(seasonChips.seasonId, seasonId));

  return rows.flatMap((row) =>
    isChipCode(row.chipCode)
      ? [
          {
            chipCode: row.chipCode,
            enabled: row.enabled,
            availableFromMatchday: row.availableFromMatchday,
          },
        ]
      : [],
  );
}

export async function loadManagerActiveChipPlays(
  tx: DbExecutor,
  seasonId: string,
  managerId: string,
): Promise<ActiveChipPlay[]> {
  const rows = await tx
    .select({
      chipCode: managerChipPlays.chipCode,
      matchdayId: managerChipPlays.matchdayId,
      status: managerChipPlays.status,
    })
    .from(managerChipPlays)
    .where(
      and(
        eq(managerChipPlays.seasonId, seasonId),
        eq(managerChipPlays.managerId, managerId),
        eq(managerChipPlays.status, "active"),
      ),
    );

  return rows.flatMap((row) =>
    isChipCode(row.chipCode)
      ? [
          {
            chipCode: row.chipCode,
            matchdayId: row.matchdayId,
            status: "active" as const,
          },
        ]
      : [],
  );
}

function paramsSnapshot(
  code: ChipCode,
  seasonParams: unknown,
): Record<string, unknown> {
  const fromSeason =
    seasonParams &&
    typeof seasonParams === "object" &&
    !Array.isArray(seasonParams)
      ? (seasonParams as Record<string, unknown>)
      : {};
  return { ...CHIP_REGISTRY[code].defaultParams, ...fromSeason };
}

/** Open matchday: replace the manager's active play for this gameweek. */
export async function syncManagerChipPlayForSubmit(
  tx: DbExecutor,
  input: {
    seasonId: string;
    managerId: string;
    matchdayId: string;
    desiredChipCode: ChipCode | null;
  },
): Promise<void> {
  await tx
    .delete(managerChipPlays)
    .where(
      and(
        eq(managerChipPlays.seasonId, input.seasonId),
        eq(managerChipPlays.managerId, input.managerId),
        eq(managerChipPlays.matchdayId, input.matchdayId),
        eq(managerChipPlays.status, "active"),
      ),
    );

  if (!input.desiredChipCode) return;

  const [config] = await tx
    .select({ params: seasonChips.params })
    .from(seasonChips)
    .where(
      and(
        eq(seasonChips.seasonId, input.seasonId),
        eq(seasonChips.chipCode, input.desiredChipCode),
      ),
    )
    .limit(1);

  await tx.insert(managerChipPlays).values({
    seasonId: input.seasonId,
    managerId: input.managerId,
    matchdayId: input.matchdayId,
    chipCode: input.desiredChipCode,
    params: paramsSnapshot(input.desiredChipCode, config?.params ?? {}),
    source: "manager",
  });
}

export async function syncTransferWindowChipMirror(
  tx: DbExecutor,
  input: {
    managerId: string;
    matchdayId: string;
    seasonId: string;
    chipCode: ChipCode | null;
    freeAvailable: number;
    penaltyPerExtra: number;
    dbNow: Date;
  },
): Promise<void> {
  const unlimited = chipSetsUnlimitedTransfers(input.chipCode);

  await tx
    .insert(managerTransferWindows)
    .values({
      managerId: input.managerId,
      matchdayId: input.matchdayId,
      seasonId: input.seasonId,
      freeAvailable: input.freeAvailable,
      unlimited,
      chipCode: input.chipCode,
      penaltyPerExtra: input.penaltyPerExtra,
      updatedAt: input.dbNow,
    })
    .onConflictDoUpdate({
      target: [
        managerTransferWindows.managerId,
        managerTransferWindows.matchdayId,
      ],
      set: {
        freeAvailable: input.freeAvailable,
        unlimited,
        chipCode: input.chipCode,
        penaltyPerExtra: input.penaltyPerExtra,
        updatedAt: input.dbNow,
        voidedAt: null,
      },
    });
}
