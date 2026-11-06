import { describe, expect, it } from "vitest";
import {
  resolveBaseSquadPlayerIds,
  hasPriorSubmittedSquadInSeason,
} from "./transfer-base-squad";
import type { SubmittedFantasyTeam } from "./effective-team";

const seasonStart = "2026-11-01";

function team(
  managerId: string,
  number: number,
  playerIds: string[],
  source: "manual" | "admin" = "manual",
): SubmittedFantasyTeam {
  return {
    managerId,
    source,
    captainPlayerId: playerIds[0]!,
    viceCaptainPlayerId: playerIds[1]!,
    playerIds,
    matchday: {
      matchdayId: `gw-${number}`,
      number,
      playedOn: `2026-11-${String(number).padStart(2, "0")}`,
      seasonStartsOn: seasonStart,
    },
  };
}

describe("resolveBaseSquadPlayerIds", () => {
  it("uses the latest prior manual squad", () => {
    const managerId = "m1";
    const teams = [
      team(managerId, 1, ["a", "b", "c", "d", "e"]),
      team(managerId, 2, ["a", "b", "c", "d", "x"]),
    ];
    const base = resolveBaseSquadPlayerIds(
      managerId,
      {
        matchdayId: "gw-3",
        number: 3,
        playedOn: "2026-11-03",
        seasonStartsOn: seasonStart,
      },
      teams,
    );
    expect(base).toEqual(["a", "b", "c", "d", "x"]);
  });

  it("ignores a submission on the target gameweek", () => {
    const managerId = "m1";
    const teams = [
      team(managerId, 2, ["a", "b", "c", "d", "e"]),
      team(managerId, 3, ["a", "b", "c", "d", "y"]),
    ];
    const base = resolveBaseSquadPlayerIds(
      managerId,
      teams[1]!.matchday,
      teams,
    );
    expect(base).toEqual(["a", "b", "c", "d", "e"]);
  });

  it("ignores a free hit squad when resolving base", () => {
    const managerId = "m1";
    const permanent = team(managerId, 2, ["a", "b", "c", "d", "e"]);
    const freeHit = {
      ...team(managerId, 3, ["f1", "f2", "f3", "f4", "f5"]),
      squadKind: "free_hit" as const,
    };
    const base = resolveBaseSquadPlayerIds(managerId, freeHit.matchday, [
      permanent,
      freeHit,
    ]);
    expect(base).toEqual(["a", "b", "c", "d", "e"]);
  });

  it("returns null when there is no prior squad", () => {
    expect(
      hasPriorSubmittedSquadInSeason(
        "m1",
        {
          matchdayId: "gw-1",
          number: 1,
          playedOn: "2026-11-01",
          seasonStartsOn: seasonStart,
        },
        [],
      ),
    ).toBe(false);
  });
});
