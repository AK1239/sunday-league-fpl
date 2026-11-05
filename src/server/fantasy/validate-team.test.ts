import { describe, expect, it } from "vitest";
import { validateFantasyTeam } from "./validate-team";

const eligible = new Map(
  ["p1", "p2", "p3", "p4", "p5", "p6"].map((id) => [
    id,
    { id, active: id !== "p6" },
  ]),
);

function validPick() {
  return {
    playerIds: ["p1", "p2", "p3", "p4", "p5"],
    captainPlayerId: "p1",
    viceCaptainPlayerId: "p2",
  };
}

describe("validateFantasyTeam", () => {
  it("accepts a valid squad", () => {
    expect(validateFantasyTeam(validPick(), eligible)).toEqual({ ok: true });
  });

  it("rejects wrong squad size", () => {
    const result = validateFantasyTeam(
      { ...validPick(), playerIds: ["p1", "p2", "p3"] },
      eligible,
    );
    expect(result.ok).toBe(false);
  });

  it("rejects duplicate players", () => {
    const result = validateFantasyTeam(
      {
        ...validPick(),
        playerIds: ["p1", "p1", "p3", "p4", "p5"],
      },
      eligible,
    );
    expect(result).toMatchObject({ ok: false, code: "DUPLICATE_PLAYER" });
  });

  it("rejects captain equal to vice", () => {
    const result = validateFantasyTeam(
      { ...validPick(), viceCaptainPlayerId: "p1" },
      eligible,
    );
    expect(result).toMatchObject({ ok: false, code: "CAPTAIN_VICE_SAME" });
  });

  it("rejects captain outside squad", () => {
    const result = validateFantasyTeam(
      { ...validPick(), captainPlayerId: "p6" },
      eligible,
    );
    expect(result).toMatchObject({ ok: false, code: "CAPTAIN_NOT_IN_SQUAD" });
  });

  it("rejects inactive players", () => {
    const result = validateFantasyTeam(
      {
        playerIds: ["p1", "p2", "p3", "p4", "p6"],
        captainPlayerId: "p1",
        viceCaptainPlayerId: "p2",
      },
      eligible,
    );
    expect(result).toMatchObject({ ok: false, code: "INACTIVE_PLAYER" });
  });
});
