import { describe, expect, it } from "vitest";
import {
  scoreManagerWithNoTeam,
  scoreManagers,
} from "./manager-score";
import type { ManagerScoringRules, TeamForManagerScoring } from "./manager-types";

const rules: ManagerScoringRules = {
  attendancePts: 2,
  winPts: 3,
  drawPts: 1,
  goalPts: 5,
  assistPts: 3,
  mvpPts: 3,
  cleanSheetPts: 4,
  captainMultiplier: 2,
};

const team: TeamForManagerScoring = {
  managerId: "m1",
  captainPlayerId: "p1",
  viceCaptainPlayerId: "p2",
  playerIds: ["p1", "p2", "p3", "p4", "p5"],
  teamSource: "manual",
};

describe("scoreManagers", () => {
  it("doubles captain points when captain attended", () => {
    const playerPoints = new Map([
      ["p1", 10],
      ["p2", 4],
      ["p3", 0],
      ["p4", 0],
      ["p5", 0],
    ]);
    const attended = new Set(["p1", "p3"]);

    const [result] = scoreManagers(rules, playerPoints, attended, [team]);
    expect(result.totalPoints).toBe(10 * 2 + 4);
    expect(result.multiplierPlayerId).toBe("p1");
    const captainLine = result.lines.find((l) => l.playerId === "p1");
    expect(captainLine).toMatchObject({ basePoints: 10, multiplier: 2, points: 20 });
  });

  it("uses vice multiplier when captain did not attend", () => {
    const playerPoints = new Map([
      ["p1", 10],
      ["p2", 6],
      ["p3", 0],
      ["p4", 0],
      ["p5", 0],
    ]);
    const attended = new Set(["p2"]);

    const [result] = scoreManagers(rules, playerPoints, attended, [team]);
    expect(result.multiplierPlayerId).toBe("p2");
    expect(result.totalPoints).toBe(10 + 6 * 2);
  });

  it("applies no multiplier when captain and vice are absent", () => {
    const playerPoints = new Map([
      ["p1", 10],
      ["p2", 6],
      ["p3", 5],
      ["p4", 0],
      ["p5", 0],
    ]);
    const attended = new Set(["p3"]);

    const [result] = scoreManagers(rules, playerPoints, attended, [team]);
    expect(result.multiplierPlayerId).toBeNull();
    expect(result.totalPoints).toBe(10 + 6 + 5);
  });

  it("scores zero base for absent players", () => {
    const playerPoints = new Map<string, number>();
    const attended = new Set<string>();

    const [result] = scoreManagers(rules, playerPoints, attended, [team]);
    expect(result.totalPoints).toBe(0);
    expect(result.lines.every((l) => l.basePoints === 0)).toBe(true);
  });

  it("scoreManagerWithNoTeam returns none source", () => {
    expect(scoreManagerWithNoTeam("m9")).toEqual({
      managerId: "m9",
      totalPoints: 0,
      multiplierPlayerId: null,
      teamSource: "none",
      lines: [],
    });
  });
});
