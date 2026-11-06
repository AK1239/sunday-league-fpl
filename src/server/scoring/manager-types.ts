import type { ScoringRules } from "./types";

export type ManagerScoringRules = ScoringRules & {
  /** Captain × as hundredths on the ledger total (200 = 2×). */
  captainMultiplier: number;
  /** Vice-captain × as hundredths (150 = 1.5×), applied when they attend. */
  viceCaptainMultiplier: number;
};

export type ManagerScoreLineRole =
  "player" | "captain" | "vice_captain" | "reserve";

export type ScoredLineRole = ManagerScoreLineRole;

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
  /** Effective fantasy multiplier (may be fractional, e.g. 1.5). */
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
  /** @deprecated Prefer captainMultiplierPlayerId — kept for older UI paths. */
  multiplierPlayerId: string | null;
  captainMultiplierPlayerId: string | null;
  viceCaptainMultiplierPlayerId: string | null;
  teamSource: ManagerTeamSource;
  lines: ScoredManagerLine[];
  /** Scoring chip on this matchday (result metadata). */
  chipCode: string | null;
  /** squadPoints difference attributable to score-affecting chips. */
  chipBonus: number;
};
