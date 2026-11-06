import type { ChipScoringInput } from "./chip-effects";
import {
  chipCodeForScoring,
  computeChipBonus,
  multiplierForScoredPlayer,
  shouldScoreBenchBoostReserve,
} from "./chip-effects";
import type {
  ManagerScoringRules,
  ManagerScoreLineRole,
  ScoredManagerLine,
  ScoredManagerMatchday,
  TeamForManagerScoring,
} from "./manager-types";

function roleForPlayer(
  playerId: string,
  captainId: string,
  viceId: string,
): ManagerScoreLineRole {
  if (playerId === captainId) return "captain";
  if (playerId === viceId) return "vice_captain";
  return "player";
}

function multiplierMetadata(
  team: TeamForManagerScoring,
  attended: ReadonlySet<string>,
): {
  captainMultiplierPlayerId: string | null;
  viceCaptainMultiplierPlayerId: string | null;
  multiplierPlayerId: string | null;
} {
  const inSquad = (id: string) => team.playerIds.includes(id);
  const captainOk =
    inSquad(team.captainPlayerId) && attended.has(team.captainPlayerId);
  const viceOk =
    inSquad(team.viceCaptainPlayerId) && attended.has(team.viceCaptainPlayerId);
  const captainMultiplierPlayerId = captainOk ? team.captainPlayerId : null;
  const viceCaptainMultiplierPlayerId = viceOk
    ? team.viceCaptainPlayerId
    : null;
  return {
    captainMultiplierPlayerId,
    viceCaptainMultiplierPlayerId,
    multiplierPlayerId:
      captainMultiplierPlayerId ?? viceCaptainMultiplierPlayerId,
  };
}

function buildSquadLines(
  rules: ManagerScoringRules,
  playerPoints: ReadonlyMap<string, number>,
  attended: ReadonlySet<string>,
  team: TeamForManagerScoring,
  chip: ChipScoringInput | null,
): {
  lines: ScoredManagerLine[];
  squadPoints: number;
  multiplierPlayerId: string | null;
  captainMultiplierPlayerId: string | null;
  viceCaptainMultiplierPlayerId: string | null;
} {
  const {
    captainMultiplierPlayerId,
    viceCaptainMultiplierPlayerId,
    multiplierPlayerId,
  } = multiplierMetadata(team, attended);
  const lines: ScoredManagerLine[] = team.playerIds.map((playerId) => {
    const basePoints = playerPoints.get(playerId) ?? 0;
    const attendedPlayer = attended.has(playerId);
    const multiplier = multiplierForScoredPlayer({
      playerId,
      captainPlayerId: team.captainPlayerId,
      viceCaptainPlayerId: team.viceCaptainPlayerId,
      attended: attendedPlayer,
      rules,
      chip,
    });
    return {
      managerId: team.managerId,
      playerId,
      role: roleForPlayer(
        playerId,
        team.captainPlayerId,
        team.viceCaptainPlayerId,
      ),
      basePoints,
      multiplier,
      points: Math.round(basePoints * multiplier),
      attended: attendedPlayer,
      teamSource: team.teamSource,
    };
  });

  const counts = shouldScoreBenchBoostReserve(chip);
  for (const reserveId of chip?.reservePlayerIds ?? []) {
    const basePoints = playerPoints.get(reserveId) ?? 0;
    lines.push({
      managerId: team.managerId,
      playerId: reserveId,
      role: "reserve",
      basePoints,
      multiplier: 1,
      points: counts && attended.has(reserveId) ? basePoints : 0,
      attended: attended.has(reserveId),
      teamSource: team.teamSource,
    });
  }

  const squadPoints = lines.reduce((sum, line) => sum + line.points, 0);
  return {
    lines,
    squadPoints,
    multiplierPlayerId,
    captainMultiplierPlayerId,
    viceCaptainMultiplierPlayerId,
  };
}

export function scoreOneManagerTeam(
  rules: ManagerScoringRules,
  playerPoints: ReadonlyMap<string, number>,
  attended: ReadonlySet<string>,
  team: TeamForManagerScoring,
  chip: ChipScoringInput | null,
  transferPenalties: ReadonlyMap<string, number>,
): ScoredManagerMatchday {
  const {
    lines,
    squadPoints,
    multiplierPlayerId,
    captainMultiplierPlayerId,
    viceCaptainMultiplierPlayerId,
  } = buildSquadLines(rules, playerPoints, attended, team, chip);
  const transferPenalty = transferPenalties.get(team.managerId) ?? 0;
  const chipBonus = computeChipBonus(
    rules,
    playerPoints,
    attended,
    team,
    chip,
    (r, pts, att, tm, c) => buildSquadLines(r, pts, att, tm, c).squadPoints,
  );

  return {
    managerId: team.managerId,
    squadPoints,
    transferPenalty,
    totalPoints: squadPoints + transferPenalty,
    multiplierPlayerId,
    captainMultiplierPlayerId,
    viceCaptainMultiplierPlayerId,
    teamSource: team.teamSource,
    lines,
    chipCode: chipCodeForScoring(chip),
    chipBonus,
  };
}

export function scoreManagers(
  rules: ManagerScoringRules,
  playerPoints: ReadonlyMap<string, number>,
  attended: ReadonlySet<string>,
  teams: readonly TeamForManagerScoring[],
  transferPenalties: ReadonlyMap<string, number> = new Map(),
  chipsByManager: ReadonlyMap<string, ChipScoringInput> = new Map(),
): ScoredManagerMatchday[] {
  return teams.map((team) =>
    scoreOneManagerTeam(
      rules,
      playerPoints,
      attended,
      team,
      chipsByManager.get(team.managerId) ?? null,
      transferPenalties,
    ),
  );
}

export function scoreManagerWithNoTeam(
  managerId: string,
): ScoredManagerMatchday {
  return {
    managerId,
    squadPoints: 0,
    transferPenalty: 0,
    totalPoints: 0,
    multiplierPlayerId: null,
    captainMultiplierPlayerId: null,
    viceCaptainMultiplierPlayerId: null,
    teamSource: "none",
    lines: [],
    chipCode: null,
    chipBonus: 0,
  };
}
