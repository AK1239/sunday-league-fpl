import { describe, expect, it } from "vitest";
import { computeBalanceChain } from "./free-transfers";

const rules = { grant: 2, cap: 3, penaltyPerExtra: 4 };

/** §3.3 rollover table (Matchday 1 = first transfer-eligible GW). */
describe("computeBalanceChain §3.3 rollover table", () => {
  it("matches the brief example row by row", () => {
    const steps = computeBalanceChain(
      [
        { key: "1", transfersMade: 0 },
        { key: "2", transfersMade: 1 },
        { key: "3", transfersMade: 2 },
        { key: "4", transfersMade: 3 },
        { key: "5", transfersMade: 1 },
      ],
      rules,
      0,
    );

    expect(steps.map((s) => s.available)).toEqual([2, 3, 3, 3, 2]);
    expect(steps.map((s) => s.made)).toEqual([0, 1, 2, 3, 1]);
    expect(steps.map((s) => s.carry)).toEqual([2, 2, 1, 0, 1]);
  });
});

describe("computeBalanceChain §3.3 penalty scenarios", () => {
  it("uses both free transfers without penalty", () => {
    const [step] = computeBalanceChain(
      [{ key: "gw", transfersMade: 2 }],
      rules,
      0,
    );
    expect(step).toMatchObject({ available: 2, extra: 0, penalty: 0, carry: 0 });
  });

  it("uses one free transfer", () => {
    const [step] = computeBalanceChain(
      [{ key: "gw", transfersMade: 1 }],
      rules,
      0,
    );
    expect(step).toMatchObject({ extra: 0, penalty: 0, carry: 1 });
  });

  it("saves both free transfers", () => {
    const [step] = computeBalanceChain(
      [{ key: "gw", transfersMade: 0 }],
      rules,
      0,
    );
    expect(step).toMatchObject({ extra: 0, carry: 2 });
  });

  it("3 banked, uses 1 — still no penalty", () => {
    const [step] = computeBalanceChain(
      [{ key: "gw", transfersMade: 1 }],
      rules,
      2,
    );
    expect(step).toMatchObject({ available: 3, extra: 0, penalty: 0, carry: 2 });
  });

  it("3 banked, uses 4 — one extra (−4)", () => {
    const [step] = computeBalanceChain(
      [{ key: "gw", transfersMade: 4 }],
      rules,
      2,
    );
    expect(step).toMatchObject({ available: 3, extra: 1, penalty: 4, carry: 0 });
  });

  it("2 available, makes 4 — two extras (−8)", () => {
    const [step] = computeBalanceChain(
      [{ key: "gw", transfersMade: 4 }],
      rules,
      0,
    );
    expect(step).toMatchObject({ available: 2, extra: 2, penalty: 8, carry: 0 });
  });
});

describe("computeBalanceChain edge cases", () => {
  it("discards carry above the cap when granting", () => {
    const steps = computeBalanceChain(
      [
        { key: "1", transfersMade: 0 },
        { key: "2", transfersMade: 0 },
      ],
      rules,
      0,
    );
    expect(steps[0]!.carry).toBe(2);
    expect(steps[1]!.available).toBe(3);
    expect(steps[1]!.carry).toBe(3);
  });

  it("skips cancelled matchdays without changing carry", () => {
    const steps = computeBalanceChain(
      [
        { key: "1", transfersMade: 0 },
        { key: "2", cancelled: true, transfersMade: 99 },
        { key: "3", transfersMade: 0 },
      ],
      rules,
      0,
    );
    expect(steps[1]).toMatchObject({
      skipped: true,
      made: 0,
      carry: 2,
    });
    expect(steps[2]!.available).toBe(3);
  });

  it("applies admin adjustment to available (D7)", () => {
    const [step] = computeBalanceChain(
      [{ key: "gw", transfersMade: 1, adjustment: 2 }],
      rules,
      0,
    );
    expect(step.available).toBe(4);
    expect(step.extra).toBe(0);
    expect(step.carry).toBe(3);
  });

  it("wildcard preserves allowance (D10)", () => {
    const [step] = computeBalanceChain(
      [{ key: "gw", transfersMade: 5, unlimited: true }],
      rules,
      1,
    );
    expect(step).toMatchObject({
      available: 3,
      extra: 0,
      penalty: 0,
      carry: 3,
    });
  });
});
