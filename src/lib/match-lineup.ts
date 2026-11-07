/** Typical Sunday sizes; sides need not match (5v4, 4v4, etc.). */
export const MATCH_LINEUP_REFERENCE_SIZE = 5;

export const MATCH_LINEUP_MAX_PLAYERS_PER_SIDE = 11;

export function isSupportedMatchLineup(
  sideACount: number,
  sideBCount: number,
): boolean {
  if (sideACount < 0 || sideBCount < 0) return false;
  if (sideACount > MATCH_LINEUP_MAX_PLAYERS_PER_SIDE) return false;
  if (sideBCount > MATCH_LINEUP_MAX_PLAYERS_PER_SIDE) return false;
  return true;
}
