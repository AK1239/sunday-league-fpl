export const TEAM_NAME_MIN = 2;
export const TEAM_NAME_MAX = 30;

export type TeamNameResult =
  | { ok: true; value: string }
  | { ok: false; message: string };

/** Trim, collapse inner whitespace, and validate a manager's team name. */
export function normalizeTeamName(raw: string): TeamNameResult {
  const value = raw.replace(/\s+/g, " ").trim();
  if (value.length < TEAM_NAME_MIN) {
    return {
      ok: false,
      message: `Team name must be at least ${TEAM_NAME_MIN} characters.`,
    };
  }
  if (value.length > TEAM_NAME_MAX) {
    return {
      ok: false,
      message: `Team name must be ${TEAM_NAME_MAX} characters or fewer.`,
    };
  }
  // Letters, numbers, spaces and light punctuation only (no control chars / markup).
  if (!/^[\p{L}\p{N} .,'&!_\-]+$/u.test(value)) {
    return {
      ok: false,
      message: "Use letters, numbers, spaces and . , ' & ! _ - only.",
    };
  }
  return { ok: true, value };
}
