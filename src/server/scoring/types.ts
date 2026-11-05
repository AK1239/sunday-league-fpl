export type PointKind =
  "attendance" | "win" | "draw" | "goal" | "assist" | "mvp" | "clean_sheet";

export type ScoringRules = {
  attendancePts: number;
  winPts: number;
  drawPts: number;
  goalPts: number;
  assistPts: number;
  mvpPts: number;
  cleanSheetPts: number;
};

export type ScoreGoal = {
  id: string;
  scorerId: string;
  assistId: string | null;
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
