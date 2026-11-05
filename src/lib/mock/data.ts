export type StandingSort =
  "points" | "goals" | "assists" | "appearances" | "average";

export type MockPlayer = {
  id: string;
  displayName: string;
  nickname?: string;
  avatarUrl?: string;
};

export type MockStandingRow = {
  player: MockPlayer;
  rank: number;
  rankDelta: number;
  points: number;
  goals: number;
  assists: number;
  appearances: number;
  wins: number;
  averagePoints: number;
};

export type MockMatchResult = {
  id: string;
  teamA: { name: string; score: number };
  teamB: { name: string; score: number };
  mvpPlayerId: string;
};

export type MockMatchday = {
  id: string;
  number: number;
  playedOn: string;
  matches: MockMatchResult[];
  playerOfWeekId: string;
};

export type MockSeason = {
  id: string;
  name: string;
  startsOn: string;
  endsOn: string;
  daysRemaining: number;
};

export type MockAchievement = {
  id: string;
  label: string;
  playerId: string;
  detail: string;
};

export const MOCK_SEASON: MockSeason = {
  id: "season-1",
  name: "Season 1 · Nov 2026 – Jan 2027",
  startsOn: "2026-11-01",
  endsOn: "2027-01-31",
  daysRemaining: 87,
};

export const MOCK_PLAYERS: MockPlayer[] = [
  { id: "akil", displayName: "Akil M.", nickname: "AK" },
  { id: "juma", displayName: "Juma Hassan" },
  { id: "david", displayName: "David K." },
  { id: "omar", displayName: "Omar Said" },
  { id: "kelvin", displayName: "Kelvin N." },
  { id: "michael", displayName: "Michael T." },
  { id: "raj", displayName: "Raj P." },
  { id: "sam", displayName: "Samuel L." },
  { id: "yusuf", displayName: "Yusuf A." },
  { id: "eric", displayName: "Eric B." },
  { id: "ian", displayName: "Ian C." },
  { id: "peter", displayName: "Peter M." },
  { id: "hassan", displayName: "Hassan R." },
  { id: "leo", displayName: "Leo F." },
  { id: "ben", displayName: "Ben W." },
];

const STANDINGS_BASE: Omit<MockStandingRow, "player" | "rank" | "rankDelta">[] =
  [
    {
      points: 142,
      goals: 18,
      assists: 9,
      appearances: 8,
      wins: 11,
      averagePoints: 17.8,
    },
    {
      points: 138,
      goals: 16,
      assists: 12,
      appearances: 8,
      wins: 10,
      averagePoints: 17.3,
    },
    {
      points: 131,
      goals: 14,
      assists: 8,
      appearances: 7,
      wins: 9,
      averagePoints: 18.7,
    },
    {
      points: 118,
      goals: 12,
      assists: 6,
      appearances: 8,
      wins: 8,
      averagePoints: 14.8,
    },
    {
      points: 112,
      goals: 11,
      assists: 7,
      appearances: 7,
      wins: 7,
      averagePoints: 16.0,
    },
    {
      points: 105,
      goals: 10,
      assists: 5,
      appearances: 8,
      wins: 6,
      averagePoints: 13.1,
    },
    {
      points: 98,
      goals: 9,
      assists: 4,
      appearances: 6,
      wins: 6,
      averagePoints: 16.3,
    },
    {
      points: 94,
      goals: 8,
      assists: 6,
      appearances: 7,
      wins: 5,
      averagePoints: 13.4,
    },
    {
      points: 88,
      goals: 7,
      assists: 5,
      appearances: 7,
      wins: 4,
      averagePoints: 12.6,
    },
    {
      points: 81,
      goals: 6,
      assists: 3,
      appearances: 6,
      wins: 4,
      averagePoints: 13.5,
    },
    {
      points: 76,
      goals: 5,
      assists: 4,
      appearances: 6,
      wins: 3,
      averagePoints: 12.7,
    },
    {
      points: 68,
      goals: 4,
      assists: 2,
      appearances: 5,
      wins: 3,
      averagePoints: 13.6,
    },
    {
      points: 59,
      goals: 3,
      assists: 2,
      appearances: 5,
      wins: 2,
      averagePoints: 11.8,
    },
    {
      points: 52,
      goals: 2,
      assists: 1,
      appearances: 4,
      wins: 2,
      averagePoints: 13.0,
    },
    {
      points: 41,
      goals: 1,
      assists: 1,
      appearances: 3,
      wins: 1,
      averagePoints: 13.7,
    },
  ];

const RANK_DELTAS = [0, 2, -1, 1, 0, -2, 3, 0, -1, 1, 0, 0, -1, 2, 0];

export function getMockStandings(
  sort: StandingSort = "points",
): MockStandingRow[] {
  const rows: MockStandingRow[] = MOCK_PLAYERS.map((player, index) => ({
    player,
    rank: index + 1,
    rankDelta: RANK_DELTAS[index] ?? 0,
    ...STANDINGS_BASE[index]!,
  }));

  const sorters: Record<
    StandingSort,
    (a: MockStandingRow, b: MockStandingRow) => number
  > = {
    points: (a, b) => b.points - a.points,
    goals: (a, b) => b.goals - a.goals || b.points - a.points,
    assists: (a, b) => b.assists - a.assists || b.points - a.points,
    appearances: (a, b) => b.appearances - a.appearances || b.points - a.points,
    average: (a, b) => b.averagePoints - a.averagePoints || b.points - a.points,
  };

  const sorted = [...rows].sort(sorters[sort]);
  return sorted.map((row, index) => ({ ...row, rank: index + 1 }));
}

export const MOCK_LATEST_MATCHDAY: MockMatchday = {
  id: "md-8",
  number: 8,
  playedOn: "2026-11-02",
  playerOfWeekId: "juma",
  matches: [
    {
      id: "m1",
      teamA: { name: "Red", score: 3 },
      teamB: { name: "Blue", score: 2 },
      mvpPlayerId: "akil",
    },
    {
      id: "m2",
      teamA: { name: "Green", score: 1 },
      teamB: { name: "Yellow", score: 1 },
      mvpPlayerId: "david",
    },
    {
      id: "m3",
      teamA: { name: "Red", score: 4 },
      teamB: { name: "Green", score: 3 },
      mvpPlayerId: "juma",
    },
  ],
};

export const MOCK_ACHIEVEMENTS: MockAchievement[] = [
  {
    id: "a1",
    label: "Hat-trick hero",
    playerId: "juma",
    detail: "Matchday 8 · Match 3",
  },
  {
    id: "a2",
    label: "Player of the Week",
    playerId: "juma",
    detail: "Matchday 8",
  },
  {
    id: "a3",
    label: "Clean sheet",
    playerId: "kelvin",
    detail: "Matchday 8 · Match 2",
  },
];

export type MockPlayerProfile = {
  player: MockPlayer;
  rank: number;
  points: number;
  appearances: number;
  goals: number;
  assists: number;
  wins: number;
  winRate: number;
  averagePoints: number;
  mvpCount: number;
  form: number[];
  recentMatches: {
    matchday: number;
    date: string;
    points: number;
    summary: string;
  }[];
  awards: string[];
};

export function getMockPlayer(id: string): MockPlayerProfile | undefined {
  const standings = getMockStandings();
  const row = standings.find((r) => r.player.id === id);
  const player = MOCK_PLAYERS.find((p) => p.id === id);
  if (!row || !player) return undefined;

  const formByPlayer: Record<string, number[]> = {
    akil: [22, 18, 24, 16, 20],
    juma: [19, 26, 21, 23, 28],
    david: [15, 17, 14, 18, 16],
  };

  return {
    player,
    rank: row.rank,
    points: row.points,
    appearances: row.appearances,
    goals: row.goals,
    assists: row.assists,
    wins: row.wins,
    winRate: row.appearances
      ? Math.round((row.wins / row.appearances) * 100)
      : 0,
    averagePoints: row.averagePoints,
    mvpCount: id === "juma" ? 4 : id === "akil" ? 3 : 1,
    form: formByPlayer[id] ?? [12, 14, 10, 15, 13],
    recentMatches: [
      {
        matchday: 8,
        date: "2026-11-02",
        points: 26,
        summary: "2G · 1A · MVP · Win",
      },
      {
        matchday: 7,
        date: "2026-10-26",
        points: 21,
        summary: "1G · Win · Attendance",
      },
      { matchday: 6, date: "2026-10-19", points: 19, summary: "1A · Draw" },
    ],
    awards:
      id === "juma"
        ? ["Golden Boot leader", "Player of the Week ×2"]
        : id === "akil"
          ? ["Most wins"]
          : [],
  };
}

export function getPlayerById(id: string): MockPlayer | undefined {
  return MOCK_PLAYERS.find((p) => p.id === id);
}

export function getGoldenBootLeader(): MockStandingRow {
  return [...getMockStandings("goals")].sort((a, b) => b.goals - a.goals)[0]!;
}

export function getPlaymakerLeader(): MockStandingRow {
  return [...getMockStandings("assists")].sort(
    (a, b) => b.assists - a.assists,
  )[0]!;
}
