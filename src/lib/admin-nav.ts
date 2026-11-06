import type { LucideIcon } from "lucide-react";
import {
  CalendarDays,
  LayoutDashboard,
  ScrollText,
  Settings,
  Shuffle,
  Sparkles,
  Ticket,
  Trophy,
  UserCircle,
  Users,
} from "lucide-react";

export type AdminNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export type AdminNavGroup = {
  label: string;
  items: readonly AdminNavItem[];
};

export const ADMIN_NAV_GROUPS: readonly AdminNavGroup[] = [
  {
    label: "Home",
    items: [
      { href: "/admin", label: "Overview", icon: LayoutDashboard },
      { href: "/admin/activity", label: "Activity", icon: ScrollText },
    ],
  },
  {
    label: "League ops",
    items: [
      { href: "/admin/matchdays", label: "Matchdays", icon: CalendarDays },
      { href: "/admin/transfers", label: "Transfers", icon: Shuffle },
      { href: "/admin/chips", label: "Chips", icon: Sparkles },
    ],
  },
  {
    label: "Content",
    items: [
      { href: "/admin/players", label: "Players", icon: UserCircle },
      { href: "/admin/seasons", label: "Seasons", icon: Trophy },
      { href: "/admin/settings", label: "Settings", icon: Settings },
    ],
  },
  {
    label: "People",
    items: [
      { href: "/admin/invites", label: "Invites", icon: Ticket },
      { href: "/admin/users", label: "Managers", icon: Users },
    ],
  },
] as const;
