import type {
  ComputedPointRow,
  PointKind,
  ScoreMatch,
  ScoreMatchdayInput,
  ScoringRules,
} from "./types";

type MatchOutcome = "A_WIN" | "B_WIN" | "DRAW";

function matchOutcome(match: ScoreMatch): MatchOutcome {
  if (match.scoreA > match.scoreB) return "A_WIN";
  if (match.scoreB > match.scoreA) return "B_WIN";
  return "DRAW";
}

function opponentScore(match: ScoreMatch, side: "A" | "B"): number {
  return side === "A" ? match.scoreB : match.scoreA;
}

function pushRow(
  rows: ComputedPointRow[],
  row: Omit<ComputedPointRow, "seasonId" | "matchdayId" | "ruleSetId">,
  context: Pick<ScoreMatchdayInput, "seasonId" | "matchdayId" | "ruleSetId">,
) {
  rows.push({
    seasonId: context.seasonId,
    matchdayId: context.matchdayId,
    ruleSetId: context.ruleSetId,
    ...row,
  });
}

export function scoreMatchday(
  rules: ScoringRules,
  input: ScoreMatchdayInput,
): ComputedPointRow[] {
  const rows: ComputedPointRow[] = [];
  const context = {
    seasonId: input.seasonId,
    matchdayId: input.matchdayId,
    ruleSetId: input.ruleSetId,
  };

  const attendees = new Set<string>();
  for (const playerId of input.attendeePlayerIds) {
    attendees.add(playerId);
  }
  for (const match of input.matches) {
    for (const playerId of match.sideA.playerIds) attendees.add(playerId);
    for (const playerId of match.sideB.playerIds) attendees.add(playerId);
  }

  for (const playerId of attendees) {
    pushRow(
      rows,
      {
        matchId: null,
        playerId,
        kind: "attendance",
        points: rules.attendancePts,
        sourceRef: null,
      },
      context,
    );
  }

  for (const match of input.matches) {
    const outcome = matchOutcome(match);

    for (const playerId of match.sideA.playerIds) {
      if (outcome === "A_WIN") {
        pushRow(
          rows,
          {
            matchId: match.id,
            playerId,
            kind: "win",
            points: rules.winPts,
            sourceRef: null,
          },
          context,
        );
      } else if (outcome === "DRAW") {
        pushRow(
          rows,
          {
            matchId: match.id,
            playerId,
            kind: "draw",
            points: rules.drawPts,
            sourceRef: null,
          },
          context,
        );
      }
    }

    for (const playerId of match.sideB.playerIds) {
      if (outcome === "B_WIN") {
        pushRow(
          rows,
          {
            matchId: match.id,
            playerId,
            kind: "win",
            points: rules.winPts,
            sourceRef: null,
          },
          context,
        );
      } else if (outcome === "DRAW") {
        pushRow(
          rows,
          {
            matchId: match.id,
            playerId,
            kind: "draw",
            points: rules.drawPts,
            sourceRef: null,
          },
          context,
        );
      }
    }

    if (match.sideA.goalkeeperId && opponentScore(match, "A") === 0) {
      pushRow(
        rows,
        {
          matchId: match.id,
          playerId: match.sideA.goalkeeperId,
          kind: "clean_sheet",
          points: rules.cleanSheetPts,
          sourceRef: null,
        },
        context,
      );
    }
    if (match.sideB.goalkeeperId && opponentScore(match, "B") === 0) {
      pushRow(
        rows,
        {
          matchId: match.id,
          playerId: match.sideB.goalkeeperId,
          kind: "clean_sheet",
          points: rules.cleanSheetPts,
          sourceRef: null,
        },
        context,
      );
    }

    for (const goal of match.goals) {
      const kind = goal.kind ?? "open_play";

      if (kind === "own_goal") {
        // Credited to the opposing side on the scoreline; the scorer loses points.
        pushRow(
          rows,
          {
            matchId: match.id,
            playerId: goal.scorerId,
            kind: "own_goal",
            points: rules.ownGoalPts,
            sourceRef: goal.id,
          },
          context,
        );
        continue;
      }

      // A penalty goal is worth `penaltyGoalPts` INSTEAD of `goalPts`.
      pushRow(
        rows,
        {
          matchId: match.id,
          playerId: goal.scorerId,
          kind: "goal",
          points: kind === "penalty" ? rules.penaltyGoalPts : rules.goalPts,
          sourceRef: goal.id,
        },
        context,
      );
      if (goal.assistId && kind === "open_play") {
        pushRow(
          rows,
          {
            matchId: match.id,
            playerId: goal.assistId,
            kind: "assist",
            points: rules.assistPts,
            sourceRef: goal.id,
          },
          context,
        );
      }
    }

    for (const incident of match.incidents ?? []) {
      const kind: PointKind =
        incident.kind === "penalty_saved"
          ? "penalty_saved"
          : incident.kind === "penalty_missed"
            ? "penalty_missed"
            : "handball";
      const points =
        incident.kind === "penalty_saved"
          ? rules.penaltySavedPts
          : incident.kind === "penalty_missed"
            ? rules.penaltyMissedPts
            : rules.handballPts;
      pushRow(
        rows,
        {
          matchId: match.id,
          playerId: incident.playerId,
          kind,
          points,
          sourceRef: incident.id,
        },
        context,
      );
    }

    if (match.mvpPlayerId) {
      pushRow(
        rows,
        {
          matchId: match.id,
          playerId: match.mvpPlayerId,
          kind: "mvp",
          points: rules.mvpPts,
          sourceRef: null,
        },
        context,
      );
    }
  }

  return rows;
}
