import { describe, expect, it } from "vitest";
import {
  addDaysToIsoDate,
  openGameweekSundayFromLocal,
} from "@/server/domain/auto-schedule-matchdays";

describe("openGameweekSundayFromLocal", () => {
  it("targets upcoming Sunday before noon on gameweek day", () => {
    expect(openGameweekSundayFromLocal("2026-11-06", 10, 0)).toBe("2026-11-08");
    expect(openGameweekSundayFromLocal("2026-11-08", 11, 59)).toBe(
      "2026-11-08",
    );
  });

  it("rolls to the following Sunday from gameweek Sunday at noon", () => {
    expect(openGameweekSundayFromLocal("2026-11-08", 12, 0)).toBe("2026-11-15");
    expect(openGameweekSundayFromLocal("2026-11-09", 9, 0)).toBe("2026-11-15");
  });
});

describe("addDaysToIsoDate", () => {
  it("adds days across month boundaries", () => {
    expect(addDaysToIsoDate("2026-11-08", 7)).toBe("2026-11-15");
  });
});
