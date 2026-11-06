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
  /** Sum of player line points after captain multiplier (stage 4). */
  squadPoints: number;
  /** Non-positive transfer hit (stage 5); 0 when transfers disabled or no extras. */
  transferPenalty: number;
  /** squadPoints + transferPenalty (stage 6). */
  totalPoints: number;
  multiplierPlayerId: string | null;
  teamSource: ManagerTeamSource;
  lines: ScoredManagerLine[];
};
