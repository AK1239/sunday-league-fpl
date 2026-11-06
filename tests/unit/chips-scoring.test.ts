import { describe, expect, it } from "vitest";
import { scoreManagers } from "@/server/scoring/manager-score";
import type {
  ManagerScoringRules,
  TeamForManagerScoring,
} from "@/server/scoring/manager-types";
import type { ChipScoringInput } from "@/server/scoring/chip-effects";

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

describe("chip scoring", () => {
  it("triple captain applies ×3 to captain only", () => {
    const playerPoints = new Map([
      ["p1", 10],
      ["p2", 4],
      ["p3", 0],
      ["p4", 0],
      ["p5", 0],
    ]);
    const attended = new Set(["p1", "p2"]);
    const chip: ChipScoringInput = {
      code: "triple_captain",
      params: { multiplier: 3 },
      reservePlayerId: null,
    };
    const chips = new Map([["m1", chip]]);

    const [result] = scoreManagers(
      rules,
      playerPoints,
      attended,
      [team],
      new Map(),
      chips,
    );
    expect(result.squadPoints).toBe(10 * 3 + 4);
    expect(result.chipBonus).toBe(10);
    expect(result.chipCode).toBe("triple_captain");
  });

  it("triple captain wasted when captain absent — vice gets ×2", () => {
    const playerPoints = new Map([
      ["p1", 10],
      ["p2", 8],
      ["p3", 0],
      ["p4", 0],
      ["p5", 0],
    ]);
    const attended = new Set(["p2"]);
    const chip: ChipScoringInput = {
      code: "triple_captain",
      params: { multiplier: 3 },
      reservePlayerId: null,
    };

    const [result] = scoreManagers(
      rules,
      playerPoints,
      attended,
      [team],
      new Map(),
      new Map([["m1", chip]]),
    );
    expect(result.squadPoints).toBe(10 + 8 * 2);
    expect(result.chipBonus).toBe(0);
  });

  it("bench boost adds reserve at ×1", () => {
    const playerPoints = new Map([
      ["p1", 10],
      ["p2", 0],
      ["p3", 0],
      ["p4", 0],
      ["p5", 0],
      ["p6", 6],
    ]);
    const attended = new Set(["p1", "p6"]);
    const chip: ChipScoringInput = {
      code: "bench_boost",
      params: {},
      reservePlayerId: "p6",
    };

    const [result] = scoreManagers(
      rules,
      playerPoints,
      attended,
      [team],
      new Map(),
      new Map([["m1", chip]]),
    );
    expect(result.squadPoints).toBe(10 * 2 + 6);
    expect(result.chipBonus).toBe(6);
    const reserveLine = result.lines.find((l) => l.role === "reserve");
    expect(reserveLine).toMatchObject({ playerId: "p6", points: 6 });
  });
});
