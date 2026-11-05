import { describe, expect, it } from "vitest";
import { scoreMatchday } from "./score";
import type { ScoreMatch, ScoreMatchdayInput, ScoringRules } from "./types";

const DEFAULT_RULES: ScoringRules = {
  attendancePts: 2,
  winPts: 3,
  drawPts: 1,
  goalPts: 5,
  assistPts: 3,
  mvpPts: 3,
  cleanSheetPts: 4,
};

const BASE: Omit<ScoreMatchdayInput, "matches" | "attendeePlayerIds"> = {
  matchdayId: "md-1",
  seasonId: "season-1",
  ruleSetId: "rules-1",
};

function match(
  overrides: Partial<ScoreMatch> & Pick<ScoreMatch, "id">,
): ScoreMatch {
  return {
    scoreA: 0,
    scoreB: 0,
    sideA: { side: "A", playerIds: ["p1"], goalkeeperId: null },
    sideB: { side: "B", playerIds: ["p2"], goalkeeperId: null },
    goals: [],
    mvpPlayerId: null,
    ...overrides,
  };
}

function sumPoints(rows: ReturnType<typeof scoreMatchday>, playerId: string) {
  return rows
    .filter((row) => row.playerId === playerId)
    .reduce((total, row) => total + row.points, 0);
}

describe("scoreMatchday", () => {
  it("awards attendance once per matchday per attendee", () => {
    const rows = scoreMatchday(DEFAULT_RULES, {
      ...BASE,
      attendeePlayerIds: ["p1", "p2"],
      matches: [
        match({
          id: "m1",
          scoreA: 1,
          scoreB: 0,
          sideA: { side: "A", playerIds: ["p1"], goalkeeperId: null },
          sideB: { side: "B", playerIds: ["p2"], goalkeeperId: null },
          goals: [{ id: "g1", scorerId: "p1", assistId: null }],
        }),
      ],
    });

    const attendance = rows.filter((row) => row.kind === "attendance");
    expect(attendance).toHaveLength(2);
    expect(attendance.every((row) => row.points === 2)).toBe(true);
    expect(attendance.every((row) => row.matchId === null)).toBe(true);
  });

  it("awards win and draw points per match", () => {
    const rows = scoreMatchday(DEFAULT_RULES, {
      ...BASE,
      attendeePlayerIds: ["p1", "p2", "p3", "p4"],
      matches: [
        match({
          id: "m1",
          scoreA: 2,
          scoreB: 1,
          sideA: { side: "A", playerIds: ["p1"], goalkeeperId: null },
          sideB: { side: "B", playerIds: ["p2"], goalkeeperId: null },
          goals: [],
        }),
        match({
          id: "m2",
          scoreA: 0,
          scoreB: 0,
          sideA: { side: "A", playerIds: ["p3"], goalkeeperId: "p3" },
          sideB: { side: "B", playerIds: ["p4"], goalkeeperId: "p4" },
          goals: [],
        }),
      ],
    });

    expect(rows.filter((row) => row.kind === "win")).toHaveLength(1);
    expect(rows.filter((row) => row.kind === "draw")).toHaveLength(2);
  });

  it("awards goal, assist, and mvp points", () => {
    const rows = scoreMatchday(DEFAULT_RULES, {
      ...BASE,
      attendeePlayerIds: ["p1", "p2"],
      matches: [
        match({
          id: "m1",
          scoreA: 1,
          scoreB: 0,
          sideA: { side: "A", playerIds: ["p1", "p2"], goalkeeperId: null },
          sideB: { side: "B", playerIds: ["p3"], goalkeeperId: null },
          goals: [{ id: "g1", scorerId: "p1", assistId: "p2" }],
          mvpPlayerId: "p1",
        }),
      ],
    });

    expect(
      rows.find((row) => row.kind === "goal" && row.playerId === "p1")?.points,
    ).toBe(5);
    expect(
      rows.find((row) => row.kind === "assist" && row.playerId === "p2")
        ?.points,
    ).toBe(3);
    expect(
      rows.find((row) => row.kind === "mvp" && row.playerId === "p1")?.points,
    ).toBe(3);
  });

  it("awards clean sheets to recorded goalkeepers when opponent scores zero", () => {
    const rows = scoreMatchday(DEFAULT_RULES, {
      ...BASE,
      attendeePlayerIds: ["gk-a", "gk-b"],
      matches: [
        match({
          id: "m1",
          scoreA: 0,
          scoreB: 0,
          sideA: { side: "A", playerIds: ["gk-a"], goalkeeperId: "gk-a" },
          sideB: { side: "B", playerIds: ["gk-b"], goalkeeperId: "gk-b" },
          goals: [],
        }),
      ],
    });

    const cleanSheets = rows.filter((row) => row.kind === "clean_sheet");
    expect(cleanSheets).toHaveLength(2);
    expect(cleanSheets.map((row) => row.playerId).sort()).toEqual([
      "gk-a",
      "gk-b",
    ]);
  });

  it("does not award clean sheet when goalkeeper is not recorded", () => {
    const rows = scoreMatchday(DEFAULT_RULES, {
      ...BASE,
      attendeePlayerIds: ["p1", "p2"],
      matches: [
        match({
          id: "m1",
          scoreA: 1,
          scoreB: 0,
          sideA: { side: "A", playerIds: ["p1"], goalkeeperId: null },
          sideB: { side: "B", playerIds: ["p2"], goalkeeperId: null },
          goals: [{ id: "g1", scorerId: "p1", assistId: null }],
        }),
      ],
    });

    expect(rows.some((row) => row.kind === "clean_sheet")).toBe(false);
  });

  it("scores players independently when they switch sides between matches", () => {
    const rows = scoreMatchday(DEFAULT_RULES, {
      ...BASE,
      attendeePlayerIds: ["p1", "p2", "p3"],
      matches: [
        match({
          id: "m1",
          scoreA: 2,
          scoreB: 0,
          sideA: { side: "A", playerIds: ["p1"], goalkeeperId: null },
          sideB: { side: "B", playerIds: ["p2"], goalkeeperId: null },
          goals: [],
        }),
        match({
          id: "m2",
          scoreA: 0,
          scoreB: 1,
          sideA: { side: "A", playerIds: ["p2"], goalkeeperId: null },
          sideB: { side: "B", playerIds: ["p1"], goalkeeperId: null },
          goals: [],
        }),
      ],
    });

    expect(sumPoints(rows, "p1")).toBe(2 + 3 + 3);
    expect(sumPoints(rows, "p2")).toBe(2);
  });

  it("uses goal id as sourceRef for goals and assists", () => {
    const rows = scoreMatchday(DEFAULT_RULES, {
      ...BASE,
      attendeePlayerIds: ["p1", "p2"],
      matches: [
        match({
          id: "m1",
          scoreA: 1,
          scoreB: 0,
          goals: [{ id: "goal-uuid", scorerId: "p1", assistId: "p2" }],
        }),
      ],
    });

    const goalRow = rows.find((row) => row.kind === "goal");
    const assistRow = rows.find((row) => row.kind === "assist");
    expect(goalRow?.sourceRef).toBe("goal-uuid");
    expect(assistRow?.sourceRef).toBe("goal-uuid");
  });
});
