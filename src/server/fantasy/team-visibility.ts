import type { UserRole } from "@/server/auth/session";
import { isLocked, type MatchdayLockState } from "./lock";

export type FantasyTeamViewer = {
  viewerUserId: string | null;
  viewerRole: UserRole | null;
  targetManagerId: string;
};

/** Other managers' teams are hidden until the gameweek selection deadline passes. */
export function canViewManagerFantasyTeam(
  viewer: FantasyTeamViewer,
  matchday: MatchdayLockState,
  now: Date,
): boolean {
  if (viewer.viewerUserId === viewer.targetManagerId) return true;
  if (viewer.viewerRole === "admin") return true;
  return isLocked(matchday, now);
}
