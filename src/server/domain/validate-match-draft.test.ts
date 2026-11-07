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

  it("accepts uneven lineups (5v4, 4v4)", () => {
    expect(
      validateMatchDraft(
        baseDraft({
          sideAPlayerIds: ["p1", "p2", "p3", "p4", "p5"],
          sideBPlayerIds: ["p6"],
          scoreA: 1,
          scoreB: 0,
          goals: [{ side: "A", scorerId: "p1", assistId: null }],
        }),
        attendees,
      ),
    ).toEqual({ ok: true });

    expect(
      validateMatchDraft(
        baseDraft({
          sideAPlayerIds: ["p1", "p2", "p3", "p4"],
          sideBPlayerIds: ["p5", "p6"],
          sideAGoalkeeperId: null,
          scoreA: 2,
          scoreB: 2,
          goals: [
            { side: "A", scorerId: "p1", assistId: null },
            { side: "A", scorerId: "p2", assistId: null },
            { side: "B", scorerId: "p5", assistId: null },
            { side: "B", scorerId: "p6", assistId: null },
          ],
        }),
        attendees,
      ),
    ).toEqual({ ok: true });
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
      baseDraft({
        scoreA: 2,
        goals: [{ side: "A", scorerId: "p1", assistId: null }],
      }),
      attendees,
    );
    expect(result).toMatchObject({ ok: false, code: "GOAL_COUNT" });
  });

  describe("penalties, own goals and incidents", () => {
    it("accepts a penalty goal without an assist", () => {
      expect(
        validateMatchDraft(
          baseDraft({
            goals: [
              { side: "A", scorerId: "p1", assistId: null, kind: "penalty" },
            ],
          }),
          attendees,
        ),
      ).toEqual({ ok: true });
    });

    it("rejects an assist on a penalty", () => {
      expect(
        validateMatchDraft(
          baseDraft({
            goals: [
              { side: "A", scorerId: "p1", assistId: "p2", kind: "penalty" },
            ],
          }),
          attendees,
        ),
      ).toMatchObject({ ok: false, code: "ASSIST" });
    });

    it("accepts an own goal by a player on the other side, credited to side A", () => {
      expect(
        validateMatchDraft(
          baseDraft({
            goals: [
              { side: "A", scorerId: "p4", assistId: null, kind: "own_goal" },
            ],
          }),
          attendees,
        ),
      ).toEqual({ ok: true });
    });

    it("rejects an own goal by a player on the credited side", () => {
      expect(
        validateMatchDraft(
          baseDraft({
            goals: [
              { side: "A", scorerId: "p1", assistId: null, kind: "own_goal" },
            ],
          }),
          attendees,
        ),
      ).toMatchObject({ ok: false, code: "OWN_GOAL" });
    });

    it("accepts incidents for players on the named side", () => {
      expect(
        validateMatchDraft(
          baseDraft({
            incidents: [
              { kind: "penalty_saved", side: "A", playerId: "p3" },
              { kind: "handball_blocked", side: "B", playerId: "p5" },
            ],
          }),
          attendees,
        ),
      ).toEqual({ ok: true });
    });

    it("rejects an incident naming a player on the wrong side", () => {
      expect(
        validateMatchDraft(
          baseDraft({
            incidents: [{ kind: "penalty_saved", side: "A", playerId: "p4" }],
          }),
          attendees,
        ),
      ).toMatchObject({ ok: false, code: "INCIDENT" });
    });
  });
});
