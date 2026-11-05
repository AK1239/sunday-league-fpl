import { describe, expect, it } from "vitest";
import { canViewManagerFantasyTeam } from "./team-visibility";

const deadline = new Date("2026-11-02T13:00:00.000Z");
const before = new Date("2026-11-02T12:00:00.000Z");
const after = new Date("2026-11-02T14:00:00.000Z");
const scheduled = { status: "scheduled" as const, deadlineAt: deadline };

describe("canViewManagerFantasyTeam", () => {
  it("allows the owner always", () => {
    expect(
      canViewManagerFantasyTeam(
        {
          viewerUserId: "mgr-1",
          viewerRole: "manager",
          targetManagerId: "mgr-1",
        },
        scheduled,
        before,
      ),
    ).toBe(true);
  });

  it("hides other managers before the deadline", () => {
    expect(
      canViewManagerFantasyTeam(
        {
          viewerUserId: "mgr-2",
          viewerRole: "manager",
          targetManagerId: "mgr-1",
        },
        scheduled,
        before,
      ),
    ).toBe(false);
  });

  it("shows other managers after lock", () => {
    expect(
      canViewManagerFantasyTeam(
        { viewerUserId: null, viewerRole: null, targetManagerId: "mgr-1" },
        scheduled,
        after,
      ),
    ).toBe(true);
  });

  it("lets admins view before lock", () => {
    expect(
      canViewManagerFantasyTeam(
        {
          viewerUserId: "admin-1",
          viewerRole: "admin",
          targetManagerId: "mgr-1",
        },
        scheduled,
        before,
      ),
    ).toBe(true);
  });
});
