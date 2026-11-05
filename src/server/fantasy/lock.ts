export type MatchdayLockState = {
  status: "scheduled" | "draft" | "published" | "cancelled";
  deadlineAt: Date;
};

/** Selections are open only while status is scheduled and now is strictly before the deadline. */
export function isLocked(matchday: MatchdayLockState, now: Date): boolean {
  if (matchday.status !== "scheduled") {
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
