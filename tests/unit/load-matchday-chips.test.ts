import { describe, expect, it } from "vitest";
import { toChipScoringInput } from "@/server/domain/load-matchday-chips";

describe("toChipScoringInput", () => {
  it("maps bench boost extras from the effective squad", () => {
    const input = toChipScoringInput(
      {
        managerId: "m1",
        chipCode: "bench_boost",
        params: {},
      },
      ["extra-1", "extra-2"],
    );
    expect(input).toMatchObject({
      code: "bench_boost",
      reservePlayerIds: ["extra-1", "extra-2"],
    });
  });

  it("ignores unknown chip codes", () => {
    expect(
      toChipScoringInput(
        { managerId: "m1", chipCode: "not_a_chip", params: {} },
        [],
      ),
    ).toBeNull();
  });
});
