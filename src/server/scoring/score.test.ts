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
  penaltyGoalPts: 3,
  penaltySavedPts: 5,
  ownGoalPts: -2,
  handballPts: -2,
  penaltyMissedPts: -2,
  hatTrickPts: 5,
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

  describe("penalties, own goals and handballs", () => {
    const two = {
      sideA: {
        side: "A" as const,
        playerIds: ["p1", "p3"],
        goalkeeperId: "p3",
      },
      sideB: {
        side: "B" as const,
        playerIds: ["p2", "p4"],
        goalkeeperId: null,
      },
    };

    it("a penalty goal is worth penaltyGoalPts instead of goalPts, with no assist", () => {
      const rows = scoreMatchday(DEFAULT_RULES, {
        ...BASE,
        attendeePlayerIds: ["p1", "p2", "p3", "p4"],
        matches: [
          match({
            id: "m1",
            ...two,
            scoreA: 1,
            goals: [
              { id: "g1", scorerId: "p1", assistId: "p3", kind: "penalty" },
            ],
          }),
        ],
      });
      const goal = rows.find((r) => r.kind === "goal" && r.playerId === "p1");
      expect(goal?.points).toBe(3);
      expect(rows.some((r) => r.kind === "assist")).toBe(false);
    });

    it("an own goal costs the scorer ownGoalPts and gives nobody goal points", () => {
      // p4 (side B) puts it in his own net: side A is credited 1-0.
      const rows = scoreMatchday(DEFAULT_RULES, {
        ...BASE,
        attendeePlayerIds: ["p1", "p2", "p3", "p4"],
        matches: [
          match({
            id: "m1",
            ...two,
            scoreA: 1,
            goals: [
              { id: "g1", scorerId: "p4", assistId: null, kind: "own_goal" },
            ],
          }),
        ],
      });
      const og = rows.filter((r) => r.kind === "own_goal");
      expect(og).toHaveLength(1);
      expect(og[0]).toMatchObject({ playerId: "p4", points: -2 });
      expect(rows.some((r) => r.kind === "goal")).toBe(false);
      // Side A still wins on the scoreline.
      expect(
        rows
          .filter((r) => r.kind === "win")
          .map((r) => r.playerId)
          .sort(),
      ).toEqual(["p1", "p3"]);
    });

    it("penalty saved, penalty missed and handball award / deduct their points", () => {
      const rows = scoreMatchday(DEFAULT_RULES, {
        ...BASE,
        attendeePlayerIds: ["p1", "p2", "p3", "p4"],
        matches: [
          match({
            id: "m1",
            ...two,
            incidents: [
              { id: "i1", playerId: "p3", kind: "penalty_saved" },
              { id: "i2", playerId: "p1", kind: "penalty_missed" },
              { id: "i3", playerId: "p4", kind: "handball_blocked" },
            ],
          }),
        ],
      });
      expect(rows.find((r) => r.kind === "penalty_saved")).toMatchObject({
        playerId: "p3",
        points: 5,
      });
      expect(rows.find((r) => r.kind === "penalty_missed")).toMatchObject({
        playerId: "p1",
        points: -2,
      });
      expect(rows.find((r) => r.kind === "handball")).toMatchObject({
        playerId: "p4",
        points: -2,
      });
    });

    it("an own goal still breaks the opposing keeper's clean sheet", () => {
      const rows = scoreMatchday(DEFAULT_RULES, {
        ...BASE,
        attendeePlayerIds: ["p1", "p2", "p3", "p4"],
        matches: [
          match({
            id: "m1",
            ...two,
            sideB: { side: "B", playerIds: ["p2", "p4"], goalkeeperId: "p4" },
            scoreA: 1,
            goals: [
              { id: "g1", scorerId: "p4", assistId: null, kind: "own_goal" },
            ],
          }),
        ],
      });
      expect(
        rows.some((r) => r.kind === "clean_sheet" && r.playerId === "p4"),
      ).toBe(false);
    });
  });

  it("awards a hat-trick bonus when a player scores 3+ goals in one match", () => {
    const rows = scoreMatchday(DEFAULT_RULES, {
      ...BASE,
      attendeePlayerIds: ["p1", "p2"],
      matches: [
        match({
          id: "m1",
          scoreA: 3,
          scoreB: 0,
          sideA: { side: "A", playerIds: ["p1"], goalkeeperId: null },
          sideB: { side: "B", playerIds: ["p2"], goalkeeperId: null },
          goals: [
            { id: "g1", scorerId: "p1", assistId: null },
            { id: "g2", scorerId: "p1", assistId: null },
            { id: "g3", scorerId: "p1", assistId: null },
          ],
        }),
      ],
    });
    expect(rows.filter((r) => r.kind === "goal" && r.playerId === "p1")).toHaveLength(
      3,
    );
    expect(rows.find((r) => r.kind === "hat_trick" && r.playerId === "p1")).toMatchObject({
      points: 5,
      matchId: "m1",
    });
  });

  it("scores win points for every player on the smaller side in a 5v4", () => {
    const rows = scoreMatchday(DEFAULT_RULES, {
      ...BASE,
      attendeePlayerIds: ["a1", "a2", "a3", "a4", "a5", "b1", "b2", "b3", "b4"],
      matches: [
        match({
          id: "m1",
          scoreA: 2,
          scoreB: 1,
          sideA: {
            side: "A",
            playerIds: ["a1", "a2", "a3", "a4", "a5"],
            goalkeeperId: null,
          },
          sideB: {
            side: "B",
            playerIds: ["b1", "b2", "b3", "b4"],
            goalkeeperId: null,
          },
          goals: [
            { id: "g1", scorerId: "a1", assistId: null },
            { id: "g2", scorerId: "a2", assistId: null },
            { id: "g3", scorerId: "b1", assistId: null },
          ],
        }),
      ],
    });
    const winsA = rows.filter((r) => r.kind === "win" && r.playerId.startsWith("a"));
    const winsB = rows.filter((r) => r.kind === "win" && r.playerId.startsWith("b"));
    expect(winsA).toHaveLength(5);
    expect(winsB).toHaveLength(0);
    expect(winsA.every((r) => r.points === DEFAULT_RULES.winPts)).toBe(true);
  });

  it("does not count own goals toward a hat-trick", () => {
    const rows = scoreMatchday(DEFAULT_RULES, {
      ...BASE,
      attendeePlayerIds: ["p1", "p2"],
      matches: [
        match({
          id: "m1",
          scoreA: 2,
          scoreB: 0,
          sideA: { side: "A", playerIds: ["p1"], goalkeeperId: null },
          sideB: { side: "B", playerIds: ["p2"], goalkeeperId: null },
          goals: [
            { id: "g1", scorerId: "p1", assistId: null },
            { id: "g2", scorerId: "p1", assistId: null },
            { id: "g3", scorerId: "p2", assistId: null, kind: "own_goal" },
          ],
        }),
      ],
    });
    expect(rows.some((r) => r.kind === "hat_trick")).toBe(false);
  });
});
