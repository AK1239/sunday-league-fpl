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
});
