import { describe, expect, it } from "vitest";
import { isLocked, isSelectionOpen } from "./lock";

const deadline = new Date("2026-11-02T13:00:00.000Z");

describe("isLocked", () => {
  it("is open before deadline when scheduled", () => {
    expect(
      isLocked(
        { status: "scheduled", deadlineAt: deadline },
        new Date("2026-11-02T12:59:59.999Z"),
      ),
    ).toBe(false);
  });

  it("locks at the exact deadline instant", () => {
    expect(
      isLocked({ status: "scheduled", deadlineAt: deadline }, deadline),
    ).toBe(true);
  });

  it("locks after deadline", () => {
    expect(
      isLocked(
        { status: "scheduled", deadlineAt: deadline },
        new Date("2026-11-02T13:00:00.001Z"),
      ),
    ).toBe(true);
  });

  it("locks when status is draft, published, or cancelled", () => {
    for (const status of ["draft", "published", "cancelled"] as const) {
      expect(
        isLocked(
          { status, deadlineAt: deadline },
          new Date("2026-11-02T12:00:00.000Z"),
        ),
      ).toBe(true);
    }
  });

  it("isSelectionOpen is the inverse for scheduled matchdays", () => {
    const state = { status: "scheduled" as const, deadlineAt: deadline };
    const before = new Date("2026-11-02T12:00:00.000Z");
    expect(isSelectionOpen(state, before)).toBe(true);
    expect(isSelectionOpen(state, deadline)).toBe(false);
  });
});
