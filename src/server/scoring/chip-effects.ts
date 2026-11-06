import type { ChipCode } from "@/server/chips/registry";
import type { ManagerScoringRules, TeamForManagerScoring } from "./manager-types";

export type ChipScoringInput = {
  code: ChipCode;
  /** Snapshotted params (e.g. `{ multiplier: 3 }` for Triple Captain). */
  params: Record<string, unknown>;
  reservePlayerId: string | null;
};

export type SquadPointsOnlyFn = (
  rules: ManagerScoringRules,
  playerPoints: ReadonlyMap<string, number>,
  attended: ReadonlySet<string>,
  team: TeamForManagerScoring,
  chip: ChipScoringInput | null,
) => number;

export function tripleCaptainMultiplier(params: Record<string, unknown>): number {
  const raw = params.multiplier;
  return typeof raw === "number" && Number.isFinite(raw) ? raw : 3;
}

/** Captain multiplier when this player is the chosen multiplier player (D8). */
export function multiplierForScoredPlayer(input: {
  playerId: string;
  captainPlayerId: string;
  viceCaptainPlayerId: string;
  multipliedPlayerId: string | null;
  rules: ManagerScoringRules;
  chip: ChipScoringInput | null;
}): number {
  if (input.multipliedPlayerId !== input.playerId) return 1;
  if (
    input.chip?.code === "triple_captain" &&
    input.playerId === input.captainPlayerId
  ) {
    return tripleCaptainMultiplier(input.chip.params);
  }
  return input.rules.captainMultiplier;
}

export function shouldScoreBenchBoostReserve(
  chip: ChipScoringInput | null,
): boolean {
  return chip?.code === "bench_boost" && chip.reservePlayerId != null;
}

/** Informational bonus: squad points with chip minus without (TC / BB only). */
export function computeChipBonus(
  rules: ManagerScoringRules,
  playerPoints: ReadonlyMap<string, number>,
  attended: ReadonlySet<string>,
  team: TeamForManagerScoring,
  chip: ChipScoringInput | null,
  squadPointsFn: SquadPointsOnlyFn,
): number {
  if (!chip || chip.code === "wildcard" || chip.code === "free_hit") {
    return 0;
  }
  const withChip = squadPointsFn(rules, playerPoints, attended, team, chip);
  const without = squadPointsFn(rules, playerPoints, attended, team, null);
  return withChip - without;
}

export function chipCodeForScoring(chip: ChipScoringInput | null): ChipCode | null {
  return chip?.code ?? null;
}
