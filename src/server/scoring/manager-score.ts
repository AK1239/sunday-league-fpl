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

function pickMultiplierPlayer(
  team: TeamForManagerScoring,
  attended: ReadonlySet<string>,
): string | null {
  if (attended.has(team.captainPlayerId)) return team.captainPlayerId;
  if (attended.has(team.viceCaptainPlayerId)) return team.viceCaptainPlayerId;
  return null;
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
} {
  const multipliedPlayerId = pickMultiplierPlayer(team, attended);
  const lines: ScoredManagerLine[] = team.playerIds.map((playerId) => {
    const basePoints = playerPoints.get(playerId) ?? 0;
    const multiplier = multiplierForScoredPlayer({
      playerId,
      captainPlayerId: team.captainPlayerId,
      viceCaptainPlayerId: team.viceCaptainPlayerId,
      multipliedPlayerId,
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
      points: basePoints * multiplier,
      attended: attended.has(playerId),
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
  return { lines, squadPoints, multiplierPlayerId: multipliedPlayerId };
}

export function scoreOneManagerTeam(
  rules: ManagerScoringRules,
  playerPoints: ReadonlyMap<string, number>,
  attended: ReadonlySet<string>,
  team: TeamForManagerScoring,
  chip: ChipScoringInput | null,
  transferPenalties: ReadonlyMap<string, number>,
): ScoredManagerMatchday {
  const { lines, squadPoints, multiplierPlayerId } = buildSquadLines(
    rules,
    playerPoints,
    attended,
    team,
    chip,
  );
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
    teamSource: "none",
    lines: [],
    chipCode: null,
    chipBonus: 0,
  };
}
