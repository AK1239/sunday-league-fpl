import { describe, expect, it } from "vitest";
import { scoreManagerWithNoTeam, scoreManagers } from "./manager-score";
import type {
  ManagerScoringRules,
  TeamForManagerScoring,
} from "./manager-types";

const rules: ManagerScoringRules = {
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
  captainMultiplier: 200,
  viceCaptainMultiplier: 150,
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
    const attended = new Set(["p1", "p2", "p3"]);

    const [result] = scoreManagers(rules, playerPoints, attended, [team]);
    expect(result.squadPoints).toBe(10 * 2 + Math.round(4 * 1.5));
    expect(result.transferPenalty).toBe(0);
    expect(result.totalPoints).toBe(result.squadPoints);
    expect(result.multiplierPlayerId).toBe("p1");
    const captainLine = result.lines.find((l) => l.playerId === "p1");
    expect(captainLine).toMatchObject({
      basePoints: 10,
      multiplier: 2,
      points: 20,
    });
    expect(result.captainMultiplierPlayerId).toBe("p1");
    expect(result.viceCaptainMultiplierPlayerId).toBe("p2");
    const viceLine = result.lines.find((l) => l.playerId === "p2");
    expect(viceLine).toMatchObject({
      basePoints: 4,
      multiplier: 1.5,
      points: 6,
    });
  });

  it("uses vice 1.5× when captain did not attend but vice did", () => {
    const playerPoints = new Map([
      ["p1", 0],
      ["p2", 6],
      ["p3", 0],
      ["p4", 0],
      ["p5", 0],
    ]);
    const attended = new Set(["p2"]);

    const [result] = scoreManagers(rules, playerPoints, attended, [team]);
    expect(result.multiplierPlayerId).toBe("p2");
    expect(result.captainMultiplierPlayerId).toBeNull();
    expect(result.viceCaptainMultiplierPlayerId).toBe("p2");
    expect(result.totalPoints).toBe(Math.round(6 * 1.5));
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
    expect(result.captainMultiplierPlayerId).toBeNull();
    expect(result.viceCaptainMultiplierPlayerId).toBeNull();
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
      squadPoints: 0,
      transferPenalty: 0,
      totalPoints: 0,
      multiplierPlayerId: null,
      captainMultiplierPlayerId: null,
      viceCaptainMultiplierPlayerId: null,
      teamSource: "none",
      lines: [],
      chipCode: null,
      chipBonus: 0,
    });
  });

  it("applies transfer penalty after squad subtotal (stages 5–6)", () => {
    const playerPoints = new Map([
      ["p1", 10],
      ["p2", 0],
      ["p3", 0],
      ["p4", 0],
      ["p5", 0],
    ]);
    const attended = new Set(["p1"]);
    const penalties = new Map([["m1", -8]]);

    const [result] = scoreManagers(
      rules,
      playerPoints,
      attended,
      [team],
      penalties,
    );
    expect(result.squadPoints).toBe(20);
    expect(result.transferPenalty).toBe(-8);
    expect(result.totalPoints).toBe(12);
  });

  it("allows negative matchday totals (D4)", () => {
    const playerPoints = new Map<string, number>();
    const attended = new Set<string>();
    const penalties = new Map([["m1", -8]]);

    const [result] = scoreManagers(
      rules,
      playerPoints,
      attended,
      [team],
      penalties,
    );
    expect(result.squadPoints).toBe(0);
    expect(result.totalPoints).toBe(-8);
  });
});
