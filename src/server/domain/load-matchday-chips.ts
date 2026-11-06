import { and, eq, inArray } from "drizzle-orm";
import { isChipCode } from "@/server/chips/registry";
import type { DbExecutor } from "@/server/db";
import { managerChipPlays } from "@/server/db/schema";
import type { ChipScoringInput } from "@/server/scoring/chip-effects";

export type ActiveChipPlayRow = {
  managerId: string;
  chipCode: string;
  params: unknown;
};

export async function loadActiveChipPlaysForMatchday(
  tx: DbExecutor,
  matchdayId: string,
  managerIds: readonly string[],
): Promise<Map<string, ActiveChipPlayRow>> {
  if (managerIds.length === 0) return new Map();

  const rows = await tx
    .select({
      managerId: managerChipPlays.managerId,
      chipCode: managerChipPlays.chipCode,
      params: managerChipPlays.params,
    })
    .from(managerChipPlays)
    .where(
      and(
        eq(managerChipPlays.matchdayId, matchdayId),
        eq(managerChipPlays.status, "active"),
        inArray(managerChipPlays.managerId, [...managerIds]),
      ),
    );

  return new Map(rows.map((row) => [row.managerId, row]));
}

export function toChipScoringInput(
  play: ActiveChipPlayRow,
  reservePlayerIds: readonly string[],
): ChipScoringInput | null {
  if (!isChipCode(play.chipCode)) return null;

  const params =
    play.params &&
    typeof play.params === "object" &&
    !Array.isArray(play.params)
      ? (play.params as Record<string, unknown>)
      : {};

  return {
    code: play.chipCode,
    params,
    reservePlayerIds:
      play.chipCode === "bench_boost" ? reservePlayerIds : [],
  };
}
