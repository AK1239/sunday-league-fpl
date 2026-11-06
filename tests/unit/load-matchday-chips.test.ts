import { describe, expect, it } from "vitest";
import { toChipScoringInput } from "@/server/domain/load-matchday-chips";

describe("toChipScoringInput", () => {
  it("maps bench boost reserve from the effective squad", () => {
    const input = toChipScoringInput(
      {
        managerId: "m1",
        chipCode: "bench_boost",
        params: {},
      },
      "reserve-1",
    );
    expect(input).toMatchObject({
      code: "bench_boost",
      reservePlayerId: "reserve-1",
    });
  });

  it("ignores unknown chip codes", () => {
    expect(
      toChipScoringInput(
        { managerId: "m1", chipCode: "not_a_chip", params: {} },
        null,
      ),
    ).toBeNull();
  });
});
