export type GoalDraft = {
  scorerId: string;
  assistId: string | null;
  side: "A" | "B";
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
