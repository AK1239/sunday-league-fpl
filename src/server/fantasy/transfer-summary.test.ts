import { describe, expect, it } from "vitest";
import {
  isPenaltyAcknowledged,
  summariseTransferWindow,
} from "./transfer-summary";

const base = ["p1", "p2", "p3", "p4", "p5"];

describe("summariseTransferWindow", () => {
  it("reports zero penalty within free allowance", () => {
    const next = ["p1", "p2", "p3", "p4", "x"];
    expect(
      summariseTransferWindow({
        baseSquad: base,
        nextSquad: next,
        freeAvailable: 2,
        penaltyPerExtra: 4,
      }),
    ).toEqual({
      made: 1,
      freeAvailable: 2,
      extra: 0,
      transferPenalty: 0,
    });
  });

  it("computes −4 and −8 penalties", () => {
    const fourTransfers = ["x", "y", "z", "w", "p5"];
    expect(
      summariseTransferWindow({
        baseSquad: base,
        nextSquad: fourTransfers,
        freeAvailable: 3,
        penaltyPerExtra: 4,
      }),
    ).toMatchObject({ made: 4, extra: 1, transferPenalty: -4 });

    expect(
      summariseTransferWindow({
        baseSquad: base,
        nextSquad: fourTransfers,
        freeAvailable: 2,
        penaltyPerExtra: 4,
      }),
    ).toMatchObject({ extra: 2, transferPenalty: -8 });
  });

  it("unlimited windows never penalise", () => {
    const next = ["a", "b", "c", "d", "e"];
    expect(
      summariseTransferWindow({
        baseSquad: base,
        nextSquad: next,
        freeAvailable: 0,
        penaltyPerExtra: 4,
        unlimited: true,
      }),
    ).toMatchObject({ made: 5, extra: 0, transferPenalty: 0 });
  });
});

describe("isPenaltyAcknowledged", () => {
  it("passes when there is no extra cost", () => {
    const summary = summariseTransferWindow({
      baseSquad: base,
      nextSquad: base,
      freeAvailable: 2,
      penaltyPerExtra: 4,
    });
    expect(isPenaltyAcknowledged(summary, 0)).toBe(true);
  });

  it("requires acknowledgement magnitude to meet server penalty", () => {
    const summary = summariseTransferWindow({
      baseSquad: base,
      nextSquad: ["x", "y", "z", "w", "p5"],
      freeAvailable: 2,
      penaltyPerExtra: 4,
    });
    expect(summary.made).toBe(4);
    expect(summary.transferPenalty).toBe(-8);
    expect(isPenaltyAcknowledged(summary, 4)).toBe(false);
    expect(isPenaltyAcknowledged(summary, 8)).toBe(true);
  });
});
