import type { ChipCode } from "@/server/chips/registry";
import type {
  ManagerScoringRules,
  TeamForManagerScoring,
} from "./manager-types";

export type ChipScoringInput = {
  code: ChipCode;
  /** Snapshotted params (e.g. `{ multiplier: 3 }` for Triple Captain). */
  params: Record<string, unknown>;
  /** Bench Boost extra players (scored ×1 if they attend). */
  reservePlayerIds: readonly string[];
};

export type SquadPointsOnlyFn = (
  rules: ManagerScoringRules,
  playerPoints: ReadonlyMap<string, number>,
  attended: ReadonlySet<string>,
  team: TeamForManagerScoring,
  chip: ChipScoringInput | null,
) => number;

export function tripleCaptainMultiplier(
  params: Record<string, unknown>,
): number {
  const raw = params.multiplier;
  return typeof raw === "number" && Number.isFinite(raw) ? raw : 3;
}

/**
 * DB history: `captain_multiplier` used to be a small integer (e.g. 2 = 2×).
 * New rows use hundredths (200 = 2×, 150 = 1.5×). Treat values ≤10 as legacy.
 */
export function fantasyMultiplierFromDb(stored: number): number {
  if (Number.isFinite(stored) && stored <= 10 && stored >= 1) {
    return stored;
  }
  return stored / 100;
}

/**
 * Fantasy multiplier for a squad line. Captain and vice each get their own
 * scale when they attend (no “vice replaces captain” backup).
 */
export function multiplierForScoredPlayer(input: {
  playerId: string;
  captainPlayerId: string;
  viceCaptainPlayerId: string;
  attended: boolean;
  rules: ManagerScoringRules;
  chip: ChipScoringInput | null;
}): number {
  if (!input.attended) return 1;

  if (input.playerId === input.captainPlayerId) {
    if (
      input.chip?.code === "triple_captain" &&
      input.playerId === input.captainPlayerId
    ) {
      return tripleCaptainMultiplier(input.chip.params);
    }
    return fantasyMultiplierFromDb(input.rules.captainMultiplier);
  }

  if (input.playerId === input.viceCaptainPlayerId) {
    return fantasyMultiplierFromDb(input.rules.viceCaptainMultiplier);
  }

  return 1;
}

export function shouldScoreBenchBoostReserve(
  chip: ChipScoringInput | null,
): boolean {
  return chip?.code === "bench_boost" && chip.reservePlayerIds.length > 0;
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

export function chipCodeForScoring(
  chip: ChipScoringInput | null,
): ChipCode | null {
  return chip?.code ?? null;
}
