import { describe, expect, it } from "vitest";
import { buildSeasonAwardDrafts } from "@/server/domain/season-awards";
import type { ManagerStandingRow } from "@/server/queries/manager-standings";
import type { StandingRow } from "@/server/queries/standings";

function player(
  id: string,
  overrides: Partial<StandingRow> = {},
): StandingRow {
  return {
    playerId: id,
    displayName: id,
    nickname: null,
    kitKey: null,
    avatarUrl: null,
    rank: 1,
    rankDelta: 0,
    points: 10,
    goals: 1,
    assists: 1,
    appearances: 5,
    wins: 2,
    averagePoints: 2,
    ...overrides,
  };
}

function manager(
  id: string,
  totalPoints: number,
): ManagerStandingRow {
  return {
    managerId: id,
    displayName: id,
    rank: 1,
    rankDelta: 0,
    totalPoints,
    bestGameweekPoints: totalPoints,
    lastGameweekPoints: 0,
  };
}

describe("buildSeasonAwardDrafts", () => {
  it("assigns manager and player awards from standings", () => {
    const drafts = buildSeasonAwardDrafts(
      [manager("m1", 120), manager("m2", 80)],
      [player("p1", { points: 50 }), player("p2", { points: 40 })],
      [player("p2", { goals: 8, points: 40 }), player("p1", { goals: 3 })],
      [player("p1", { assists: 5 }), player("p2", { assists: 2 })],
      [player("p2", { appearances: 12 }), player("p1", { appearances: 10 })],
      [player("p1", { wins: 6 }), player("p2", { wins: 4 })],
    );

    expect(drafts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          award: "manager_champion",
          managerId: "m1",
          value: 120,
        }),
        expect.objectContaining({
          award: "champion",
          playerId: "p1",
          value: 50,
        }),
        expect.objectContaining({
          award: "golden_boot",
          playerId: "p2",
          value: 8,
        }),
      ]),
    );
  });

  it("skips awards when nobody has positive stats", () => {
    const drafts = buildSeasonAwardDrafts(
      [manager("m1", 0)],
      [player("p1", { points: 0, goals: 0, assists: 0, appearances: 0, wins: 0 })],
      [],
      [],
      [],
      [],
    );
    expect(drafts).toHaveLength(0);
  });
});
