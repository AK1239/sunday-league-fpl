import { describe, expect, it } from "vitest";
import {
  resolveEffectiveTeam,
  type SubmittedFantasyTeam,
} from "./effective-team";

const md1 = {
  matchdayId: "md1",
  playedOn: "2026-11-02",
  number: 1,
  seasonStartsOn: "2026-11-01",
};
const md2 = {
  matchdayId: "md2",
  playedOn: "2026-11-09",
  number: 2,
  seasonStartsOn: "2026-11-01",
};

const baseTeam = (
  overrides: Partial<SubmittedFantasyTeam>,
): SubmittedFantasyTeam => ({
  managerId: "mgr",
  matchday: md1,
  source: "manual",
  captainPlayerId: "c1",
  viceCaptainPlayerId: "c2",
  playerIds: ["c1", "c2", "p3", "p4", "p5"],
  ...overrides,
});

describe("resolveEffectiveTeam", () => {
  it("uses manual team on the same matchday", () => {
    const teams = [baseTeam({ matchday: md2 })];
    const resolved = resolveEffectiveTeam("mgr", md2, teams);
    expect(resolved?.teamSource).toBe("manual");
  });

  it("carries over the latest prior manual team", () => {
    const teams = [baseTeam({})];
    const resolved = resolveEffectiveTeam("mgr", md2, teams);
    expect(resolved).toMatchObject({
      teamSource: "carry_over",
      captainPlayerId: "c1",
      playerIds: ["c1", "c2", "p3", "p4", "p5"],
    });
  });

  it("returns null when no prior team exists", () => {
    expect(resolveEffectiveTeam("mgr", md1, [])).toBeNull();
  });

  it("ignores carry_over rows as carry sources", () => {
    const teams = [baseTeam({ source: "carry_over", matchday: md1 })];
    expect(resolveEffectiveTeam("mgr", md2, teams)).toBeNull();
  });

  it("uses a free_hit squad on its matchday", () => {
    const permanent = baseTeam({
      playerIds: ["a", "b", "c", "d", "e"],
      captainPlayerId: "a",
      viceCaptainPlayerId: "b",
    });
    const freeHit = baseTeam({
      matchday: md2,
      squadKind: "free_hit",
      playerIds: ["f", "g", "h", "i", "j"],
      captainPlayerId: "f",
      viceCaptainPlayerId: "g",
      reservePlayerId: "r1",
    });
    const resolved = resolveEffectiveTeam("mgr", md2, [permanent, freeHit]);
    expect(resolved).toMatchObject({
      teamSource: "manual",
      squadKind: "free_hit",
      reservePlayerId: "r1",
      playerIds: ["f", "g", "h", "i", "j"],
    });
  });

  it("carries the latest permanent squad after a free_hit week", () => {
    const permanent = baseTeam({
      playerIds: ["a", "b", "c", "d", "e"],
      captainPlayerId: "a",
      viceCaptainPlayerId: "b",
    });
    const freeHit = baseTeam({
      matchday: md2,
      squadKind: "free_hit",
      playerIds: ["f", "g", "h", "i", "j"],
      captainPlayerId: "f",
      viceCaptainPlayerId: "g",
    });
    const md3 = {
      matchdayId: "md3",
      playedOn: "2026-11-16",
      number: 3,
      seasonStartsOn: "2026-11-01",
    };
    const resolved = resolveEffectiveTeam("mgr", md3, [
      permanent,
      freeHit,
    ]);
    expect(resolved).toMatchObject({
      teamSource: "carry_over",
      squadKind: "permanent",
      reservePlayerId: null,
      playerIds: ["a", "b", "c", "d", "e"],
    });
  });
});
