export type MatchdayLockState = {
  status: "scheduled" | "draft" | "published" | "cancelled";
  deadlineAt: Date;
};

/**
 * Selections stay open until the deadline for scheduled gameweeks and for
 * draft (admin prep / results entry) — published and cancelled are always locked.
 */
export function isLocked(matchday: MatchdayLockState, now: Date): boolean {
  if (matchday.status === "published" || matchday.status === "cancelled") {
    return true;
  }
  return now.getTime() >= matchday.deadlineAt.getTime();
}

export function isSelectionOpen(
  matchday: MatchdayLockState,
  now: Date,
): boolean {
  return !isLocked(matchday, now);
}
