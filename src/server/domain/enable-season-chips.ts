import { and, asc, eq, sql } from "drizzle-orm";
import type { AppDb, DbExecutor } from "@/server/db";
import { matchdays, seasonChips, seasons } from "@/server/db/schema";
import { CHIP_CODES, CHIP_REGISTRY } from "@/server/chips/registry";
import { writeAuditLog } from "./audit-log";

export class EnableSeasonChipsError extends Error {
  constructor(
    message: string,
    readonly code: string,
  ) {
    super(message);
    this.name = "EnableSeasonChipsError";
  }
}

export async function resolveDefaultChipAvailableFromMatchday(
  tx: DbExecutor,
  seasonId: string,
): Promise<number> {
  const [next] = await tx
    .select({ number: matchdays.number })
    .from(matchdays)
    .where(
      and(
        eq(matchdays.seasonId, seasonId),
        sql`${matchdays.status} in ('scheduled', 'draft')`,
      ),
    )
    .orderBy(asc(matchdays.number))
    .limit(1);

  return next?.number ?? 1;
}

export async function enableChipsForSeason(
  db: AppDb,
  adminUserId: string,
  seasonId: string,
  options?: { availableFromMatchday?: number },
): Promise<{ availableFromMatchday: number; chipCount: number }> {
  return db.transaction(async (tx) => {
    const [season] = await tx
      .select({ id: seasons.id })
      .from(seasons)
      .where(eq(seasons.id, seasonId))
      .limit(1);

    if (!season) {
      throw new EnableSeasonChipsError("Season not found.", "NOT_FOUND");
    }

    const existing = await tx
      .select({ chipCode: seasonChips.chipCode })
      .from(seasonChips)
      .where(eq(seasonChips.seasonId, seasonId));

    if (existing.length >= CHIP_CODES.length) {
      throw new EnableSeasonChipsError(
        "Chips are already enabled for this season.",
        "ALREADY_ENABLED",
      );
    }

    const availableFromMatchday =
      options?.availableFromMatchday ??
      (await resolveDefaultChipAvailableFromMatchday(tx, seasonId));

    if (availableFromMatchday < 1) {
      throw new EnableSeasonChipsError(
        "Available-from gameweek must be at least 1.",
        "VALIDATION",
      );
    }

    for (const code of CHIP_CODES) {
      await tx
        .insert(seasonChips)
        .values({
          seasonId,
          chipCode: code,
          enabled: true,
          availableFromMatchday,
          params: CHIP_REGISTRY[code].defaultParams,
        })
        .onConflictDoNothing();
    }

    const after = await tx
      .select({ chipCode: seasonChips.chipCode })
      .from(seasonChips)
      .where(eq(seasonChips.seasonId, seasonId));

    await writeAuditLog(tx, {
      userId: adminUserId,
      action: "enable_season_chips",
      entity: "season",
      entityId: seasonId,
      before: { chipCodes: existing.map((row) => row.chipCode) },
      after: {
        chipCodes: after.map((row) => row.chipCode),
        availableFromMatchday,
      },
    });

    return {
      availableFromMatchday,
      chipCount: after.length,
    };
  });
}
