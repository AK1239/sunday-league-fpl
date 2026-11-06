import { describe, expect, it } from "vitest";
import { normalizeTeamName } from "@/lib/team-name";

describe("normalizeTeamName", () => {
  it("trims and collapses whitespace", () => {
    expect(normalizeTeamName("  Sunday   Wolves ")).toEqual({
      ok: true,
      value: "Sunday Wolves",
    });
  });

  it("rejects names that are too short or too long", () => {
    expect(normalizeTeamName("A").ok).toBe(false);
    expect(normalizeTeamName("   ").ok).toBe(false);
    expect(normalizeTeamName("x".repeat(31)).ok).toBe(false);
    expect(normalizeTeamName("x".repeat(30)).ok).toBe(true);
  });

  it("allows letters, numbers and light punctuation (including non-latin)", () => {
    for (const name of [
      "FC 2026",
      "O'Brien & Sons",
      "Mkate_United!",
      "Ñandú",
    ]) {
      expect(normalizeTeamName(name).ok).toBe(true);
    }
  });

  it("rejects markup and control characters", () => {
    for (const name of ["<b>Hi</b>", "Team\u0000", "a/b", "x;DROP"]) {
      expect(normalizeTeamName(name).ok).toBe(false);
    }
  });
});
