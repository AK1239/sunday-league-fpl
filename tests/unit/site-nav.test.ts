import { describe, expect, it } from "vitest";
import { PRIMARY_SITE_NAV, navActive } from "@/lib/site-nav";

describe("navActive", () => {
  it("highlights My team on captain and history", () => {
    const myTeam = PRIMARY_SITE_NAV.find((i) => i.href === "/my")!;
    expect(navActive("/my", myTeam)).toBe(true);
    expect(navActive("/my/captain", myTeam)).toBe(true);
    expect(navActive("/my/history", myTeam)).toBe(true);
    expect(navActive("/my/points", myTeam)).toBe(false);
  });

  it("highlights Points only on points routes", () => {
    const points = PRIMARY_SITE_NAV.find((i) => i.href === "/my/points")!;
    expect(navActive("/my/points", points)).toBe(true);
    expect(navActive("/my/points/abc", points)).toBe(true);
    expect(navActive("/my", points)).toBe(false);
  });
});
