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

export function scoreManagers(
  rules: ManagerScoringRules,
  playerPoints: ReadonlyMap<string, number>,
  attended: ReadonlySet<string>,
  teams: readonly TeamForManagerScoring[],
  transferPenalties: ReadonlyMap<string, number> = new Map(),
): ScoredManagerMatchday[] {
  return teams.map((team) => {
    const multipliedPlayerId = pickMultiplierPlayer(team, attended);
    const lines: ScoredManagerLine[] = team.playerIds.map((playerId) => {
      const basePoints = playerPoints.get(playerId) ?? 0;
      const multiplier =
        multipliedPlayerId === playerId ? rules.captainMultiplier : 1;
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

    const squadPoints = lines.reduce((sum, line) => sum + line.points, 0);
    const transferPenalty = transferPenalties.get(team.managerId) ?? 0;
    const totalPoints = squadPoints + transferPenalty;

    return {
      managerId: team.managerId,
      squadPoints,
      transferPenalty,
      totalPoints,
      multiplierPlayerId: multipliedPlayerId,
      teamSource: team.teamSource,
      lines,
    };
  });
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
  };
}
