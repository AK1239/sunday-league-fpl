import type { ScoringRules } from "./types";

export type ManagerScoringRules = ScoringRules & {
  captainMultiplier: number;
};

export type ManagerScoreLineRole = "player" | "captain" | "vice_captain";

export type ManagerTeamSource = "manual" | "carry_over" | "admin" | "none";

export type TeamForManagerScoring = {
  managerId: string;
  captainPlayerId: string;
  viceCaptainPlayerId: string;
  playerIds: readonly string[];
  teamSource: Exclude<ManagerTeamSource, "none">;
};

export type ScoredManagerLine = {
  managerId: string;
  playerId: string;
  role: ManagerScoreLineRole;
  basePoints: number;
  multiplier: number;
  points: number;
  attended: boolean;
  teamSource: ManagerTeamSource;
};

export type ScoredManagerMatchday = {
  managerId: string;
  totalPoints: number;
  multiplierPlayerId: string | null;
  teamSource: ManagerTeamSource;
  lines: ScoredManagerLine[];
};
