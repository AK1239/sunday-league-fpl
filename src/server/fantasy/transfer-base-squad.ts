import {
  compareMatchdaysChronologically,
  isMatchdayBefore,
  isPermanentSubmittedTeam,
  type MatchdayTimelineEntry,
  type SubmittedFantasyTeam,
} from "./effective-team";

/** Squad at the start of a transfer window (excludes any pick on the target gameweek). */
export function resolveBaseSquadPlayerIds(
  managerId: string,
  targetMatchday: MatchdayTimelineEntry,
  submittedTeams: readonly SubmittedFantasyTeam[],
): readonly string[] | null {
  const prior = submittedTeams
    .filter(
      (t) =>
        t.managerId === managerId &&
        (t.source === "manual" || t.source === "admin") &&
        isPermanentSubmittedTeam(t) &&
        isMatchdayBefore(t.matchday, targetMatchday),
    )
    .sort((a, b) =>
      compareMatchdaysChronologically(b.matchday, a.matchday),
    )[0];

  return prior?.playerIds ?? null;
}

export function hasPriorSubmittedSquadInSeason(
  managerId: string,
  targetMatchday: MatchdayTimelineEntry,
  submittedTeams: readonly SubmittedFantasyTeam[],
): boolean {
  return resolveBaseSquadPlayerIds(managerId, targetMatchday, submittedTeams) != null;
}
