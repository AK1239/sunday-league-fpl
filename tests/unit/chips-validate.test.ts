import { describe, expect, it } from "vitest";
import { validateChipSubmission } from "@/server/chips/validate-chip";
import type { SeasonChipConfig } from "@/server/chips/validate-chip";
import { CHIP_CODES } from "@/server/chips/registry";

const enabledSeason: SeasonChipConfig[] = CHIP_CODES.map((chipCode) => ({
  chipCode,
  enabled: true,
  availableFromMatchday: 1,
}));

function baseInput(
  overrides: Partial<Parameters<typeof validateChipSubmission>[0]> = {},
) {
  return {
    chipCode: null,
    reservePlayerIds: [],
    squadKind: "permanent" as const,
    playerIds: ["p1", "p2", "p3", "p4", "p5"],
    captainPlayerId: "p1",
    viceCaptainPlayerId: "p2",
    matchdayNumber: 3,
    targetMatchdayId: "gw-3",
    transferRulesApply: true,
    hasBaseSquad: true,
    isInitialBuild: false,
    seasonChips: enabledSeason,
    activePlays: [],
    reserveEligible: (id: string) => id !== "inactive",
    ...overrides,
  };
}

describe("validateChipSubmission", () => {
  it("rejects wildcard on initial build", () => {
    const result = validateChipSubmission(
      baseInput({ chipCode: "wildcard", isInitialBuild: true }),
    );
    expect(result).toMatchObject({ ok: false, code: "CHIP_NOT_APPLICABLE" });
  });

  it("rejects two chips on one matchday", () => {
    const result = validateChipSubmission(
      baseInput({
        chipCode: "triple_captain",
        activePlays: [
          {
            chipCode: "bench_boost",
            matchdayId: "gw-3",
            status: "active",
          },
        ],
      }),
    );
    expect(result).toMatchObject({ ok: false, code: "CHIP_MATCHDAY_TAKEN" });
  });

  it("rejects reusing a chip in another gameweek", () => {
    const result = validateChipSubmission(
      baseInput({
        chipCode: "wildcard",
        targetMatchdayId: "gw-4",
        activePlays: [
          {
            chipCode: "wildcard",
            matchdayId: "gw-2",
            status: "active",
          },
        ],
      }),
    );
    expect(result).toMatchObject({ ok: false, code: "CHIP_ALREADY_USED" });
  });

  it("requires 2 extra players for bench boost", () => {
    for (const extras of [[], ["x1"]]) {
      const result = validateChipSubmission(
        baseInput({ chipCode: "bench_boost", reservePlayerIds: extras }),
      );
      expect(result).toMatchObject({
        ok: false,
        code: "CHIP_RESERVE_REQUIRED",
      });
    }
  });

  it("accepts bench boost with 2 valid extra players", () => {
    expect(
      validateChipSubmission(
        baseInput({
          chipCode: "bench_boost",
          reservePlayerIds: ["x1", "x2"],
        }),
      ),
    ).toEqual({ ok: true });
  });

  it("rejects duplicate, starter or inactive extra players", () => {
    const cases: string[][] = [
      ["x1", "x1"],
      ["x1", "p1"],
      ["x1", "inactive"],
    ];
    for (const extras of cases) {
      const result = validateChipSubmission(
        baseInput({ chipCode: "bench_boost", reservePlayerIds: extras }),
      );
      expect(result).toMatchObject({ ok: false, code: "CHIP_RESERVE_INVALID" });
    }
  });

  it("rejects extra players on other chips", () => {
    const result = validateChipSubmission(
      baseInput({ chipCode: "triple_captain", reservePlayerIds: ["x1", "x2"] }),
    );
    expect(result).toMatchObject({ ok: false, code: "CHIP_RESERVE_INVALID" });
  });

  it("accepts triple captain with permanent squad", () => {
    expect(
      validateChipSubmission(baseInput({ chipCode: "triple_captain" })),
    ).toEqual({ ok: true });
  });
});
