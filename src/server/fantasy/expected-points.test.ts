import { describe, expect, it } from "vitest";
import { computeExpectedPoints } from "./expected-points";

describe("computeExpectedPoints", () => {
  it("returns 0 for empty form", () => {
    expect(computeExpectedPoints([])).toBe(0);
  });

  it("averages recent gameweek totals", () => {
    expect(computeExpectedPoints([10, 14, 8])).toBe(11);
    expect(computeExpectedPoints([7])).toBe(7);
  });
});
