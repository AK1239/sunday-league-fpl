import { describe, expect, it } from "vitest";
import {
  validateFantasyTeamTransferLineup,
  validateFantasyTeamTransferPick,
  validateInitialFantasyTeamBuild,
} from "./validate-transfers";

const eligible = new Map(
  ["p1", "p2", "p3", "p4", "p5", "p6", "inactive"].map((id) => [
    id,
    { id, active: id !== "inactive" },
  ]),
);

const base = ["p1", "p2", "p3", "p4", "p5"];

function pick(
  overrides: Partial<{
    playerIds: string[];
    captainPlayerId: string;
    viceCaptainPlayerId: string;
  }> = {},
) {
  return {
    playerIds: base,
    captainPlayerId: "p1",
    viceCaptainPlayerId: "p2",
    ...overrides,
  };
}

describe("validateFantasyTeamTransferLineup", () => {
  it("ignores captain and vice", () => {
    expect(
      validateFantasyTeamTransferLineup(
        ["p1", "p2", "p3", "p4", "p6"],
        base,
        eligible,
      ),
    ).toEqual({ ok: true });
  });
});

describe("validateFantasyTeamTransferPick", () => {
  it("accepts captain-only change with retained inactive player", () => {
    const squadWithInactive = ["p1", "p2", "p3", "p4", "inactive"];
    const result = validateFantasyTeamTransferPick(
      {
        playerIds: squadWithInactive,
        captainPlayerId: "inactive",
        viceCaptainPlayerId: "p2",
      },
      squadWithInactive,
      eligible,
    );
    expect(result).toEqual({ ok: true });
  });

  it("rejects transferring an inactive player in", () => {
    const result = validateFantasyTeamTransferPick(
      pick({ playerIds: ["p1", "p2", "p3", "p4", "inactive"] }),
      base,
      eligible,
    );
    expect(result).toMatchObject({ ok: false, code: "INELIGIBLE_PLAYER" });
  });

  it("rejects duplicate players", () => {
    const result = validateFantasyTeamTransferPick(
      pick({ playerIds: ["p1", "p1", "p3", "p4", "p5"] }),
      base,
      eligible,
    );
    expect(result).toMatchObject({ ok: false, code: "DUPLICATE_PLAYER" });
  });

  it("allows a normal one-in one-out transfer", () => {
    const result = validateFantasyTeamTransferPick(
      pick({ playerIds: ["p1", "p2", "p3", "p4", "p6"] }),
      base,
      eligible,
    );
    expect(result).toEqual({ ok: true });
  });
});

describe("validateInitialFantasyTeamBuild", () => {
  it("requires all active players on first build", () => {
    expect(validateInitialFantasyTeamBuild(pick(), eligible)).toEqual({
      ok: true,
    });
    expect(
      validateInitialFantasyTeamBuild(
        pick({ playerIds: ["p1", "p2", "p3", "p4", "inactive"] }),
        eligible,
      ),
    ).toMatchObject({ ok: false, code: "INELIGIBLE_PLAYER" });
  });
});
