export type PointKind =
  | "attendance"
  | "win"
  | "draw"
  | "goal"
  | "assist"
  | "mvp"
  | "clean_sheet"
  | "own_goal"
  | "penalty_saved"
  | "handball"
  | "penalty_missed"
  | "hat_trick";

export type GoalKind = "open_play" | "penalty" | "own_goal";
export type IncidentKind =
  "penalty_saved" | "handball_blocked" | "penalty_missed";

export type ScoringRules = {
  attendancePts: number;
  winPts: number;
  drawPts: number;
  goalPts: number;
  assistPts: number;
  mvpPts: number;
  cleanSheetPts: number;
  /** Replaces `goalPts` for a penalty goal. */
  penaltyGoalPts: number;
  penaltySavedPts: number;
  ownGoalPts: number;
  /** Handball that stops a goal. */
  handballPts: number;
  /** Taker misses the penalty (not saved — separate from penalty_saved). */
  penaltyMissedPts: number;
  /** One-off bonus per match when the player scores 3+ goals (excludes own goals). */
  hatTrickPts: number;
};

export type ScoreGoal = {
  id: string;
  /** For own goals: the player who scored it (on the side opposite the credited one). */
  scorerId: string;
  assistId: string | null;
  /** Defaults to open play. */
  kind?: GoalKind;
};

export type ScoreIncident = {
  id: string;
  playerId: string;
  kind: IncidentKind;
};

export type ScoreSide = {
  side: "A" | "B";
  playerIds: string[];
  goalkeeperId: string | null;
};

export type ScoreMatch = {
  id: string;
  scoreA: number;
  scoreB: number;
  sideA: ScoreSide;
  sideB: ScoreSide;
  goals: ScoreGoal[];
  incidents?: ScoreIncident[];
  mvpPlayerId: string | null;
};

/** Whole-day per-player totals from the quick "enter results" flow. */
export type ScoreDayStats = {
  playerId: string;
  goals: number;
  /** Penalty goals: worth `penaltyGoalPts` instead of `goalPts`, no assist. */
  penaltyGoals: number;
  assists: number;
  penaltiesMissed: number;
  penaltiesSaved: number;
  ownGoals: number;
  handballs: number;
  cleanSheets: number;
  /** Explicit hat-trick bonuses (cannot be derived from day totals). */
  hatTricks: number;
  mvps: number;
};

export type ScoreMatchdayInput = {
  matchdayId: string;
  seasonId: string;
  ruleSetId: string;
  attendeePlayerIds: string[];
  matches: ScoreMatch[];
  /** Optional per-player day totals, scored in addition to `matches`. */
  dayStats?: ScoreDayStats[];
};

export type ComputedPointRow = {
  seasonId: string;
  matchdayId: string;
  matchId: string | null;
  playerId: string;
  kind: PointKind;
  points: number;
  sourceRef: string | null;
  ruleSetId: string;
};
