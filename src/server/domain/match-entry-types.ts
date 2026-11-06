export type GoalDraftKind = "open_play" | "penalty" | "own_goal";

export type GoalDraft = {
  /** For an own goal: the player who put it in (on the side OPPOSITE `side`). */
  scorerId: string;
  assistId: string | null;
  /** Side credited with the goal on the scoreline. */
  side: "A" | "B";
  /** Defaults to open play. */
  kind?: GoalDraftKind;
};

export type IncidentDraft = {
  kind: "penalty_saved" | "handball_blocked";
  /** Side of the player involved. */
  side: "A" | "B";
  playerId: string;
};

export type MatchDraftInput = {
  matchId?: string | null;
  matchNo: number;
  scoreA: number;
  scoreB: number;
  sideAPlayerIds: string[];
  sideBPlayerIds: string[];
  sideAGoalkeeperId: string | null;
  sideBGoalkeeperId: string | null;
  goals: GoalDraft[];
  incidents?: IncidentDraft[];
  mvpPlayerId: string | null;
};

export type MatchEntryPlayer = {
  id: string;
  displayName: string;
  nickname: string | null;
  avatarUrl: string | null;
};

export type MatchEntryMatch = {
  id: string;
  matchNo: number;
  scoreA: number;
  scoreB: number;
  sideAPlayerIds: string[];
  sideBPlayerIds: string[];
  sideAGoalkeeperId: string | null;
  sideBGoalkeeperId: string | null;
  goals: GoalDraft[];
  incidents: IncidentDraft[];
  mvpPlayerId: string | null;
};

export type MatchdayEntryData = {
  matchdayId: string;
  seasonId: string;
  number: number;
  playedOn: string;
  status: "scheduled" | "draft" | "published" | "cancelled";
  attendeeIds: string[];
  players: MatchEntryPlayer[];
  matches: MatchEntryMatch[];
};
