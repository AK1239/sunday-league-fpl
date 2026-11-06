import { describe, expect, it } from "vitest";
import { diffSquads, pairTransferSlots } from "./transfer-diff";

const base = ["a", "b", "c", "d", "e"];

describe("diffSquads", () => {
  it("returns no change when squads match", () => {
    expect(diffSquads(base, base)).toEqual({
      out: [],
      in: [],
      made: 0,
    });
  });

  it("detects a single transfer", () => {
    const next = ["a", "b", "c", "d", "x"];
    expect(diffSquads(base, next)).toEqual({
      out: ["e"],
      in: ["x"],
      made: 1,
    });
  });

  it("detects two transfers", () => {
    const next = ["a", "b", "x", "y", "e"];
    expect(diffSquads(base, next).made).toBe(2);
  });

  it("treats swap-back as zero transfers vs the base squad", () => {
    const withSwap = ["a", "b", "c", "d", "x"];
    expect(diffSquads(base, withSwap).made).toBe(1);
    expect(diffSquads(base, base).made).toBe(0);
  });

  it("counts five changes as five transfers", () => {
    const next = ["v", "w", "x", "y", "z"];
    expect(diffSquads(base, next).made).toBe(5);
  });

  it("pairTransferSlots aligns by index", () => {
    const diff = diffSquads(base, ["x", "b", "c", "d", "e"]);
    expect(pairTransferSlots(diff)).toEqual([
      { playerOutId: "a", playerInId: "x" },
    ]);
  });
});
