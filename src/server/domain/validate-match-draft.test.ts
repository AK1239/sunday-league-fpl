import { describe, expect, it } from "vitest";
import { validateMatchDraft } from "./validate-match-draft";
import type { MatchDraftInput } from "./match-entry-types";

const attendees = ["p1", "p2", "p3", "p4", "p5", "p6"];

function baseDraft(overrides: Partial<MatchDraftInput> = {}): MatchDraftInput {
  return {
    matchNo: 1,
    scoreA: 1,
    scoreB: 0,
    sideAPlayerIds: ["p1", "p2", "p3"],
    sideBPlayerIds: ["p4", "p5"],
    sideAGoalkeeperId: "p3",
    sideBGoalkeeperId: null,
    goals: [{ side: "A", scorerId: "p1", assistId: "p2" }],
    mvpPlayerId: "p1",
    ...overrides,
  };
}

describe("validateMatchDraft", () => {
  it("accepts a valid draft", () => {
    expect(validateMatchDraft(baseDraft(), attendees)).toEqual({ ok: true });
  });

  it("rejects player not in attendance", () => {
    const result = validateMatchDraft(
      baseDraft({ sideAPlayerIds: ["p1", "p2", "p99"] }),
      attendees,
    );
    expect(result.ok).toBe(false);
  });

  it("rejects goal count mismatch", () => {
    const result = validateMatchDraft(
      baseDraft({ scoreA: 2, goals: [{ side: "A", scorerId: "p1", assistId: null }] }),
      attendees,
    );
    expect(result).toMatchObject({ ok: false, code: "GOAL_COUNT" });
  });
});
