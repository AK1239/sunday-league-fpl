import type { ManagerStandingRow } from "@/server/queries/manager-standings";
import type { StandingRow } from "@/server/queries/standings";

export type SeasonAwardKind =
  | "champion"
  | "manager_champion"
  | "golden_boot"
  | "playmaker"
  | "most_appearances"
  | "most_wins";

export type SeasonAwardDraft = {
  award: SeasonAwardKind;
  playerId?: string;
  managerId?: string;
  value: number;
};

function topManager(
  rows: ManagerStandingRow[],
): ManagerStandingRow | undefined {
  return rows.find((row) => row.totalPoints > 0);
}

function topPlayerBy(
  rows: StandingRow[],
  pick: (row: StandingRow) => number,
): StandingRow | undefined {
  const sorted = [...rows].sort((a, b) => {
    const diff = pick(b) - pick(a);
    if (diff !== 0) return diff;
    if (b.points !== a.points) return b.points - a.points;
    return a.displayName.localeCompare(b.displayName);
  });
  const top = sorted[0];
  if (!top || pick(top) <= 0) return undefined;
  return top;
}

/** Pure: winners for a closed season from final standings snapshots. */
export function buildSeasonAwardDrafts(
  managerStandings: ManagerStandingRow[],
  playerStandingsByPoints: StandingRow[],
  playerStandingsByGoals: StandingRow[],
  playerStandingsByAssists: StandingRow[],
  playerStandingsByApps: StandingRow[],
  playerStandingsByWins: StandingRow[],
): SeasonAwardDraft[] {
  const drafts: SeasonAwardDraft[] = [];

  const manager = topManager(managerStandings);
  if (manager) {
    drafts.push({
      award: "manager_champion",
      managerId: manager.managerId,
      value: manager.totalPoints,
    });
  }

  const pointsLeader = topPlayerBy(
    playerStandingsByPoints,
    (row) => row.points,
  );
  if (pointsLeader) {
    drafts.push({
      award: "champion",
      playerId: pointsLeader.playerId,
      value: pointsLeader.points,
    });
  }

  const boot = topPlayerBy(playerStandingsByGoals, (row) => row.goals);
  if (boot) {
    drafts.push({
      award: "golden_boot",
      playerId: boot.playerId,
      value: boot.goals,
    });
  }

  const playmaker = topPlayerBy(playerStandingsByAssists, (row) => row.assists);
  if (playmaker) {
    drafts.push({
      award: "playmaker",
      playerId: playmaker.playerId,
      value: playmaker.assists,
    });
  }

  const apps = topPlayerBy(playerStandingsByApps, (row) => row.appearances);
  if (apps) {
    drafts.push({
      award: "most_appearances",
      playerId: apps.playerId,
      value: apps.appearances,
    });
  }

  const wins = topPlayerBy(playerStandingsByWins, (row) => row.wins);
  if (wins) {
    drafts.push({
      award: "most_wins",
      playerId: wins.playerId,
      value: wins.wins,
    });
  }

  return drafts;
}

export const AWARD_LABELS: Record<SeasonAwardKind, string> = {
  manager_champion: "Manager champion",
  champion: "Player of the season",
  golden_boot: "Golden Boot",
  playmaker: "Playmaker",
  most_appearances: "Most appearances",
  most_wins: "Most wins",
};

export function awardValueLabel(award: SeasonAwardKind, value: number): string {
  switch (award) {
    case "manager_champion":
    case "champion":
      return `${value} pts`;
    case "golden_boot":
      return `${value} goal${value === 1 ? "" : "s"}`;
    case "playmaker":
      return `${value} assist${value === 1 ? "" : "s"}`;
    case "most_appearances":
      return `${value} apps`;
    case "most_wins":
      return `${value} win${value === 1 ? "" : "s"}`;
    default:
      return String(value);
  }
}
