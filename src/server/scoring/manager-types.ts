import type { ScoringRules } from "./types";

export type ManagerScoringRules = ScoringRules & {
  captainMultiplier: number;
};

export type ManagerScoreLineRole = "player" | "captain" | "vice_captain";

/** In-memory scoring roles (DB enum gains `reserve` in migration 0009). */
export type ScoredLineRole = ManagerScoreLineRole | "reserve";

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
  role: ScoredLineRole;
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
  /** Scoring chip on this matchday (result metadata). */
  chipCode: string | null;
  /** squadPoints difference attributable to score-affecting chips. */
  chipBonus: number;
};
