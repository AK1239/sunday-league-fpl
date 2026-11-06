import type { ChipCode } from "./registry";
import { CHIP_REGISTRY, isChipCode } from "./registry";
import type { SquadKind } from "@/server/fantasy/effective-team";

export type SeasonChipConfig = {
  chipCode: ChipCode;
  enabled: boolean;
  availableFromMatchday: number;
};

export type ActiveChipPlay = {
  chipCode: ChipCode;
  matchdayId: string;
  status: "active" | "void";
};

export type ChipValidationErrorCode =
  | "CHIP_UNKNOWN"
  | "CHIP_NOT_ENABLED"
  | "CHIP_ALREADY_USED"
  | "CHIP_MATCHDAY_TAKEN"
  | "CHIP_NOT_APPLICABLE"
  | "CHIP_RESERVE_REQUIRED"
  | "CHIP_RESERVE_INVALID"
  | "CHIP_STATE_MISMATCH";

export type ChipValidationResult =
  | { ok: true }
  | { ok: false; code: ChipValidationErrorCode; message: string };

export type ValidateChipInput = {
  chipCode: string | null;
  reservePlayerId: string | null;
  squadKind: SquadKind;
  playerIds: readonly string[];
  captainPlayerId: string;
  viceCaptainPlayerId: string;
  matchdayNumber: number;
  targetMatchdayId: string;
  transferRulesApply: boolean;
  hasBaseSquad: boolean;
  isInitialBuild: boolean;
  seasonChips: readonly SeasonChipConfig[];
  activePlays: readonly ActiveChipPlay[];
  reserveEligible: (playerId: string) => boolean;
};

export function validateChipSubmission(
  input: ValidateChipInput,
): ChipValidationResult {
  const desiredChip = input.chipCode;

  if (desiredChip == null || desiredChip === "") {
    if (input.reservePlayerId != null) {
      return {
        ok: false,
        code: "CHIP_RESERVE_INVALID",
        message: "Reserve player requires Bench Boost.",
      };
    }
    if (input.squadKind === "free_hit") {
      return {
        ok: false,
        code: "CHIP_STATE_MISMATCH",
        message: "Free Hit squad requires the Free Hit chip.",
      };
    }
    return { ok: true };
  }

  if (!isChipCode(desiredChip)) {
    return {
      ok: false,
      code: "CHIP_UNKNOWN",
      message: "Unknown chip.",
    };
  }

  const entry = CHIP_REGISTRY[desiredChip];
  const config = input.seasonChips.find((c) => c.chipCode === desiredChip);
  if (!config?.enabled) {
    return {
      ok: false,
      code: "CHIP_NOT_ENABLED",
      message: "This chip is not enabled for the season.",
    };
  }

  if (input.matchdayNumber < config.availableFromMatchday) {
    return {
      ok: false,
      code: "CHIP_NOT_APPLICABLE",
      message: `This chip is available from gameweek ${config.availableFromMatchday}.`,
    };
  }

  const otherActiveOnMatchday = input.activePlays.find(
    (p) =>
      p.status === "active" &&
      p.matchdayId === input.targetMatchdayId &&
      p.chipCode !== desiredChip,
  );
  if (otherActiveOnMatchday) {
    return {
      ok: false,
      code: "CHIP_MATCHDAY_TAKEN",
      message: "You already have a different chip active this gameweek.",
    };
  }

  const usedSameChip = input.activePlays.find(
    (p) =>
      p.status === "active" &&
      p.chipCode === desiredChip &&
      p.matchdayId !== input.targetMatchdayId,
  );
  if (usedSameChip) {
    return {
      ok: false,
      code: "CHIP_ALREADY_USED",
      message: "You have already used this chip this season.",
    };
  }

  if (entry.requiresTransferBase) {
    if (input.isInitialBuild || !input.hasBaseSquad || !input.transferRulesApply) {
      return {
        ok: false,
        code: "CHIP_NOT_APPLICABLE",
        message: "Available from your second squad when transfer rules apply.",
      };
    }
  }

  if (entry.requiresTemporarySquad && input.squadKind !== "free_hit") {
    return {
      ok: false,
      code: "CHIP_STATE_MISMATCH",
      message: "Free Hit requires a temporary squad for this gameweek.",
    };
  }

  if (entry.requiresTemporarySquad === false && input.squadKind === "free_hit") {
    return {
      ok: false,
      code: "CHIP_STATE_MISMATCH",
      message: "Free Hit squad kind requires the Free Hit chip.",
    };
  }

  if (entry.permanence === "permanent_squad" && input.squadKind === "free_hit") {
    return {
      ok: false,
      code: "CHIP_STATE_MISMATCH",
      message: "Wildcard cannot use a Free Hit squad.",
    };
  }

  if (entry.requiresReserve) {
    if (!input.reservePlayerId) {
      return {
        ok: false,
        code: "CHIP_RESERVE_REQUIRED",
        message: "Bench Boost requires a reserve player.",
      };
    }
    const reserve = input.reservePlayerId;
    if (input.playerIds.includes(reserve)) {
      return {
        ok: false,
        code: "CHIP_RESERVE_INVALID",
        message: "Reserve must not be one of your five starters.",
      };
    }
    if (
      reserve === input.captainPlayerId ||
      reserve === input.viceCaptainPlayerId
    ) {
      return {
        ok: false,
        code: "CHIP_RESERVE_INVALID",
        message: "Reserve cannot be captain or vice-captain.",
      };
    }
    if (!input.reserveEligible(reserve)) {
      return {
        ok: false,
        code: "CHIP_RESERVE_INVALID",
        message: "Reserve must be an active player.",
      };
    }
  } else if (input.reservePlayerId != null) {
    return {
      ok: false,
      code: "CHIP_RESERVE_INVALID",
      message: "Only Bench Boost may set a reserve player.",
    };
  }

  if (
    desiredChip !== "bench_boost" &&
    desiredChip !== "free_hit" &&
    input.squadKind !== "permanent"
  ) {
    return {
      ok: false,
      code: "CHIP_STATE_MISMATCH",
      message: "This chip requires a permanent squad.",
    };
  }

  return { ok: true };
}
