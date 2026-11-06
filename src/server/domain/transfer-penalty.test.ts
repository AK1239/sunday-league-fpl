import { describe, expect, it } from "vitest";
import { deriveTransferPenalty } from "./transfer-penalty";

describe("deriveTransferPenalty", () => {
  it("returns zero within free allowance", () => {
    expect(
      deriveTransferPenalty({
        transfersMade: 2,
        freeAvailable: 2,
        penaltyPerExtra: 4,
        unlimited: false,
      }),
    ).toBe(0);
  });

  it("returns negative points per extra transfer", () => {
    expect(
      deriveTransferPenalty({
        transfersMade: 4,
        freeAvailable: 3,
        penaltyPerExtra: 4,
        unlimited: false,
      }),
    ).toBe(-4);
  });

  it("wildcard windows never penalise", () => {
    expect(
      deriveTransferPenalty({
        transfersMade: 10,
        freeAvailable: 0,
        penaltyPerExtra: 4,
        unlimited: true,
      }),
    ).toBe(0);
  });
});
