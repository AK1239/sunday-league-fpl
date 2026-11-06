import {
  type EligiblePlayer,
  type FantasyTeamPick,
  type ValidateFantasyTeamResult,
} from "./validate-team";
import { diffSquads } from "./transfer-diff";

const SQUAD_SIZE = 5;

/**
 * Validates a squad submission when transfer rules apply (D5: retain inactive base players).
 * Does not replace legacy `validateFantasyTeam` used while transfers are disabled.
 */
export function validateFantasyTeamTransferPick(
  pick: FantasyTeamPick,
  basePlayerIds: readonly string[],
  eligibleById: ReadonlyMap<string, EligiblePlayer>,
): ValidateFantasyTeamResult {
  if (pick.playerIds.length !== SQUAD_SIZE) {
    return {
      ok: false,
      code: "SQUAD_SIZE",
      message: `Pick exactly ${SQUAD_SIZE} players.`,
    };
  }

  const unique = new Set(pick.playerIds);
  if (unique.size !== SQUAD_SIZE) {
    return {
      ok: false,
      code: "DUPLICATE_PLAYER",
      message: "Each player can only appear once.",
    };
  }

  if (pick.captainPlayerId === pick.viceCaptainPlayerId) {
    return {
      ok: false,
      code: "CAPTAIN_VICE_SAME",
      message: "Captain and vice-captain must be different players.",
    };
  }

  if (!unique.has(pick.captainPlayerId)) {
    return {
      ok: false,
      code: "CAPTAIN_NOT_IN_SQUAD",
      message: "Captain must be one of the five picked players.",
    };
  }

  if (!unique.has(pick.viceCaptainPlayerId)) {
    return {
      ok: false,
      code: "VICE_NOT_IN_SQUAD",
      message: "Vice-captain must be one of the five picked players.",
    };
  }

  const baseSet = new Set(basePlayerIds);
  if (baseSet.size !== SQUAD_SIZE && basePlayerIds.length > 0) {
    return {
      ok: false,
      code: "VALIDATION",
      message: "Base squad must contain exactly five players.",
    };
  }

  const { in: incoming, out } = diffSquads(basePlayerIds, pick.playerIds);

  for (const playerId of out) {
    if (!baseSet.has(playerId)) {
      return {
        ok: false,
        code: "VALIDATION",
        message: "Cannot transfer out a player who is not in your squad.",
      };
    }
  }

  for (const playerId of pick.playerIds) {
    const meta = eligibleById.get(playerId);
    if (!meta) {
      return {
        ok: false,
        code: "UNKNOWN_PLAYER",
        message: "One or more selected players are not in the squad pool.",
      };
    }
    const isIncoming = incoming.includes(playerId);
    if (isIncoming && !meta.active) {
      return {
        ok: false,
        code: "INELIGIBLE_PLAYER",
        message: "Inactive players cannot be transferred in.",
      };
    }
    if (!meta.active && !baseSet.has(playerId)) {
      return {
        ok: false,
        code: "INELIGIBLE_PLAYER",
        message: "Inactive players cannot be transferred in.",
      };
    }
  }

  for (const playerId of incoming) {
    if (baseSet.has(playerId)) {
      return {
        ok: false,
        code: "VALIDATION",
        message: "Incoming player is already in your squad.",
      };
    }
  }

  return { ok: true };
}

/** Initial unrestricted build — no base squad yet. */
export function validateInitialFantasyTeamBuild(
  pick: FantasyTeamPick,
  eligibleById: ReadonlyMap<string, EligiblePlayer>,
): ValidateFantasyTeamResult {
  if (pick.playerIds.length !== SQUAD_SIZE) {
    return {
      ok: false,
      code: "SQUAD_SIZE",
      message: `Pick exactly ${SQUAD_SIZE} players.`,
    };
  }

  const unique = new Set(pick.playerIds);
  if (unique.size !== SQUAD_SIZE) {
    return {
      ok: false,
      code: "DUPLICATE_PLAYER",
      message: "Each player can only appear once.",
    };
  }

  if (pick.captainPlayerId === pick.viceCaptainPlayerId) {
    return {
      ok: false,
      code: "CAPTAIN_VICE_SAME",
      message: "Captain and vice-captain must be different players.",
    };
  }

  if (!unique.has(pick.captainPlayerId)) {
    return {
      ok: false,
      code: "CAPTAIN_NOT_IN_SQUAD",
      message: "Captain must be one of the five picked players.",
    };
  }

  if (!unique.has(pick.viceCaptainPlayerId)) {
    return {
      ok: false,
      code: "VICE_NOT_IN_SQUAD",
      message: "Vice-captain must be one of the five picked players.",
    };
  }

  for (const playerId of pick.playerIds) {
    const meta = eligibleById.get(playerId);
    if (!meta) {
      return {
        ok: false,
        code: "UNKNOWN_PLAYER",
        message: "One or more selected players are not in the squad pool.",
      };
    }
    if (!meta.active) {
      return {
        ok: false,
        code: "INELIGIBLE_PLAYER",
        message: "Inactive players cannot be picked.",
      };
    }
  }

  return { ok: true };
}
