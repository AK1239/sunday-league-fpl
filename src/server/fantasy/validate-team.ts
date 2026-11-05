export type FantasyTeamPick = {
  playerIds: readonly string[];
  captainPlayerId: string;
  viceCaptainPlayerId: string;
};

export type EligiblePlayer = {
  id: string;
  active: boolean;
};

export type ValidateFantasyTeamResult =
  { ok: true } | { ok: false; code: string; message: string };

const SQUAD_SIZE = 5;

export function validateFantasyTeam(
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
    const player = eligibleById.get(playerId);
    if (!player) {
      return {
        ok: false,
        code: "UNKNOWN_PLAYER",
        message: "One or more selected players are not in the squad pool.",
      };
    }
    if (!player.active) {
      return {
        ok: false,
        code: "INACTIVE_PLAYER",
        message: "Inactive players cannot be picked.",
      };
    }
  }

  return { ok: true };
}
