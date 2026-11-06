import type {
  GoalDraft,
  IncidentDraft,
  MatchDraftInput,
} from "./match-entry-types";

export type ValidateMatchDraftResult =
  { ok: true } | { ok: false; code: string; message: string };

export function validateMatchDraft(
  draft: MatchDraftInput,
  attendeeIds: readonly string[],
): ValidateMatchDraftResult {
  if (draft.matchNo < 1) {
    return { ok: false, code: "MATCH_NO", message: "Invalid match number." };
  }
  if (draft.scoreA < 0 || draft.scoreB < 0) {
    return { ok: false, code: "SCORE", message: "Scores cannot be negative." };
  }

  const sideA = new Set(draft.sideAPlayerIds);
  const sideB = new Set(draft.sideBPlayerIds);

  if (sideA.size !== draft.sideAPlayerIds.length) {
    return {
      ok: false,
      code: "DUPLICATE",
      message: "Duplicate players on side A.",
    };
  }
  if (sideB.size !== draft.sideBPlayerIds.length) {
    return {
      ok: false,
      code: "DUPLICATE",
      message: "Duplicate players on side B.",
    };
  }

  for (const id of sideA) {
    if (sideB.has(id)) {
      return {
        ok: false,
        code: "OVERLAP",
        message: "A player cannot be on both sides.",
      };
    }
  }

  const allParticipants = [...draft.sideAPlayerIds, ...draft.sideBPlayerIds];
  const hasLineup = allParticipants.length > 0;
  const attendees = new Set(attendeeIds);

  if (hasLineup) {
    for (const playerId of allParticipants) {
      if (!attendees.has(playerId)) {
        return {
          ok: false,
          code: "NOT_ATTENDING",
          message:
            "All match players must be marked as attending the matchday.",
        };
      }
    }
  }

  if (draft.sideAGoalkeeperId && !sideA.has(draft.sideAGoalkeeperId)) {
    return {
      ok: false,
      code: "GK",
      message: "Side A goalkeeper must be on side A.",
    };
  }
  if (draft.sideBGoalkeeperId && !sideB.has(draft.sideBGoalkeeperId)) {
    return {
      ok: false,
      code: "GK",
      message: "Side B goalkeeper must be on side B.",
    };
  }

  if (draft.mvpPlayerId) {
    const mvpOk = sideA.has(draft.mvpPlayerId) || sideB.has(draft.mvpPlayerId);
    if (!mvpOk) {
      return {
        ok: false,
        code: "MVP",
        message: "MVP must be a player in this match.",
      };
    }
  }

  for (const goal of draft.goals) {
    const goalCheck = validateGoal(goal, sideA, sideB);
    if (!goalCheck.ok) return goalCheck;
  }

  for (const incident of draft.incidents ?? []) {
    const incidentCheck = validateIncident(incident, sideA, sideB);
    if (!incidentCheck.ok) return incidentCheck;
  }

  if (hasLineup || draft.scoreA > 0 || draft.scoreB > 0) {
    const goalsA = draft.goals.filter((g) => g.side === "A").length;
    const goalsB = draft.goals.filter((g) => g.side === "B").length;
    if (goalsA !== draft.scoreA || goalsB !== draft.scoreB) {
      return {
        ok: false,
        code: "GOAL_COUNT",
        message: "Goal events must match the entered score.",
      };
    }
  }

  return { ok: true };
}

function validateIncident(
  incident: IncidentDraft,
  sideA: Set<string>,
  sideB: Set<string>,
): ValidateMatchDraftResult {
  const sideSet = incident.side === "A" ? sideA : sideB;
  if (!sideSet.has(incident.playerId)) {
    return {
      ok: false,
      code: "INCIDENT",
      message:
        "Incidents (penalty save, miss, handball) must name a player on that side.",
    };
  }
  return { ok: true };
}

function validateGoal(
  goal: GoalDraft,
  sideA: Set<string>,
  sideB: Set<string>,
): ValidateMatchDraftResult {
  const kind = goal.kind ?? "open_play";

  if (kind === "own_goal") {
    // The credited side is `goal.side`; the scorer plays for the other team.
    const conceding = goal.side === "A" ? sideB : sideA;
    if (!conceding.has(goal.scorerId)) {
      return {
        ok: false,
        code: "OWN_GOAL",
        message: "An own goal must be scored by a player on the other side.",
      };
    }
    if (goal.assistId) {
      return {
        ok: false,
        code: "ASSIST",
        message: "An own goal cannot have an assist.",
      };
    }
    return { ok: true };
  }

  if (kind === "penalty" && goal.assistId) {
    return {
      ok: false,
      code: "ASSIST",
      message: "A penalty cannot have an assist.",
    };
  }

  const sideSet = goal.side === "A" ? sideA : sideB;
  if (!sideSet.has(goal.scorerId)) {
    return {
      ok: false,
      code: "SCORER",
      message: "Each scorer must be on the scoring side.",
    };
  }
  if (goal.assistId) {
    if (goal.assistId === goal.scorerId) {
      return {
        ok: false,
        code: "ASSIST",
        message: "Assist cannot be the same as scorer.",
      };
    }
    const participants = new Set([...sideA, ...sideB]);
    if (!participants.has(goal.assistId)) {
      return {
        ok: false,
        code: "ASSIST",
        message: "Assist must be a player in this match.",
      };
    }
  }
  return { ok: true };
}
