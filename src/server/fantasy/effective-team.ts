import type { ManagerTeamSource } from "@/server/scoring/manager-types";

export type SquadKind = "permanent" | "free_hit";

export type MatchdayTimelineEntry = {
  matchdayId: string;
  playedOn: string;
  number: number;
  seasonStartsOn: string;
};

export type SubmittedFantasyTeam = {
  managerId: string;
  matchday: MatchdayTimelineEntry;
  source: "manual" | "admin" | "carry_over";
  captainPlayerId: string;
  viceCaptainPlayerId: string;
  playerIds: readonly string[];
  /** Defaults to permanent when omitted (pre-chips rows). */
  squadKind?: SquadKind;
  /** Bench Boost extras (pre-chips rows: omit). */
  reservePlayerIds?: readonly string[];
};

export function submittedSquadKind(team: SubmittedFantasyTeam): SquadKind {
  return team.squadKind ?? "permanent";
}

export function isPermanentSubmittedTeam(team: SubmittedFantasyTeam): boolean {
  return submittedSquadKind(team) === "permanent";
}

function isSubmittedPickSource(source: SubmittedFantasyTeam["source"]): boolean {
  return source === "manual" || source === "admin";
}

export type EffectiveFantasyTeam = {
  managerId: string;
  captainPlayerId: string;
  viceCaptainPlayerId: string;
  playerIds: readonly string[];
  teamSource: Exclude<ManagerTeamSource, "none">;
  squadKind: SquadKind;
  reservePlayerIds: readonly string[];
};

export function compareMatchdaysChronologically(
  a: MatchdayTimelineEntry,
  b: MatchdayTimelineEntry,
): number {
  const played = a.playedOn.localeCompare(b.playedOn);
  if (played !== 0) return played;
  const season = a.seasonStartsOn.localeCompare(b.seasonStartsOn);
  if (season !== 0) return season;
  return a.number - b.number;
}

export function isMatchdayBefore(
  earlier: MatchdayTimelineEntry,
  later: MatchdayTimelineEntry,
): boolean {
  return compareMatchdaysChronologically(earlier, later) < 0;
}

export function resolveEffectiveTeam(
  managerId: string,
  targetMatchday: MatchdayTimelineEntry,
  submittedTeams: readonly SubmittedFantasyTeam[],
): EffectiveFantasyTeam | null {
  const forManager = submittedTeams.filter((t) => t.managerId === managerId);

  const onMatchday = forManager.find(
    (t) =>
      t.matchday.matchdayId === targetMatchday.matchdayId &&
      isSubmittedPickSource(t.source),
  );
  if (onMatchday) {
    return {
      managerId,
      captainPlayerId: onMatchday.captainPlayerId,
      viceCaptainPlayerId: onMatchday.viceCaptainPlayerId,
      playerIds: onMatchday.playerIds,
      teamSource: onMatchday.source,
      squadKind: submittedSquadKind(onMatchday),
      reservePlayerIds: onMatchday.reservePlayerIds ?? [],
    };
  }

  const priorManual = forManager
    .filter(
      (t) =>
        isSubmittedPickSource(t.source) &&
        isPermanentSubmittedTeam(t) &&
        isMatchdayBefore(t.matchday, targetMatchday),
    )
    .sort((a, b) => compareMatchdaysChronologically(b.matchday, a.matchday))[0];

  if (!priorManual) return null;

  return {
    managerId,
    captainPlayerId: priorManual.captainPlayerId,
    viceCaptainPlayerId: priorManual.viceCaptainPlayerId,
    playerIds: priorManual.playerIds,
    teamSource: "carry_over",
    squadKind: "permanent",
    reservePlayerIds: [],
  };
}
