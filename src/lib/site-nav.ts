/** Primary app navigation (header desktop + mobile bottom bar). */
export const PRIMARY_SITE_NAV = [
  { href: "/", label: "Home", match: "home" as const },
  { href: "/my", label: "My team", match: "my-team" as const },
  { href: "/my/points", label: "Points", match: "my-points" as const },
  { href: "/pick", label: "Transfers", match: "prefix" as const },
  { href: "/table", label: "League", match: "prefix" as const },
  { href: "/more", label: "More", match: "more" as const },
] as const;

export type PrimaryNavItem = (typeof PRIMARY_SITE_NAV)[number];

/** Linked from /more — league-wide and extra manager views. */
export const MORE_SITE_NAV = [
  { href: "/matchdays", label: "Matchdays" },
  { href: "/players", label: "Players" },
  { href: "/awards", label: "Awards" },
  { href: "/my/captain", label: "Captain picks" },
  { href: "/my/history", label: "My history" },
  { href: "/rules", label: "Scoring rules" },
] as const;

export function navActive(pathname: string, item: PrimaryNavItem): boolean {
  switch (item.match) {
    case "home":
      return pathname === "/";
    case "my-team":
      return (
        pathname === "/my" ||
        pathname === "/my/captain" ||
        pathname === "/my/history"
      );
    case "my-points":
      return pathname === "/my/points" || pathname.startsWith("/my/points/");
    case "more":
      if (pathname === "/more") return true;
      return MORE_SITE_NAV.some((link) => {
        if (link.href.startsWith("/my/")) return false;
        return pathname === link.href || pathname.startsWith(`${link.href}/`);
      });
    case "prefix":
      return pathname === item.href || pathname.startsWith(`${item.href}/`);
    default:
      return false;
  }
}
