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
  | "penalty_missed";

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

export type ScoreMatchdayInput = {
  matchdayId: string;
  seasonId: string;
  ruleSetId: string;
  attendeePlayerIds: string[];
  matches: ScoreMatch[];
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
